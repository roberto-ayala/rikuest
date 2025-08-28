import React from 'react';
import { Monitor, Sidebar } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useUISize } from '../hooks/useUISize';

const LayoutSelector = ({ modal = false }) => {
  const { layout, setLayout } = useUIStore();
  const { text, button } = useUISize();
  
  const layouts = [
    {
      id: 'default',
      name: 'Default Layout',
      description: 'Full header across the top with content below',
      icon: Monitor,
      preview: (
        <div className="w-full h-16 border border-border rounded bg-card p-1">
          <div className="w-full h-4 bg-primary/20 rounded mb-1"></div>
          <div className="flex gap-1 h-10">
            <div className="w-8 bg-muted rounded"></div>
            <div className="flex-1 bg-muted/50 rounded"></div>
          </div>
        </div>
      )
    },
    {
      id: 'compact',
      name: 'Compact Layout', 
      description: 'Compact header in sidebar, more space for content',
      icon: Sidebar,
      preview: (
        <div className="w-full h-16 border border-border rounded bg-card p-1">
          <div className="flex gap-1 h-14">
            <div className="w-8 bg-primary/20 rounded flex flex-col gap-0.5 p-0.5">
              <div className="w-full h-2 bg-primary rounded"></div>
              <div className="w-full flex-1 bg-muted rounded"></div>
            </div>
            <div className="flex-1 bg-muted/50 rounded"></div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3">
      {layouts.map((layoutOption) => {
        const Icon = layoutOption.icon;
        const isSelected = layout === layoutOption.id;
        
        return (
          <button
            key={layoutOption.id}
            onClick={() => setLayout(layoutOption.id)}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200 text-left group
              ${isSelected 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                ${isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                }
              `}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className={`${text('sm')} font-medium text-foreground`}>
                    {layoutOption.name}
                  </h4>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
                <p className={`${text('xs')} text-muted-foreground mb-3`}>
                  {layoutOption.description}
                </p>
                <div className="w-full">
                  {layoutOption.preview}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default LayoutSelector;