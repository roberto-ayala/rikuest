import { useRef, useState, useCallback, useEffect } from 'react';

// Removes the client-side row id used for stable React list keys so it never
// reaches the server payload or the change-detection comparison.
const stripRowId = (row) => {
  const copy = { ...row };
  delete copy._id;
  return copy;
};

// Builds the normalized JSON string used to detect meaningful changes.
// Only rows with real content are compared, and the derived `headers` object
// is excluded to avoid conflicts with `headers_array`.
export function normalizeRequestData(requestData) {
  const normalizedData = {
    ...requestData,
    // Only compare meaningful headers - both key AND value must have content
    headers_array: requestData.headers_array
      .filter(h => (h.key && h.key.trim()) && (h.value && h.value.trim()))
      .map(stripRowId),
    query_params: requestData.query_params
      .filter(p => (p.key && p.key.trim()) || (p.value && p.value.trim()))
      .map(stripRowId),
    form_data: requestData.form_data
      .filter(item => (item.key && item.key.trim()) || (item.value && item.value.trim()))
      .map(stripRowId)
  };

  // Remove headers object from comparison to avoid conflicts
  delete normalizedData.headers;

  return JSON.stringify(normalizedData);
}

// How long the transient 'saved' status stays visible before returning to 'idle'.
const SAVED_STATUS_RESET_MS = 2000;

// Debounced autosave for the request builder. Saves via the optimistic store
// action 500ms after the last meaningful change. Returns the refs used to
// coordinate with the initialization effect in the consuming component, plus
// a save status ('idle' | 'saving' | 'saved' | 'error') and a retry function.
export function useAutosave(requestData, saveRequestOptimistic) {
  const saveTimeout = useRef(null);
  const savedStatusTimeout = useRef(null);
  const isInitializing = useRef(false);
  const lastSavedData = useRef(null);
  const [status, setStatus] = useState('idle');

  // Performs the actual save immediately (no debounce). Shared by the
  // debounced timer and the force-flush path (e.g. Cmd/Ctrl+S).
  const performSave = useCallback(async () => {
    if (!requestData.id || isInitializing.current) return;

    const currentDataString = normalizeRequestData(requestData);
    if (lastSavedData.current === currentDataString) return;

    if (savedStatusTimeout.current) clearTimeout(savedStatusTimeout.current);
    setStatus('saving');
    try {
      // Sync headers object from headers_array before saving
      const filteredHeaders = {};
      requestData.headers_array.forEach(h => {
        if (h.key && h.key.trim() && h.value && h.value.trim()) {
          filteredHeaders[h.key.trim()] = h.value.trim();
        }
      });

      const filteredQueryParams = requestData.query_params
        .filter(p => (p.key && p.key.trim()) || (p.value && p.value.trim()))
        .map(stripRowId);
      // Always ensure at least one empty param exists for UI, but don't save it
      if (filteredQueryParams.length === 0) {
        filteredQueryParams.push({ key: '', value: '', enabled: true });
      }

      const filteredFormData = requestData.form_data
        .filter(item => (item.key && item.key.trim()) || (item.value && item.value.trim()))
        .map(stripRowId);

      const requestToSave = {
        ...requestData,
        headers: filteredHeaders,
        headers_array: requestData.headers_array.map(stripRowId),
        query_params: filteredQueryParams,
        form_data: filteredFormData
      };

      // Optimistic update - save to server and update background data
      await saveRequestOptimistic(requestData.id, requestToSave);

      // Update the comparison data to prevent unnecessary saves
      lastSavedData.current = currentDataString;

      setStatus('saved');
      savedStatusTimeout.current = setTimeout(() => setStatus('idle'), SAVED_STATUS_RESET_MS);
    } catch (error) {
      // The store action already surfaces an error toast centrally
      // (createAsyncAction), so here we only track the status.
      console.error('Failed to save request:', error);
      setStatus('error');
    }
  }, [requestData, saveRequestOptimistic]);

  const saveRequest = useCallback(() => {
    if (!requestData.id || isInitializing.current) return;

    const currentDataString = normalizeRequestData(requestData);
    if (lastSavedData.current === currentDataString) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      performSave();
    }, 500); // Reduced debounce since UI is now optimistic
  }, [requestData, performSave]);

  // Re-runs the debounced save immediately; used by the "Save failed" retry.
  const retrySave = useCallback(() => {
    setStatus('idle');
    saveRequest();
  }, [saveRequest]);

  // Cancels any pending debounced save and saves right away; used by the
  // Cmd/Ctrl+S keyboard shortcut so the user gets an immediate save.
  const flushNow = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    performSave();
  }, [performSave]);

  // Clear the transient status timer on unmount. The pending save timer is
  // intentionally left alone so an in-flight debounced save still completes.
  useEffect(() => {
    return () => {
      if (savedStatusTimeout.current) clearTimeout(savedStatusTimeout.current);
    };
  }, []);

  // Auto-save when requestData changes (optimistic UI - no re-renders after save)
  useEffect(() => {
    if (requestData.id && !isInitializing.current) {
      saveRequest();
    }
  }, [requestData, saveRequest]);

  return { isInitializing, lastSavedData, status, retrySave, flushNow };
}
