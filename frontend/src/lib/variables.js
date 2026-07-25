// Helpers for the {{variable}} placeholder syntax shared by the request
// builder inputs (highlighting + autocomplete) and the variable docs.
//
// Syntax rules mirror the backend resolver (internal/services/variable_resolver.go):
// a placeholder is `{{name}}` where name is a word (letters, digits, underscore).
// Anything else is left untouched at execution time.

export const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

// Same shape, but also matches a not-yet-valid name so the highlighter can mark
// `{{ foo-bar }}` as unknown instead of leaving it as plain text.
const TOKEN_SPLIT_PATTERN = /(\{\{[^{}]*\}\})/g;

/**
 * Splits text into plain and variable segments for highlighting.
 *
 * @param {string} text
 * @param {Set<string>} knownKeys
 * @returns {Array<{ text: string, variable: boolean, name?: string, known?: boolean }>}
 */
export function tokenizeVariables(text, knownKeys = new Set()) {
  if (!text) return [];

  return text
    .split(TOKEN_SPLIT_PATTERN)
    .filter(part => part !== '')
    .map(part => {
      const match = /^\{\{([^{}]*)\}\}$/.exec(part);
      if (!match) return { text: part, variable: false };
      const name = match[1].trim();
      // Only `\w+` names resolve at execution time; everything else is a
      // literal that will be sent as-is, so flag it as unknown.
      const resolvable = /^\w+$/.test(name);
      return { text: part, variable: true, name, known: resolvable && knownKeys.has(name) };
    });
}

/**
 * Finds the placeholder being typed at the caret, if any.
 * Returns the offset of its opening `{{` and the partial name typed so far.
 *
 * @param {string} value
 * @param {number} caret
 * @returns {{ start: number, query: string } | null}
 */
export function getActiveVariableToken(value, caret) {
  if (typeof value !== 'string' || caret == null) return null;

  const before = value.slice(0, caret);
  const open = before.lastIndexOf('{{');
  if (open === -1) return null;
  // Already closed before the caret: not inside a placeholder anymore.
  if (before.indexOf('}}', open) !== -1) return null;

  const query = before.slice(open + 2);
  if (/[\s{}]/.test(query)) return null;

  return { start: open, query };
}

/**
 * Replaces the placeholder being typed with a complete `{{name}}`.
 * Consumes an existing closing `}}` right after the caret so completing
 * `{{to|}}` yields `{{token}}` instead of `{{token}}}}`.
 *
 * @returns {{ value: string, caret: number }}
 */
export function completeVariable(value, caret, token, name) {
  const placeholder = `{{${name}}}`;
  const after = value.slice(caret).startsWith('}}') ? value.slice(caret + 2) : value.slice(caret);
  const nextValue = value.slice(0, token.start) + placeholder + after;
  return { value: nextValue, caret: token.start + placeholder.length };
}

/**
 * Filters the available variables against what has been typed so far.
 * Prefix matches rank above substring matches; ties keep alphabetical order.
 */
export function filterVariables(variables, query) {
  const list = variables || [];
  const needle = (query || '').toLowerCase();
  if (!needle) return list;

  return list
    .filter(v => v.key.toLowerCase().includes(needle))
    .sort((a, b) => {
      const aPrefix = a.key.toLowerCase().startsWith(needle) ? 0 : 1;
      const bPrefix = b.key.toLowerCase().startsWith(needle) ? 0 : 1;
      return aPrefix - bPrefix || a.key.localeCompare(b.key);
    });
}

/** Names of the variables that a text references but that do not resolve. */
export function findUnknownVariables(text, knownKeys = new Set()) {
  return tokenizeVariables(text, knownKeys)
    .filter(token => token.variable && !token.known)
    .map(token => token.name);
}
