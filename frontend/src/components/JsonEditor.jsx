import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useTranslation } from '../hooks/useTranslation';
import { useMonacoAppTheme, MONACO_FONT_FAMILY } from '../hooks/useMonacoAppTheme';
import { VARIABLE_PATTERN } from '../lib/variables';
import './JsonEditor.css';

const JsonEditor = ({ value, onChange, placeholder, className, variables = [] }) => {
  const editorRef = useRef(null);
  const completionRef = useRef(null);
  const decorationsRef = useRef(null);
  // Read inside the completion provider, which is registered once per mount.
  const variablesRef = useRef(variables);
  variablesRef.current = variables;
  const [isValidJson, setIsValidJson] = useState(true);
  const { t } = useTranslation();

  // Theme, background tint and text size are shared with the response viewer so
  // both editors stay identical.
  const { themeName, fontSize, lineHeight, defineTheme, handleEditorWillMount } =
    useMonacoAppTheme({ editorRef });


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

  // Registers {{name}} completion for the body editor. Kept in a ref so the
  // provider is disposed on unmount instead of stacking up per mount.
  const registerVariableCompletion = (monaco) => {
    completionRef.current?.dispose();
    completionRef.current = monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['{'],
      provideCompletionItems: (model, position) => {
        const line = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const open = /\{\{(\w*)$/.exec(line);
        if (!open) return { suggestions: [] };

        const typed = open[1];
        const startColumn = position.column - typed.length;
        // Auto-closing brackets may already have inserted the `}}`; only add
        // the closing braces when they are not there yet.
        const afterCursor = model.getLineContent(position.lineNumber).slice(position.column - 1);
        const closer = afterCursor.startsWith('}}') ? '' : '}}';

        return {
          suggestions: (variablesRef.current || []).map(variable => ({
            label: variable.key,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: variable.value,
            documentation: variable.source_name || variable.source,
            insertText: `${variable.key}${closer}`,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn,
              endColumn: position.column,
            },
          })),
        };
      },
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    registerVariableCompletion(monaco);
    decorationsRef.current = editor.createDecorationsCollection([]);
    
    defineTheme(monaco);
    
    // Configure editor options with dynamic sizing
    editor.updateOptions({
      tabSize: 2,
      insertSpaces: true,
      fontSize,
      lineHeight,
      fontFamily: MONACO_FONT_FAMILY,
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

  // Colors {{name}} placeholders inside the body: resolvable ones green,
  // undefined ones amber, matching the VariableInput fields.
  useEffect(() => {
    const editor = editorRef.current;
    const collection = decorationsRef.current;
    if (!editor || !collection) return;

    const model = editor.getModel();
    if (!model) return;

    const known = new Set((variables || []).map(v => v.key));
    const decorations = [];
    const pattern = new RegExp(VARIABLE_PATTERN.source, 'g');

    for (let line = 1; line <= model.getLineCount(); line++) {
      const content = model.getLineContent(line);
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        decorations.push({
          range: {
            startLineNumber: line,
            endLineNumber: line,
            startColumn: match.index + 1,
            endColumn: match.index + match[0].length + 1,
          },
          options: {
            inlineClassName: known.has(match[1]) ? 'rikuest-variable-known' : 'rikuest-variable-unknown',
          },
        });
      }
    }
    collection.set(decorations);
  }, [value, variables]);

  // Drop the completion provider when the editor goes away.
  useEffect(() => () => {
    completionRef.current?.dispose();
    completionRef.current = null;
  }, []);

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

  return (
    <div className="json-editor relative" style={{ height: '100%' }}>
      <Editor
        height="100%"
        language="json"
        theme={themeName}
        value={value}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount}
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
          title={t('jsonEditor.formatTooltip')}
          style={{
            fontSize: Math.max(10, fontSize - 3) + 'px'
          }}
        >
          {t('jsonEditor.format')}
        </button>
      )}
      
      {/* JSON validation indicator */}
      {value && value.trim() && (
        <div className="absolute bottom-2 right-2 flex items-center z-10">
          <div 
            className={`status-indicator ${isValidJson ? 'valid' : 'invalid'}`}
            title={isValidJson ? t('jsonEditor.validJson') : t('jsonEditor.invalidJson')}
            style={{
              width: Math.max(6, fontSize * 0.6) + 'px',
              height: Math.max(6, fontSize * 0.6) + 'px'
            }}
          />
          <div 
            className="tooltip"
            style={{
              fontSize: Math.max(9, fontSize - 4) + 'px'
            }}
          >
            {isValidJson ? t('jsonEditor.validJson') : t('jsonEditor.invalidJson')}
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;