import { useCallback, useEffect, useRef } from 'react';
import { useIsDark } from './useIsDark';
import { useUISize } from './useUISize';
import { useUIStore } from '../stores/uiStore';

// Monaco paints its own background, so it has to be told the app's — including
// the user's chosen background tint, which is not a plain CSS variable.
// Shared by every embedded editor so they stay visually identical.

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function readAppBackgroundColor(isDark) {
  if (typeof window === 'undefined') return isDark ? '#020617' : '#ffffff';

  const effectiveTheme = isDark ? 'dark' : 'light';
  const { backgroundColorLight, backgroundColorDark, getBackgroundColors } = useUIStore.getState();

  const backgroundColors = getBackgroundColors();
  const currentBgId = isDark ? backgroundColorDark : backgroundColorLight;
  const currentBgConfig = backgroundColors[effectiveTheme]?.find(bg => bg.id === currentBgId);
  if (currentBgConfig?.preview) return currentBgConfig.preview;

  // No explicit tint chosen: fall back to the theme's --background variable,
  // which can be HSL channels, hex or rgb depending on where it was set.
  const root = getComputedStyle(document.documentElement);
  let bgColor = root.getPropertyValue('--background').trim();
  if (!bgColor) return isDark ? '#020617' : '#ffffff';

  if (bgColor.startsWith('#')) return bgColor;

  if (bgColor.startsWith('rgb')) {
    const match = bgColor.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    return isDark ? '#020617' : '#ffffff';
  }

  if (bgColor.includes(' ')) {
    bgColor = bgColor.replace(/^hsl\(|\)$/g, '');
    const values = bgColor.split(/[\s,]+/).map(v => v.replace('%', ''));
    if (values.length >= 3) {
      return hslToHex(parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]));
    }
  }

  return isDark ? '#020617' : '#ffffff';
}

// Font size mirrors the app's own text scale so an editor never looks like a
// foreign widget dropped into the page.
function fontSizeFor(config) {
  const textSm = config.text.sm;
  if (textSm.includes('text-xs')) return 12;
  if (textSm.includes('text-sm')) return 14;
  if (textSm.includes('text-base')) return 16;
  if (textSm.includes('text-lg')) return 18;
  return 14;
}

export const MONACO_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Cascadia, "Roboto Mono", Menlo, monospace';

/**
 * Keeps an embedded Monaco editor in sync with the app's theme, chosen
 * background tint and text size.
 *
 * @param {object} [options]
 * @param {React.MutableRefObject<any>} [options.editorRef] - editor instance, for live font updates
 * @returns {{themeName: string, fontSize: number, lineHeight: number, defineTheme: (monaco: any) => string, handleEditorWillMount: (monaco: any) => void}}
 */
export function useMonacoAppTheme({ editorRef } = {}) {
  const isDark = useIsDark();
  const { config } = useUISize();
  const { theme, backgroundColorLight, backgroundColorDark } = useUIStore();
  const internalRef = useRef(null);
  const instanceRef = editorRef || internalRef;

  const themeName = isDark ? 'app-dark' : 'app-light';
  const fontSize = fontSizeFor(config);
  const lineHeight = Math.round(fontSize * 1.4);

  const defineTheme = useCallback((monaco) => {
    const name = isDark ? 'app-dark' : 'app-light';
    try {
      monaco.editor.defineTheme(name, {
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [], // Keep all default syntax highlighting
        colors: { 'editor.background': readAppBackgroundColor(isDark) },
      });
    } catch {
      // Already defined with the same name — redefining is what we wanted anyway.
    }
    return name;
  }, [isDark]);

  // Defined before mount so the editor never flashes its default background.
  const handleEditorWillMount = useCallback((monaco) => {
    defineTheme(monaco);
  }, [defineTheme]);

  useEffect(() => {
    if (!instanceRef.current || !window.monaco) return;
    window.monaco.editor.setTheme(defineTheme(window.monaco));
  }, [isDark, defineTheme, theme, backgroundColorLight, backgroundColorDark, instanceRef]);

  useEffect(() => {
    instanceRef.current?.updateOptions({ fontSize, lineHeight });
  }, [fontSize, lineHeight, instanceRef]);

  return { themeName, fontSize, lineHeight, defineTheme, handleEditorWillMount };
}
