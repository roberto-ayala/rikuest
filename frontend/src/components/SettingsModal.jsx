import React, { useState } from 'react';
import { X, Palette, Type, Monitor, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';
import ColorSelector from './ColorSelector';
import UISizeSelector from './UISizeSelector';
import ResponseThemeSelector from './ResponseThemeSelector';

const SettingsModal = ({ isOpen, onClose }) => {
  const { text, spacing, button } = useUISize();
  const [activeSection, setActiveSection] = useState('interface');

  const sections = [
    { id: 'interface', name: 'Interface', icon: Type, description: 'Size and layout' },
    { id: 'colors', name: 'Colors', icon: Palette, description: 'Theme and colors' },
    { id: 'response', name: 'Response', icon: Monitor, description: 'Response display' },
  ];

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'interface':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>Interface Size</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                Choose the size of text, buttons, and other interface elements throughout the application.
              </p>
              <UISizeSelector modal={true} />
            </div>
          </div>
        );
      case 'colors':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>Primary Color</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                Select the primary color that will be used for buttons, links, highlights, and other interactive elements.
              </p>
              <ColorSelector modal={true} />
            </div>
          </div>
        );
      case 'response':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>Response Syntax Highlighting</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                Choose how API responses are displayed. You can follow the app theme automatically or select specific themes for light and dark modes.
              </p>
              <ResponseThemeSelector modal={true} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl lg:max-w-4xl mx-auto max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header - Fixed */}
        <div className={`flex items-center justify-between flex-shrink-0 border-b border-border ${spacing(4)}`}>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary" />
            <h2 className={`${text('xl')} font-semibold text-foreground`}>Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar Navigation */}
          <div className={`w-64 border-r border-border flex-shrink-0 ${spacing(4)}`}>
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={`${text('sm')} font-medium`}>
                        {section.name}
                      </div>
                      <div className={`${text('xs')} ${isActive ? 'text-primary/70' : 'text-muted-foreground'}`}>
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className={`flex-1 overflow-y-auto ${spacing(6)}`}>
            {renderContent()}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className={`flex justify-between items-center flex-shrink-0 border-t border-border ${spacing(4)}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className={`${text('sm')} text-muted-foreground`}>
              Settings are saved automatically
            </span>
          </div>
          <Button onClick={onClose} className={button}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;