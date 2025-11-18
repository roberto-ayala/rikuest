import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, Terminal, Code, FileCode } from 'lucide-react';
import { adapterFactory } from '../adapters/adapterFactory';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  oneLight,
  oneDark
} from 'react-syntax-highlighter/dist/esm/styles/prism';

const CopyFormatModal = ({ isOpen, onClose, requestId }) => {
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState('raw');
  const [formats, setFormats] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  // Use default theme based on dark/light mode
  const getResponseTheme = () => {
    return isDark ? oneDark : oneLight;
  };

  // Load formats when modal opens
  useEffect(() => {
    if (isOpen && requestId) {
      loadFormats();
    }
  }, [isOpen, requestId]);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Load all formats for the request
  const loadFormats = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const adapter = await adapterFactory.getAdapter();
      const response = await adapter.copyAllRequestFormats(requestId);
      
      // The response contains a 'formats' object with all formats
      setFormats(response.formats || response);
    } catch (error) {
      console.error('Failed to load formats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get language for syntax highlighting
  const getLanguage = () => {
    switch (activeFormat) {
      case 'raw':
        return 'http';
      case 'curl':
        return 'bash';
      case 'fetch':
        return 'javascript';
      case 'python':
        return 'python';
      default:
        return 'text';
    }
  };

  // Copy to clipboard function
  const handleCopy = async () => {
    const content = formats[activeFormat];
    if (!content) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTabs = [
    { id: 'raw', label: 'Raw HTTP', icon: FileText },
    { id: 'curl', label: 'cURL', icon: Terminal },
    { id: 'fetch', label: 'JavaScript Fetch', icon: Code },
    { id: 'python', label: 'Python Requests', icon: FileCode }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Copy Request
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!formats[activeFormat] || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar with format tabs */}
          <div className="w-48 border-r border-border bg-muted/30 flex-shrink-0">
            <div className="p-2">
              {formatTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFormat(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors mb-1 ${
                      activeFormat === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading formats...</p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <SyntaxHighlighter
                  language={getLanguage()}
                  style={getResponseTheme()}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '0.875rem',
                    backgroundColor: 'hsl(var(--background))',
                    padding: '1rem'
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {formats[activeFormat] || ''}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default CopyFormatModal;
