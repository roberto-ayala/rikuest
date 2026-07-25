import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

// Renders a translated list, tolerating a missing/loading translation (t()
// falls back to the key, which is a string, not an array).
function asList(value) {
  return Array.isArray(value) ? value : [];
}

function Code({ children }) {
  return (
    <code className="font-mono px-1 py-0.5 rounded bg-muted text-emerald-600 dark:text-emerald-400">
      {children}
    </code>
  );
}

/**
 * Collapsible explainer for the variable syntax. Two variants:
 * - `usage`: how {{name}} placeholders work and where they are allowed.
 * - `capture`: how the JSON path of a capture rule is written.
 */
export default function VariableSyntaxHelp({ variant = 'usage', defaultOpen = false }) {
  const { t } = useTranslation();
  const { text, icon } = useUISize();
  const [open, setOpen] = useState(defaultOpen);

  const title = variant === 'capture' ? t('variables.captureHelpTitle') : t('variables.helpTitle');
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="rounded border border-border bg-muted/30 mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 ${text('xs')} text-muted-foreground hover:text-foreground transition-colors`}
      >
        <Chevron className={`${icon} flex-shrink-0`} />
        <HelpCircle className={`${icon} flex-shrink-0`} />
        <span className="font-medium">{title}</span>
      </button>

      {open && (
        <div className={`px-2 pb-2 space-y-2 ${text('xs')} text-muted-foreground`}>
          {variant === 'capture' ? <CaptureHelp t={t} /> : <UsageHelp t={t} />}
        </div>
      )}
    </div>
  );
}

function UsageHelp({ t }) {
  return (
    <>
      <p>
        {t('variables.helpIntro')} <Code>{'{{token}}'}</Code>
      </p>

      <div>
        <p className="text-foreground font-medium mb-1">{t('variables.helpWhereTitle')}</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {asList(t('variables.helpWhere')).map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </div>

      <div>
        <p className="text-foreground font-medium mb-1">{t('variables.helpExamplesTitle')}</p>
        <ul className="space-y-0.5">
          <li><Code>{'https://{{base_url}}/users/{{user_id}}'}</Code></li>
          <li><Code>{'Authorization: Bearer {{access_token}}'}</Code></li>
          <li><Code>{'{"email": "{{user_email}}"}'}</Code></li>
        </ul>
      </div>

      <p>{t('variables.helpRules')}</p>
      <p>{t('variables.helpPrecedence')}</p>
      <p>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t('variables.helpKnown')}</span>
        {' · '}
        <span className="text-amber-600 dark:text-amber-400 font-medium">{t('variables.helpUnknown')}</span>
      </p>
      <p>{t('variables.helpAutocomplete')}</p>
    </>
  );
}

function CaptureHelp({ t }) {
  const examples = [
    ['token', 'variables.captureExampleTop'],
    ['data.token', 'variables.captureExampleNested'],
    ['data.users.0.id', 'variables.captureExampleIndex'],
    ['data.users[0].roles[1]', 'variables.captureExampleBrackets'],
  ];

  return (
    <>
      <p>{t('variables.captureHelpIntro')}</p>

      <div>
        <p className="text-foreground font-medium mb-1">{t('variables.helpExamplesTitle')}</p>
        <ul className="space-y-0.5">
          {examples.map(([path, key]) => (
            <li key={path} className="flex gap-2">
              <Code>{path}</Code>
              <span className="flex-1">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p>{t('variables.captureHelpStored')}</p>
      <p>{t('variables.captureHelpRules')}</p>
    </>
  );
}
