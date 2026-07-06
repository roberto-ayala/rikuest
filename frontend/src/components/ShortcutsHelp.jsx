import React from 'react';
import { Keyboard } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from './ui';
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
  const { icon } = useUISize();
  const { t } = useTranslation();

  const shortcuts = [
    { label: t('shortcuts.execute'), keys: [MOD_LABEL, 'Enter'] },
    { label: t('shortcuts.save'), keys: [MOD_LABEL, 'S'] },
    { label: t('shortcuts.search'), keys: [MOD_LABEL, 'K'] },
    { label: t('shortcuts.help'), keys: [MOD_LABEL, '/'] }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader
        title={t('shortcuts.title')}
        onClose={onClose}
        icon={<Keyboard className={icon} />}
      />
      <ModalBody className="pb-6">
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} label={shortcut.label} keys={shortcut.keys} />
        ))}
      </ModalBody>
    </Modal>
  );
}

export default ShortcutsHelp;
