import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Input } from './ui';
import { Search } from 'lucide-react';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { useRequestStore } from '../stores/requestStore';
import { useFolderStore } from '../stores/folderStore';
import { getMethodColor } from '../lib/utils';

const MAX_RESULTS = 50;

function GlobalSearch({ isOpen, onClose }) {
  const { text, spacing, icon } = useUISize();
  const { t } = useTranslation();
  const requests = useRequestStore(state => state.requests);
  const openTab = useRequestStore(state => state.openTab);
  const folders = useFolderStore(state => state.folders);

  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      // Focus after the dialog has mounted/animated in.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const list = (Array.isArray(requests) ? requests : []).filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.url && r.url.toLowerCase().includes(q))
    );

    list.sort((a, b) => {
      const aExact = (a.name || '').toLowerCase() === q;
      const bExact = (b.name || '').toLowerCase() === q;
      if (aExact === bExact) return 0;
      return aExact ? -1 : 1;
    });

    return list.slice(0, MAX_RESULTS);
  }, [requests, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const getFolderName = (folderId) => {
    if (folderId === null || folderId === undefined) return '';
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : '';
  };

  const handleOpenResult = (request) => {
    if (!request) return;
    openTab(request);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (results.length === 0 ? 0 : (prev - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleOpenResult(results[highlightedIndex]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" align="top" className="overflow-hidden">
        <div className={`flex items-center gap-2 border-b border-border ${spacing(4)}`}>
          <Search className={`${icon} text-muted-foreground flex-shrink-0`} />
          <Input
            variant="borderless"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className={`${text('sm')} text-foreground`}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.trim() === '' ? (
            <div className={`${spacing(6)} text-center ${text('sm')} text-muted-foreground`}>
              {t('search.typeToSearch')}
            </div>
          ) : results.length === 0 ? (
            <div className={`${spacing(6)} text-center ${text('sm')} text-muted-foreground`}>
              {t('search.noResults')}
            </div>
          ) : (
            <div className="py-1">
              {results.map((request, index) => {
                const folderName = getFolderName(request.folder_id);
                return (
                  <button
                    key={request.id}
                    type="button"
                    className={`w-full text-left flex items-center gap-3 px-4 py-2 ${
                      index === highlightedIndex ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleOpenResult(request)}
                  >
                    <span
                      className={`flex-shrink-0 px-1.5 py-0.5 rounded border font-mono ${text('xs')} ${getMethodColor(request.method)}`}
                    >
                      {request.method}
                    </span>
                    <span className={`${text('sm')} text-foreground truncate flex-shrink-0 max-w-[40%]`}>
                      {request.name || t('request.untitled')}
                    </span>
                    <span className={`${text('xs')} text-muted-foreground truncate flex-1`}>
                      {request.url}
                    </span>
                    {folderName && (
                      <span className={`${text('xs')} text-muted-foreground flex-shrink-0`}>
                        {folderName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
    </Modal>
  );
}

export default GlobalSearch;
