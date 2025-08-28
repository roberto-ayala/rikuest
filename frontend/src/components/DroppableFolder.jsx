import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { 
  Folder, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';

function DroppableFolder({ folder, isExpanded, onToggle, onShowMenu, children }) {
  const { text, spacing, button, icon, iconMd, itemSpacing } = useUISize();
  
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `folder-${folder.id}`,
  });

  return (
    <div>
      {/* Folder Header */}
      <div
        ref={setNodeRef}
        className={`group flex items-center ${spacing(2)} rounded cursor-pointer transition-all ${
          isOver 
            ? 'bg-primary/10 border-2 border-dashed border-primary' 
            : 'hover:bg-muted'
        }`}
        onClick={onToggle}
      >
        <Button
          variant="ghost"
          size="sm"
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
          
          <span className={`${text('sm')} font-medium text-foreground truncate ${
            isOver ? 'text-primary' : ''
          }`}>
            {folder.name}
            {isOver && (
              <span className="ml-2 text-xs opacity-75">
                Drop request here
              </span>
            )}
          </span>
        </div>
        
        <Button
          variant="ghost"
          className={`opacity-0 group-hover:opacity-100 ${button} h-6 w-6 p-0`}
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