import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from './ui/Input';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

function CaptureRow({ capture, onChange, onDelete, iconClass, textXs }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1 font-mono"
        placeholder="variableName"
        value={capture.variable_name}
        onChange={e => onChange({ ...capture, variable_name: e.target.value })}
      />
      <span className={`${textXs} text-muted-foreground flex-shrink-0`}>=</span>
      <Input
        className="flex-1 font-mono"
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

export default function ResponseCapturesPanel({ requestId }) {
  const { t } = useTranslation();
  const { text, icon } = useUISize();
  const [captures, setCaptures] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load captures when request changes
  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    adapterFactory.getAdapter().then(adapter =>
      adapter.getResponseCaptures(requestId)
    ).then(data => {
      if (!cancelled) {
        setCaptures(data || []);
        setLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [requestId]);

  // Debounced auto-save
  useEffect(() => {
    if (!loaded || !requestId) return;
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
  }, [captures, requestId, loaded]);

  const addCapture = () => setCaptures(c => [...c, { variable_name: '', json_path: '' }]);
  const updateCapture = (i, updated) => setCaptures(c => c.map((item, idx) => idx === i ? updated : item));
  const removeCapture = (i) => setCaptures(c => c.filter((_, idx) => idx !== i));

  return (
    <div className="h-full overflow-y-auto p-4">
      <p className={`${text('xs')} text-muted-foreground mb-3`}>
        {t('captures.description')}
      </p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('captures.variableName')}</span>
          <span className="w-3" />
          <span className={`flex-1 ${text('xs')} text-muted-foreground`}>{t('captures.jsonPath')}</span>
          <span className="w-5" />
        </div>
        {captures.map((c, i) => (
          <CaptureRow
            key={i}
            capture={c}
            onChange={updated => updateCapture(i, updated)}
            onDelete={() => removeCapture(i)}
            iconClass={icon}
            textXs={text('xs')}
          />
        ))}
        <button
          onClick={addCapture}
          className={`flex items-center gap-1 ${text('xs')} text-muted-foreground hover:text-foreground py-1`}
        >
          <Plus className={icon} /> {t('captures.addRule')}
        </button>
      </div>
    </div>
  );
}
