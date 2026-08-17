import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMethodLabel } from '../lib/utils';
import { useUISize } from '../hooks/useUISize';

function RequestTreeItem({ request, isSelected, onSelect, getMethodColor, isBeingDragged, onShowMenu }) {
  const { text, spacing, itemSpacing, methodBadge, methodBadgeText, methodBadgeWidth } = useUISize();

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
      className={`group flex items-center ${itemSpacing} ${spacing(1)} rounded hover:bg-muted cursor-pointer transition-all ${
        isSelected ? 'bg-muted' : ''
      } ${isDragging || isBeingDragged ? 'opacity-50 scale-105 shadow-lg bg-primary/5 border border-primary/20' : ''}`}
      onClick={() => onSelect(request)}
      onContextMenu={(e) => {
        if (!onShowMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onShowMenu(request, e);
      }}
      {...attributes}
      {...listeners}
    >
      {/* Starts flush with a sibling folder's icon: with no expander column on
          either row, the left edge alone carries the nesting level. */}
      <span
        className={`${methodBadgeText} ${methodBadge} ${methodBadgeWidth} font-bold leading-none text-center rounded border flex-shrink-0 ${getMethodColor(request.method)}`}
        title={request.method}
      >
        {getMethodLabel(request.method)}
      </span>
      <span className={`${text('xs')} text-muted-foreground truncate flex-1 min-w-0`}>
        {request.name}
      </span>
    </div>
  );
}

export default RequestTreeItem;
