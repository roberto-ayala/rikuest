import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Send, Copy, Trash2, Zap, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ConfirmDialog from '../components/ConfirmDialog';
import { useProjectStore } from '../stores/projectStore';
import { useRequestStore } from '../stores/requestStore';
import { useFolderStore } from '../stores/folderStore';
import { useUIStore } from '../stores/uiStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import ThemeSelector from '../components/ThemeSelector';
import RequestBuilder from '../components/RequestBuilder';
import FolderTree from '../components/FolderTree';
import CopyFormatModal from '../components/CopyFormatModal.jsx';

function Project({ layout, onNewProject, onSettings }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = parseInt(id);
  const uiLayout = useUIStore(state => state.layout);
  const currentLayout = layout || uiLayout;
  const { text, spacing, button, input, select, sidebar, card, icon, iconButton, iconMd, sidebarMinWidth, menuItem } = useUISize();
  const { t } = useTranslation();
  
  const { currentProject, fetchProject } = useProjectStore();
  const { requests, loading, currentRequest, fetchRequests, createRequest, deleteRequest, setCurrentRequest } = useRequestStore();
  const { fetchFolders } = useFolderStore();
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [copyModal, setCopyModal] = useState({ isOpen: false, format: '', content: '' });
  const [newRequest, setNewRequest] = useState({
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    body: ''
  });

  // Panel resizing with percentage-based persistence
  const [sidebarWidth, setSidebarWidth] = useState(320); // Initial pixel value
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = React.useRef(null);

  // Save sidebar width percentage to localStorage
  const saveWidthPercentage = React.useCallback((width) => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const percentage = (width / containerWidth) * 100;
      localStorage.setItem('project-sidebarPercentage', percentage.toString());
    }
  }, []);

  // Load and apply saved percentage
  const loadSavedWidth = React.useCallback(() => {
    if (containerRef.current) {
      const savedPercentage = localStorage.getItem('project-sidebarPercentage');
      if (savedPercentage) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const percentage = parseFloat(savedPercentage);
        
        // Apply constraints (10% to 40%)
        const constrainedPercentage = Math.min(Math.max(percentage, 10), 40);
        const calculatedWidth = (constrainedPercentage / 100) * containerWidth;
        
        // Ensure minimum width is respected
        const minWidth = Math.max(sidebarMinWidth, containerWidth * 0.1);
        const newWidth = Math.max(calculatedWidth, minWidth);
        
        setSidebarWidth(newWidth);
      } else {
        // Default to 25% if no saved value, but respect minimum width
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const defaultWidth = containerWidth * 0.25;
        const minWidth = Math.max(sidebarMinWidth, containerWidth * 0.1);
        setSidebarWidth(Math.max(defaultWidth, minWidth));
      }
    }
  }, [sidebarMinWidth]);

  // Handle resizing
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    // Calculate minimum width: max between sidebarMinWidth and 10% of container
    const percentageMinWidth = containerWidth * 0.1;
    const minWidth = Math.max(sidebarMinWidth, percentageMinWidth);
    const maxWidth = containerWidth * 0.4;
    
    // Clamp the width between min and max
    const newWidth = Math.min(Math.max(mouseX, minWidth), maxWidth);
    
    setSidebarWidth(newWidth);
    saveWidthPercentage(newWidth);
  }, [isResizing, saveWidthPercentage, sidebarMinWidth]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Initialize sidebar width responsively and load saved width
  React.useEffect(() => {
    const handleResize = () => {
      loadSavedWidth();
    };

    // Load saved width on mount
    loadSavedWidth();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadSavedWidth]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchRequests(projectId);
      // Clear current request when switching projects
      setCurrentRequest(null);
    }
  }, [projectId, fetchProject, fetchRequests, setCurrentRequest]);

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
        body_type: selectedRequest.body_type || 'none',
        body: selectedRequest.body || '',
        form_data: selectedRequest.form_data || [],
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
        // If deleting the current request, clear it
        if (currentRequest && currentRequest.id === selectedRequest.id) {
          setCurrentRequest(null);
        }
        
        await deleteRequest(selectedRequest.id);
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
    
    console.log('✅ Opening copy request modal');
  };

  const handleCloseMenus = () => {
    setShowMenu(false);
    setSelectedRequest(null);
  };

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
                title="New Project"
              >
                <Plus className={icon} />
              </Button>
              <ThemeSelector />
              <Button 
                variant="ghost"
                onClick={onSettings}
                className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
                title="Settings"
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
                {currentProject?.description || 'No description'}
              </p>
            </div>
          </div>
          
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
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-0 w-3 -translate-x-1 z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-muted-foreground/30 rounded-full group-hover:bg-primary/70 transition-colors" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
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
                    <h3 className={`${text('lg')} font-medium text-foreground`}>No requests yet</h3>
                    <p className={`${text('sm')} text-muted-foreground`}>Create your first request to get started</p>
                  </>
                ) : (
                  <>
                    <h3 className={`${text('lg')} font-medium text-foreground`}>Select a request</h3>
                    <p className={`${text('sm')} text-muted-foreground`}>Choose a request from the sidebar or create a new one</p>
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
            <h2 className={`${text('lg')} font-semibold mb-4`}>Create New Request</h2>
            
            <div className="space-y-4">
              <div>
                <label className={`${text('sm')} font-medium mb-2 block`}>Request Name</label>
                <Input
                  value={newRequest.name}
                  onChange={(e) => setNewRequest({...newRequest, name: e.target.value})}
                  placeholder="Enter request name"
                  className={`w-full ${input}`}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`${text('sm')} font-medium mb-2 block`}>Method</label>
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
                  <label className={`${text('sm')} font-medium mb-2 block`}>URL</label>
                  <Input
                    value={newRequest.url}
                    onChange={(e) => setNewRequest({...newRequest, url: e.target.value})}
                    placeholder="https://api.example.com/endpoint"
                    className={`w-full ${input}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="ghost" onClick={handleCancelCreateRequest} className={button}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={!newRequest.name.trim()} className={button}>
                Create Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50" onClick={handleCloseMenus}>
          <div 
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={handleDuplicateRequest}
            >
              <Copy className={iconMd} />
              Duplicate
            </button>
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={handleCopyRequest}
            >
              <Copy className={iconMd} />
              Copy Request
            </button>
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted text-destructive transition-colors flex items-center gap-2`}
              onClick={handleDeleteRequest}
            >
              <Trash2 className={iconMd} />
              Delete
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
    </div>
  );
}

export default Project;