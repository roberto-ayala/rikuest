import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';

export function useBackgroundColor() {
  const { theme, backgroundColorLight, backgroundColorDark, getBackgroundColors } = useUIStore();
  const [systemIsDark, setSystemIsDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  
  useEffect(() => {
    const updateBackground = () => {
      const backgroundColors = getBackgroundColors();
      
      // Determine effective theme (handle 'system' theme)
      let effectiveTheme = theme;
      if (theme === 'system') {
        effectiveTheme = systemIsDark ? 'dark' : 'light';
      }
      
      const currentBgId = effectiveTheme === 'dark' ? backgroundColorDark : backgroundColorLight;
      const currentBgConfig = backgroundColors[effectiveTheme]?.find(bg => bg.id === currentBgId);
      
      console.log('Background hook executing:', { theme, effectiveTheme, currentBgId, currentBgConfig });
      
      // Update CSS custom property that Tailwind uses for --background
      const root = document.documentElement;
      
      if (currentBgConfig) {
        // Convert hex color to HSL values that Tailwind expects
        const hexToHsl = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;

          if (max === min) {
            h = s = 0;
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }

          return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
        };

        const [h, s, l] = hexToHsl(currentBgConfig.preview);
        root.style.setProperty('--background', `${h} ${s}% ${l}%`);
        console.log('Applied background HSL:', `${h} ${s}% ${l}%`, 'from', currentBgConfig.preview);
      } else {
        // Fallback to default Tailwind background values
        const defaultHsl = effectiveTheme === 'dark' ? '222.2 84% 4.9%' : '0 0% 100%';
        root.style.setProperty('--background', defaultHsl);
        console.log('Applied default HSL:', defaultHsl);
      }
    };

    // Listen for system theme changes when theme is set to 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (theme === 'system') {
        setSystemIsDark(e.matches);
        updateBackground();
      }
    };

    // Initial update
    updateBackground();

    // Listen for system theme changes
    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    // Also listen for class changes on documentElement (when ThemeProvider updates it)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (theme === 'system') {
            const isDark = document.documentElement.classList.contains('dark');
            if (isDark !== systemIsDark) {
              setSystemIsDark(isDark);
            }
          }
          updateBackground();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      observer.disconnect();
    };
  }, [theme, backgroundColorLight, backgroundColorDark, getBackgroundColors, systemIsDark]);

  return {
    getCurrentBackgroundClass: () => {
      const backgroundColors = getBackgroundColors();
      const currentBgId = theme === 'dark' ? backgroundColorDark : backgroundColorLight;
      const currentBgConfig = backgroundColors[theme].find(bg => bg.id === currentBgId);
      return currentBgConfig?.class || (theme === 'dark' ? 'bg-slate-950' : 'bg-white');
    }
  };
}