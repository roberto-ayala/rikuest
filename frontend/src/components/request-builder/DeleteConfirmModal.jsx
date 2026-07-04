import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { getHistoryStatusColor } from '../../lib/utils';

function DeleteConfirmModal({ deleteConfirmation, onConfirm, onCancel }) {
  const { text } = useUISize();
  const { t } = useTranslation();

  if (!deleteConfirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg p-6 m-4 max-w-md w-full">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>
              {t('request.deleteHistoryTitle')}
            </h3>
            <p className={`${text('sm')} text-muted-foreground mb-4`}>
              {t('request.deleteHistoryConfirm')}
            </p>
            <div className={`${text('xs')} text-muted-foreground p-2 bg-muted rounded border mb-4`}>
              <div className="flex justify-between items-center mb-1">
                <span>{t('request.executed')}</span>
                <span>{new Date(deleteConfirmation.historyItem.executed_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('common.status')}:</span>
                <span className={`font-medium ${getHistoryStatusColor(deleteConfirmation.historyItem.response.status)}`}>
                  {deleteConfirmation.historyItem.response.status}
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onConfirm}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
