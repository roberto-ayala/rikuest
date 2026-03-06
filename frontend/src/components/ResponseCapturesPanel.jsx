import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { useTranslation } from '../hooks/useTranslation';

function CaptureRow({ capture, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
        placeholder="variableName"
        value={capture.variable_name}
        onChange={e => onChange({ ...capture, variable_name: e.target.value })}
      />
      <span className="text-xs text-muted-foreground flex-shrink-0">=</span>
      <input
        className="flex-1 h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
        placeholder="data.token"
        value={capture.json_path}
        onChange={e => onChange({ ...capture, json_path: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function ResponseCapturesPanel({ requestId }) {
  const { t } = useTranslation();
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
      <p className="text-xs text-muted-foreground mb-3">
        {t('captures.description')}
      </p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <span className="flex-1 text-xs text-muted-foreground">{t('captures.variableName')}</span>
          <span className="w-3" />
          <span className="flex-1 text-xs text-muted-foreground">{t('captures.jsonPath')}</span>
          <span className="w-5" />
        </div>
        {captures.map((c, i) => (
          <CaptureRow
            key={i}
            capture={c}
            onChange={updated => updateCapture(i, updated)}
            onDelete={() => removeCapture(i)}
          />
        ))}
        <button
          onClick={addCapture}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
        >
          <Plus size={12} /> {t('captures.addRule')}
        </button>
      </div>
    </div>
  );
}
