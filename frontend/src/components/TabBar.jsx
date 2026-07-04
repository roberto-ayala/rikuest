import React from 'react';
import { Loader2, X } from 'lucide-react';
import { useRequestStore } from '../stores/requestStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { getMethodColor } from '../lib/utils';

// Horizontal strip of open-request tabs, rendered above RequestBuilder.
// Reads entirely from requestStore (no prop drilling needed - it's a sibling
// of RequestBuilder under the same Zustand store).
function TabBar() {
  const { requests, openTabIds, activeTabId, executingIds, activateTab, closeTab } = useRequestStore();
  const { text } = useUISize();
  const { t } = useTranslation();

  if (!openTabIds || openTabIds.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={t('request.openTabs', 'Open request tabs')}
      className="flex items-stretch overflow-x-auto border-b border-border bg-background flex-shrink-0"
    >
      {openTabIds.map((id) => {
        const request = requests.find(r => r.id === id);
        const isActive = id === activeTabId;
        const isExecuting = executingIds.includes(id);
        const name = request?.name?.trim() || t('request.untitled', 'Untitled');
        const method = request?.method || 'GET';

        return (
          <div
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={`${method} ${name}`}
            tabIndex={0}
            onClick={() => activateTab(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateTab(id);
              }
            }}
            className={`group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer select-none whitespace-nowrap max-w-[200px] ${text('sm')} ${
              isActive
                ? 'bg-muted text-foreground border-b-2 border-b-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 border ${getMethodColor(method)}`}
              aria-hidden="true"
            />
            <span className="truncate flex-1 min-w-0">{name}</span>
            {isExecuting && (
              <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            <button
              type="button"
              aria-label={t('request.closeTab', 'Close tab')}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              className="flex-shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-background/80 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default TabBar;
