import React from 'react';
import { DialogTitle } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './ui';
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
  variant = 'danger', // 'danger' or 'warning'
  children,
}) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBody className="pt-6">
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
            {children}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          {cancelText || t('common.cancel')}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'default'}
          onClick={handleConfirm}
        >
          {confirmText || t('common.delete')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDialog;
