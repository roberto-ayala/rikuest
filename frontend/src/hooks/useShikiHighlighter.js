import { useState, useEffect, useCallback } from 'react';
import { createHighlighter } from 'shiki';

// Module-level singleton — created once, shared across all consumers
let highlighterPromise = null;
let cachedHighlighter = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: ['json', 'html', 'xml', 'css', 'javascript', 'bash', 'python', 'http'],
      themes: ['github-light', 'github-dark'],
    }).then((h) => {
      cachedHighlighter = h;
      return h;
    });
  }
  return highlighterPromise;
}

export function useShikiHighlighter() {
  const [highlighter, setHighlighter] = useState(cachedHighlighter);

  useEffect(() => {
    if (!cachedHighlighter) {
      getHighlighter().then(setHighlighter);
    }
  }, []);

  const highlight = useCallback(
    (code, lang, { lineNumbers = false } = {}) => {
      if (!highlighter || !code) return null;
      try {
        return highlighter.codeToHtml(code, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark' },
          transformers: lineNumbers
            ? [{ line(node, line) { node.properties['data-line'] = String(line); } }]
            : [],
        });
      } catch {
        return null; // unknown lang — caller renders plain text
      }
    },
    [highlighter]
  );

  return { highlight, ready: !!highlighter };
}
