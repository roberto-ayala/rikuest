import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Field } from './ui/Field';
import { useTranslation } from '../hooks/useTranslation';

const EMPTY = { name: '', description: '' };

// Single dialog for both creating and editing a project — `mode` only changes
// the copy (title / submit label). Replaces the two near-identical blocks that
// used to live in views/Home.jsx.
function ProjectFormDialog({ isOpen, onClose, mode = 'create', initialValues, onSubmit }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(EMPTY);

  useEffect(() => {
    if (isOpen) {
      setValues({
        name: initialValues?.name || '',
        description: initialValues?.description || '',
      });
    }
  }, [isOpen, initialValues]);

  const canSubmit = values.name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: values.name, description: values.description });
  };

  const title = mode === 'edit'
    ? `${t('common.edit')} ${t('common.project')}`
    : t('project.create');
  const submitLabel = mode === 'edit'
    ? t('common.save')
    : `${t('common.create')} ${t('common.project')}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title={title} />
      <ModalBody className="space-y-4">
        <Field label={t('project.projectName')} htmlFor="project-name">
          <Input
            id="project-name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder={t('project.projectNamePlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </Field>
        <Field label={t('project.projectDescription')} htmlFor="project-description">
          <Textarea
            id="project-description"
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            placeholder={t('project.projectDescriptionPlaceholder')}
            rows={3}
          />
        </Field>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ProjectFormDialog;
