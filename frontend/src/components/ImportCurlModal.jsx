import React, { useState, useEffect, useRef } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal } from './ui';
import { X, Terminal, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useRequestStore } from '../stores/requestStore';
import { addToast } from '../stores/toastStore';
import { parseCurlCommand } from '../lib/curlParser';

const PARSE_DEBOUNCE_MS = 400;

// Derives a reasonable default request name from a URL's path, falling
// back to the host, then a generic label.
function deriveNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1];
    return parsed.hostname || url;
  } catch {
    return url;
  }
}

const ImportCurlModal = ({ isOpen, onClose, projectId }) => {
  const { text, input } = useUISize();
  const { t } = useTranslation();
  const { createRequest, fetchRequests, openTab } = useRequestStore();

  const [curlText, setCurlText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [importing, setImporting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!curlText.trim()) {
      setParsed(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      try {
        const result = parseCurlCommand(curlText);
        setParsed(result);
        setError(null);
        setName((prev) => prev || deriveNameFromUrl(result.url));
      } catch (err) {
        setParsed(null);
        setError(err.message || t('curlImport.errors.parseFailed'));
      }
    }, PARSE_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curlText]);

  const resetState = () => {
    setCurlText('');
    setParsed(null);
    setError(null);
    setName('');
    setImporting(false);
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!parsed) return;

    setImporting(true);
    setError(null);

    try {
      const newRequest = await createRequest({
        project_id: projectId,
        folder_id: null,
        name: name.trim() || deriveNameFromUrl(parsed.url),
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        body: parsed.body,
        body_type: parsed.body_type,
        query_params: [],
        form_data: [],
        auth_type: parsed.auth_type,
        bearer_token: parsed.bearer_token,
        basic_auth: parsed.basic_auth,
        insecure_skip_verify: parsed.insecure_skip_verify,
        follow_redirects: parsed.follow_redirects,
        timeout_seconds: parsed.timeout_seconds
      });

      await fetchRequests(projectId);
      openTab(newRequest);
      addToast('success', t('curlImport.imported'));

      resetState();
      onClose();
    } catch (err) {
      setError(err.message || t('curlImport.errors.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" className="p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <DialogTitle as="h2" className={`${text('xl')} font-semibold text-foreground flex items-center gap-2`}>
            <Terminal className="h-5 w-5" />
            {t('curlImport.title')}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={importing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <Textarea
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
            placeholder={t('curlImport.placeholder')}
            className={`min-h-[160px] font-mono ${text('sm')} resize-none`}
            disabled={importing}
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
              <p className={`${text('sm')} text-destructive flex-1`}>{error}</p>
            </div>
          )}

          {parsed && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className={`${text('xs')} text-muted-foreground mb-1`}>{t('curlImport.preview')}</p>
                <div className="flex items-center gap-2">
                  <span className={`${text('xs')} font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold`}>
                    {parsed.method}
                  </span>
                  <span className={`${text('sm')} font-mono text-foreground truncate`}>{parsed.url}</span>
                </div>
              </div>

              <div>
                <label className={`${text('sm')} font-medium mb-2 block`}>{t('curlImport.nameLabel')}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('curlImport.namePlaceholder')}
                  className={`w-full ${input}`}
                  disabled={importing}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-border flex-shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={importing}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleImport} disabled={importing || !parsed}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('curlImport.importing')}
              </>
            ) : (
              t('curlImport.import')
            )}
          </Button>
        </div>
    </Modal>
  );
};

export default ImportCurlModal;
