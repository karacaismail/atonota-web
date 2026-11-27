import { type ApiClient, ApiError, type DocumentRequest, type DocumentResponse } from '@/api';

import { formatRecordMessage } from './messages';
import { validateNewRecordContext } from './prefill';
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

/**
 * Record adapter options. Requests go through the session's shared API client (SZ-5).
 * Site root, cookie setting, CSRF store, timeout and session expiry live in the client.
 * The adapter builds no `fetch` layer of its own. It does not read the page `meta` tag (security
 * finding B3).
 */
export interface FrappeRecordAdapterConfig {
  api: Pick<ApiClient, 'frappeDocument'>;
  locale?: RecordLocale | undefined;
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

interface JsonHttpResult {
  notModified: boolean;
  etag: string | undefined;
  body: unknown;
}

const VALIDATION_TYPES = new Set([
  'ValidationError',
  'MandatoryError',
  'LinkValidationError',
  'UniqueValidationError',
]);

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/** Maps the shared error type to the record view's error code. The server message is sanitised. */
function toRecordError(error: ApiError, rawBody: unknown, locale: RecordLocale): RecordApiError {
  const body = asRecord(rawBody);
  const excType = extractExcType(body);
  const safeMsg = extractSafeServerMessage(body);
  const status = error.status === 0 ? undefined : error.status;
  const make = (code: RecordErrorCode, message: string) =>
    new RecordApiError({ code, status, message });
  switch (error.kind) {
    case 'session_expired':
      return make('session_expired', formatRecordMessage(locale, 'unauthorizedSessionDescription'));
    case 'forbidden':
      return make('unauthorized', formatRecordMessage(locale, 'unauthorizedPermissionDescription'));
    case 'not_found':
      return make('not_found', formatRecordMessage(locale, 'emptyNotFoundDescription'));
    case 'conflict':
      return make('conflict', safeMsg ?? formatRecordMessage(locale, 'conflictDescription'));
    case 'rate_limited':
      return make('rate_limited', formatRecordMessage(locale, 'rateLimitedError'));
    case 'network':
    case 'timeout':
      return make('network', formatRecordMessage(locale, 'networkError'));
    case 'invalid_response':
      return make('invalid_response', formatRecordMessage(locale, 'invalidServerResponse'));
    case 'invalid_request':
      if (error.status === 417 || (excType !== undefined && VALIDATION_TYPES.has(excType))) {
        return make('validation', safeMsg ?? formatRecordMessage(locale, 'validationServerError'));
      }
      return make('server_error', formatRecordMessage(locale, 'errorDefaultDescription'));
    default:
      return make('server_error', formatRecordMessage(locale, 'errorDefaultDescription'));
  }
}

export function createFrappeRecordAdapter(config: FrappeRecordAdapterConfig): RecordDataAdapter {
  const { api } = config;
  const locale: RecordLocale = config.locale ?? 'tr';
  const metaCache = new Map<string, { etag: string | undefined; meta: DocTypeMeta }>();

  async function requestJsonWithMeta(
    path: string,
    init: {
      method?: DocumentRequest['method'];
      query?: Record<string, string>;
      body?: unknown;
      etag?: string | undefined;
      allow304?: boolean | undefined;
      externalSignal?: AbortSignal | undefined;
    },
  ): Promise<JsonHttpResult> {
    let result: DocumentResponse;
    try {
      result = await api.frappeDocument({
        method: init.method ?? 'GET',
        path,
        ...(init.query ? { query: init.query } : {}),
        ...(init.body === undefined ? {} : { body: init.body }),
        etag: init.etag,
        signal: init.externalSignal,
      });
    } catch (err) {
      // A user abort is passed through as is. The screen does not treat an abort as an error.
      if (init.externalSignal?.aborted || !(err instanceof ApiError)) throw err;
      throw toRecordError(err, undefined, locale);
    }
    if (!result.ok) throw toRecordError(result.error, result.body, locale);
    if (result.status === 304) {
      if (init.allow304) return { notModified: true, etag: result.etag, body: undefined };
      throw new RecordApiError({
        code: 'invalid_response',
        status: 304,
        message: formatRecordMessage(locale, 'invalidServerResponse'),
      });
    }
    return { notModified: false, etag: result.etag, body: result.body };
  }

  return {
    async getNewRecordContext(params) {
      if (params.doctype !== 'Leave Application') return undefined;
      const result = await requestJsonWithMeta(
        '/api/method/hrms_tr.api.get_leave_request_context',
        {
          method: 'GET',
          externalSignal: params.signal,
        },
      );
      try {
        return validateNewRecordContext(result.body);
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
    async getDocTypeMeta(params: GetDocTypeMetaParams): Promise<DocTypeMeta> {
      const cacheKey = `${params.doctype}::${params.language ?? ''}`;
      const cached = metaCache.get(cacheKey);
      const query: Record<string, string> = { doctype: params.doctype, surface: 'web' };
      if (params.language) {
        query['_lang'] = params.language;
      }
      const metaPath = '/api/method/platform_core.api.meta.get_doctype';

      const effectiveEtag = params.etag ?? cached?.etag;
      const etag = effectiveEtag && cached ? effectiveEtag : params.etag;

      const result = await requestJsonWithMeta(metaPath, {
        method: 'GET',
        query,
        etag,
        allow304: true,
        externalSignal: params.signal,
      });

      if (result.notModified) {
        if (cached) {
          return cached.meta;
        }
        // If caller passed an uncached ETag and received 304, re-fetch unconditionally without If-None-Match.
        const freshFallback = await requestJsonWithMeta(metaPath, {
          method: 'GET',
          query,
          externalSignal: params.signal,
        });
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
          body: payload,
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
        body: params.data,
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
      const query: Record<string, string> = {
        doctype: params.doctype,
        txt: params.txt,
        page_length: String(params.pageLength ?? 10),
      };
      if (params.referenceDoctype) {
        query['reference_doctype'] = params.referenceDoctype;
      }
      if (params.linkFieldname) {
        query['link_fieldname'] = params.linkFieldname;
      }
      if (params.filters) {
        query['filters'] = JSON.stringify(params.filters);
      }

      const result = await requestJsonWithMeta('/api/method/frappe.desk.search.search_link', {
        method: 'GET',
        query,
        externalSignal: params.signal,
      });
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
          body: { modified: params.modified },
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
