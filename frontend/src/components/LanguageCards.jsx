import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

const LanguageCards = () => {
  const { currentLanguage, changeLanguage } = useTranslation();
  const { text, spacing, card } = useUISize();

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es', name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => handleLanguageChange(language.code)}
          className={`${card} relative border-2 rounded-lg transition-all duration-200 hover:shadow-md group ${
            currentLanguage === language.code
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-border hover:border-primary/50 bg-card hover:bg-accent/5'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{language.flag}</div>
            <div className="flex-1 text-left">
              <div className={`${text('base')} font-medium text-foreground group-hover:text-primary transition-colors`}>
                {language.nativeName}
              </div>
              <div className={`${text('sm')} text-muted-foreground`}>
                {language.name}
              </div>
            </div>
            {currentLanguage === language.code && (
              <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default LanguageCards;
