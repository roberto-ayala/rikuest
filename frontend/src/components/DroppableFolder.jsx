import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { 
  Folder, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';

function DroppableFolder({ folder, isExpanded, onToggle, onShowMenu, children, title }) {
  const { text, spacing, button, icon, iconMd, itemSpacing } = useUISize();
  
  // The folder is both a drop target (accepts requests + other folders) and a
  // drag source (can be re-parented). Both hooks share the same id; their refs
  // are merged onto the header row, which doubles as the drag handle.
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
  });
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
  });
  const setNodeRef = (node) => {
    setDroppableRef(node);
    setDraggableRef(node);
  };

  return (
    <div>
      {/* Folder Header (drag handle) */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`group flex items-center ${spacing(2)} rounded cursor-pointer transition-all ${
          isDragging ? 'opacity-50' : ''
        } ${
          isOver
            ? 'bg-primary/10 border-2 border-dashed border-primary'
            : 'hover:bg-muted'
        }`}
        onClick={onToggle}
      >
        <Button
          variant="ghost"
          size="sm"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`${button} h-6 w-6 p-0 hover:bg-muted/50`}
        >
          {isExpanded ? (
            <ChevronDown className={icon} />
          ) : (
            <ChevronRight className={icon} />
          )}
        </Button>
        
        <div className={`flex items-center ${itemSpacing} flex-1 min-w-0`}>
          {isExpanded ? (
            <FolderOpen className={`${iconMd} text-primary flex-shrink-0`} />
          ) : (
            <Folder className={`${iconMd} text-primary flex-shrink-0`} />
          )}
          
          <span
            title={title}
            className={`${text('sm')} font-medium text-foreground truncate ${
              isOver ? 'text-primary' : ''
            }`}
          >
            {folder.name}
          </span>
        </div>
        
        <Button
          variant="ghost"
          className={`opacity-0 group-hover:opacity-100 ${button} h-6 w-6 p-0`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (onShowMenu) {
              onShowMenu(folder, e);
            }
          }}
        >
          <MoreVertical className={icon} />
        </Button>
      </div>
      
      {/* Folder Contents */}
      {isExpanded && children}
    </div>
  );
}

export default DroppableFolder;