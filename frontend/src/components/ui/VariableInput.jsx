import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useUISize } from '../../hooks/useUISize';
import { Input } from './Input';
import {
  completeVariable,
  filterVariables,
  getActiveVariableToken,
  tokenizeVariables,
} from '../../lib/variables';

const MAX_SUGGESTIONS = 8;

// Colors for {{name}} placeholders: resolvable ones read as "this will be
// substituted", unresolvable ones as "this will be sent literally".
const knownClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-[2px]';
const unknownClass = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-[2px]';

/**
 * Single-line input that highlights {{variable}} placeholders and completes
 * them from the variables visible to the current request. Drop-in replacement
 * for Input in any field where the backend resolves variables.
 *
 * The visible text is drawn by an overlay layer stacked on top of a
 * transparent-text input, so caret and selection stay native.
 */
const VariableInput = React.forwardRef(function VariableInput(
  { value = '', onChange, onKeyDown, variables = [], className, wrapperClassName, ...props },
  forwardedRef
) {
  const { input, text } = useUISize();
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const listRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [token, setToken] = useState(null);
  const [highlighted, setHighlighted] = useState(0);

  const setRefs = useCallback((node) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const knownKeys = useMemo(
    () => new Set((variables || []).map(v => v.key)),
    [variables]
  );
  const segments = useMemo(() => tokenizeVariables(value, knownKeys), [value, knownKeys]);

  const suggestions = useMemo(() => {
    if (!token) return [];
    return filterVariables(variables, token.query).slice(0, MAX_SUGGESTIONS);
  }, [token, variables]);

  const isOpen = suggestions.length > 0;
  // Masked fields keep their dots: rendering the highlight overlay there would
  // put the secret back on screen in plain text. Autocomplete still works.
  const masked = props.type === 'password';

  useEffect(() => {
    setHighlighted(0);
  }, [token?.query, token?.start]);

  // Keep the highlighted suggestion in view when navigating with the keyboard.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.children?.[highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const closeSuggestions = () => setToken(null);

  const refreshToken = (element) => {
    // Only suggest while typing at a single caret position, not on selections.
    if (element.selectionStart !== element.selectionEnd) return closeSuggestions();
    setToken(getActiveVariableToken(element.value, element.selectionStart));
  };

  const handleChange = (event) => {
    onChange?.(event);
    refreshToken(event.target);
  };

  const applySuggestion = (variable) => {
    const element = inputRef.current;
    if (!element || !token) return;

    const { value: nextValue, caret } = completeVariable(
      element.value,
      element.selectionStart,
      token,
      variable.key
    );

    // Mimic a user edit so controlled parents receive it through onChange.
    onChange?.({ target: { value: nextValue } });
    closeSuggestions();
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(caret, caret);
    });
  };

  const handleKeyDown = (event) => {
    // Ctrl/Cmd+Space opens the list without typing `{{` first.
    if (event.key === ' ' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      const element = event.target;
      const caret = element.selectionStart;
      const prefix = element.value.slice(0, caret);
      const openBraces = getActiveVariableToken(element.value, caret);
      if (openBraces) {
        setToken(openBraces);
      } else {
        onChange?.({ target: { value: prefix + '{{' + element.value.slice(caret) } });
        requestAnimationFrame(() => {
          const node = inputRef.current;
          if (!node) return;
          node.setSelectionRange(caret + 2, caret + 2);
          setToken(getActiveVariableToken(node.value, caret + 2));
        });
      }
      return;
    }

    if (isOpen) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlighted(i => (i + 1) % suggestions.length);
          return;
        case 'ArrowUp':
          event.preventDefault();
          setHighlighted(i => (i - 1 + suggestions.length) % suggestions.length);
          return;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          // Stop here so the parent's Enter handler (e.g. "send request")
          // does not also fire while completing a variable.
          event.stopPropagation();
          applySuggestion(suggestions[highlighted]);
          return;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closeSuggestions();
          return;
        default:
          break;
      }
    }

    onKeyDown?.(event);
  };

  return (
    // Layout classes belong on the wrapper, since the input itself is nested.
    <div className={cn('relative w-full', wrapperClassName)}>
      {/* Highlight layer: mirrors the input's font and padding, sits on top of
          the transparent-text input, and never intercepts pointer events. */}
      {!masked && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            input,
            className,
            'absolute inset-0 z-10 flex items-center overflow-hidden whitespace-pre',
            'rounded border border-transparent bg-transparent select-none pointer-events-none'
          )}
        >
          <span className="whitespace-pre" style={{ transform: `translateX(${-scrollLeft}px)` }}>
            {segments.map((segment, i) =>
              segment.variable ? (
                <span key={i} className={segment.known ? knownClass : unknownClass}>
                  {segment.text}
                </span>
              ) : (
                <span key={i} className="text-foreground">{segment.text}</span>
              )
            )}
          </span>
        </div>
      )}

      <Input
        {...props}
        ref={setRefs}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={e => setScrollLeft(e.target.scrollLeft)}
        onClick={e => refreshToken(e.target)}
        onKeyUp={e => refreshToken(e.target)}
        onBlur={e => { closeSuggestions(); props.onBlur?.(e); }}
        className={cn(className, !masked && 'text-transparent caret-foreground selection:text-transparent')}
        spellCheck={false}
        autoComplete="off"
      />

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded border border-border bg-popover shadow-lg py-1"
        >
          {suggestions.map((variable, i) => (
            <li key={variable.key}>
              <button
                type="button"
                // Complete before the input's blur can close the list.
                onMouseDown={e => { e.preventDefault(); applySuggestion(variable); }}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  'w-full flex items-baseline gap-2 px-2 py-1 text-left',
                  text('xs'),
                  i === highlighted ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="font-mono flex-shrink-0">{variable.key}</span>
                <span className="truncate text-muted-foreground flex-1">{variable.value}</span>
                <span className="flex-shrink-0 text-muted-foreground/70">
                  {variable.source === 'folder' ? variable.source_name || 'folder' : variable.source_name || 'env'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export { VariableInput };
