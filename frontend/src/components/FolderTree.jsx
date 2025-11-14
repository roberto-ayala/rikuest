import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import ConfirmDialog from './ConfirmDialog';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useFolderStore } from '../stores/folderStore';
import { useRequestStore } from '../stores/requestStore';
import FolderTreeItem from './FolderTreeItem';
import RequestTreeItem from './RequestTreeItem';
import DroppableFolder from './DroppableFolder';

// Root Drop Zone Component
function RootDropZone() {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: 'root-drop-zone' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${
        isOver 
          ? 'h-8 bg-primary/10 border-2 border-dashed border-primary rounded-md flex items-center justify-center' 
          : 'h-1'
      }`}
      {...attributes}
      {...listeners}
    >
      {isOver && (
        <span className="text-xs text-primary font-medium">
          Drop here to move to root level
        </span>
      )}
    </div>
  );
}

function FolderTree({ projectId, currentRequest, onSelectRequest, onRequestMoved, onShowRequestMenu }) {
  const { text, spacing, button, input, icon, iconMd, menuItem, itemSpacing } = useUISize();
  const { t } = useTranslation();
  
  // Load expanded folders from localStorage
  const loadExpandedFolders = () => {
    try {
      const saved = localStorage.getItem(`expandedFolders_project_${projectId}`);
      if (saved) {
        const folderIds = JSON.parse(saved);
        return new Set(folderIds);
      }
    } catch (error) {
      console.warn('Failed to load expanded folders:', error);
    }
    return new Set();
  };
  
  // Save expanded folders to localStorage
  const saveExpandedFolders = (expandedSet) => {
    try {
      const folderIds = Array.from(expandedSet);
      localStorage.setItem(`expandedFolders_project_${projectId}`, JSON.stringify(folderIds));
    } catch (error) {
      console.warn('Failed to save expanded folders:', error);
    }
  };
  
  const [expandedFolders, setExpandedFolders] = useState(() => loadExpandedFolders());
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [newFolderName, setNewFolderName] = useState('');
  const [newRequestName, setNewRequestName] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [activeId, setActiveId] = useState(null);
  
  const { 
    folders, 
    loading: foldersLoading, 
    fetchFolders, 
    createFolder,
    updateFolder,
    deleteFolder,
    moveRequest,
    getFolderTree 
  } = useFolderStore();
  
  const { 
    requests, 
    createRequest,
    getRequestsByFolder 
  } = useRequestStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useEffect(() => {
    if (projectId) {
      console.log('Fetching folders for project:', projectId);
      fetchFolders(projectId);
      // Reload expanded folders when project changes
      setExpandedFolders(loadExpandedFolders());
    }
  }, [projectId, fetchFolders]);
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder({
        project_id: projectId,
        name: newFolderName.trim(),
        parent_id: null
      });
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };
  
  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
    saveExpandedFolders(newExpanded);
  };
  
  const handleShowFolderMenu = (folder, event) => {
    setSelectedFolder(folder);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowFolderMenu(true);
  };
  
  const handleRenameFolder = async () => {
    if (!selectedFolder || !renameFolderName.trim()) return;
    
    try {
      await updateFolder(selectedFolder.id, {
        ...selectedFolder,
        name: renameFolderName.trim()
      });
      
      setShowRenameFolderDialog(false);
      setRenameFolderName('');
      setSelectedFolder(null);
      
      // Refresh folders
      fetchFolders(projectId);
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  };
  
  const handleDeleteFolder = () => {
    if (!selectedFolder) return;
    
    setShowFolderMenu(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!selectedFolder) return;
    
      try {
        await deleteFolder(selectedFolder.id);
        setSelectedFolder(null);
        // Refresh both folders and requests
        if (onRequestMoved) {
          onRequestMoved();
        }
      } catch (error) {
        console.error('Failed to delete folder:', error);
    }
  };
  
  const handleCreateRequestInFolder = async () => {
    if (!newRequestName.trim()) return;
    
    try {
      const newRequest = await createRequest({
        project_id: projectId,
        folder_id: selectedFolder?.id || null,
        name: newRequestName.trim(),
        method: 'GET',
        url: 'https://api.example.com'
      });
      
      setShowNewRequestDialog(false);
      setNewRequestName('');
      
      // Keep the folder expanded if request was created in a folder
      if (selectedFolder) {
        const newExpanded = new Set(expandedFolders);
        newExpanded.add(selectedFolder.id);
        setExpandedFolders(newExpanded);
        saveExpandedFolders(newExpanded);
      }
      
      setSelectedFolder(null);
      
      // Refresh requests and select the new one
      if (onRequestMoved) {
        onRequestMoved();
      }
      if (onSelectRequest) {
        onSelectRequest(newRequest);
      }
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };
  
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const activeType = active.id.toString().startsWith('folder-') ? 'folder' : 'request';
    let overType = 'request'; // default
    
    if (over.id.toString().startsWith('folder-')) {
      overType = 'folder';
    } else if (over.id === 'root-drop-zone') {
      overType = 'root';
    }
    
    // Only allow moving requests, not folders
    if (activeType !== 'request') {
      return;
    }
    
    const activeId_clean = active.id.toString().replace('request-', '');
    const overId_clean = over.id.toString().replace('request-', '').replace('folder-', '');
    
    const activeItem = getItemById(activeId_clean);
    const overItem = overType !== 'root' ? getItemById(overId_clean) : null;
    
    if (!activeItem || activeItem.type !== 'request') return;
    
    let targetFolderId = null;
    
    if (overType === 'folder') {
      // Dropped on a folder - put the request inside the folder
      targetFolderId = overItem?.id || null;
      // Expand the folder to show the moved request
      if (targetFolderId) {
        const newExpanded = new Set(expandedFolders);
        newExpanded.add(targetFolderId);
        setExpandedFolders(newExpanded);
        saveExpandedFolders(newExpanded);
      }
    } else if (overType === 'root') {
      // Dropped on root drop zone - move to root level
      targetFolderId = null;
    } else if (overType === 'request') {
      // Dropped on another request - use the same folder as that request
      targetFolderId = overItem?.folder_id || null;
    }
    
    const position = calculateNewPosition(activeItem.id, overId_clean);
    
    try {
      console.log('Moving request', activeItem.id, 'to folder', targetFolderId, 'at position', position);
      await moveRequest(activeItem.id, targetFolderId, position);
      // Refresh requests to reflect the change
      if (onRequestMoved) {
        onRequestMoved();
      }
    } catch (error) {
      console.error('Failed to move request:', error);
    }
  };
  
  const getItemById = (id) => {
    // Check if it's a request
    const request = requests.find(r => r.id.toString() === id.toString());
    if (request) {
      return { ...request, type: 'request' };
    }
    
    // Check if it's a folder
    const folder = folders.find(f => f.id.toString() === id.toString());
    if (folder) {
      return { ...folder, type: 'folder' };
    }
    
    return null;
  };
  
  const calculateNewPosition = (activeId, overId) => {
    // Simple position calculation - in a real implementation,
    // you would calculate based on drop position
    return Date.now() % 1000;
  };
  
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
  
  const folderTree = getFolderTree();
  const requestsByFolder = getRequestsByFolder();
  
  // Only requests are sortable, folders are drop targets
  const sortableItems = [
    'root-drop-zone', // Special drop zone for root level
    ...requestsByFolder.root.map(request => `request-${request.id}`),
    // Add requests from all folders
    ...Object.values(requestsByFolder.folders).flat().map(request => `request-${request.id}`)
  ];
  
  if (foldersLoading) {
    return (
      <div className="space-y-1">
        {[...Array(3)].map((_, n) => (
          <div key={n} className="animate-pulse">
            <div className="h-10 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {/* New Folder Button */}
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <span className={`${text('sm')} font-medium text-muted-foreground`}>
          Folders & Requests
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            setMenuPosition({ x: e.clientX, y: e.clientY });
            setShowCreateMenu(true);
          }}
          className={`${button} h-6 w-6 p-0`}
          title="Create New"
        >
          <Plus className={icon} />
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {/* Root Drop Zone - invisible but functional */}
            <RootDropZone />
            
            {/* Render folders */}
            {folderTree.map(folder => (
              <DroppableFolder
                key={folder.id}
                folder={folder}
                isExpanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
                onShowMenu={handleShowFolderMenu}
              >
                {/* Render requests in this folder */}
                {requestsByFolder.folders[folder.id] && (
                  <div className="ml-4 space-y-1 mt-1">
                    {/* Drop zone for inserting at the beginning of folder */}
                    <div 
                      className={`h-1 transition-all duration-200 ${
                        activeId && !activeId.toString().includes(`folder-${folder.id}`) 
                          ? 'hover:h-2 hover:bg-primary/20 hover:border-dashed hover:border-primary rounded' 
                          : ''
                      }`}
                    />
                    
                    {requestsByFolder.folders[folder.id].map((request, index) => (
                      <div key={request.id} className="relative">
                        <RequestTreeItem
                          request={request}
                          isSelected={currentRequest?.id === request.id}
                          onSelect={onSelectRequest}
                          getMethodColor={getMethodColor}
                          isBeingDragged={activeId === `request-${request.id}`}
                          onShowMenu={onShowRequestMenu}
                        />
                        
                        {/* Drop zone between requests */}
                        {index < requestsByFolder.folders[folder.id].length - 1 && (
                          <div 
                            className={`h-1 transition-all duration-200 ${
                              activeId && activeId !== `request-${request.id}` 
                                ? 'hover:h-2 hover:bg-primary/20 hover:border-dashed hover:border-primary rounded' 
                                : ''
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </DroppableFolder>
            ))}
            
            {/* Render root level requests */}
            {requestsByFolder.root.map((request, index) => (
              <div key={request.id} className="relative">
                <RequestTreeItem
                  request={request}
                  isSelected={currentRequest?.id === request.id}
                  onSelect={onSelectRequest}
                  getMethodColor={getMethodColor}
                  isBeingDragged={activeId === `request-${request.id}`}
                  onShowMenu={onShowRequestMenu}
                />
                
                {/* Drop zone between root requests */}
                {index < requestsByFolder.root.length - 1 && (
                  <div 
                    className={`h-1 transition-all duration-200 ${
                      activeId && activeId !== `request-${request.id}` 
                        ? 'hover:h-2 hover:bg-primary/20 hover:border-dashed hover:border-primary rounded' 
                        : ''
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId ? (
            <div className="bg-card border border-border rounded shadow-lg p-2">
              {getItemById(activeId)?.type === 'request' ? (
                <div className="flex items-center space-x-2">
                  <FileText className={`${iconMd} text-muted-foreground`} />
                  <span className={`${text('sm')} font-medium`}>
                    {getItemById(activeId)?.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Folder className={`${iconMd} text-primary`} />
                  <span className={`${text('sm')} font-medium`}>
                    {getItemById(activeId)?.name}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`bg-card ${spacing(4)} rounded-lg shadow-lg border border-border w-full max-w-sm`}>
            <h3 className={`${text('base')} font-semibold mb-3`}>Create Folder</h3>
            
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className={`w-full ${input} mb-4`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className={button}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className={button}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Folder Context Menu */}
      {showFolderMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowFolderMenu(false)}>
          <div 
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={() => {
                setShowNewRequestDialog(true);
                setShowFolderMenu(false);
              }}
            >
              <FileText className={iconMd} />
              New Request
            </button>
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center gap-2`}
              onClick={() => {
                setShowRenameFolderDialog(true);
                setRenameFolderName(selectedFolder.name); // Pre-fill with current name
                setShowFolderMenu(false);
              }}
            >
              <Edit3 className={iconMd} />
              Rename
            </button>
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted text-destructive transition-colors flex items-center gap-2`}
              onClick={handleDeleteFolder}
            >
              <Trash2 className={iconMd} />
              Delete
            </button>
          </div>
        </div>
      )}
      
      {/* New Request in Folder Dialog */}
      {showNewRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`bg-card ${spacing(4)} rounded-lg shadow-lg border border-border w-full max-w-sm`}>
            <h3 className={`${text('base')} font-semibold mb-3`}>
              New Request {selectedFolder ? `in ${selectedFolder.name}` : ''}
            </h3>
            
            <Input
              value={newRequestName}
              onChange={(e) => setNewRequestName(e.target.value)}
              placeholder="Request name"
              className={`w-full ${input} mb-4`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateRequestInFolder();
                } else if (e.key === 'Escape') {
                  setShowNewRequestDialog(false);
                  setNewRequestName('');
                  setSelectedFolder(null);
                }
              }}
              autoFocus
            />
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowNewRequestDialog(false);
                  setNewRequestName('');
                  setSelectedFolder(null);
                }}
                className={button}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRequestInFolder}
                disabled={!newRequestName.trim()}
                className={button}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rename Folder Dialog */}
      {showRenameFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className={`bg-card ${spacing(4)} rounded-lg shadow-lg border border-border w-full max-w-sm`}>
            <h3 className={`${text('base')} font-semibold mb-3`}>
              Rename Folder
            </h3>
            
            <Input
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="Folder name"
              className={`w-full ${input} mb-4`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameFolder();
                } else if (e.key === 'Escape') {
                  setShowRenameFolderDialog(false);
                  setRenameFolderName('');
                  setSelectedFolder(null);
                }
              }}
              autoFocus
            />
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowRenameFolderDialog(false);
                  setRenameFolderName('');
                  setSelectedFolder(null);
                }}
                className={button}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRenameFolder}
                disabled={!renameFolderName.trim()}
                className={button}
              >
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Menu */}
      {showCreateMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowCreateMenu(false)}>
          <div 
            className="absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center ${itemSpacing}`}
              onClick={() => {
                setShowCreateMenu(false);
                setShowNewFolderDialog(true);
              }}
            >
              <Folder className={`${iconMd} text-primary`} />
              <span>New Folder</span>
            </button>
            <button
              className={`w-full ${menuItem} text-left hover:bg-muted transition-colors flex items-center ${itemSpacing}`}
              onClick={() => {
                setShowCreateMenu(false);
                setSelectedFolder(null); // Reset folder context for root level request
                setShowNewRequestDialog(true);
              }}
            >
              <FileText className={iconMd} />
              <span>New Request</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Folder Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDeleteFolder}
        title={t('folder.deleteFolder')}
        message={`${t('folder.deleteFolderConfirm')} "${selectedFolder?.name}"? ${t('folder.deleteFolderWarning')}`}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  );
}

export default FolderTree;