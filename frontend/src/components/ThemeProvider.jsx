import React, { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';

function ThemeProvider({ children }) {
  const { theme, primaryColor, getColorConfig } = useUIStore();

  // Update colors when theme or color changes
  useEffect(() => {
    const updateColors = () => {
      const colorConfig = getColorConfig(primaryColor);
      const isDark = document.documentElement.classList.contains('dark');
      const selectedConfig = isDark ? colorConfig.dark : colorConfig.light;
      
      document.documentElement.style.setProperty('--primary', selectedConfig.primary);
      document.documentElement.style.setProperty('--primary-foreground', selectedConfig.foreground);
    };

    const handleSystemThemeChange = (e) => {
      if (theme === 'system') {
        // Use classList.replace to ensure proper update
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        updateColors(); // Update colors when system theme changes
        
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('themechange', { 
          detail: { isDark: e.matches, theme: 'system' } 
        }));
      }
    };

    // Set initial theme
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Update colors after theme is set
    updateColors();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme, primaryColor, getColorConfig]);

  return <>{children}</>;
}

export default ThemeProvider;