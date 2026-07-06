import React from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { cn } from '../../lib/utils';

// Edge-anchored, full-height panel (e.g. the request history drawer). Shares the
// overlay with Modal but slides in from a side instead of centering. Built on
// Headless UI Dialog, so it gets focus-trap and Escape-to-close for free — which
// the previous hand-rolled `fixed inset-0` version lacked.
function Drawer({ isOpen, onClose, side = 'right', width = 'w-96', className, children }) {
  if (!isOpen) return null;

  const anchor = side === 'right' ? 'ml-auto border-l' : 'mr-auto border-r';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-background/80" aria-hidden="true" />
      <div className="fixed inset-0 flex">
        <DialogPanel
          className={cn(
            'relative h-full flex flex-col bg-card border-border shadow-lg',
            anchor,
            width,
            className
          )}
        >
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export { Drawer };
