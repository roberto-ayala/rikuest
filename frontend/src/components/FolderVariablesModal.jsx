import React, { useState, useEffect } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import VariableSyntaxHelp from './VariableSyntaxHelp';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

function VariableRow({ variable, onChange, onDelete, iconClass, t }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1"
        placeholder={t('environment.variablePlaceholder')}
        value={variable.key}
        onChange={e => onChange({ ...variable, key: e.target.value })}
      />
      <Input
        className="flex-1"
        placeholder={t('environment.valuePlaceholder')}
        value={variable.value}
        onChange={e => onChange({ ...variable, value: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className={iconClass} />
      </button>
    </div>
  );
}

export default function FolderVariablesModal({ folder, isOpen, onClose }) {
  const { folderVariables, fetchFolderVariables, updateFolderVariables } = useEnvironmentStore();
  const { t } = useTranslation();
  const { text, icon, button: buttonClass } = useUISize();
  const [variables, setVariables] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && folder?.id) {
      fetchFolderVariables(folder.id);
    }
  }, [isOpen, folder?.id]);

  useEffect(() => {
    const vars = folderVariables[folder?.id] || [];
    setVariables(vars.map(v => ({ ...v })));
  }, [folderVariables, folder?.id]);

  const handleSave = async () => {
    setSaving(true);
    const filtered = variables.filter(v => v.key.trim());
    await updateFolderVariables(folder.id, filtered);
    setSaving(false);
    onClose();
  };

  const addVariable = () => setVariables(v => [...v, { key: '', value: '' }]);
  const updateVariable = (i, updated) => setVariables(v => v.map((item, idx) => idx === i ? updated : item));
  const removeVariable = (i) => setVariables(v => v.filter((_, idx) => idx !== i));

  if (!isOpen || !folder) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="max-w-[480px] max-h-[70vh]">
      <ModalHeader onClose={onClose}>
        <div>
          <DialogTitle as="h2" className={`${text('sm')} font-semibold`}>{t('environment.folderVariables')}</DialogTitle>
          <p className={`${text('xs')} text-muted-foreground mt-0.5`}>
            {t('environment.folderVariablesDesc')} <span className="font-medium">{folder.name}</span>
          </p>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-2">
        <VariableSyntaxHelp variant="usage" />
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('environment.variable')}</span>
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('environment.value')}</span>
          <span className="w-5" />
        </div>
        {variables.map((v, i) => (
          <VariableRow
            key={i}
            variable={v}
            onChange={updated => updateVariable(i, updated)}
            onDelete={() => removeVariable(i)}
            iconClass={icon}
            t={t}
          />
        ))}
        <button
          onClick={addVariable}
          className={`flex items-center gap-1 ${text('xs')} text-muted-foreground hover:text-foreground py-1`}
        >
          <Plus className={icon} /> {t('environment.addVariable')}
        </button>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" className={buttonClass} onClick={onClose}>{t('common.cancel')}</Button>
        <Button className={buttonClass} onClick={handleSave} disabled={saving}>
          {saving ? t('environment.saving') : t('common.save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
