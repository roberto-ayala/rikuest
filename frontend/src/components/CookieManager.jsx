import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import ConfirmDialog from './ConfirmDialog';
import { useCookieStore } from '../stores/cookieStore';
import { addToast } from '../stores/toastStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

function formatExpiry(expiresAt, t) {
  if (!expiresAt) return t('cookies.session');
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return t('cookies.session');
  return date.toLocaleString();
}

export default function CookieManager({ projectId, isOpen, onClose }) {
  const { cookies, loading, fetchCookies, deleteCookie, clearCookies } = useCookieStore();
  const { t } = useTranslation();
  const { text, spacing, icon, iconMd, button: buttonClass } = useUISize();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchCookies(projectId);
    }
  }, [isOpen, projectId]);

  const handleDelete = async (cookie) => {
    try {
      await deleteCookie(cookie.id);
      addToast('success', t('cookies.deleted'));
    } catch {
      // asyncAction already surfaced an error toast
    }
  };

  const handleClearAll = async () => {
    try {
      await clearCookies(projectId);
      addToast('success', t('cookies.cleared'));
    } catch {
      // asyncAction already surfaced an error toast
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <DialogPanel className="bg-background border border-border rounded-lg shadow-xl w-[680px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${spacing(4)}`}>
          <DialogTitle as="h2" className={`${text('base')} font-semibold`}>{t('cookies.title')}</DialogTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className={iconMd} />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto min-h-0 ${spacing(4)}`}>
          {loading ? (
            <div className={`flex items-center justify-center ${text('sm')} text-muted-foreground py-8`}>
              {t('common.loading')}
            </div>
          ) : cookies.length === 0 ? (
            <div className={`flex items-center justify-center ${text('sm')} text-muted-foreground py-8`}>
              {t('cookies.empty')}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1 px-0.5">
                <span className={`w-32 ${text('xs')} text-muted-foreground`}>{t('cookies.domain')}</span>
                <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('cookies.name')}</span>
                <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('cookies.value')}</span>
                <span className={`w-40 ${text('xs')} text-muted-foreground`}>{t('cookies.expires')}</span>
                <span className="w-5" />
              </div>
              {cookies.map(cookie => (
                <div key={cookie.id} className="flex items-center gap-2">
                  <span className={`w-32 ${text('xs')} truncate`} title={cookie.domain}>{cookie.domain}</span>
                  <span className={`flex-1 ${text('xs')} truncate max-w-[150px]`} title={cookie.name}>{cookie.name}</span>
                  <span className={`flex-1 ${text('xs')} truncate max-w-[150px] text-muted-foreground`} title={cookie.value}>{cookie.value}</span>
                  <span className={`w-40 ${text('xs')} text-muted-foreground truncate`}>{formatExpiry(cookie.expires_at, t)}</span>
                  <button
                    onClick={() => handleDelete(cookie)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className={icon} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-2 border-t border-border ${spacing(4)}`}>
          <Button variant="outline" className={buttonClass} onClick={onClose}>{t('common.close')}</Button>
          <Button
            variant="destructive"
            className={buttonClass}
            onClick={() => setShowClearConfirm(true)}
            disabled={cookies.length === 0}
          >
            {t('cookies.clearAll')}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title={t('cookies.clearAll')}
        message={t('cookies.clearAllConfirm')}
        confirmText={t('cookies.clearAll')}
        variant="danger"
      />
    </>
  );
}
