import React, { useState, useEffect } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal } from './ui';
import { Input } from './ui/Input';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import VariableSyntaxHelp from './VariableSyntaxHelp';
import { useEnvironmentStore } from '../stores/environmentStore';
import { addToast } from '../stores/toastStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

// Name of the environment created for a project that has none, so variables
// and response captures always have a home.
const DEFAULT_ENVIRONMENT_NAME = 'Local';

// Inline editable variable row
function VariableRow({ variable, onChange, onDelete, iconClass, t }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1 min-w-0"
        placeholder={t('environment.variablePlaceholder')}
        value={variable.key}
        onChange={e => onChange({ ...variable, key: e.target.value })}
      />
      <Input
        className="flex-1 min-w-0"
        placeholder={t('environment.valuePlaceholder')}
        value={variable.value}
        onChange={e => onChange({ ...variable, value: e.target.value })}
      />
      {/* Fixed width, matching the header's reserved column: sized by padding
          alone the button grew with the icon, drifting at larger UI sizes. */}
      <button
        onClick={onDelete}
        className="w-5 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
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
  // Environment whose variable list has unsaved edits, if any.
  const [editedEnvId, setEditedEnvId] = useState(null);

  // Load, then bootstrap: a project with no environments has nowhere to store
  // variables — response captures in particular just report
  // `no_active_environment` and look broken. Give it an active "Local" so there
  // is always somewhere to write. Only when there are none at all; an explicit
  // "deactivate all" over an existing set is a choice, not a gap to fill.
  // The check reads the store directly because `environments` from this render
  // is still the pre-fetch value at this point.
  useEffect(() => {
    if (!isOpen || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        await fetchEnvironments(projectId);
        if (cancelled || useEnvironmentStore.getState().environments.length > 0) return;
        const env = await createEnvironment(projectId, DEFAULT_ENVIRONMENT_NAME);
        if (!cancelled && env?.id) await setActiveEnvironment(projectId, env.id);
      } catch {
        // Reported through the store's error state; retried on the next open.
      }
    })();
    return () => { cancelled = true; };
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

  // Load variables when the selected env changes, and pick up background
  // refreshes (a response capture creating or rewriting a value lands here) —
  // except while this environment has unsaved edits, which such a refresh must
  // never discard. editedEnvId is read but deliberately not a dependency:
  // re-running on every keystroke is exactly what the guard exists to prevent.
  useEffect(() => {
    if (editedEnvId === selectedEnvId) return;
    const env = environments.find(e => e.id === selectedEnvId);
    setVariables(env?.variables ? env.variables.map(v => ({ ...v })) : []);
  }, [selectedEnvId, environments]);

  const selectedEnv = environments.find(e => e.id === selectedEnvId);
  const hasUnsavedChanges = editedEnvId !== null && editedEnvId === selectedEnvId;

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
    try {
      await updateEnvironmentVariables(selectedEnvId, filtered);
      // The modal stays open after saving, so without this the write left no
      // trace at all and read as a dead button.
      setVariables(filtered);
      setEditedEnvId(null);
      addToast('success', t('environment.variablesSaved'));
    } catch {
      addToast('error', t('environment.variablesSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Editing marks this environment as holding unsaved work, which is what the
  // sync effect above checks before accepting a background refresh — and what
  // the Save button uses to show there is something to save.
  const editVariables = (updater) => {
    setEditedEnvId(selectedEnvId);
    setVariables(updater);
  };

  const addVariable = () => editVariables(v => [...v, { key: '', value: '' }]);
  const updateVariable = (index, updated) => editVariables(v => v.map((item, i) => i === index ? updated : item));
  const removeVariable = (index) => editVariables(v => v.filter((_, i) => i !== index));

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

                <div className={`flex items-center justify-end gap-2 border-t border-border ${spacing(4)}`}>
                  {/* Says whether there is anything to save, so the button is
                      never a no-op the user has to guess about. */}
                  <span className={`mr-auto ${text('xs')} text-muted-foreground`}>
                    {hasUnsavedChanges ? t('environment.unsavedChanges') : ''}
                  </span>
                  <Button variant="outline" className={buttonClass} onClick={onClose}>{t('common.cancel')}</Button>
                  <Button className={buttonClass} onClick={handleSaveVariables} disabled={saving || !hasUnsavedChanges}>
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
