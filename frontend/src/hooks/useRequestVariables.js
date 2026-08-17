import { useEffect, useState } from 'react';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { useEnvironmentStore } from '../stores/environmentStore';

/**
 * Loads the variables visible to a request (active environment + folder
 * ancestry, resolved with the same precedence the backend uses when executing).
 *
 * Feeds the {{name}} highlighting and autocomplete in the request builder.
 * Reloads whenever a layer it depends on changes — the active environment (a
 * response capture creating or rewriting a value, an edit in the environment
 * editor) or a folder's variables — so a variable becomes known everywhere the
 * moment it exists, without a reload.
 *
 * @param {number|null} requestId
 * @returns {{ variables: Array<{key: string, value: string, source: string, source_name: string}> }}
 */
export function useRequestVariables(requestId) {
  const [variables, setVariables] = useState([]);
  const activeEnvironment = useEnvironmentStore(state => state.activeEnvironment);
  const folderVariables = useEnvironmentStore(state => state.folderVariables);

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
  }, [requestId, activeEnvironment?.id, activeEnvironment?.variables, folderVariables]);

  return { variables };
}
