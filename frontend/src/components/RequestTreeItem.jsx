import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, MoreVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';

function RequestTreeItem({ request, isSelected, onSelect, getMethodColor, isBeingDragged, onShowMenu }) {
  const { text, spacing, button, icon, iconButton, methodBadge, itemSpacing } = useUISize();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `request-${request.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center ${spacing(1)} rounded hover:bg-muted cursor-pointer transition-all ${
        isSelected ? 'bg-muted' : ''
      } ${isDragging || isBeingDragged ? 'opacity-50 scale-105 shadow-lg bg-primary/5 border border-primary/20' : ''}`}
      onClick={() => onSelect(request)}
      {...attributes}
      {...listeners}
    >
      <div className={`flex items-center ${itemSpacing} flex-1 min-w-0`}>
        <div
          className={`${methodBadge} rounded ${text('xs')} font-medium text-white ${getMethodColor(request.method)}`}
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
      
      {onShowMenu && (
        <Button
          variant="ghost"
          className={`opacity-0 group-hover:opacity-100 ${iconButton}`}
          onClick={(e) => {
            e.stopPropagation();
            onShowMenu(request, e);
          }}
        >
          <MoreVertical className={icon} />
        </Button>
      )}
    </div>
  );
}

export default RequestTreeItem;