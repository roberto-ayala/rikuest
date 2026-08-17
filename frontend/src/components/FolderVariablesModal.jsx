import React, { useState, useEffect, useMemo } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectOption, Label } from './ui';
import VariableSyntaxHelp from './VariableSyntaxHelp';
import { useEnvironmentStore, folderScopeKey } from '../stores/environmentStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

// Scope 0 is the set of defaults shared by every environment; any other value
// is a single environment's overrides on top of those defaults.
const SHARED_SCOPE = 0;

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

export default function FolderVariablesModal({ folder, isOpen, onClose }) {
  const { environments, folderVariables, fetchFolderVariables, updateFolderVariables } = useEnvironmentStore();
  const { t } = useTranslation();
  const { text, icon, button: buttonClass } = useUISize();
  const [scope, setScope] = useState(SHARED_SCOPE);
  // One draft per scope, so switching scopes inside the modal never discards
  // edits: every touched scope is written on save.
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  const scopes = useMemo(
    () => [SHARED_SCOPE, ...environments.map(e => e.id)],
    [environments]
  );

  // Opening on a folder starts from a clean slate; scopes arriving later (the
  // environment list loading) must not wipe what is already being edited.
  useEffect(() => {
    if (!isOpen || !folder?.id) return;
    setScope(SHARED_SCOPE);
    setDrafts({});
  }, [isOpen, folder?.id]);

  // Every scope is loaded up front: the inherited-defaults hint needs the
  // shared scope even while an environment scope is being edited.
  useEffect(() => {
    if (!isOpen || !folder?.id) return;
    scopes.forEach(id => fetchFolderVariables(folder.id, id));
  }, [isOpen, folder?.id, scopes]);

  const stored = (scopeId) => folderVariables[folderScopeKey(folder?.id, scopeId)] || [];
  const variables = drafts[scope] ?? stored(scope).map(v => ({ ...v }));

  const setVariables = (next) => setDrafts(d => ({
    ...d,
    [scope]: typeof next === 'function' ? next(variables) : next
  }));

  // Defaults the current environment scope does not override yet, offered as
  // one-click starting points instead of making the user retype the key.
  const inherited = scope === SHARED_SCOPE
    ? []
    : (drafts[SHARED_SCOPE] ?? stored(SHARED_SCOPE))
      .filter(d => d.key.trim() && !variables.some(v => v.key.trim() === d.key.trim()));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [scopeId, vars] of Object.entries(drafts)) {
        await updateFolderVariables(folder.id, Number(scopeId), vars.filter(v => v.key.trim()));
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addVariable = () => setVariables(v => [...v, { key: '', value: '' }]);
  const overrideInherited = (d) => setVariables(v => [...v, { key: d.key, value: d.value }]);
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

        <div className="space-y-1">
          <Label>{t('environment.folderScope')}</Label>
          <Select value={scope} onChange={e => setScope(Number(e.target.value))}>
            <SelectOption value={SHARED_SCOPE}>{t('environment.folderScopeShared')}</SelectOption>
            {environments.map(env => (
              <SelectOption key={env.id} value={env.id}>
                {env.name}{env.is_active ? ` · ${t('environment.active')}` : ''}
              </SelectOption>
            ))}
          </Select>
          <p className={`${text('xs')} text-muted-foreground`}>
            {scope === SHARED_SCOPE
              ? t('environment.folderScopeSharedHint')
              : t('environment.folderScopeEnvHint')}
          </p>
        </div>

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

        {inherited.length > 0 && (
          <div className="pt-1 border-t border-border space-y-1">
            <p className={`${text('xs')} text-muted-foreground`}>{t('environment.folderInherited')}</p>
            <div className="flex flex-wrap gap-1">
              {inherited.map(d => (
                <button
                  key={d.key}
                  onClick={() => overrideInherited(d)}
                  title={d.value}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border border-border ${text('xs')} text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors`}
                >
                  <Plus className={icon} /> {d.key}
                </button>
              ))}
            </div>
          </div>
        )}
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
