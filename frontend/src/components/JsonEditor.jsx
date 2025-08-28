import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useUISize } from '../hooks/useUISize';
import { useUIStore } from '../stores/uiStore';
import './JsonEditor.css';

const JsonEditor = ({ value, onChange, placeholder, className }) => {
  const editorRef = useRef(null);
  const [isValidJson, setIsValidJson] = useState(true);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const { config } = useUISize();
  
  // Subscribe to background color changes
  const { theme, backgroundColorLight, backgroundColorDark } = useUIStore();

  // Get font size based on UI size configuration
  const getFontSize = () => {
    // Extract font size from text.sm configuration
    const textSm = config.text.sm;
    if (textSm.includes('text-xs')) return 12;
    if (textSm.includes('text-sm')) return 14;
    if (textSm.includes('text-base')) return 16;
    if (textSm.includes('text-lg')) return 18;
    return 14; // default fallback
  };

  const getLineHeight = () => {
    // Calculate line height based on font size
    const fontSize = getFontSize();
    return fontSize * 1.4; // 1.4 ratio for good readability
  };

  const getEditorHeight = () => {
    // Calculate editor height based on UI size
    const fontSize = getFontSize();
    // Base height + scaled with font size
    const baseHeight = 200;
    const scaleFactor = fontSize / 14; // 14 is the default font size
    return Math.max(180, baseHeight * scaleFactor);
  };

  // Get app background color from CSS variables with fallback
  const getAppBackgroundColor = useCallback(() => {
    if (typeof window === 'undefined') return isDark ? '#0f0f23' : '#ffffff';
    
    // First try to get the current background color selection
    const { 
      theme, 
      backgroundColorLight, 
      backgroundColorDark, 
      getBackgroundColors 
    } = useUIStore.getState();
    
    // Determine effective theme
    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Get background colors and find current selection
    const backgroundColors = getBackgroundColors();
    const currentBgId = effectiveTheme === 'dark' ? backgroundColorDark : backgroundColorLight;
    const currentBgConfig = backgroundColors[effectiveTheme]?.find(bg => bg.id === currentBgId);
    
    if (currentBgConfig) {
      return currentBgConfig.preview;
    }
    
    // Fallback to CSS variable if no background selection
    const root = getComputedStyle(document.documentElement);
    let bgColor = root.getPropertyValue('--background').trim();
    
    if (bgColor) {
      // Handle HSL format: "220 14% 96%" or "hsl(220, 14%, 96%)"
      if (bgColor.includes(' ')) {
        // Remove any hsl() wrapper if present
        bgColor = bgColor.replace(/^hsl\(|\)$/g, '');
        const values = bgColor.split(/[\s,]+/).map(v => v.replace('%', ''));
        
        if (values.length >= 3) {
          const h = parseFloat(values[0]);
          const s = parseFloat(values[1]);
          const l = parseFloat(values[2]);
          return hslToHex(h, s, l);
        }
      }
      
      // Handle hex colors directly
      if (bgColor.startsWith('#')) {
        return bgColor;
      }
      
      // Handle rgb format
      if (bgColor.startsWith('rgb')) {
        const match = bgColor.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0]);
          const g = parseInt(match[1]);
          const b = parseInt(match[2]);
          return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
      }
    }
    
    // Fallback colors
    return isDark ? '#0f0f23' : '#ffffff';
  }, [isDark]);

  // Helper to convert HSL to hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Setup custom theme with app background
  const setupAppTheme = useCallback((monaco) => {
    const themeName = isDark ? 'app-dark' : 'app-light';
    const baseTheme = isDark ? 'vs-dark' : 'vs';
    const backgroundColor = getAppBackgroundColor();
    
    monaco.editor.defineTheme(themeName, {
      base: baseTheme,
      inherit: true,
      rules: [], // Keep all default syntax highlighting
      colors: {
        'editor.background': backgroundColor,
      }
    });
    
    return themeName;
  }, [isDark, getAppBackgroundColor]);

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

  // Update theme when dark mode changes or background colors change
  useEffect(() => {
    if (editorRef.current && window.monaco) {
      const monaco = window.monaco;
      const themeName = setupAppTheme(monaco);
      monaco.editor.setTheme(themeName);
    }
  }, [isDark, setupAppTheme, theme, backgroundColorLight, backgroundColorDark]);

  // Update editor font size when UI size changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: getFontSize(),
        lineHeight: getLineHeight()
      });
    }
  }, [config.text.sm]); // Re-run when text size configuration changes

  // Get Monaco theme based on app theme
  const getMonacoTheme = useCallback(() => {
    return isDark ? 'app-dark' : 'app-light';
  }, [isDark]);

  const handleEditorChange = (newValue) => {
    // Validate JSON
    if (newValue && newValue.trim()) {
      try {
        JSON.parse(newValue);
        setIsValidJson(true);
      } catch {
        setIsValidJson(false);
      }
    } else {
      setIsValidJson(true);
    }
    
    // Call the parent onChange with the same structure as textarea
    onChange({ target: { value: newValue || '' } });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Setup custom theme
    setupAppTheme(monaco);
    
    // Configure editor options with dynamic sizing
    editor.updateOptions({
      tabSize: 2,
      insertSpaces: true,
      fontSize: getFontSize(),
      lineHeight: getLineHeight(),
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Cascadia, "Roboto Mono", Menlo, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      renderWhitespace: 'selection',
      cursorBlinking: 'smooth',
      smoothScrolling: true
    });

    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      formatJson();
    });
  };

  const formatJson = () => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      try {
        const parsed = JSON.parse(currentValue);
        const formatted = JSON.stringify(parsed, null, 2);
        editorRef.current.setValue(formatted);
        setIsValidJson(true);
      } catch (error) {
        // Invalid JSON - do nothing
      }
    }
  };

  const editorHeight = getEditorHeight();

  return (
    <div className="json-editor relative" style={{ height: '100%' }}>
      <Editor
        height="100%"
        language="json"
        theme={getMonacoTheme()}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
          cursorStyle: 'line',
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          renderValidationDecorations: 'on',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          }
        }}
      />
      
      {/* Format button */}
      {value && value.trim() && (
        <button
          type="button"
          onClick={formatJson}
          className="format-button absolute top-2 right-2 z-10"
          title="Format JSON (Ctrl+Shift+F)"
          style={{
            fontSize: Math.max(10, getFontSize() - 3) + 'px'
          }}
        >
          Format
        </button>
      )}
      
      {/* JSON validation indicator */}
      {value && value.trim() && (
        <div className="absolute bottom-2 right-2 flex items-center z-10">
          <div 
            className={`status-indicator ${isValidJson ? 'valid' : 'invalid'}`}
            title={isValidJson ? 'Valid JSON' : 'Invalid JSON'}
            style={{
              width: Math.max(6, getFontSize() * 0.6) + 'px',
              height: Math.max(6, getFontSize() * 0.6) + 'px'
            }}
          />
          <div 
            className="tooltip"
            style={{
              fontSize: Math.max(9, getFontSize() - 4) + 'px'
            }}
          >
            {isValidJson ? 'Valid JSON' : 'Invalid JSON'}
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;