import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { Input } from './ui/Input';
import VariableSyntaxHelp from './VariableSyntaxHelp';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';
import { useEnvironmentStore } from '../stores/environmentStore';

function CaptureRow({ capture, onChange, onDelete, iconClass, textXs, listId, existingKeys, t }) {
  // A rule either refreshes a variable that already exists or brings a new one
  // into the environment; saying which removes the guesswork of typing a name
  // and not knowing whether it lands on top of something.
  const name = capture.variable_name.trim();
  const hint = !name ? null : existingKeys.has(name) ? t('captures.overwritesExisting') : t('captures.createsNew');

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <Input
          className="w-full font-mono"
          placeholder="variableName"
          list={listId}
          value={capture.variable_name}
          onChange={e => onChange({ ...capture, variable_name: e.target.value })}
        />
        {hint && <span className={`${textXs} text-muted-foreground`}>{hint}</span>}
      </div>
      <span className={`${textXs} text-muted-foreground flex-shrink-0`}>=</span>
      <Input
        className="flex-1 min-w-0 font-mono"
        placeholder="data.token"
        value={capture.json_path}
        onChange={e => onChange({ ...capture, json_path: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        <Trash2 className={iconClass} />
      </button>
    </div>
  );
}

// Per-status presentation of the capture results reported by the last execution.
const STATUS_STYLES = {
  applied: { Icon: CheckCircle2, className: 'text-green-600 dark:text-green-400', key: 'captures.statusApplied' },
  no_active_environment: { Icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400', key: 'captures.statusNoEnvironment' },
  invalid_json: { Icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400', key: 'captures.statusInvalidJson' },
  path_not_found: { Icon: XCircle, className: 'text-destructive', key: 'captures.statusPathNotFound' },
  skipped_error_status: { Icon: MinusCircle, className: 'text-muted-foreground', key: 'captures.statusSkipped' },
  failed: { Icon: XCircle, className: 'text-destructive', key: 'captures.statusFailed' },
};

function CaptureResults({ results, t, textXs, iconClass }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className={`${textXs} text-muted-foreground mb-2`}>{t('captures.lastRun')}</p>
      <div className="space-y-1">
        {results.map((result, i) => {
          const style = STATUS_STYLES[result.status] || STATUS_STYLES.failed;
          const { Icon } = style;
          return (
            <div key={i} className={`flex items-start gap-2 ${textXs}`}>
              <Icon className={`${iconClass} flex-shrink-0 mt-0.5 ${style.className}`} />
              <div className="min-w-0 flex-1">
                <span className="font-mono text-foreground">{result.variable_name}</span>
                <span className="text-muted-foreground"> ← </span>
                <span className="font-mono text-muted-foreground">{result.json_path}</span>
                <span className={`ml-2 ${style.className}`}>{t(style.key)}</span>
                {result.status === 'applied' && result.value && (
                  <div className="font-mono text-muted-foreground truncate">= {result.value}</div>
                )}
                {result.detail && result.status !== 'applied' && (
                  <div className="text-muted-foreground truncate">{result.detail}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResponseCapturesPanel({ requestId, results, variables = [] }) {
  const { t } = useTranslation();
  const { text, icon } = useUISize();
  const activeEnvironment = useEnvironmentStore(state => state.activeEnvironment);
  const [captures, setCaptures] = useState([]);
  // Guards the debounced save: it must never run against a request whose
  // captures have not been loaded yet, or it would overwrite them with the
  // previously selected request's rules.
  const [loadedId, setLoadedId] = useState(null);

  // Load captures when request changes
  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    setLoadedId(null);
    adapterFactory.getAdapter().then(adapter =>
      adapter.getResponseCaptures(requestId)
    ).then(data => {
      if (!cancelled) {
        setCaptures(data || []);
        setLoadedId(requestId);
      }
    }).catch(() => {
      if (!cancelled) {
        setCaptures([]);
        setLoadedId(requestId);
      }
    });
    return () => { cancelled = true; };
  }, [requestId]);

  // Debounced auto-save
  useEffect(() => {
    if (!requestId || loadedId !== requestId) return;
    const timer = setTimeout(async () => {
      try {
        const adapter = await adapterFactory.getAdapter();
        const filtered = captures.filter(c => c.variable_name.trim() && c.json_path.trim());
        await adapter.updateResponseCaptures(requestId, filtered);
      } catch (e) {
        console.error('Failed to save captures:', e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [captures, requestId, loadedId]);

  const addCapture = () => setCaptures(c => [...c, { variable_name: '', json_path: '' }]);
  const updateCapture = (i, updated) => setCaptures(c => c.map((item, idx) => idx === i ? updated : item));
  const removeCapture = (i) => setCaptures(c => c.filter((_, idx) => idx !== i));

  const hasRules = captures.some(c => c.variable_name.trim() && c.json_path.trim());

  // Names already visible to this request, offered as suggestions so a rule can
  // target an existing variable without retyping (and misspelling) its name.
  // The list follows the same live data as the {{name}} autocomplete, so a
  // variable a capture just created shows up here too.
  const existingKeys = new Set(variables.map(v => v.key));
  const nameListId = `capture-names-${requestId}`;

  return (
    <div className="h-full overflow-y-auto p-4">
      <p className={`${text('xs')} text-muted-foreground mb-3`}>
        {t('captures.description')}
      </p>

      <VariableSyntaxHelp variant="capture" />

      {/* Without an active environment there is nowhere to store captured
          values, which otherwise looks like the rules being ignored. */}
      {hasRules && !activeEnvironment && (
        <div className={`flex items-start gap-2 mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 ${text('xs')} text-amber-700 dark:text-amber-300`}>
          <AlertTriangle className={`${icon} flex-shrink-0 mt-0.5`} />
          <span>{t('captures.noEnvironmentWarning')}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('captures.variableName')}</span>
          <span className="w-3" />
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('captures.jsonPath')}</span>
          <span className="w-5" />
        </div>
        <datalist id={nameListId}>
          {[...existingKeys].map(key => <option key={key} value={key} />)}
        </datalist>
        {captures.map((c, i) => (
          <CaptureRow
            key={i}
            capture={c}
            onChange={updated => updateCapture(i, updated)}
            onDelete={() => removeCapture(i)}
            iconClass={icon}
            textXs={text('xs')}
            listId={nameListId}
            existingKeys={existingKeys}
            t={t}
          />
        ))}
        <button
          onClick={addCapture}
          className={`flex items-center gap-1 ${text('xs')} text-muted-foreground hover:text-foreground py-1`}
        >
          <Plus className={icon} /> {t('captures.addRule')}
        </button>
      </div>

      {results?.length > 0 && (
        <CaptureResults results={results} t={t} textXs={text('xs')} iconClass={icon} />
      )}
    </div>
  );
}
