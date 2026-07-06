import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send, Loader2, BarChart3, Timer, HardDrive, Calendar,
  Copy, Braces, AlignLeft, WrapText, Search, ChevronUp, ChevronDown, X, ImageOff
} from 'lucide-react';
import { Input } from '../ui';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { useShikiHighlighter } from '../../hooks/useShikiHighlighter';
import { formatSize } from '../../lib/utils';
import { addToast } from '../../stores/toastStore';

const VIEW_MODE_STORAGE_KEY = 'rikuest-response-view';
const WRAP_STORAGE_KEY = 'rikuest-response-wrap';

const HighlightedCode = React.memo(({ content, language, formatJson, textSize, config, showLineNumbers, wrap = true }) => {
  const { highlight, ready } = useShikiHighlighter();

  const fontSize = config.text.sm.includes('text-xs') ? '0.75rem' :
                   config.text.sm.includes('text-sm') ? '0.875rem' :
                   config.text.sm.includes('text-base') ? '1rem' : '1.125rem';

  const processedContent = language === 'json' ? formatJson(content) : (content || '');
  const wrapClass = wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre';

  if (language === 'text' || !language) {
    return (
      <div className="h-full overflow-y-auto">
        <pre
          className={`${textSize} p-4 overflow-x-auto font-mono ${wrapClass}`}
          style={{ fontSize }}
        >
          {content}
        </pre>
      </div>
    );
  }

  const html = ready ? highlight(processedContent, language, { lineNumbers: showLineNumbers }) : null;

  return (
    <div className="h-full overflow-y-auto">
      {html ? (
        <div
          className={`shiki-wrapper${showLineNumbers ? ' line-numbers' : ''}${wrap === false ? ' no-wrap' : ''}`}
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={`${textSize} p-4 overflow-x-auto font-mono ${wrapClass}`}
          style={{ fontSize }}
        >
          {processedContent}
        </pre>
      )}
    </div>
  );
});

HighlightedCode.displayName = 'HighlightedCode';

// Plain-text body view used for the "raw" body mode and for search - renders
// the untouched body and (optionally) wraps individual matches in <mark>
// elements so the caller can scroll to and highlight the active match.
const RawBody = React.memo(({ content, textSize, wrap, searchQuery, currentMatchIndex, matchRefs }) => {
  const wrapClass = wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre';

  const segments = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const lowerContent = (content || '').toLowerCase();
    const parts = [];
    let lastIndex = 0;
    let matchIndex = 0;
    let searchIndex = lowerContent.indexOf(query, 0);

    while (searchIndex !== -1) {
      if (searchIndex > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, searchIndex) });
      }
      parts.push({ type: 'match', value: content.slice(searchIndex, searchIndex + query.length), index: matchIndex });
      lastIndex = searchIndex + query.length;
      matchIndex += 1;
      searchIndex = lowerContent.indexOf(query, lastIndex);
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return parts;
  }, [content, searchQuery]);

  return (
    <div className="h-full overflow-y-auto">
      <pre className={`${textSize} p-4 overflow-x-auto font-mono ${wrapClass}`}>
        {segments ? (
          segments.map((part, i) =>
            part.type === 'match' ? (
              <mark
                key={i}
                ref={(el) => { if (matchRefs?.current) matchRefs.current[part.index] = el; }}
                className={part.index === currentMatchIndex
                  ? 'bg-orange-400/70 text-foreground rounded-sm'
                  : 'bg-yellow-300/50 dark:bg-yellow-500/30 text-foreground rounded-sm'}
              >
                {part.value}
              </mark>
            ) : (
              <React.Fragment key={i}>{part.value}</React.Fragment>
            )
          )
        ) : (
          content
        )}
      </pre>
    </div>
  );
});

RawBody.displayName = 'RawBody';

const getStatusColor = (status) => {
  if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
  if (status >= 300 && status < 400) return 'text-yellow-600 bg-yellow-50';
  if (status >= 400) return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
};

const formatJson = (jsonString) => {
  try {
    return JSON.stringify(JSON.parse(jsonString), null, 2);
  } catch {
    return jsonString;
  }
};

// Case-insensitive header lookup - backend response headers come back with
// their original (often canonical "Content-Type") casing.
const getHeaderValue = (headers, name) => {
  if (!headers) return '';
  const lowerName = name.toLowerCase();
  const found = Object.keys(headers).find((key) => key.toLowerCase() === lowerName);
  return found ? headers[found] : '';
};

