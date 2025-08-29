import React, { useState, useEffect } from 'react';
import { Monitor, Sun, Moon, Palette, Star } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useUISize } from '../hooks/useUISize';
import { Select, SelectOption } from './ui/Select';

const ResponseThemeSelector = ({ modal = false }) => {
  const { 
    responseTheme, 
    responseThemeLight, 
    responseThemeDark,
    defaultResponseThemeLight,
    defaultResponseThemeDark,
    setResponseTheme, 
    setResponseThemeLight, 
    setResponseThemeDark,
    setDefaultResponseThemeLight,
    setDefaultResponseThemeDark,
    getAvailableResponseThemes 
  } = useUIStore();
  const { text, spacing } = useUISize();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  
  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  const [showThemes, setShowThemes] = useState(false);
  const [showDefaultSettings, setShowDefaultSettings] = useState(false);
  const [themeMode, setThemeMode] = useState(() => isDark ? 'dark' : 'light'); // Initialize based on current app theme
  
  const availableThemes = getAvailableResponseThemes();
  
  const getCurrentDefaultTheme = (mode) => {
    if (mode === 'light') {
      return availableThemes.light.find(t => t.id === defaultResponseThemeLight)?.name || 'One Light';
    } else {
      return availableThemes.dark.find(t => t.id === defaultResponseThemeDark)?.name || 'One Dark';
    }
  };

  const baseOptions = [
    { 
      id: 'auto', 
      name: 'Auto', 
      icon: Monitor, 
      description: `Follow app theme (${getCurrentDefaultTheme(isDark ? 'dark' : 'light')} currently)` 
    },
    { id: 'custom', name: 'Custom', icon: Palette, description: 'Choose specific themes' }
  ];
  
  // Helper function to check if a theme is default
  const isDefaultTheme = (themeId, mode) => {
    if (mode === 'light') {
      return themeId === defaultResponseThemeLight;
    } else {
      return themeId === defaultResponseThemeDark;
    }
  };

  const handleBaseThemeChange = (themeId) => {
    if (themeId === 'custom') {
      setShowThemes(true);
    } else {
      setResponseTheme(themeId);
      setShowThemes(false);
    }
  };

  const handleSpecificThemeChange = (themeId) => {
    if (themeMode === 'light') {
      setResponseThemeLight(themeId);
    } else {
      setResponseThemeDark(themeId);
    }
    setResponseTheme('custom');
  };

  const handleSetAsDefault = (themeId, mode) => {
    if (mode === 'light') {
      setDefaultResponseThemeLight(themeId);
    } else {
      setDefaultResponseThemeDark(themeId);
    }
  };

  const getCurrentThemeName = () => {
    if (responseTheme === 'auto') return 'Auto';
    if (responseTheme === 'custom') {
      const lightTheme = availableThemes.light.find(t => t.id === responseThemeLight)?.name || responseThemeLight;
      const darkTheme = availableThemes.dark.find(t => t.id === responseThemeDark)?.name || responseThemeDark;
      return `${lightTheme} / ${darkTheme}`;
    }
    return responseTheme;
  };

  if (!modal) {
    // Compact version for non-modal usage
    return (
      <div className="flex items-center gap-2">
        <span className={`${text('sm')} text-muted-foreground`}>Response Theme:</span>
        <span className={`${text('sm')} font-medium`}>{getCurrentThemeName()}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Base theme selection */}
      <div className="grid grid-cols-1 gap-2">
        {baseOptions.map((theme) => {
          const Icon = theme.icon;
          const isSelected = (responseTheme === theme.id) || (responseTheme === 'custom' && theme.id === 'custom');
          
          return (
            <button
              key={theme.id}
              onClick={() => handleBaseThemeChange(theme.id)}
              className={`
                relative flex items-center gap-3 rounded-lg border transition-all duration-200
                ${spacing(3)} w-full text-left
                ${isSelected 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border bg-card hover:bg-muted/50 hover:border-border'
                }
              `}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className={`${text('sm')} font-medium truncate`}>
                  {theme.name}
                  {theme.id === 'custom' && responseTheme === 'custom' && (
                    <span className={`${text('xs')} text-muted-foreground ml-2`}>
                      ({getCurrentThemeName()})
                    </span>
                  )}
                </div>
                <div className={`${text('xs')} text-muted-foreground mt-0.5`}>
                  {theme.description}
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom theme selection */}
      {showThemes && (
        <div className="border-t border-border pt-4">
          {/* Default themes info */}
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="currentColor" />
                <span className={`${text('sm')} font-medium text-amber-800 dark:text-amber-200`}>
                  Default Themes for Auto Mode
                </span>
              </div>
              <button
                onClick={() => setShowDefaultSettings(!showDefaultSettings)}
                className={`${text('xs')} text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline`}
              >
                {showDefaultSettings ? 'Hide' : 'Change'}
              </button>
            </div>
            <div className={`${text('xs')} text-amber-700 dark:text-amber-300`}>
              <strong>Light mode:</strong> {getCurrentDefaultTheme('light')} • <strong>Dark mode:</strong> {getCurrentDefaultTheme('dark')}
            </div>
          </div>

          {/* Default theme configuration */}
          {showDefaultSettings && (
            <div className="mb-4 p-3 border border-border rounded-lg bg-muted/30">
              <h4 className={`${text('sm')} font-medium mb-3`}>Configure Default Themes</h4>
              <p className={`${text('xs')} text-muted-foreground mb-3`}>
                Choose which themes will be used when "Auto" mode is selected.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Light default selector */}
                <div>
                  <label className={`${text('xs')} font-medium text-foreground mb-2 block`}>Light Mode Default</label>
                  <Select
                    value={defaultResponseThemeLight}
                    onChange={(e) => setDefaultResponseThemeLight(e.target.value)}
                    className="w-full px-2 py-1 text-xs"
                  >
                    {availableThemes.light.map((theme) => (
                      <SelectOption key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectOption>
                    ))}
                  </Select>
                </div>

                {/* Dark default selector */}
                <div>
                  <label className={`${text('xs')} font-medium text-foreground mb-2 block`}>Dark Mode Default</label>
                  <Select
                    value={defaultResponseThemeDark}
                    onChange={(e) => setDefaultResponseThemeDark(e.target.value)}
                    className="w-full px-2 py-1 text-xs"
                  >
                    {availableThemes.dark.map((theme) => (
                      <SelectOption key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectOption>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setThemeMode('light')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                themeMode === 'light' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light Themes
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                themeMode === 'dark' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark Themes
            </button>
          </div>

          {/* Theme grid */}
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {availableThemes[themeMode].map((theme) => {
              const isSelected = themeMode === 'light' 
                ? responseThemeLight === theme.id 
                : responseThemeDark === theme.id;
              const isDefault = isDefaultTheme(theme.id, themeMode);
              
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSpecificThemeChange(theme.id)}
                  className={`
                    relative px-3 py-2 rounded-md border text-left transition-all duration-200
                    ${isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border bg-card hover:bg-muted/50 hover:border-border'
                    }
                    ${isDefault ? 'ring-1 ring-amber-500/30' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`${text('sm')} font-medium truncate flex-1`}>
                      {theme.name}
                    </div>
                    {isDefault && (
                      <Star className="h-3 w-3 text-amber-500 flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                  {isDefault && (
                    <div className={`${text('xs')} text-amber-600 dark:text-amber-400 mt-0.5`}>
                      Default
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseThemeSelector;