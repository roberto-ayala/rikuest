import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { isMac } from '../hooks/useKeyboardShortcuts';

const MOD_LABEL = isMac ? '⌘' : 'Ctrl';

function ShortcutRow({ label, keys }) {
  const { text } = useUISize();
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className={`${text('sm')} text-foreground`}>{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className={`${text('xs')} px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-muted-foreground`}
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function ShortcutsHelp({ isOpen, onClose }) {
  const { text, spacing, iconButton, icon } = useUISize();
  const { t } = useTranslation();

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { label: t('shortcuts.execute'), keys: [MOD_LABEL, 'Enter'] },
    { label: t('shortcuts.save'), keys: [MOD_LABEL, 'S'] },
    { label: t('shortcuts.help'), keys: [MOD_LABEL, '/'] }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-card border border-border rounded-lg shadow-lg ${spacing(6)} m-4 max-w-sm w-full`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className={icon} />
            <h3 className={`${text('lg')} font-semibold text-foreground`}>{t('shortcuts.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className={`${iconButton} hover:bg-muted rounded-md text-muted-foreground hover:text-foreground`}
            title={t('common.close')}
          >
            <X className={icon} />
          </button>
        </div>

        <div>
          {shortcuts.map((shortcut, index) => (
            <ShortcutRow key={index} label={shortcut.label} keys={shortcut.keys} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelp;