// Binary-ish content types can't be faithfully previewed: the backend reads
// the response body into a Go string and it is later JSON-encoded to reach
// the frontend, which mangles non-UTF-8 bytes (invalid sequences get
// replaced/escaped). Rather than dump corrupted bytes, show a placeholder.
const isBinaryContentType = (contentType) => {
  if (!contentType) return false;
  const type = contentType.toLowerCase();
  return (
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    type.startsWith('audio/') ||
    type.startsWith('font/') ||
    type.includes('application/pdf') ||
    type.includes('application/octet-stream') ||
    type.includes('application/zip') ||
    type.includes('application/x-msdownload') ||
    type.includes('application/vnd.ms-') ||
    type.includes('application/vnd.openxmlformats')
  );
};

const getResponseLanguage = (currentResponse) => {
  if (!currentResponse || !currentResponse.body) return 'text';

  const contentType = currentResponse.headers?.['content-type'] || '';
  const body = currentResponse.body.trim();

  // Check content type first
  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    return 'json';
  }
  if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
    return 'html';
  }
  if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
    return 'xml';
  }
  if (contentType.includes('text/css')) {
    return 'css';
  }
  if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
    return 'javascript';
  }

  // Fallback: detect by content structure
  try {
    JSON.parse(body);
    return 'json';
  } catch {
    if (body.startsWith('<!DOCTYPE') || body.startsWith('<html') || /<[^>]+>/.test(body)) {
      return 'html';
    }
    if (body.startsWith('<?xml') || /<[^>]+>/.test(body)) {
      return 'xml';
    }
  }

  return 'text';
};

