import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Folder, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';

function FolderTreeItem({ folder, isExpanded, onToggle, onShowMenu }) {
  const { text, spacing, button } = useUISize();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `folder-${folder.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center ${spacing(2)} rounded hover:bg-muted cursor-pointer transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
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
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>
      
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
        )}
        
        <span className={`${text('sm')} font-medium text-foreground truncate`}>
          {folder.name}
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
        <MoreVertical className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default FolderTreeItem;