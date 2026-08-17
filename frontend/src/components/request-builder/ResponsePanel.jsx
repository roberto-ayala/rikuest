import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Send, Loader2, BarChart3, Timer, HardDrive, Calendar,
  Copy, Braces, AlignLeft, WrapText, Search, ImageOff
} from 'lucide-react';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { useMonacoAppTheme, MONACO_FONT_FAMILY } from '../../hooks/useMonacoAppTheme';
import { formatSize } from '../../lib/utils';
import { addToast } from '../../stores/toastStore';

const VIEW_MODE_STORAGE_KEY = 'rikuest-response-view';
const WRAP_STORAGE_KEY = 'rikuest-response-wrap';

// Monaco renders only the lines in view and tokenizes as it scrolls, so body
// size stops driving DOM size. Above this the extras that do scale with the
// document (folding ranges, bracket pairs, occurrence highlighting) are dropped
// too, which is the same "large file optimizations" trade editors make.
const LARGE_BODY_BYTES = 512 * 1024;

// Languages the response viewer can ask Monaco for; anything else is plain text.
const MONACO_LANGUAGES = { json: 'json', html: 'html', xml: 'xml', css: 'css', javascript: 'javascript' };

const ResponseViewer = React.memo(({ content, language, wrap, editorRef }) => {
  const { themeName, fontSize, lineHeight, handleEditorWillMount } = useMonacoAppTheme({ editorRef });
  const isLarge = content.length > LARGE_BODY_BYTES;

  const options = useMemo(() => ({
    readOnly: true,
    // Read-only still shows a caret and allows selection; this only hides the
    // "cannot edit in read-only editor" tooltip on keypress.
    domReadOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: wrap ? 'on' : 'off',
    lineNumbers: 'on',
    folding: !isLarge,
    bracketPairColorization: { enabled: !isLarge },
    occurrencesHighlight: isLarge ? 'off' : 'singleFile',
    renderLineHighlight: 'none',
    fontFamily: MONACO_FONT_FAMILY,
    fontSize,
    lineHeight,
    // Off on purpose: the platform already applies its own trackpad momentum,
    // and Monaco's animation on top of it reads as drift rather than scrolling.
    smoothScrolling: false,
    // The overview ruler is the strip of markers Monaco paints in the scrollbar
    // track. Nothing here produces markers, and it is the main thing that makes
    // the scrollbar look like a web editor's rather than the system's.
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      // Lets the surrounding page take over once the editor hits its end.
      alwaysConsumeMouseWheel: false,
      // Monaco's inner shadow on scroll has no platform equivalent.
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    contextmenu: true,
  }), [wrap, isLarge, fontSize, lineHeight]);

  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGES[language] || 'plaintext'}
      value={content}
      theme={themeName}
      beforeMount={handleEditorWillMount}
      onMount={(editor) => { editorRef.current = editor; }}
      options={options}
      loading=""
    />
  );
});

ResponseViewer.displayName = 'ResponseViewer';


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

  // Fallback: detect by content structure. The trim and the parse only happen
  // here, so a body whose content-type already answered the question is never
  // copied or parsed just to pick a language.
  const body = currentResponse.body.trim();
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
  const { text, tab: tabStyle } = useUISize();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState(() => localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'pretty');
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem(WRAP_STORAGE_KEY) === 'true');
  const editorRef = useRef(null);

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

  // Detection can fall back to parsing the whole body, so it is tied to the
  // response rather than re-run on every render.
  const bodyLanguage = useMemo(() => getResponseLanguage(currentResponse), [currentResponse]);

  // Pretty-printing is a parse plus a serialize of the whole body: memoized so
  // it is not redone by unrelated renders, such as toggling word wrap.
  const bodyContent = useMemo(() => {
    const body = currentResponse?.body || '';
    if (viewMode === 'raw' || bodyLanguage !== 'json') return body;
    return formatJson(body);
  }, [currentResponse?.body, viewMode, bodyLanguage]);

  // Search is the editor's own find widget: it works off the text model rather
  // than the rendered DOM, so it finds matches in lines that were never drawn.
  const openSearch = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.getAction('actions.find')?.run();
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
                  className={toolbarButtonClass(false)}
                  onClick={openSearch}
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
          ) : (
            <ResponseViewer
              content={bodyContent}
              language={viewMode === 'raw' ? 'text' : bodyLanguage}
              wrap={wordWrap}
              editorRef={editorRef}
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
          <div className="h-full">
            {currentResponse.raw_request ? (
              <ResponseViewer
                content={currentResponse.raw_request}
                language="text"
                wrap={wordWrap}
                editorRef={editorRef}
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