function ResponsePanel({ currentResponse, executing, loadingHistoryItem, activeResponseTab, setActiveResponseTab }) {
  const { text, tab: tabStyle, config } = useUISize();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'pretty');
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem(WRAP_STORAGE_KEY) === 'true');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef([]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(WRAP_STORAGE_KEY, String(wordWrap));
  }, [wordWrap]);

  const responseTabs = [
    { id: 'body', label: t('request.tabBody') },
    { id: 'headers', label: t('request.tabHeaders') },
    { id: 'raw', label: t('request.tabRawRequest') }
  ];

  const contentType = getHeaderValue(currentResponse?.headers, 'content-type');
  const isBinaryBody = isBinaryContentType(contentType);
  const isImageBody = contentType.toLowerCase().startsWith('image/');

  const matchCount = useMemo(() => {
    if (!searchQuery || !searchQuery.trim() || !currentResponse?.body) return 0;
    const query = searchQuery.toLowerCase();
    const lowerBody = currentResponse.body.toLowerCase();
    let count = 0;
    let index = lowerBody.indexOf(query);
    while (index !== -1) {
      count += 1;
      index = lowerBody.indexOf(query, index + query.length);
    }
    return count;
  }, [searchQuery, currentResponse?.body]);

  // Keep the active match index in range as the query/matches change.
  useEffect(() => {
    matchRefs.current = [];
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const scrollToMatch = useCallback((index) => {
    // Deferred so the DOM has re-rendered the <mark> refs first.
    requestAnimationFrame(() => {
      const el = matchRefs.current[index];
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const goToNextMatch = () => {
    if (matchCount === 0) return;
    const next = (currentMatchIndex + 1) % matchCount;
    setCurrentMatchIndex(next);
    scrollToMatch(next);
  };

  const goToPrevMatch = () => {
    if (matchCount === 0) return;
    const prev = (currentMatchIndex - 1 + matchCount) % matchCount;
    setCurrentMatchIndex(prev);
    scrollToMatch(prev);
  };

  const openSearch = () => {
    // Highlighting matches inside Shiki's generated HTML is fragile, so
    // search only operates against the raw body view - switch to it.
    setViewMode('raw');
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const getCurrentTabContent = () => {
    if (!currentResponse) return '';
    if (activeResponseTab === 'headers') {
      return Object.entries(currentResponse.headers || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    if (activeResponseTab === 'raw') {
      return currentResponse.raw_request || '';
    }
    return currentResponse.body || '';
  };

  const handleCopy = async () => {
    const content = getCurrentTabContent();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      addToast('success', t('response.copied'));
    } catch {
      addToast('error', t('response.copyFailed'));
    }
  };

  if (loadingHistoryItem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto animate-pulse">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className={`${text('lg')} font-medium text-foreground`}>{t('request.loadingHistoryTitle')}</h3>
            <p className={`${text('sm')} text-muted-foreground`}>{t('request.loadingHistoryDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (executing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
          <div>
            <h3 className={`${text('lg')} font-medium text-foreground`}>{t('request.executingTitle')}</h3>
            <p className={`${text('sm')} text-muted-foreground`}>{t('request.executingDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentResponse) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className={`${text('lg')} font-medium text-foreground`}>{t('request.noResponse')}</h3>
            <p className={`${text('sm')} text-muted-foreground`}>{t('request.noResponseDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  const toolbarButtonClass = (active) =>
    `h-6 w-6 flex items-center justify-center rounded transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Response Header */}
      <div className="border-b border-border p-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`px-2 py-1 rounded ${text('sm')} font-bold ${getStatusColor(currentResponse.status)}`}>
              {currentResponse.status_text}
            </div>
            <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
              <Timer className="h-3 w-3" />
              {currentResponse.duration}ms
            </span>
            <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
              <HardDrive className="h-3 w-3" />
              {formatSize(currentResponse.size)}
            </span>
            {currentResponse.executed_at && (
              <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
                <Calendar className="h-3 w-3" />
                {new Date(currentResponse.executed_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Response Tabs */}
      <div className="border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between pr-2">
          <div className="flex">
            {responseTabs.map((tab) => (
              <button
                key={tab.id}
                className={`${tabStyle} font-medium border-b-2 transition-colors ${
                  activeResponseTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                onClick={() => setActiveResponseTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {activeResponseTab === 'body' && !isBinaryBody && (
              <>
                <button
                  className={toolbarButtonClass(viewMode === 'pretty')}
                  onClick={() => setViewMode(viewMode === 'pretty' ? 'raw' : 'pretty')}
                  title={viewMode === 'pretty' ? t('response.switchToRaw') : t('response.switchToPretty')}
                >
                  {viewMode === 'pretty' ? <Braces className="h-3.5 w-3.5" /> : <AlignLeft className="h-3.5 w-3.5" />}
                </button>
                <button
                  className={toolbarButtonClass(wordWrap)}
                  onClick={() => setWordWrap(!wordWrap)}
                  title={t('response.toggleWrap')}
                >
                  <WrapText className="h-3.5 w-3.5" />
                </button>
                <button
                  className={toolbarButtonClass(searchOpen)}
                  onClick={() => (searchOpen ? closeSearch() : openSearch())}
                  title={t('response.search')}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              className={toolbarButtonClass(false)}
              onClick={handleCopy}
              title={t('response.copy')}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {searchOpen && activeResponseTab === 'body' && (
          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border bg-muted/30">
            <Input
              variant="borderless"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.shiftKey ? goToPrevMatch() : goToNextMatch();
                } else if (e.key === 'Escape') {
                  closeSearch();
                }
              }}
              placeholder={t('response.searchPlaceholder')}
              className={`flex-1 ${text('sm')}`}
            />
            <span className={`${text('xs')} text-muted-foreground whitespace-nowrap`}>
              {matchCount === 0
                ? t('response.noMatches')
                : t('response.matchCounter').replace('{current}', currentMatchIndex + 1).replace('{total}', matchCount)}
            </span>
            <button className={toolbarButtonClass(false)} onClick={goToPrevMatch} title={t('response.prevMatch')}>
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button className={toolbarButtonClass(false)} onClick={goToNextMatch} title={t('response.nextMatch')}>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button className={toolbarButtonClass(false)} onClick={closeSearch} title={t('response.closeSearch')}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Response Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeResponseTab === 'body' && (
          isBinaryBody ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto">
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className={`${text('sm')} text-foreground font-medium`}>
                  {t('response.binaryPreviewTitle')}
                </p>
                <p className={`${text('xs')} text-muted-foreground`}>
                  {t('response.binaryPreviewDesc')
                    .replace('{type}', contentType || (isImageBody ? 'image' : 'binary'))
                    .replace('{size}', formatSize(currentResponse.size))}
                </p>
              </div>
            </div>
          ) : viewMode === 'raw' ? (
            <RawBody
              content={currentResponse.body || ''}
              textSize={text('sm')}
              wrap={wordWrap}
              searchQuery={searchOpen ? searchQuery : ''}
              currentMatchIndex={currentMatchIndex}
              matchRefs={matchRefs}
            />
          ) : (
            <HighlightedCode
              content={currentResponse.body}
              language={getResponseLanguage(currentResponse)}
              formatJson={formatJson}
              textSize={text('sm')}
              config={config}
              showLineNumbers
              wrap={wordWrap}
            />
          )
        )}

        {activeResponseTab === 'headers' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-2">
              {Object.entries(currentResponse.headers || {}).map(([key, value]) => (
                <div key={key} className="flex py-2 border-b border-border last:border-b-0">
                  <div className={`w-1/3 font-medium ${text('sm')} text-foreground flex-shrink-0`}>{key}</div>
                  <div className={`flex-1 ${text('sm')} text-muted-foreground font-mono break-all`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeResponseTab === 'raw' && (
          <div className="h-full overflow-y-auto">
            {currentResponse.raw_request ? (
              <HighlightedCode
                content={currentResponse.raw_request}
                language="http"
                formatJson={formatJson}
                textSize={text('sm')}
                config={config}
              />
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Send className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className={`${text('sm')} text-muted-foreground`}>{t('request.rawNotAvailable')}</p>
                <p className={`${text('xs')} text-muted-foreground`}>{t('request.rawNotAvailableDesc')}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ResponsePanel;
