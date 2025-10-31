import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

const LanguageSelector = () => {
  const { currentLanguage, currentLanguageInfo, changeLanguage, availableLanguages } = useTranslation();
  const { icon, iconButton, menuItem } = useUISize();
  const [isOpen, setIsOpen] = useState(false);

  console.log('LanguageSelector rendered:', { currentLanguage, availableLanguages });

  const handleLanguageChange = (languageCode) => {
    console.log('Changing language to:', languageCode);
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
        title="Language"
      >
        <Globe className={icon} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg min-w-[160px]">
            <div className="p-1">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`${menuItem} w-full text-left flex items-center space-x-2 hover:bg-accent hover:text-accent-foreground rounded-sm ${
                    currentLanguage === language.code ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span>{language.name}</span>
                  {currentLanguage === language.code && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;