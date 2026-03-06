import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';

function RequestTreeItem({ request, isSelected, onSelect, getMethodColor, isBeingDragged, onShowMenu }) {
  const { text, button, icon } = useUISize();

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
      className={`group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted cursor-pointer transition-all ${
        isSelected ? 'bg-muted' : ''
      } ${isDragging || isBeingDragged ? 'opacity-50 scale-105 shadow-lg bg-primary/5 border border-primary/20' : ''}`}
      onClick={() => onSelect(request)}
      {...attributes}
      {...listeners}
    >
      <span className={`${text('xs')} font-bold flex-shrink-0 w-10 ${getMethodColor(request.method)}`}>
        {request.method}
      </span>
      <span className={`${text('xs')} text-muted-foreground truncate flex-1 min-w-0`}>
        {request.name}
      </span>

      {onShowMenu && (
        <Button
          variant="ghost"
          className={`opacity-0 group-hover:opacity-100 ${button} h-5 w-5 p-0 flex-shrink-0`}
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
