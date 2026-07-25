import React, { useState, useEffect } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal } from './ui';
import { Input } from './ui/Input';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import VariableSyntaxHelp from './VariableSyntaxHelp';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

// Inline editable variable row
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

export default function EnvironmentManager({ projectId, isOpen, onClose }) {
  const {
    environments,
    activeEnvironment,
    fetchEnvironments,
    createEnvironment,
    updateEnvironmentName,
    deleteEnvironment,
    setActiveEnvironment,
    deactivateAllEnvironments,
    updateEnvironmentVariables,
  } = useEnvironmentStore();

  const { t } = useTranslation();
  const { text, spacing, icon, iconMd, button: buttonClass } = useUISize();

  const [selectedEnvId, setSelectedEnvId] = useState(null);
  const [variables, setVariables] = useState([]);
  const [newEnvName, setNewEnvName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchEnvironments(projectId);
    }
  }, [isOpen, projectId]);

  // Sync selected env with active
  useEffect(() => {
    if (environments.length > 0) {
      const id = selectedEnvId ?? activeEnvironment?.id ?? environments[0]?.id;
      setSelectedEnvId(id);
    } else {
      setSelectedEnvId(null);
    }
  }, [environments]);

  // Load variables when selected env changes
  useEffect(() => {
    const env = environments.find(e => e.id === selectedEnvId);
    setVariables(env?.variables ? env.variables.map(v => ({ ...v })) : []);
  }, [selectedEnvId, environments]);

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    await createEnvironment(projectId, newEnvName.trim());
    setNewEnvName('');
    setIsCreating(false);
  };

  const handleRename = async (id) => {
    if (editingName.trim()) await updateEnvironmentName(id, editingName.trim());
    setEditingId(null);
  };

  const handleSetActive = async (id) => {
    if (activeEnvironment?.id === id) {
      await deactivateAllEnvironments(projectId);
    } else {
      await setActiveEnvironment(projectId, id);
    }
  };

  const handleSaveVariables = async () => {
    if (!selectedEnvId) return;
    setSaving(true);
    const filtered = variables.filter(v => v.key.trim());
    await updateEnvironmentVariables(selectedEnvId, filtered);
    setSaving(false);
  };

  const addVariable = () => setVariables(v => [...v, { key: '', value: '' }]);
  const updateVariable = (index, updated) => setVariables(v => v.map((item, i) => i === index ? updated : item));
  const removeVariable = (index) => setVariables(v => v.filter((_, i) => i !== index));

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="max-w-[680px] max-h-[80vh]">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-border ${spacing(4)}`}>
          <DialogTitle as="h2" className={`${text('base')} font-semibold`}>{t('environment.title')}</DialogTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className={iconMd} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: environment list */}
          <div className="w-44 flex-shrink-0 border-r border-border flex flex-col">
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
              {environments.map(env => (
                <div
                  key={env.id}
                  className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer ${text('xs')} transition-colors ${
                    selectedEnvId === env.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setSelectedEnvId(env.id)}
                >
                  {editingId === env.id ? (
                    <input
                      autoFocus
                      className={`flex-1 ${text('xs')} bg-transparent border-b border-primary outline-none`}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRename(env.id)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(env.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 truncate">{env.name}</span>
                  )}
                  {env.is_active && <Check className={`${icon} text-green-500 flex-shrink-0`} />}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      className="p-0.5 hover:text-foreground text-muted-foreground"
                      onClick={e => { e.stopPropagation(); setEditingId(env.id); setEditingName(env.name); }}
                    >
                      <Pencil className={icon} />
                    </button>
                    <button
                      className="p-0.5 hover:text-destructive text-muted-foreground"
                      onClick={e => { e.stopPropagation(); deleteEnvironment(env.id); }}
                    >
                      <Trash2 className={icon} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* New env */}
            <div className={`border-t border-border ${spacing(3)}`}>
              {isCreating ? (
                <div className="flex gap-1">
                  <Input
                    autoFocus
                    className="flex-1"
                    placeholder={t('common.name')}
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateEnv(); if (e.key === 'Escape') setIsCreating(false); }}
                  />
                  <button onClick={handleCreateEnv} className="text-primary hover:text-primary/80">
                    <Check className={iconMd} />
                  </button>
                  <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground">
                    <X className={iconMd} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className={`w-full flex items-center gap-1 ${text('xs')} text-muted-foreground hover:text-foreground`}
                >
                  <Plus className={icon} /> {t('environment.newEnvironment')}
                </button>
              )}
            </div>
          </div>

          {/* Right: variables editor */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedEnv ? (
              <>
                <div className={`flex items-center justify-between border-b border-border ${spacing(3)}`}>
                  <div className="flex items-center gap-2">
                    <span className={`${text('sm')} font-medium`}>{selectedEnv.name}</span>
                    <button
                      onClick={() => handleSetActive(selectedEnv.id)}
                      className={`${text('xs')} px-2 py-0.5 rounded-full border transition-colors ${
                        selectedEnv.is_active
                          ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                      }`}
                    >
                      {selectedEnv.is_active ? t('environment.active') : t('environment.setActive')}
                    </button>
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto space-y-2 ${spacing(4)}`}>
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
                </div>

                <div className={`flex justify-end gap-2 border-t border-border ${spacing(4)}`}>
                  <Button variant="outline" className={buttonClass} onClick={onClose}>{t('common.cancel')}</Button>
                  <Button className={buttonClass} onClick={handleSaveVariables} disabled={saving}>
                    {saving ? t('environment.saving') : t('common.save')}
                  </Button>
                </div>
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center ${text('xs')} text-muted-foreground`}>
                {t('environment.createOrSelect')}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
}
