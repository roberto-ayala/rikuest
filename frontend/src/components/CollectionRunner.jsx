import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, PlayCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useFolderStore } from '../stores/folderStore';
import { useRequestStore } from '../stores/requestStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { addToast } from '../stores/toastStore';
import adapterFactory from '../adapters/adapterFactory';
import { getMethodColor, getHistoryStatusColor, collectRunnableRequests } from '../lib/utils';

function StatusIcon({ status }) {
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (status === 'success') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === 'error') {
    return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
  }
  return null;
}

function CollectionRunner({ isOpen, onClose, folder, projectId }) {
  const { text, spacing, button, icon, iconButton } = useUISize();
  const { t } = useTranslation();
  const { folders } = useFolderStore();
  const { requests } = useRequestStore();
  const { fetchEnvironments } = useEnvironmentStore();

  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const stopRequestedRef = useRef(false);
  const runIdRef = useRef(0);

  const runnableRequests = useMemo(
    () => (folder ? collectRunnableRequests(folder, folders, requests) : []),
    [folder, folders, requests]
  );

  useEffect(() => {
    if (!isOpen) return;

    stopRequestedRef.current = false;
    setDone(false);
    setRunning(false);
    setItems(
      runnableRequests.map((r) => ({
        id: r.id,
        name: r.name,
        method: r.method,
        status: 'pending',
        statusCode: null,
        duration: null
      }))
    );

    if (runnableRequests.length === 0) return undefined;

    const runId = ++runIdRef.current;
    setRunning(true);

    const run = async () => {
      const adapter = await adapterFactory.getAdapter();
      let succeeded = 0;
      let failed = 0;

      for (const request of runnableRequests) {
        if (stopRequestedRef.current || runIdRef.current !== runId) break;

        setItems((prev) =>
          prev.map((it) => (it.id === request.id ? { ...it, status: 'running' } : it))
        );

        try {
          const response = await adapter.executeRequest(request.id);
          const isError = !response || !response.status || response.status === 0;
          if (isError) {
            failed += 1;
          } else {
            succeeded += 1;
          }
          setItems((prev) =>
            prev.map((it) =>
              it.id === request.id
                ? {
                    ...it,
                    status: isError ? 'error' : 'success',
                    statusCode: response?.status ?? 0,
                    duration: response?.duration ?? null
                  }
                : it
            )
          );
        } catch {
          failed += 1;
          setItems((prev) =>
            prev.map((it) =>
              it.id === request.id ? { ...it, status: 'error', statusCode: 0, duration: null } : it
            )
          );
        }
      }

      if (runIdRef.current !== runId) return;

      setRunning(false);
      setDone(true);

      if (projectId) {
        fetchEnvironments(projectId);
      }

      const summary = `${succeeded} ${t('runner.succeeded')}, ${failed} ${t('runner.failed')}`;
      addToast(failed > 0 ? 'error' : 'success', summary);
    };

    run();

    return () => {
      // Stop this run if the dialog is closed/reopened before it finishes.
      stopRequestedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, folder?.id]);

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  const succeededCount = items.filter((it) => it.status === 'success').length;

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        stopRequestedRef.current = true;
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden="true" />

      <DialogPanel className={`relative bg-card border border-border rounded-lg shadow-lg ${spacing(6)} m-4 max-w-xl w-full`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PlayCircle className={icon} />
            <DialogTitle as="h3" className={`${text('lg')} font-semibold text-foreground`}>
              {t('runner.title')}{folder ? `: ${folder.name}` : ''}
            </DialogTitle>
          </div>
          <button
            onClick={() => {
              stopRequestedRef.current = true;
              onClose();
            }}
            className={`${iconButton} hover:bg-muted rounded-md text-muted-foreground hover:text-foreground`}
            title={t('common.close')}
          >
            <X className={icon} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={`${text('sm')} text-muted-foreground py-6 text-center`}>
            {t('runner.noRequests')}
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto space-y-1 mb-4">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`${text('xs')} font-mono font-semibold px-1.5 py-0.5 rounded border ${getMethodColor(it.method)}`}
                    >
                      {it.method}
                    </span>
                    <span className={`${text('sm')} truncate`}>{it.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {it.status === 'success' || it.status === 'error' ? (
                      <span className={`${text('xs')} font-medium ${getHistoryStatusColor(it.statusCode)}`}>
                        {it.statusCode}{it.duration != null ? ` · ${it.duration}ms` : ''}
                      </span>
                    ) : null}
                    <StatusIcon status={it.status} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className={`${text('sm')} text-muted-foreground`}>
                {done ? `${t('runner.completed')}: ${succeededCount}/${items.length} ${t('runner.succeeded')}` : ''}
              </span>
              <div className="flex gap-2">
                {running && (
                  <button
                    onClick={handleStop}
                    className={`${button} border border-border rounded-md hover:bg-muted transition-colors`}
                  >
                    {t('runner.stop')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogPanel>
    </Dialog>
  );
}

export default CollectionRunner;
