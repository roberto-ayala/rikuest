import React from 'react';
import { cn, handleMenuKeyDown } from '../../lib/utils';
import { useUISize } from '../../hooks/useUISize';

// Cursor-anchored popup menu. Encapsulates the shell that was hand-repeated in
// Home, FolderTree (x2) and Project: a full-screen click-catcher overlay plus a
// `role="menu"` container positioned at an absolute {x,y}, with arrow-key/Escape
// navigation via handleMenuKeyDown. `position` is the click coordinates.
function ContextMenu({ isOpen, position, onClose, className, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        className={cn(
          'absolute bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]',
          className
        )}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => handleMenuKeyDown(e, onClose)}
      >
        {children}
      </div>
    </div>
  );
}

// A row in a ContextMenu. Size-aware (via useUISize `menuItem`) so every menu
// scales with the UI-size setting; `icon` renders a leading glyph, `destructive`
// tints it red.
const ContextMenuItem = React.forwardRef(
  ({ icon, destructive, disabled, className, children, ...props }, ref) => {
    const { menuItem } = useUISize();
    return (
      <button
        ref={ref}
        role="menuitem"
        disabled={disabled}
        className={cn(
          'w-full text-left transition-colors flex items-center gap-2',
          menuItem,
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted',
          destructive && 'text-destructive',
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);
ContextMenuItem.displayName = 'ContextMenuItem';

export { ContextMenu, ContextMenuItem };
