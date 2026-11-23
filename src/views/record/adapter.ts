import { formatRecordMessage } from './messages';
import {
  SchemaValidationError,
  validateDocTypeMeta,
  validateLinkSearchResponse,
  validateRecordEnvelope,
} from './schema';
import type {
  DocTypeMeta,
  GetDocTypeMetaParams,
  GetRecordParams,
  LinkOption,
  LinkSearchParams,
  RecordDataAdapter,
  RecordDocument,
  RecordErrorCode,
  RecordLocale,
  RunDocActionParams,
  SaveRecordParams,
} from './types';

export class RecordApiError extends Error {
  public readonly code: RecordErrorCode;
  public readonly status: number | undefined;
  public readonly fieldErrors: Readonly<Record<string, string>> | undefined;

  public constructor(options: {
    code: RecordErrorCode;
    message: string;
    status?: number | undefined;
    fieldErrors?: Readonly<Record<string, string>> | undefined;
  }) {
    super(options.message);
    this.name = 'RecordApiError';
    this.code = options.code;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors;
  }
}

export interface FrappeRecordAdapterConfig {
  baseUrl?: string | undefined;
  locale?: RecordLocale | undefined;
  timeoutMs?: number | undefined;
  fetchFn?: typeof fetch | undefined;
  getCsrfToken?: (() => string | null | undefined) | undefined;
}

const HTML_ENTITY_MAP: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
};

/**
 * Strips actual HTML markup tags without eating mathematical '<' comparisons,
 * then decodes standard HTML entities safely (GV-2, Review 1 Minor 1).
 */
export function stripHtmlTagsSafe(input: string): string {
  const withoutTags = input.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^<>]*)?>/g, ' ');
  const decoded = withoutTags.replace(
    /&(?:amp|lt|gt|quot|nbsp|#39|#x27);/gi,
    (entity) => HTML_ENTITY_MAP[entity.toLowerCase()] ?? entity,
  );
  return decoded.replace(/\s+/g, ' ').trim();
}

function readMetaCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const meta =
    document.querySelector('meta[name="csrf-token"]') ??
    document.querySelector('meta[name="frappe-csrf-token"]');
  const content = meta?.getAttribute('content');
  return content && content.trim().length > 0 ? content.trim() : null;
}

function extractSafeServerMessage(body: Record<string, unknown>): string | undefined {
  const rawServerMessages = body['_server_messages'];
  if (typeof rawServerMessages === 'string' && rawServerMessages.length > 0) {
    try {
      const outer: unknown = JSON.parse(rawServerMessages);
      if (Array.isArray(outer) && outer.length > 0) {
        const first: unknown = outer[0];
        if (typeof first === 'string') {
          const parsedInner: unknown = JSON.parse(first);
          if (
            typeof parsedInner === 'object' &&
            parsedInner !== null &&
            typeof (parsedInner as Record<string, unknown>)['message'] === 'string'
          ) {
            const clean = stripHtmlTagsSafe(
              String((parsedInner as Record<string, unknown>)['message']),
            );
            if (clean.length > 0) {
              return clean;
            }
          }
        }
      }
    } catch {
      // Never expose malformed serialized server messages (SZ-8).
    }
  }

  const v2Errors = body['errors'];
  if (Array.isArray(v2Errors) && v2Errors.length > 0) {
    const firstErr: unknown = v2Errors[0];
    if (
      typeof firstErr === 'object' &&
      firstErr !== null &&
      typeof (firstErr as Record<string, unknown>)['message'] === 'string'
    ) {
      const clean = stripHtmlTagsSafe(String((firstErr as Record<string, unknown>)['message']));
      if (clean.length > 0) {
        return clean;
      }
    }
  }

  return undefined;
}

function extractExcType(body: Record<string, unknown>): string | undefined {
  if (typeof body['exc_type'] === 'string' && body['exc_type'].length > 0) {
    return body['exc_type'];
  }
  const v2Errors = body['errors'];
  if (Array.isArray(v2Errors) && v2Errors.length > 0) {
    const firstErr: unknown = v2Errors[0];
    if (
      typeof firstErr === 'object' &&
      firstErr !== null &&
      typeof (firstErr as Record<string, unknown>)['type'] === 'string'
    ) {
      return String((firstErr as Record<string, unknown>)['type']);
    }
  }
  return undefined;
}

function createTimedSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onAbort);
    },
  };
}

interface JsonHttpResult {
  notModified: boolean;
  etag: string | undefined;
  body: unknown;
}

export function createFrappeRecordAdapter(config?: FrappeRecordAdapterConfig): RecordDataAdapter {
  const baseUrl = (config?.baseUrl ?? '').replace(/\/$/, '');
  const locale: RecordLocale = config?.locale ?? 'tr';
  const timeoutMs = config?.timeoutMs ?? 15_000;
  const fetchFn: typeof fetch = config?.fetchFn ?? ((input, init) => fetch(input, init));
  const resolveCsrf = config?.getCsrfToken ?? readMetaCsrfToken;
  const metaCache = new Map<string, { etag: string | undefined; meta: DocTypeMeta }>();

  /**
   * SZ-8 & Review 1 Finding 3: Only HTTP 200 with a real non-Guest username confirms an active
   * session; every other outcome (401, 403 Guest, timeout) is treated as session_expired.
   */
  async function verifySessionOnAmbiguous403(
    externalSignal?: AbortSignal,
  ): Promise<'session_expired' | 'unauthorized'> {
    const { signal, cleanup } = createTimedSignal(externalSignal, timeoutMs);
    try {
      const probeResponse = await fetchFn(`${baseUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal,
      });
      cleanup();
      if (probeResponse.status !== 200) {
        return 'session_expired';
      }
      const ct = probeResponse.headers.get('Content-Type') ?? '';
      if (!ct.toLowerCase().includes('application/json')) {
        return 'session_expired';
      }
      const raw: unknown = await probeResponse.json();
      if (
        typeof raw === 'object' &&
        raw !== null &&
        typeof (raw as Record<string, unknown>)['message'] === 'string'
      ) {
        const user = String((raw as Record<string, unknown>)['message']).trim();
        if (user.length > 0 && user !== 'Guest') {
          return 'unauthorized';
        }
      }
      return 'session_expired';
    } catch {
      cleanup();
      return 'session_expired';
    }
  }

  async function requestJsonWithMeta(
    path: string,
    init: RequestInit & {
      isWrite?: boolean | undefined;
      allow304?: boolean | undefined;
      externalSignal?: AbortSignal | undefined;
    },
  ): Promise<JsonHttpResult> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (init.isWrite) {
      headers.set('Content-Type', 'application/json');
      const csrfToken = resolveCsrf();
      if (csrfToken) {
        headers.set('X-Frappe-CSRF-Token', csrfToken);
      }
    }

    const { signal, cleanup } = createTimedSignal(init.externalSignal, timeoutMs);
    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body ?? null,
        credentials: 'same-origin',
        signal,
      });
    } catch (err) {
      cleanup();
      if (init.externalSignal?.aborted) {
        throw err;
      }
      throw new RecordApiError({
        code: 'network',
        message: formatRecordMessage(locale, 'networkError'),
      });
    }
    cleanup();

    const etag = response.headers.get('ETag') ?? undefined;
    if (init.allow304 && response.status === 304) {
      return {
        notModified: true,
        etag,
        body: undefined,
      };
    }

    const contentType = response.headers.get('Content-Type') ?? '';
    const isJson = contentType.toLowerCase().includes('application/json');
    let parsedBody: Record<string, unknown> = {};
    if (isJson) {
      try {
        const raw: unknown = await response.json();
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
          parsedBody = raw as Record<string, unknown>;
        }
      } catch {
        if (response.ok) {
          throw new RecordApiError({
            code: 'invalid_response',
            status: response.status,
            message: formatRecordMessage(locale, 'invalidServerResponse'),
          });
        }
      }
    } else if (response.ok) {
      throw new RecordApiError({
        code: 'invalid_response',
        status: response.status,
        message: formatRecordMessage(locale, 'invalidServerResponse'),
      });
    }

    if (response.ok) {
      return {
        notModified: false,
        etag,
        body: parsedBody,
      };
    }

    const excType = extractExcType(parsedBody);
    const safeMsg = extractSafeServerMessage(parsedBody);

    if (
      response.status === 401 ||
      excType === 'SessionExpired' ||
      excType === 'AuthenticationError' ||
      parsedBody['session_expired'] === 1
    ) {
      throw new RecordApiError({
        code: 'session_expired',
        status: response.status,
        message: formatRecordMessage(locale, 'unauthorizedSessionDescription'),
      });
    }

    if (response.status === 403) {
      if (excType === 'PermissionError') {
        throw new RecordApiError({
          code: 'unauthorized',
          status: 403,
          message: formatRecordMessage(locale, 'unauthorizedPermissionDescription'),
        });
      }
      const disambiguated = await verifySessionOnAmbiguous403(init.externalSignal);
      throw new RecordApiError({
        code: disambiguated,
        status: 403,
        message:
          disambiguated === 'session_expired'
            ? formatRecordMessage(locale, 'unauthorizedSessionDescription')
            : formatRecordMessage(locale, 'unauthorizedPermissionDescription'),
      });
    }

    if (response.status === 404 || excType === 'DoesNotExistError') {
      throw new RecordApiError({
        code: 'not_found',
        status: response.status,
        message: formatRecordMessage(locale, 'emptyNotFoundDescription'),
      });
    }

    if (response.status === 409 || excType === 'TimestampMismatchError') {
      throw new RecordApiError({
        code: 'conflict',
        status: response.status,
        message: safeMsg ?? formatRecordMessage(locale, 'conflictDescription'),
      });
    }

    if (response.status === 429 || excType === 'RateLimitExceededError') {
      throw new RecordApiError({
        code: 'rate_limited',
        status: response.status,
        message: formatRecordMessage(locale, 'rateLimitedError'),
      });
    }

    if (
      response.status === 417 ||
      excType === 'ValidationError' ||
      excType === 'MandatoryError' ||
      excType === 'LinkValidationError' ||
      excType === 'UniqueValidationError'
    ) {
      throw new RecordApiError({
        code: 'validation',
        status: response.status,
        message: safeMsg ?? formatRecordMessage(locale, 'validationServerError'),
      });
    }

    throw new RecordApiError({
      code: 'server_error',
      status: response.status,
      message: formatRecordMessage(locale, 'errorDefaultDescription'),
    });
  }

  return {
    async getDocTypeMeta(params: GetDocTypeMetaParams): Promise<DocTypeMeta> {
      const cacheKey = `${params.doctype}::${params.language ?? ''}`;
      const cached = metaCache.get(cacheKey);
      const search = new URLSearchParams({
        doctype: params.doctype,
        surface: 'web',
      });
      if (params.language) {
        search.set('_lang', params.language);
      }

      const headers: Record<string, string> = {};
      const effectiveEtag = params.etag ?? cached?.etag;
      if (effectiveEtag && cached) {
        headers['If-None-Match'] = effectiveEtag;
      } else if (params.etag) {
        headers['If-None-Match'] = params.etag;
      }

      const result = await requestJsonWithMeta(
        `/api/method/platform_core.api.meta.get_doctype?${search.toString()}`,
        {
          method: 'GET',
          headers,
          allow304: true,
          externalSignal: params.signal,
        },
      );

      if (result.notModified) {
        if (cached) {
          return cached.meta;
        }
        // If caller passed an uncached ETag and received 304, re-fetch unconditionally without If-None-Match.
        const freshFallback = await requestJsonWithMeta(
          `/api/method/platform_core.api.meta.get_doctype?${search.toString()}`,
          {
            method: 'GET',
            externalSignal: params.signal,
          },
        );
        const validatedFallback = validateDocTypeMeta(freshFallback.body);
        metaCache.set(cacheKey, { etag: freshFallback.etag, meta: validatedFallback });
        return validatedFallback;
      }

      try {
        const validated = validateDocTypeMeta(result.body);
        metaCache.set(cacheKey, { etag: result.etag, meta: validated });
        return validated;
      } catch (err) {
        if (err instanceof SchemaValidationError) {
          throw new RecordApiError({
            code: 'invalid_response',
            message: formatRecordMessage(locale, 'invalidServerResponse'),
          });
        }
        throw err;
      }
    },

    async getRecord(params: GetRecordParams): Promise<RecordDocument> {
      const encodedDoctype = encodeURIComponent(params.doctype);
      const encodedName = encodeURIComponent(params.name);
      const result = await requestJsonWithMeta(`/api/resource/${encodedDoctype}/${encodedName}`, {
        method: 'GET',
        externalSignal: params.signal,
      });
      try {
        return validateRecordEnvelope(result.body);
      } catch (err) {
        if (err instanceof SchemaValidationError) {
          throw new RecordApiError({
            code: 'invalid_response',
            message: formatRecordMessage(locale, 'invalidServerResponse'),
          });
        }
        throw err;
      }
    },

    async saveRecord(params: SaveRecordParams): Promise<RecordDocument> {
      const encodedDoctype = encodeURIComponent(params.doctype);
      if (params.name) {
        if (!params.modified || params.modified.trim().length === 0) {
          throw new RecordApiError({
            code: 'validation',
            message: formatRecordMessage(locale, 'missingVersionError'),
          });
        }
        const encodedName = encodeURIComponent(params.name);
        const payload: Record<string, unknown> = {
          ...params.data,
          modified: params.modified,
        };
        const result = await requestJsonWithMeta(`/api/resource/${encodedDoctype}/${encodedName}`, {
          method: 'PUT',
          isWrite: true,
          body: JSON.stringify(payload),
          externalSignal: params.signal,
        });
        try {
          return validateRecordEnvelope(result.body);
        } catch {
          throw new RecordApiError({
            code: 'invalid_response',
            message: formatRecordMessage(locale, 'invalidServerResponse'),
          });
        }
      }

      const result = await requestJsonWithMeta(`/api/resource/${encodedDoctype}`, {
        method: 'POST',
        isWrite: true,
        body: JSON.stringify(params.data),
        externalSignal: params.signal,
      });
      try {
        return validateRecordEnvelope(result.body);
      } catch {
        throw new RecordApiError({
          code: 'invalid_response',
          message: formatRecordMessage(locale, 'invalidServerResponse'),
        });
      }
    },

    async searchLink(params: LinkSearchParams): Promise<readonly LinkOption[]> {
      const search = new URLSearchParams({
        doctype: params.doctype,
        txt: params.txt,
        page_length: String(params.pageLength ?? 10),
      });
      if (params.referenceDoctype) {
        search.set('reference_doctype', params.referenceDoctype);
      }
      if (params.linkFieldname) {
        search.set('link_fieldname', params.linkFieldname);
      }
      if (params.filters) {
        search.set('filters', JSON.stringify(params.filters));
      }

      const result = await requestJsonWithMeta(
        `/api/method/frappe.desk.search.search_link?${search.toString()}`,
        {
          method: 'GET',
          externalSignal: params.signal,
        },
      );
      try {
        return validateLinkSearchResponse(result.body);
      } catch {
        throw new RecordApiError({
          code: 'invalid_response',
          message: formatRecordMessage(locale, 'invalidServerResponse'),
        });
      }
    },

    async runDocAction(params: RunDocActionParams): Promise<RecordDocument | undefined> {
      const encodedDoctype = encodeURIComponent(params.doctype);
      const encodedName = encodeURIComponent(params.name);
      const encodedAction = encodeURIComponent(params.action);
      const result = await requestJsonWithMeta(
        `/api/v2/document/${encodedDoctype}/${encodedName}/method/${encodedAction}/`,
        {
          method: 'POST',
          isWrite: true,
          body: JSON.stringify({ modified: params.modified }),
          externalSignal: params.signal,
        },
      );
      const raw = result.body;
      if (typeof raw === 'object' && raw !== null && ('data' in raw || 'message' in raw)) {
        try {
          return validateRecordEnvelope(raw);
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
  };
}
