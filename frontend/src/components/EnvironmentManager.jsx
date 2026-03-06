import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, ChevronDown, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useTranslation } from '../hooks/useTranslation';

// Inline editable variable row
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

  const addVariable = () => {
    setVariables(v => [...v, { key: '', value: '' }]);
  };

  const updateVariable = (index, updated) => {
    setVariables(v => v.map((item, i) => i === index ? updated : item));
  };

  const removeVariable = (index) => {
    setVariables(v => v.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-[680px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">{t('environment.title')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: environment list */}
          <div className="w-44 flex-shrink-0 border-r border-border flex flex-col">
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
              {environments.map(env => (
                <div
                  key={env.id}
                  className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                    selectedEnvId === env.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setSelectedEnvId(env.id)}
                >
                  {editingId === env.id ? (
                    <input
                      autoFocus
                      className="flex-1 text-xs bg-transparent border-b border-primary outline-none"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRename(env.id)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(env.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 truncate">{env.name}</span>
                  )}
                  {env.is_active && <Check size={11} className="text-green-500 flex-shrink-0" />}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      className="p-0.5 hover:text-foreground text-muted-foreground"
                      onClick={e => { e.stopPropagation(); setEditingId(env.id); setEditingName(env.name); }}
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      className="p-0.5 hover:text-destructive text-muted-foreground"
                      onClick={e => { e.stopPropagation(); deleteEnvironment(env.id); }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* New env */}
            <div className="p-2 border-t border-border">
              {isCreating ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    className="flex-1 h-6 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('common.name')}
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateEnv(); if (e.key === 'Escape') setIsCreating(false); }}
                  />
                  <button onClick={handleCreateEnv} className="text-primary hover:text-primary/80">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
                >
                  <Plus size={12} /> {t('environment.newEnvironment')}
                </button>
              )}
            </div>
          </div>

          {/* Right: variables editor */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedEnv ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{selectedEnv.name}</span>
                    <button
                      onClick={() => handleSetActive(selectedEnv.id)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        selectedEnv.is_active
                          ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                      }`}
                    >
                      {selectedEnv.is_active ? t('environment.active') : t('environment.setActive')}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                  <Button size="sm" onClick={handleSaveVariables} disabled={saving}>
                    {saving ? t('environment.saving') : t('common.save')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                {t('environment.createOrSelect')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
