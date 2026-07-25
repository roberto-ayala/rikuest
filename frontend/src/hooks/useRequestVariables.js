import { useCallback, useEffect, useState } from 'react';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { useEnvironmentStore } from '../stores/environmentStore';

/**
 * Loads the variables visible to a request (active environment + folder
 * ancestry, resolved with the same precedence the backend uses when executing).
 *
 * Feeds the {{name}} highlighting and autocomplete in the request builder.
 * Reloads whenever the active environment changes — including after a response
 * capture rewrites a value — so suggestions never show a stale value.
 *
 * @param {number|null} requestId
 * @returns {{ variables: Array<{key: string, value: string, source: string, source_name: string}>, reload: () => void }}
 */
export function useRequestVariables(requestId) {
  const [variables, setVariables] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const activeEnvironment = useEnvironmentStore(state => state.activeEnvironment);

  useEffect(() => {
    if (!requestId) {
      setVariables([]);
      return;
    }
    let cancelled = false;
    adapterFactory.getAdapter()
      .then(adapter => adapter.getRequestVariables(requestId))
      .then(list => { if (!cancelled) setVariables(list || []); })
      .catch(() => { if (!cancelled) setVariables([]); });
    return () => { cancelled = true; };
  }, [requestId, reloadToken, activeEnvironment?.id, activeEnvironment?.variables]);

  const reload = useCallback(() => setReloadToken(token => token + 1), []);

  return { variables, reload };
}
