import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Send, Copy, Trash2, Zap, Settings, Upload, Layers, Terminal } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ConfirmDialog from '../components/ConfirmDialog';
import { useProjectStore } from '../stores/projectStore';
import { useRequestStore } from '../stores/requestStore';
import { useFolderStore } from '../stores/folderStore';
import { useUIStore } from '../stores/uiStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { addToast } from '../stores/toastStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { handleMenuKeyDown } from '../lib/utils';
import ThemeSelector from '../components/ThemeSelector';
import RequestBuilder from '../components/RequestBuilder';
import TabBar from '../components/TabBar';
import FolderTree from '../components/FolderTree';
import CopyFormatModal from '../components/CopyFormatModal.jsx';
import OpenAPIImportModal from '../components/OpenAPIImportModal';
import ImportCurlModal from '../components/ImportCurlModal';
import EnvironmentManager from '../components/EnvironmentManager';
import ShortcutsHelp from '../components/ShortcutsHelp';

function Project({ layout, onNewProject, onSettings }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = parseInt(id);
  const uiLayout = useUIStore(state => state.layout);
  const currentLayout = layout || uiLayout;
  const { text, spacing, button, input, select, sidebar, card, icon, iconButton, iconMd, sidebarMinWidth, menuItem } = useUISize();
  const { t } = useTranslation();
  
  const { currentProject, fetchProject } = useProjectStore();
  const { requests, loading, currentRequest, fetchRequests, createRequest, deleteRequest, setCurrentRequest, loadTabsForProject } = useRequestStore();
  const { fetchFolders } = useFolderStore();
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [copyModal, setCopyModal] = useState({ isOpen: false, format: '', content: '' });
  const [showOpenAPIModal, setShowOpenAPIModal] = useState(false);
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { activeEnvironment } = useEnvironmentStore();
  const [newRequest, setNewRequest] = useState({
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    body: ''
  });

  // Panel resizing with percentage-based persistence
  const {
    size: sidebarWidth,
    isResizing,
    startResize,
    containerRef
  } = useResizablePanel({
    storageKey: 'project-sidebarPercentage',
    initialSize: 320,
    defaultPercent: 25,
    minPercent: 10,
    maxPercent: 40,
    minPx: sidebarMinWidth
  });

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      // Tabs from a previous project must not leak into this one: load tabs
      // only after requests for the new project have resolved, then restore
      // (and filter) whatever was persisted for this project.
      fetchRequests(projectId).then(() => {
        loadTabsForProject(projectId);
      });
    }
  }, [projectId, fetchProject, fetchRequests, loadTabsForProject]);

  const handleSelectRequest = (request) => {
    setCurrentRequest(request);
  };
  
  const handleRequestMoved = () => {
    // Refresh requests after a move operation
    fetchRequests(projectId);
    fetchFolders(projectId);
  };

  const handleCreateRequest = async () => {
    if (!newRequest.name.trim()) return;
    
    // Set default URL if empty
    if (!newRequest.url.trim()) {
      newRequest.url = 'https://api.example.com';
    }
    
    try {
      const request = await createRequest({
        ...newRequest,
        project_id: projectId
      });
      setShowRequestDialog(false);
      setNewRequest({ name: '', method: 'GET', url: '', headers: {}, body: '' });
      handleSelectRequest(request);
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleCancelCreateRequest = () => {
    setShowRequestDialog(false);
    setNewRequest({ name: '', method: 'GET', url: '', headers: {}, body: '' });
  };

  const handleShowRequestMenu = (request, event) => {
    setSelectedRequest(request);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleDuplicateRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const duplicatedRequest = {
        project_id: selectedRequest.project_id,
        folder_id: selectedRequest.folder_id,
        name: `${selectedRequest.name} (Copy)`,
        method: selectedRequest.method,
        url: selectedRequest.url,
        headers: selectedRequest.headers,
        query_params: selectedRequest.query_params || [],
        auth_type: selectedRequest.auth_type || 'none',
        bearer_token: selectedRequest.bearer_token || '',
        basic_auth: selectedRequest.basic_auth || { username: '', password: '' },
        api_key_name: selectedRequest.api_key_name || '',
        api_key_value: selectedRequest.api_key_value || '',
        api_key_location: selectedRequest.api_key_location || 'header',
        body_type: selectedRequest.body_type || 'none',
        body: selectedRequest.body || '',
        form_data: selectedRequest.form_data || [],
        insecure_skip_verify: selectedRequest.insecure_skip_verify || false,
        follow_redirects: selectedRequest.follow_redirects !== undefined ? selectedRequest.follow_redirects : true,
        max_redirects: selectedRequest.max_redirects !== undefined ? selectedRequest.max_redirects : 10,
        timeout_seconds: selectedRequest.timeout_seconds || 0,
        position: selectedRequest.position + 1
      };
      
      const newRequest = await createRequest(duplicatedRequest);
      setCurrentRequest(newRequest);
      setShowMenu(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to duplicate request:', error);
    }
  };

  const handleDeleteRequest = () => {
    if (!selectedRequest) return;
    
    setShowMenu(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!selectedRequest) return;
    
      try {
        // deleteRequest itself removes the request from any open tab and
        // picks the next active tab if it was the active one - no need to
        // pre-clear currentRequest here (doing so would blow away the tab
        // selection before deleteRequest can hand off to a neighboring tab).
        await deleteRequest(selectedRequest.id);
        addToast('success', t('request.deleted'));
        setSelectedRequest(null);
      } catch (error) {
        console.error('Failed to delete request:', error);
    }
  };

  const handleCopyRequest = () => {
    if (!selectedRequest) return;
    
    // Show modal directly
    setCopyModal({
      isOpen: true,
      requestId: selectedRequest.id
    });
    
    // Close menus
    setShowMenu(false);
    setSelectedRequest(null);
  };

  const handleCloseMenus = () => {
    setShowMenu(false);
    setSelectedRequest(null);
  };

  // Cmd/Ctrl+/ opens the shortcuts help modal from anywhere in the project view.
  useKeyboardShortcuts([
    { key: '/', mod: true, handler: () => setShowShortcutsHelp(true) }
  ]);

  return (
    <div 
      ref={containerRef}
      className="flex h-full w-full overflow-hidden relative"
    >
      {/* Sidebar */}
      <div 
        className="flex-shrink-0 bg-background flex flex-col"
        style={{ width: sidebarWidth + 'px' }}
      >
        {currentLayout === 'compact' && (
          /* Compact Header - Same width as sidebar */
          <div className={`${spacing(4)} border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50`}>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className={iconButton}
              >
                <ArrowLeft className={icon} />
              </Button>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`font-semibold ${text('base')} truncate`}>Rikuest</h1>
              </div>
              <Button 
                onClick={onNewProject}
                variant="ghost"
                className={iconButton}
                title={t('navigation.newProject')}
              >
                <Plus className={icon} />
              </Button>
              <ThemeSelector />
              <Button 
                variant="ghost"
                onClick={onSettings}
                className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
                title={t('common.settings')}
              >
                <Settings className={icon} />
              </Button>
            </div>
          </div>
        )}
        
        {/* Project Header */}
        <div className={`${spacing(4)} border-b border-border`}>
          <div className="flex items-center space-x-3">
            {currentLayout === 'default' && (
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className={button}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className={`${text('lg')} font-semibold text-foreground truncate`}>
                {currentProject?.name}
              </h1>
              <p className={`${text('sm')} text-muted-foreground truncate`}>
                {currentProject?.description || t('project.noDescription')}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOpenAPIModal(true);
              }}
              className={iconButton}
              title={t('openapi.title')}
            >
              <Upload className={icon} />
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCurlImportModal(true);
              }}
              className={iconButton}
              title={t('curlImport.triggerTitle')}
            >
              <Terminal className={icon} />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEnvManager(true)}
              className={`${iconButton} ${activeEnvironment ? 'text-green-600 dark:text-green-400 border-green-500/40' : ''}`}
              title={t('environment.title')}
            >
              <Layers className={icon} />
            </Button>
          </div>
          {activeEnvironment && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {activeEnvironment.name}
              </span>
            </div>
          )}
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <FolderTree 
              projectId={projectId}
              currentRequest={currentRequest}
              onSelectRequest={handleSelectRequest}
              onRequestMoved={handleRequestMoved}
              onShowRequestMenu={handleShowRequestMenu}
            />
          </div>
        </div>
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

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TabBar />
        {currentRequest ? (
          <RequestBuilder />
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                {!loading && requests.length === 0 ? (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Send className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                {!loading && requests.length === 0 ? (
                  <>
                    <h3 className={`${text('lg')} font-medium text-foreground`}>{t('request.noRequests')}</h3>
                    <p className={`${text('sm')} text-muted-foreground`}>{t('project.noRequestsCreate')}</p>
                  </>
                ) : (
                  <>
                    <h3 className={`${text('lg')} font-medium text-foreground`}>{t('project.selectRequest')}</h3>
                    <p className={`${text('sm')} text-muted-foreground`}>{t('project.selectRequestDesc')}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Request Dialog */}
      {showRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`bg-card ${spacing(6)} rounded-lg shadow-lg border border-border w-full max-w-lg`}>
            <h2 className={`${text('lg')} font-semibold mb-4`}>{t('request.create')}</h2>

            <div className="space-y-4">
              <div>
                <label className={`${text('sm')} font-medium mb-2 block`}>{t('request.requestName')}</label>
                <Input
                  value={newRequest.name}
                  onChange={(e) => setNewRequest({...newRequest, name: e.target.value})}
                  placeholder={t('request.requestNamePlaceholder')}
                  className={`w-full ${input}`}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`${text('sm')} font-medium mb-2 block`}>{t('common.method')}</label>
                  <select
                    value={newRequest.method}
                    onChange={(e) => setNewRequest({...newRequest, method: e.target.value})}
                    className={`${select} w-full shadow-sm`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={`${text('sm')} font-medium mb-2 block`}>{t('common.url')}</label>
                  <Input
                    value={newRequest.url}
                    onChange={(e) => setNewRequest({...newRequest, url: e.target.value})}
                    placeholder={t('request.requestUrlPlaceholder')}
                    className={`w-full ${input}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="ghost" onClick={handleCancelCreateRequest} className={button}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateRequest} disabled={!newRequest.name.trim()} className={button}>
                {t('request.createRequest')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50" onClick={handleCloseMenus}>
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => handleMenuKeyDown(e, handleCloseMenus)}
          >
            <button
              role="menuitem"
              autoFocus
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={handleDuplicateRequest}
            >
              <Copy className={iconMd} />
              {t('project.duplicate')}
            </button>
            <button
              role="menuitem"
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={handleCopyRequest}
            >
              <Copy className={iconMd} />
              {t('request.copyRequest')}
            </button>
            <button
              role="menuitem"
              className={`w-full ${menuItem} text-left hover:bg-muted text-destructive transition-colors flex items-center gap-2`}
              onClick={handleDeleteRequest}
            >
              <Trash2 className={iconMd} />
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      {/* Copy Format Modal */}
      <CopyFormatModal
        isOpen={copyModal.isOpen}
        onClose={() => setCopyModal({ isOpen: false, requestId: null })}
        requestId={copyModal.requestId}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDeleteRequest}
        title={t('request.deleteRequest')}
        message={`${t('request.deleteRequestConfirm')} "${selectedRequest?.name}"?`}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* OpenAPI Import Modal */}
      <OpenAPIImportModal
        isOpen={showOpenAPIModal}
        onClose={() => setShowOpenAPIModal(false)}
        projectId={projectId}
      />

      {/* cURL Import Modal */}
      <ImportCurlModal
        isOpen={showCurlImportModal}
        onClose={() => setShowCurlImportModal(false)}
        projectId={projectId}
      />

      {/* Environment Manager */}
      <EnvironmentManager
        projectId={projectId}
        isOpen={showEnvManager}
        onClose={() => setShowEnvManager(false)}
      />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}

export default Project;