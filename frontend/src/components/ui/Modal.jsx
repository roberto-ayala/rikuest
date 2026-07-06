import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './IconButton';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-2xl lg:max-w-4xl',
};

// Standard modal shell: single overlay style + centered, size-capped panel.
// Replaces the three divergent hand-rolled shells (raw div, Dialog-with-overlay,
// Dialog-with-separate-backdrop). Compose with ModalHeader/Body/Footer.
function Modal({ isOpen, onClose, size = 'md', className, children, initialFocus }) {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      initialFocus={initialFocus}
      className="relative z-50"
    >
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={cn(
            'flex flex-col w-full bg-card border border-border rounded-lg shadow-lg max-h-[calc(100vh-2rem)]',
            sizeClasses[size] || sizeClasses.md,
            className
          )}
        >
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

// Title row with an optional close button. `icon` renders a leading glyph.
function ModalHeader({ title, onClose, icon, className, children }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 p-6 pb-4 flex-shrink-0', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        {title && (
          <DialogTitle as="h2" className="text-lg font-semibold text-foreground truncate">
            {title}
          </DialogTitle>
        )}
        {children}
      </div>
      {onClose && (
        <IconButton onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
}

function ModalBody({ className, children }) {
  return <div className={cn('px-6 py-2 overflow-y-auto', className)}>{children}</div>;
}

// Action row, right-aligned by default.
function ModalFooter({ className, children }) {
  return (
    <div className={cn('flex justify-end items-center gap-2 p-6 pt-4 flex-shrink-0', className)}>
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalBody, ModalFooter };
