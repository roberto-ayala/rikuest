import React from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

function UISizeSelector({ modal = false }) {
  const { uiSize, setUISize, getSizeConfig } = useUIStore();
  const config = getSizeConfig(uiSize);

  const sizes = [
    { value: 'xs', label: 'Extra Small' },
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' }
  ];

  // Modal version with better presentation
  if (modal) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sizes.map((size) => (
          <button
            key={size.value}
            onClick={() => setUISize(size.value)}
            className={`group flex flex-col items-center space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all hover:bg-muted/50 ${
              uiSize === size.value 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full bg-current ${
                size.value === 'xs' ? 'opacity-60' :
                size.value === 'sm' ? 'opacity-75' :
                size.value === 'md' ? 'opacity-90' : 'opacity-100'
              }`} />
              <div className={`w-3 h-3 rounded-full bg-current ${
                size.value === 'xs' ? 'opacity-60' :
                size.value === 'sm' ? 'opacity-75' :
                size.value === 'md' ? 'opacity-90' : 'opacity-100'
              }`} />
              <div className={`w-4 h-4 rounded-full bg-current ${
                size.value === 'xs' ? 'opacity-60' :
                size.value === 'sm' ? 'opacity-75' :
                size.value === 'md' ? 'opacity-90' : 'opacity-100'
              }`} />
            </div>
            <div className="text-center">
              <div className={`font-medium ${
                size.value === 'xs' ? config.text.xs :
                size.value === 'sm' ? config.text.sm :
                size.value === 'md' ? config.text.base : config.text.lg
              } ${uiSize === size.value ? 'text-primary' : 'text-foreground'}`}>
                {size.label}
              </div>
              <div className={`${config.text.xs} text-muted-foreground mt-1`}>
                {size.value.toUpperCase()}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Original compact version for header
  return (
    <div className="relative group">
      <button className={`flex items-center space-x-2 ${config.components.button} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors`}>
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">{sizes.find(s => s.value === uiSize)?.label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      
      <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[120px]">
        <div className={`${config.spacing[1]}`}>
          <div className={`${config.text.xs} text-muted-foreground font-medium mb-2`}>UI Size</div>
          {sizes.map((size) => (
            <button
              key={size.value}
              onClick={() => setUISize(size.value)}
              className={`w-full text-left px-2 py-1.5 ${config.text.sm} rounded transition-colors ${
                uiSize === size.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UISizeSelector;