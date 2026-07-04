import React from 'react';
import { BarChart3, Clock, History, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { formatSize, getHistoryStatusColor } from '../../lib/utils';

function HistoryDrawer({ isOpen, onClose, history, onSelectItem, onDeleteItem }) {
  const { text, spacing } = useUISize();
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-96 h-full bg-card border-l border-border shadow-lg flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${spacing(4)}`}>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h3 className={`${text('lg')} font-semibold text-foreground`}>{t('request.historyTitle')}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${spacing(4)}`}>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className={`${text('sm')} text-muted-foreground mb-2`}>{t('request.noHistory')}</p>
              <p className={`${text('xs')} text-muted-foreground`}>{t('request.noHistoryDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="relative border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 group hover:shadow-sm"
                >
                  <button
                    onClick={() => onSelectItem(item)}
                    className="w-full p-3 pr-12 text-left rounded-lg hover:bg-transparent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${text('xs')} text-muted-foreground`}>
                        {new Date(item.executed_at).toLocaleString()}
                      </span>
                      <span className={`${text('sm')} font-medium ${getHistoryStatusColor(item.response.status)}`}>
                        {item.response.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`${text('xs')} text-muted-foreground flex items-center gap-2`}>
                        <BarChart3 className="h-3 w-3" />
                        <span>{item.response.duration}ms</span>
                      </div>
                      <div className={`${text('xs')} text-muted-foreground`}>
                        {formatSize(item.response.size)}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id, item);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 transition-all duration-200 shadow-sm border border-red-200 dark:border-red-800 bg-white dark:bg-card opacity-95 hover:opacity-100"
                    title={t('request.deleteHistoryItem')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryDrawer;
