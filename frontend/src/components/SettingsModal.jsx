import React, { useState } from 'react';
import { X, Palette, Type, Settings, Layout, Paintbrush, Globe, Clock, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import ColorSelector from './ColorSelector';
import UISizeSelector from './UISizeSelector';
import LayoutSelector from './LayoutSelector';
import BackgroundColorSelector from './BackgroundColorSelector';
import LanguageSelector from './LanguageSelector';
import LanguageCards from './LanguageCards';
import ParametersSettings from './ParametersSettings';
import TelemetrySettings from './TelemetrySettings';

const SettingsModal = ({ isOpen, onClose }) => {
  const { text, spacing, button, iconMd, iconButton, icon } = useUISize();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('interface');

  const sections = [
    { id: 'interface', name: t('settings.general'), icon: Type, description: t('settings.uiSize') },
    { id: 'language', name: t('settings.language'), icon: Globe, description: t('settings.language') },
    { id: 'layout', name: t('settings.layout'), icon: Layout, description: t('settings.layout') },
    { id: 'colors', name: t('settings.appearance'), icon: Palette, description: t('settings.primaryColor') },
    { id: 'background', name: t('settings.background'), icon: Paintbrush, description: t('settings.background') },
    { id: 'parameters', name: t('settings.parameters'), icon: Clock, description: t('settings.parameters') },
    { id: 'telemetry', name: t('settings.telemetry'), icon: Activity, description: t('settings.telemetry') },
  ];

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'interface':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>{t('settings.uiSize')}</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                {t('settings.uiSize')}
              </p>
              <UISizeSelector modal={true} />
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>{t('settings.language')}</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                {t('settings.language')}
              </p>
              <LanguageCards />
            </div>
          </div>
        );
      case 'layout':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>{t('settings.appLayout')}</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                {t('settings.appLayoutDesc')}
              </p>
              <LayoutSelector modal={true} />
            </div>
          </div>
        );
      case 'background':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>{t('settings.backgroundColors')}</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                {t('settings.backgroundColorsDesc')}
              </p>
              <BackgroundColorSelector modal={true} />
            </div>
          </div>
        );
      case 'colors':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>{t('settings.primaryColor')}</h3>
              <p className={`${text('sm')} text-muted-foreground mb-6`}>
                {t('settings.primaryColorDesc')}
              </p>
              <ColorSelector modal={true} />
            </div>
          </div>
        );
      case 'parameters':
        return (
          <div className="space-y-6">
            <ParametersSettings />
          </div>
        );
      case 'telemetry':
        return (
          <div className="space-y-6">
            <TelemetrySettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        {/* Header - Fixed */}
        <div className={`flex items-center justify-between flex-shrink-0 border-b border-border ${spacing(4)}`}>
          <div className="flex items-center gap-3">
            <Settings className={`${iconMd} text-primary`} />
            <h2 className={`${text('xl')} font-semibold text-foreground`}>{t('settings.title')}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`${iconButton} hover:bg-muted flex-shrink-0`}
          >
            <X className={icon} />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar Navigation */}
          <div className={`w-64 border-r border-border flex-shrink-0 flex flex-col`}>
            <div className={`${spacing(4)} border-b border-border flex-shrink-0`}>
              <h3 className={`${text('sm')} font-medium text-muted-foreground`}>{t('settings.title')}</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className={`space-y-2 ${spacing(4)}`}>
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
              {t('settings.savedAutomatically')}
            </span>
          </div>
          <Button onClick={onClose} className={button}>
            {t('settings.done')}
          </Button>
        </div>
    </Modal>
  );
};

export default SettingsModal;