import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Send, MoreVertical } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useProjectStore } from '../stores/projectStore';
import { useRequestStore } from '../stores/requestStore';
import { useUISize } from '../hooks/useUISize';
import RequestBuilder from '../components/RequestBuilder';

function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = parseInt(id);
  const { text, spacing, button, input, select, sidebar, card } = useUISize();
  
  const { currentProject, fetchProject } = useProjectStore();
  const { requests, loading, currentRequest, fetchRequests, createRequest, deleteRequest, setCurrentRequest } = useRequestStore();
  
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
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
        const newWidth = (constrainedPercentage / 100) * containerWidth;
        
        setSidebarWidth(newWidth);
      } else {
        // Default to 25% if no saved value
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        setSidebarWidth(containerWidth * 0.25);
      }
    }
  }, []);

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
    
    // Calculate percentage constraints (10% to 40%)
    const minWidth = containerWidth * 0.1;
    const maxWidth = containerWidth * 0.4;
    
    // Clamp the width between min and max
    const newWidth = Math.min(Math.max(mouseX, minWidth), maxWidth);
    
    setSidebarWidth(newWidth);
    saveWidthPercentage(newWidth);
  }, [isResizing, saveWidthPercentage]);

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

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'bg-blue-500',
      'POST': 'bg-green-500',
      'PUT': 'bg-orange-500',
      'DELETE': 'bg-red-500',
      'PATCH': 'bg-purple-500',
      'HEAD': 'bg-gray-500',
      'OPTIONS': 'bg-gray-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  const handleSelectRequest = (request) => {
    setCurrentRequest(request);
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

  const handleDuplicateRequest = () => {
    setShowMenu(false);
    // Implement duplicate functionality
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    if (window.confirm('Are you sure you want to delete this request?')) {
      try {
        await deleteRequest(selectedRequest.id);
        setShowMenu(false);
        setSelectedRequest(null);
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    }
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
        {/* Project Header */}
        <div className={`${spacing(4)} border-b border-border`}>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className={button}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`${text('lg')} font-semibold text-foreground truncate`}>
                {currentProject?.name}
              </h1>
              <p className={`${text('sm')} text-muted-foreground truncate`}>
                {currentProject?.description || 'No description'}
              </p>
            </div>
          </div>
          
          <Button onClick={() => setShowRequestDialog(true)} className={`w-full mt-3 ${button}`}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className={`${text('sm')} font-medium text-muted-foreground`}>Requests</span>
              <span className={`${text('xs')} text-muted-foreground`}>{requests.length}</span>
            </div>

            {loading && (
              <div className="space-y-1">
                {[...Array(5)].map((_, n) => (
                  <div key={n} className="animate-pulse">
                    <div className="h-12 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && requests.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className={`${text('sm')} text-muted-foreground`}>No requests yet</p>
                <p className={`${text('xs')} text-muted-foreground`}>Create your first request to get started</p>
              </div>
            )}

            {!loading && requests.length > 0 && (
              <div className="space-y-1">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className={`group flex items-center ${spacing(2)} rounded hover:bg-muted cursor-pointer transition-colors ${
                      currentRequest && currentRequest.id === request.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelectRequest(request)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div
                        className={`px-2 py-1 rounded ${text('xs')} font-medium text-white ${getMethodColor(request.method)}`}
                      >
                        {request.method}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`${text('sm')} font-medium text-foreground truncate`}>
                          {request.name}
                        </div>
                        <div className={`${text('xs')} text-muted-foreground truncate`}>
                          {request.url}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      className={`opacity-0 group-hover:opacity-100 ${button}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowRequestMenu(request, e);
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Select a request</h3>
                <p className="text-sm text-muted-foreground">Choose a request from the sidebar or create a new one</p>
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
                    className={`${select} w-full rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
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
        <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
              onClick={handleDuplicateRequest}
            >
              Duplicate
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive transition-colors"
              onClick={handleDeleteRequest}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Project;