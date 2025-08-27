import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useUISize } from '../hooks/useUISize';
import './JsonEditor.css';

const JsonEditor = ({ value, onChange, placeholder, className }) => {
  const editorRef = useRef(null);
  const [isValidJson, setIsValidJson] = useState(true);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const { config } = useUISize();

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

  // Update editor font size when UI size changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: getFontSize(),
        lineHeight: getLineHeight()
      });
    }
  }, [config.text.sm]); // Re-run when text size configuration changes

  // Update editor theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      // Update the editor theme
      const monaco = window.monaco;
      if (monaco) {
        setupCustomThemes(monaco);
        monaco.editor.setTheme(isDark ? 'app-dark' : 'app-light');
      }
    }
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

  const setupCustomThemes = (monaco) => {
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

    // Custom dark theme that matches the app's exact CSS variables
    monaco.editor.defineTheme('app-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: hslToHex(210, 40, 98).slice(1) }, // --foreground
        { token: 'string', foreground: '22d3ee' }, // cyan for strings (complementary to primary)
        { token: 'number', foreground: '34d399' }, // emerald for numbers
        { token: 'keyword', foreground: hslToHex(195, 85, 52).slice(1) }, // --primary color
        { token: 'delimiter.bracket', foreground: '84cc16' }, // lime for brackets
        { token: 'delimiter.square', foreground: '84cc16' }, // lime for square brackets  
        { token: 'delimiter.curly', foreground: '84cc16' }, // lime for curly brackets
        { token: 'comment', foreground: hslToHex(215, 20.2, 65.1).slice(1) }, // --muted-foreground
      ],
      colors: {
        'editor.background': hslToHex(222.2, 84, 4.9), // --background
        'editor.foreground': hslToHex(210, 40, 98), // --foreground
        'editorLineNumber.foreground': hslToHex(215, 20.2, 65.1), // --muted-foreground
        'editorLineNumber.activeForeground': hslToHex(210, 40, 98), // --foreground
        'editor.selectionBackground': hslToHex(195, 85, 52) + '44', // --primary with opacity
        'editor.inactiveSelectionBackground': hslToHex(195, 85, 52) + '22',
        'editorCursor.foreground': hslToHex(195, 85, 52), // --primary
        'editor.lineHighlightBackground': hslToHex(217.2, 32.6, 17.5), // --muted
        'editorWidget.background': hslToHex(217.2, 32.6, 17.5), // --muted
        'editorWidget.border': hslToHex(217.2, 32.6, 17.5), // --border
        'editorSuggestWidget.background': hslToHex(217.2, 32.6, 17.5), // --muted
        'editorSuggestWidget.border': hslToHex(217.2, 32.6, 17.5), // --border
        'editorSuggestWidget.selectedBackground': hslToHex(217.2, 32.6, 22), // slightly lighter
        'editorHoverWidget.background': hslToHex(217.2, 32.6, 17.5), // --muted
        'editorHoverWidget.border': hslToHex(217.2, 32.6, 17.5), // --border
        'scrollbar.shadow': '#00000033',
        'scrollbarSlider.background': hslToHex(215, 20.2, 65.1) + '44', // --muted-foreground
        'scrollbarSlider.hoverBackground': hslToHex(215, 20.2, 65.1) + '66',
        'scrollbarSlider.activeBackground': hslToHex(215, 20.2, 65.1) + '88',
      }
    });

    // Custom light theme that matches the app's exact CSS variables
    monaco.editor.defineTheme('app-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: hslToHex(222.2, 84, 4.9).slice(1) }, // --foreground (light theme)
        { token: 'string', foreground: '0891b2' }, // cyan for strings
        { token: 'number', foreground: '059669' }, // emerald for numbers
        { token: 'keyword', foreground: hslToHex(195, 85, 41).slice(1) }, // --primary color (darker for light theme)
        { token: 'delimiter.bracket', foreground: '65a30d' }, // lime for brackets
        { token: 'delimiter.square', foreground: '65a30d' }, // lime for square brackets
        { token: 'delimiter.curly', foreground: '65a30d' }, // lime for curly brackets  
        { token: 'comment', foreground: hslToHex(215.4, 16.3, 46.9).slice(1) }, // --muted-foreground (light theme)
      ],
      colors: {
        'editor.background': hslToHex(0, 0, 100), // --background (light theme)
        'editor.foreground': hslToHex(222.2, 84, 4.9), // --foreground (light theme)  
        'editorLineNumber.foreground': hslToHex(215.4, 16.3, 46.9), // --muted-foreground
        'editorLineNumber.activeForeground': hslToHex(222.2, 84, 4.9), // --foreground
        'editor.selectionBackground': hslToHex(195, 85, 41) + '33', // --primary with opacity
        'editor.inactiveSelectionBackground': hslToHex(195, 85, 41) + '22',
        'editorCursor.foreground': hslToHex(195, 85, 41), // --primary
        'editor.lineHighlightBackground': hslToHex(210, 40, 96), // --muted (light theme)
        'editorWidget.background': hslToHex(0, 0, 100), // --background
        'editorWidget.border': hslToHex(214.3, 31.8, 91.4), // --border (light theme)
        'editorSuggestWidget.background': hslToHex(0, 0, 100), // --background
        'editorSuggestWidget.border': hslToHex(214.3, 31.8, 91.4), // --border
        'editorSuggestWidget.selectedBackground': hslToHex(210, 40, 98), // --secondary
        'editorHoverWidget.background': hslToHex(0, 0, 100), // --background
        'editorHoverWidget.border': hslToHex(214.3, 31.8, 91.4), // --border
        'scrollbar.shadow': '#00000011',
        'scrollbarSlider.background': hslToHex(215.4, 16.3, 46.9) + '22', // --muted-foreground
        'scrollbarSlider.hoverBackground': hslToHex(215.4, 16.3, 46.9) + '44',
        'scrollbarSlider.activeBackground': hslToHex(215.4, 16.3, 46.9) + '66',
      }
    });
  };


  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Setup custom themes
    setupCustomThemes(monaco);
    
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
    <div className="json-editor relative" style={{ minHeight: `${editorHeight}px` }}>
      <Editor
        height={`${editorHeight}px`}
        language="json"
        theme={isDark ? 'app-dark' : 'app-light'}
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