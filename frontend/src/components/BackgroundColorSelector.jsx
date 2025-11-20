import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useUISize } from '../hooks/useUISize';

const BackgroundColorSelector = ({ modal = false }) => {
  const { 
    theme, 
    backgroundColorLight, 
    backgroundColorDark,
    setBackgroundColorLight,
    setBackgroundColorDark,
    getBackgroundColors
  } = useUIStore();
  
  const { text, spacing, button, iconMd } = useUISize();
  
  // Determine effective theme for system mode
  const getEffectiveTheme = (themeValue) => {
    if (themeValue === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeValue;
  };
  
  const [effectiveTheme, setEffectiveTheme] = useState(() => getEffectiveTheme(theme));
  const [activeMode, setActiveMode] = useState(effectiveTheme);
  
  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e) => {
        const newEffectiveTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newEffectiveTheme);
        // Update activeMode if it matches the previous effective theme
        if (activeMode === effectiveTheme) {
          setActiveMode(newEffectiveTheme);
        }
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      // Also listen for class changes (when ThemeProvider updates it)
      const observer = new MutationObserver(() => {
        const newEffectiveTheme = getEffectiveTheme(theme);
        if (newEffectiveTheme !== effectiveTheme) {
          setEffectiveTheme(newEffectiveTheme);
          if (activeMode === effectiveTheme) {
            setActiveMode(newEffectiveTheme);
          }
        }
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        observer.disconnect();
      };
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme, effectiveTheme, activeMode]);
  
  const backgroundColors = getBackgroundColors();
  
  const currentColor = activeMode === 'light' ? backgroundColorLight : backgroundColorDark;
  const setCurrentColor = activeMode === 'light' ? setBackgroundColorLight : setBackgroundColorDark;
  const availableColors = backgroundColors[activeMode];

  if (modal) {
    return (
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex flex-col items-center space-y-2">
          {theme === 'system' && (
            <div className={`${text('xs')} text-muted-foreground text-center`}>
              System theme detected as: <span className="font-medium">{effectiveTheme}</span>
            </div>
          )}
          <div className="bg-muted rounded-lg p-1 flex">
            <button
              onClick={() => setActiveMode('light')}
              className={`${button} px-4 py-2 rounded-md transition-colors flex items-center justify-center ${
                activeMode === 'light' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Light Mode
            </button>
            <button
              onClick={() => setActiveMode('dark')}
              className={`${button} px-4 py-2 rounded-md transition-colors flex items-center justify-center ${
                activeMode === 'dark' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dark Mode
            </button>
          </div>
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setCurrentColor(color.id)}
              className={`group relative flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                currentColor === color.id 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div 
                className="w-12 h-12 rounded-full border-2 border-border shadow-inner relative overflow-hidden"
                style={{ backgroundColor: color.preview }}
              >
                {currentColor === color.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-5 w-5 text-foreground drop-shadow-sm" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className={`${text('xs')} font-medium ${
                  currentColor === color.id ? 'text-primary' : 'text-foreground'
                }`}>
                  {color.name}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className={`${text('sm')} font-medium text-foreground`}>Preview</div>
          <div 
            className="h-16 rounded-lg border border-border flex items-center justify-center"
            style={{ backgroundColor: availableColors.find(c => c.id === currentColor)?.preview }}
          >
            <div className={`${text('sm')} text-muted-foreground`}>
              Background preview for {activeMode} mode
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact version (not implemented for this component)
  return null;
};

export default BackgroundColorSelector;