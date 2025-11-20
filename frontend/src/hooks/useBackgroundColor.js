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
        
        // Update card and popover to match background (modals and popovers use these)
        root.style.setProperty('--card', `${h} ${s}% ${l}%`);
        root.style.setProperty('--popover', `${h} ${s}% ${l}%`);
        
        // Calculate border color based on background
        // For dark backgrounds: make border slightly lighter
        // For light backgrounds: make border slightly darker
        let borderL = l;
        let borderS = s;
        
        if (effectiveTheme === 'dark') {
          // Dark mode: increase lightness by 8-12% but cap at 30% for very dark backgrounds
          borderL = Math.min(l + 10, 30);
          // Slightly reduce saturation for more subtle borders
          borderS = Math.max(s * 0.7, 10);
        } else {
          // Light mode: decrease lightness by 8-12% but keep above 70% for very light backgrounds
          borderL = Math.max(l - 10, 70);
          // Slightly reduce saturation for more subtle borders
          borderS = Math.max(s * 0.6, 5);
        }
        
        root.style.setProperty('--border', `${h} ${borderS}% ${borderL}%`);
        // Also update --input to match border for consistency
        root.style.setProperty('--input', `${h} ${borderS}% ${borderL}%`);
        console.log('Applied border HSL:', `${h} ${borderS}% ${borderL}%`);
      } else {
        // Fallback to default background values
        if (effectiveTheme === 'dark') {
          // Use the new default dark color: #1a1a1f (desaturated blue-grey)
          root.style.setProperty('--background', '240 8% 10%');
          // Update card and popover to match background
          root.style.setProperty('--card', '240 8% 10%');
          root.style.setProperty('--popover', '240 8% 10%');
          // Calculate border for default dark color
          root.style.setProperty('--border', '240 6% 18%');
          root.style.setProperty('--input', '240 6% 18%');
          console.log('Applied default dark HSL: 240 8% 10%');
        } else {
          root.style.setProperty('--background', '0 0% 100%');
          // Update card and popover to match background
          root.style.setProperty('--card', '0 0% 100%');
          root.style.setProperty('--popover', '0 0% 100%');
          const defaultBorder = '214.3 31.8% 91.4%';
          root.style.setProperty('--border', defaultBorder);
          root.style.setProperty('--input', defaultBorder);
          console.log('Applied default light HSL: 0 0% 100%');
        }
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