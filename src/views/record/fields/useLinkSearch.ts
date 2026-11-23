import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { RecordApiError } from '../adapter';
import { formatRecordMessage } from '../messages';
import { RECORD_LINK_SEARCH_DEBOUNCE_MS } from '../tokens';
import type { LinkOption, RecordDataAdapter, RecordLocale } from '../types';

export interface UseLinkSearchParams {
  targetDoctype: string;
  referenceDoctype: string;
  linkFieldname: string;
  readOnly: boolean;
  locale: RecordLocale;
  adapter: RecordDataAdapter;
}

export interface UseLinkSearchResult {
  options: readonly LinkOption[];
  searching: boolean;
  searchError: string | null;
  dropdownOpen: boolean;
  handleOpenChange: (nextOpen: boolean) => void;
  handleSearchInput: (searchText: string) => void;
  handleRetry: () => void;
  handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function useLinkSearch(params: UseLinkSearchParams): UseLinkSearchResult {
  const { targetDoctype, referenceDoctype, linkFieldname, readOnly, locale, adapter } = params;

  const [options, setOptions] = useState<readonly LinkOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabbingOutRef = useRef(false);
  const seqRef = useRef(0);
  const lastQueryRef = useRef('');

  const clearPendingTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimer();
      abortRef.current?.abort();
    };
  }, [clearPendingTimer]);

  const executeServerSearch = useCallback(
    (searchText: string) => {
      const cleanTarget = targetDoctype.trim();
      if (!cleanTarget || readOnly) {
        return;
      }

      clearPendingTimer();
      lastQueryRef.current = searchText;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      seqRef.current += 1;
      const requestId = seqRef.current;
      setSearching(true);
      setSearchError(null);

      void adapter
        .searchLink({
          doctype: cleanTarget,
          txt: searchText,
          referenceDoctype,
          linkFieldname,
          signal: controller.signal,
        })
        .then((results) => {
          if (controller.signal.aborted || requestId !== seqRef.current) {
            return;
          }
          setOptions(results);
          setSearchError(null);
          setSearching(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || requestId !== seqRef.current) {
            return;
          }
          setOptions([]);
          setSearchError(
            err instanceof RecordApiError
              ? err.message
              : formatRecordMessage(locale, 'networkError'),
          );
          setSearching(false);
        });
    },
    [adapter, clearPendingTimer, linkFieldname, locale, readOnly, referenceDoctype, targetDoctype],
  );

  const handleSearchInput = useCallback(
    (searchText: string) => {
      const cleanTarget = targetDoctype.trim();
      if (!cleanTarget || readOnly || tabbingOutRef.current) {
        return;
      }
      if (searchError !== null && searchText === '' && lastQueryRef.current !== '') {
        return;
      }
      lastQueryRef.current = searchText;
      clearPendingTimer();
      abortRef.current?.abort();
      setSearching(true);
      setSearchError(null);

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        executeServerSearch(searchText);
      }, RECORD_LINK_SEARCH_DEBOUNCE_MS);
    },
    [clearPendingTimer, executeServerSearch, readOnly, searchError, targetDoctype],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setDropdownOpen(nextOpen);
      if (nextOpen) {
        executeServerSearch('');
      } else {
        clearPendingTimer();
      }
    },
    [clearPendingTimer, executeServerSearch],
  );

  const handleRetry = useCallback(() => {
    setDropdownOpen(true);
    executeServerSearch(lastQueryRef.current);
  }, [executeServerSearch]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Tab') {
        tabbingOutRef.current = true;
        queueMicrotask(() => {
          tabbingOutRef.current = false;
        });
        return;
      }
      if (event.key === 'Enter' && searchError !== null) {
        event.preventDefault();
        event.stopPropagation();
        handleRetry();
      }
    },
    [handleRetry, searchError],
  );

  return {
    options,
    searching,
    searchError,
    dropdownOpen,
    handleOpenChange,
    handleSearchInput,
    handleRetry,
    handleInputKeyDown,
  };
}
