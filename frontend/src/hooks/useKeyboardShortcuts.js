import { useEffect } from 'react';

// True on Macs (and iPadOS "Mac" UAs) so shortcuts can show/check the Cmd
// symbol instead of Ctrl.
export const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

// Returns the modifier key held for a given event, respecting platform
// (metaKey on Mac, ctrlKey elsewhere).
const hasModifier = (event) => (isMac ? event.metaKey : event.ctrlKey);

const isEditableTarget = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // Monaco editor renders its own hidden textarea, but also wraps everything
  // in a container with this class - catch both.
  if (typeof target.closest === 'function' && target.closest('.monaco-editor')) return true;
  return false;
};

/**
 * Registers global keyboard shortcuts on `window`.
 *
 * `bindings` is an array of:
 *   { key, mod (bool), shift (bool), handler, allowInInputs (bool) }
 *
 * - `key` is compared case-insensitively against `event.key`.
 * - `mod` requires Cmd (mac) / Ctrl (others).
 * - `allowInInputs` lets the shortcut fire even while focus is inside an
 *   input/textarea/select/contentEditable/monaco editor (used for
 *   Cmd/Ctrl+Enter and Cmd/Ctrl+S, since that's where users are when they
 *   want to send/save).
 */
export function useKeyboardShortcuts(bindings, deps = []) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      for (const binding of bindings) {
        if (!binding || typeof binding.handler !== 'function') continue;

        const keyMatches = event.key.toLowerCase() === binding.key.toLowerCase();
        if (!keyMatches) continue;

        const modRequired = binding.mod !== false;
        if (modRequired && !hasModifier(event)) continue;
        if (!modRequired && hasModifier(event)) continue;

        if (binding.shift && !event.shiftKey) continue;
        if (!binding.shift && event.shiftKey) continue;

        if (!binding.allowInInputs && isEditableTarget(event.target)) continue;

        event.preventDefault();
        binding.handler(event);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
