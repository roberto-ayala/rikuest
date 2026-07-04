import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from '../hooks/useTranslation';

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger' // 'danger' or 'warning'
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <DialogPanel className="bg-card p-6 rounded-lg shadow-lg border border-border w-full max-w-md">
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-destructive/10' : 'bg-orange-500/10'
          }`}>
            <AlertTriangle className={`h-5 w-5 ${
              variant === 'danger' ? 'text-destructive' : 'text-orange-500'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <DialogTitle as="h2" className="text-lg font-semibold mb-2 text-foreground">
              {title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="ghost" onClick={onClose}>
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {confirmText || t('common.delete')}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}

export default ConfirmDialog;

