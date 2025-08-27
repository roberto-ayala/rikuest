import React from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

function ThemeSelector() {
  const { theme, setTheme, getSizeConfig, uiSize } = useUIStore();
  const config = getSizeConfig(uiSize);

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <div className="relative group">
      <button className={`flex items-center space-x-1 ${config.components.button} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors`}>
        <CurrentIcon className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </button>
      
      <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[120px]">
        <div className={`${config.spacing[1]}`}>
          <div className={`${config.text.xs} text-muted-foreground font-medium mb-2`}>Theme</div>
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={`w-full text-left px-2 py-1.5 ${config.text.sm} rounded transition-colors flex items-center space-x-2 ${
                  theme === themeOption.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{themeOption.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ThemeSelector;