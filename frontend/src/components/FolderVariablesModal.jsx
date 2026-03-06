import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useTranslation } from '../hooks/useTranslation';

function VariableRow({ variable, onChange, onDelete, t }) {
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={t('environment.variablePlaceholder')}
        value={variable.key}
        onChange={e => onChange({ ...variable, key: e.target.value })}
      />
      <input
        className="flex-1 h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={t('environment.valuePlaceholder')}
        value={variable.value}
        onChange={e => onChange({ ...variable, value: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function FolderVariablesModal({ folder, isOpen, onClose }) {
  const { folderVariables, fetchFolderVariables, updateFolderVariables } = useEnvironmentStore();
  const { t } = useTranslation();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">{t('environment.folderVariables')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('environment.folderVariablesDesc')} <span className="font-medium">{folder.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          <div className="flex items-center gap-2 mb-1 px-0.5">
            <span className="flex-1 text-xs text-muted-foreground">{t('environment.variable')}</span>
            <span className="flex-1 text-xs text-muted-foreground">{t('environment.value')}</span>
            <span className="w-5" />
          </div>
          {variables.map((v, i) => (
            <VariableRow
              key={i}
              variable={v}
              onChange={updated => updateVariable(i, updated)}
              onDelete={() => removeVariable(i)}
              t={t}
            />
          ))}
          <button
            onClick={addVariable}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
          >
            <Plus size={12} /> {t('environment.addVariable')}
          </button>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t('environment.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
