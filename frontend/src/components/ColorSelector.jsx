import React from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

function ColorSelector({ modal = false }) {
  const { primaryColor, setPrimaryColor, getColorConfig, getSizeConfig, uiSize } = useUIStore();
  const config = getSizeConfig(uiSize);

  const colors = [
    { key: 'blue', name: 'Blue', preview: 'hsl(221, 83%, 53%)' },
    { key: 'petroleum', name: 'Petroleum Blue', preview: 'hsl(195, 85%, 41%)' },
    { key: 'teal', name: 'Teal', preview: 'hsl(173, 80%, 40%)' },
    { key: 'green', name: 'Green', preview: 'hsl(142, 76%, 36%)' },
    { key: 'purple', name: 'Purple', preview: 'hsl(262, 83%, 58%)' },
    { key: 'indigo', name: 'Indigo', preview: 'hsl(239, 84%, 67%)' },
    { key: 'pink', name: 'Pink', preview: 'hsl(330, 81%, 60%)' },
    { key: 'orange', name: 'Orange', preview: 'hsl(25, 95%, 53%)' },
    { key: 'red', name: 'Red', preview: 'hsl(0, 84%, 60%)' },
    { key: 'slate', name: 'Slate', preview: 'hsl(215, 28%, 17%)' }
  ];

  const currentColor = colors.find(c => c.key === primaryColor);

  const handleColorChange = (colorKey) => {
    setPrimaryColor(colorKey);
    
    // Apply the color change immediately to CSS variables
    const colorConfig = getColorConfig(colorKey);
    const isDark = document.documentElement.classList.contains('dark');
    
    const selectedConfig = isDark ? colorConfig.dark : colorConfig.light;
    
    // Update CSS variables
    document.documentElement.style.setProperty('--primary', selectedConfig.primary);
    document.documentElement.style.setProperty('--primary-foreground', selectedConfig.foreground);
  };

  // Initialize color on component mount
  React.useEffect(() => {
    const colorConfig = getColorConfig(primaryColor);
    const isDark = document.documentElement.classList.contains('dark');
    const selectedConfig = isDark ? colorConfig.dark : colorConfig.light;
    
    document.documentElement.style.setProperty('--primary', selectedConfig.primary);
    document.documentElement.style.setProperty('--primary-foreground', selectedConfig.foreground);

    // Listen for theme changes to update colors
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          const colorConfig = getColorConfig(primaryColor);
          const selectedConfig = isDark ? colorConfig.dark : colorConfig.light;
          
          document.documentElement.style.setProperty('--primary', selectedConfig.primary);
          document.documentElement.style.setProperty('--primary-foreground', selectedConfig.foreground);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [primaryColor, getColorConfig]);

  // Modal version with better spacing
  if (modal) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
        {colors.map((color) => (
          <button
            key={color.key}
            onClick={() => handleColorChange(color.key)}
            className={`group flex flex-col items-center space-y-2 p-2 sm:p-3 rounded-lg transition-all hover:bg-muted/50 ${
              primaryColor === color.key ? 'bg-primary/10 ring-2 ring-primary' : ''
            }`}
            title={color.name}
          >
            <div 
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all group-hover:scale-110 ${
                primaryColor === color.key 
                  ? 'border-primary shadow-lg scale-110' 
                  : 'border-border group-hover:border-muted-foreground'
              }`}
              style={{ backgroundColor: color.preview }}
            />
            <span className={`${config.text.xs} text-center font-medium leading-tight ${
              primaryColor === color.key ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {color.name}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Original compact version for header
  return (
    <div className="relative group">
      <button className={`flex items-center space-x-2 ${config.components.button} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors`}>
        <Palette className="h-4 w-4" />
        <div 
          className="w-3 h-3 rounded-full border border-border" 
          style={{ backgroundColor: currentColor?.preview }}
        />
        <span className="hidden sm:inline">{currentColor?.name}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      
      <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[180px]">
        <div className={`${config.spacing[1]}`}>
          <div className={`${config.text.xs} text-muted-foreground font-medium mb-2`}>Primary Color</div>
          <div className="grid grid-cols-5 gap-1 mb-2">
            {colors.map((color) => (
              <button
                key={color.key}
                onClick={() => handleColorChange(color.key)}
                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                  primaryColor === color.key 
                    ? 'border-foreground shadow-md' 
                    : 'border-border hover:border-muted-foreground'
                }`}
                style={{ backgroundColor: color.preview }}
                title={color.name}
              />
            ))}
          </div>
          <div className="space-y-1">
            {colors.slice(0, 5).map((color) => (
              <button
                key={color.key}
                onClick={() => handleColorChange(color.key)}
                className={`w-full text-left px-2 py-1.5 ${config.text.sm} rounded transition-colors flex items-center space-x-2 ${
                  primaryColor === color.key 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full border border-border" 
                  style={{ backgroundColor: color.preview }}
                />
                <span>{color.name}</span>
              </button>
            ))}
            {colors.length > 5 && (
              <details className="group/details">
                <summary className={`cursor-pointer px-2 py-1.5 ${config.text.sm} rounded transition-colors hover:bg-muted text-muted-foreground`}>
                  More colors...
                </summary>
                <div className="mt-1 space-y-1">
                  {colors.slice(5).map((color) => (
                    <button
                      key={color.key}
                      onClick={() => handleColorChange(color.key)}
                      className={`w-full text-left px-2 py-1.5 ${config.text.sm} rounded transition-colors flex items-center space-x-2 ${
                        primaryColor === color.key 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full border border-border" 
                        style={{ backgroundColor: color.preview }}
                      />
                      <span>{color.name}</span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColorSelector;