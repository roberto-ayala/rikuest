import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useUISize } from '../hooks/useUISize';

function DroppableFolder({ folder, isExpanded, onToggle, onShowMenu, children, title }) {
  const { text, spacing, icon, iconMd, itemSpacing } = useUISize();
  
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
        className={`group flex items-center ${itemSpacing} ${spacing(1)} rounded cursor-pointer transition-all ${
          isDragging ? 'opacity-50' : ''
        } ${
          isOver
            ? 'bg-primary/10 border-2 border-dashed border-primary'
            : 'hover:bg-muted'
        }`}
        onClick={onToggle}
        onContextMenu={(e) => {
          if (!onShowMenu) return;
          e.preventDefault();
          e.stopPropagation();
          onShowMenu(folder, e);
        }}
      >
        {isExpanded ? (
          <FolderOpen className={`${iconMd} text-primary flex-shrink-0`} />
        ) : (
          <Folder className={`${iconMd} text-primary flex-shrink-0`} />
        )}

        <span
          title={title}
          className={`${text('sm')} font-medium text-foreground truncate flex-1 min-w-0 ${
            isOver ? 'text-primary' : ''
          }`}
        >
          {folder.name}
        </span>

        {/* Trailing state indicator, not a button: the whole row toggles, and
            keeping the left edge clear is what lets a folder icon and a request
            badge share one column per level. */}
        {isExpanded ? (
          <ChevronDown className={`${icon} text-muted-foreground flex-shrink-0`} />
        ) : (
          <ChevronRight className={`${icon} text-muted-foreground flex-shrink-0`} />
        )}
      </div>
      
      {/* Folder Contents */}
      {isExpanded && children}
    </div>
  );
}

export default DroppableFolder;