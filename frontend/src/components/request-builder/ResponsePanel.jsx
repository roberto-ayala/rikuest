import React from 'react';
import { Send, Loader2, BarChart3, Timer, HardDrive, Calendar } from 'lucide-react';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { useShikiHighlighter } from '../../hooks/useShikiHighlighter';
import { formatSize } from '../../lib/utils';

const HighlightedCode = React.memo(({ content, language, formatJson, textSize, config, showLineNumbers }) => {
  const { highlight, ready } = useShikiHighlighter();

  const fontSize = config.text.sm.includes('text-xs') ? '0.75rem' :
                   config.text.sm.includes('text-sm') ? '0.875rem' :
                   config.text.sm.includes('text-base') ? '1rem' : '1.125rem';

  const processedContent = language === 'json' ? formatJson(content) : (content || '');

  if (language === 'text' || !language) {
    return (
      <div className="h-full overflow-y-auto">
        <pre
          className={`${textSize} p-4 overflow-x-auto font-mono whitespace-pre-wrap break-words`}
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
          className={`shiki-wrapper${showLineNumbers ? ' line-numbers' : ''}`}
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={`${textSize} p-4 overflow-x-auto font-mono whitespace-pre-wrap`}
          style={{ fontSize }}
        >
          {processedContent}
        </pre>
      )}
    </div>
  );
});

HighlightedCode.displayName = 'HighlightedCode';

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

  const responseTabs = [
    { id: 'body', label: t('request.tabBody') },
    { id: 'headers', label: t('request.tabHeaders') },
    { id: 'raw', label: t('request.tabRawRequest') }
  ];

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
      </div>

      {/* Response Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeResponseTab === 'body' && (
          <HighlightedCode
            content={currentResponse.body}
            language={getResponseLanguage(currentResponse)}
            formatJson={formatJson}
            textSize={text('sm')}
            config={config}
            showLineNumbers
          />
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
