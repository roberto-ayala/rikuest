import React, { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, History, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useRequestStore } from '../stores/requestStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useAutosave, normalizeRequestData } from '../hooks/useAutosave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getMethodColor, createRow } from '../lib/utils';
import { adapterFactory } from '../adapters/adapterFactory.js';
import RequestTabs from './request-builder/RequestTabs';
import ResponsePanel from './request-builder/ResponsePanel';
import HistoryDrawer from './request-builder/HistoryDrawer';
import DeleteConfirmModal from './request-builder/DeleteConfirmModal';

function RequestBuilder() {
  const { currentRequest, currentResponse, executing, saveRequestOptimistic, executeRequest, setCurrentResponse } = useRequestStore();
  const { text, spacing, button, input, select } = useUISize();
  const { t } = useTranslation();
  const { fetchEnvironments } = useEnvironmentStore();

  // Local state for the request data
  const [requestData, setRequestData] = useState({
    id: null,
    project_id: null,
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    headers_array: [createRow({ key: '', value: '' })], // UI representation of headers
    body: '',
    query_params: [createRow({ key: '', value: '', enabled: true })],
    auth_type: 'none',
    bearer_token: '',
    basic_auth: { username: '', password: '' },
    body_type: 'none',
    form_data: []
  });

  const [activeResponseTab, setActiveResponseTab] = useState('body');
  const [history, setHistory] = useState([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { historyId, historyItem }

  // Panel resizing with percentage-based persistence
  const {
    size: leftPanelWidth,
    isResizing,
    startResize,
    containerRef
  } = useResizablePanel({
    storageKey: 'requestBuilder-leftPanelPercentage',
    initialSize: 500,
    defaultPercent: 40,
    minPercent: 30,
    maxPercent: 80
  });

  // Debounced autosave (500ms) with initialization guard and save status
  const { isInitializing, lastSavedData, status: saveStatus, retrySave, flushNow } = useAutosave(requestData, saveRequestOptimistic);

  // Initialize request data when currentRequest changes
  useEffect(() => {
    if (currentRequest) {
      isInitializing.current = true;

      // Convert headers object to array for UI
      const headersObj = currentRequest.headers || {};
      const headersArray = Object.keys(headersObj).length > 0
        ? Object.entries(headersObj).map(([key, value]) => createRow({ key, value }))
        : [createRow({ key: '', value: '' })];
      // Always ensure at least one empty row
      if (headersArray.every(h => h.key.trim() || h.value.trim())) {
        headersArray.push(createRow({ key: '', value: '' }));
      }

      const newRequestData = {
        id: currentRequest.id,
        project_id: currentRequest.project_id,
        folder_id: currentRequest.folder_id || null,
        name: currentRequest.name || '',
        method: currentRequest.method || 'GET',
        url: currentRequest.url || '',
        headers: { ...(currentRequest.headers || {}) },
        headers_array: headersArray,
        body: currentRequest.body || '',
        query_params: currentRequest.query_params && currentRequest.query_params.length > 0
          ? currentRequest.query_params.map(p => createRow({ ...p }))
          : [createRow({ key: '', value: '', enabled: true })],
        auth_type: currentRequest.auth_type || 'none',
        bearer_token: currentRequest.bearer_token || '',
        basic_auth: { ...(currentRequest.basic_auth || { username: '', password: '' }) },
        body_type: currentRequest.body_type || 'none',
        form_data: currentRequest.form_data ? currentRequest.form_data.map(item => createRow({ ...item })) : []
      };

      setRequestData(newRequestData);

      // Set normalized data for comparison - only meaningful content
      lastSavedData.current = normalizeRequestData(newRequestData);

      // Reset initialization flag after a brief delay
      setTimeout(() => {
        isInitializing.current = false;
      }, 100);
    }
  }, [currentRequest, isInitializing, lastSavedData]);

  const updateRequestData = (updates) => {
    setRequestData(prev => ({ ...prev, ...updates }));
  };

  // Execute request
  const handleExecuteRequest = async () => {
    if (!requestData.id) return;

    try {
      await executeRequest(requestData.id);
      loadHistory();
      // Refresh active environment to reflect any response captures
      if (currentRequest?.project_id) {
        fetchEnvironments(currentRequest.project_id);
      }
    } catch (error) {
      console.error('Failed to execute request:', error);
    }
  };

  // Load history
  const loadHistory = useCallback(async () => {
    if (!requestData.id) return;

    try {
      const adapter = await adapterFactory.getAdapter();
      const history = await adapter.getRequestHistory(requestData.id);
      setHistory(history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, [requestData.id]);

  // Load history automatically when request changes
  useEffect(() => {
    if (requestData.id) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [requestData.id, loadHistory]);

  // Handle history item selection
  const handleHistoryItemSelect = async (historyItem) => {
    setLoadingHistoryItem(true);

    // Close drawer immediately to show loader
    setIsHistoryDrawerOpen(false);

    // Switch to response view
    setActiveResponseTab('body');

    try {
      // Small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 300));

      // The history item contains a "response" object with the actual response data
      const response = {
        ...historyItem.response,
        executed_at: historyItem.executed_at // Add the execution timestamp
      };

      // Update the current response with the history item's response
      setCurrentResponse(response);
    } finally {
      setLoadingHistoryItem(false);
    }
  };

  // Handle history item deletion
  const handleDeleteHistoryItem = async (historyId, historyItem) => {
    setDeleteConfirmation({ historyId, historyItem });
  };

  const confirmDeleteHistoryItem = async () => {
    if (!deleteConfirmation) return;

    try {
      const adapter = await adapterFactory.getAdapter();
      await adapter.deleteRequestHistoryItem(requestData.id, deleteConfirmation.historyId);

      // Reload history
      await loadHistory();

      // Clear current response if it matches the deleted item
      if (currentResponse && currentResponse.executed_at === deleteConfirmation.historyItem.executed_at) {
        setCurrentResponse(null);
      }
    } catch (error) {
      console.error('Failed to delete history item:', error);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const cancelDeleteHistoryItem = () => {
    setDeleteConfirmation(null);
  };

  // Cmd/Ctrl+Enter sends the current request; Cmd/Ctrl+S force-flushes the
  // pending autosave. Both work even while focus is inside an input/textarea.
  useKeyboardShortcuts([
    {
      key: 'Enter',
      mod: true,
      allowInInputs: true,
      handler: () => {
        if (requestData.id && requestData.url?.trim() && !executing) {
          handleExecuteRequest();
        }
      }
    },
    {
      key: 's',
      mod: true,
      allowInInputs: true,
      handler: () => flushNow()
    }
  ], [requestData.id, requestData.url, executing, flushNow]);

  if (!currentRequest) {
    return <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">{t('request.noSelected')}</p>
    </div>;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Request Header */}
      <div className={`border-b border-border bg-background ${spacing(4)}`}>
        <div className="flex items-center space-x-3 mb-3">
          <select
            value={requestData.method}
            onChange={(e) => updateRequestData({ method: e.target.value })}
            className={`${select} font-medium min-w-[90px] ${getMethodColor(requestData.method)}`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>

          <Input
            value={requestData.url}
            onChange={(e) => updateRequestData({ url: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && requestData.url?.trim() && !executing) handleExecuteRequest(); }}
            placeholder={t('request.urlPlaceholder')}
            className={`flex-1 ${input} not-box-shadow`}
          />

          <Button
            onClick={handleExecuteRequest}
            disabled={!requestData.url?.trim() || executing}
            className={`min-w-[100px] ${button}`}
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('request.sending')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('request.send')}
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between flex-1">
          <Input
            value={requestData.name}
            onChange={(e) => updateRequestData({ name: e.target.value })}
            placeholder={t('request.requestNamePlaceholder')}
            className={`${text('lg')} font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 shadow-none flex-1 mr-3`}
          />

          {/* Autosave status indicator */}
          {saveStatus === 'saving' && (
            <span className={`flex items-center text-muted-foreground ${text('xs')} mr-2 flex-shrink-0`}>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {t('request.saving')}
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className={`flex items-center text-green-500 ${text('xs')} mr-2 flex-shrink-0`}>
              <Check className="h-3 w-3 mr-1" />
              {t('request.saved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <button
              onClick={retrySave}
              className={`flex items-center text-red-500 hover:text-red-400 ${text('xs')} mr-2 flex-shrink-0`}
              title={t('request.retrySave')}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              {t('request.saveFailed')}
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
            title={t('request.historyTitle')}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden w-full min-h-0 relative"
      >
        {/* Request Configuration Panel */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: leftPanelWidth + 'px' }}
        >
          <RequestTabs
            requestData={requestData}
            updateRequestData={updateRequestData}
            setRequestData={setRequestData}
            panelWidth={leftPanelWidth}
          />
        </div>

        {/* Resizable Divider */}
        <div
          className={`w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group ${
            isResizing ? 'bg-primary' : ''
          }`}
          onMouseDown={startResize}
        >
          <div className="absolute inset-0 w-3 -translate-x-1 z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-muted-foreground/30 rounded-full group-hover:bg-primary/70 transition-colors" />
        </div>

        {/* Response Area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <ResponsePanel
            currentResponse={currentResponse}
            executing={executing}
            loadingHistoryItem={loadingHistoryItem}
            activeResponseTab={activeResponseTab}
            setActiveResponseTab={setActiveResponseTab}
          />
        </div>
      </div>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        onSelectItem={handleHistoryItemSelect}
        onDeleteItem={handleDeleteHistoryItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        deleteConfirmation={deleteConfirmation}
        onConfirm={confirmDeleteHistoryItem}
        onCancel={cancelDeleteHistoryItem}
      />
    </div>
  );
}

export default RequestBuilder;
