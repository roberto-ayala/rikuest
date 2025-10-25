import React, { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

// Available languages
export const LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' }
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Cache for loaded translations
const translationCache = new Map();

// Load translation file
const loadTranslation = async (language) => {
  if (translationCache.has(language)) {
    return translationCache.get(language);
  }

  try {
    const translation = await import(`../locales/${language}.json`);
    translationCache.set(language, translation.default);
    return translation.default;
  } catch (error) {
    console.warn(`Failed to load translation for ${language}:`, error);
    // Fallback to English
    if (language !== DEFAULT_LANGUAGE) {
      return loadTranslation(DEFAULT_LANGUAGE);
    }
    return {};
  }
};

// Get nested value from object using dot notation
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

// Custom hook for translations
export const useTranslation = () => {
  const { language: storeLanguage, setLanguage } = useUIStore();
  
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get from store first, then localStorage, then browser language
    if (storeLanguage && LANGUAGES[storeLanguage]) {
      return storeLanguage;
    }
    
    const saved = localStorage.getItem('rikuest-language');
    if (saved && LANGUAGES[saved]) {
      return saved;
    }
    
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    return LANGUAGES[browserLang] ? browserLang : DEFAULT_LANGUAGE;
  });

  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Sync with store language changes
  useEffect(() => {
    if (storeLanguage && storeLanguage !== currentLanguage && LANGUAGES[storeLanguage]) {
      setCurrentLanguage(storeLanguage);
    }
  }, [storeLanguage, currentLanguage]);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const translationData = await loadTranslation(currentLanguage);
        setTranslations(translationData);
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  // Save language preference
  const changeLanguage = useCallback((languageCode) => {
    console.log('Changing language to:', languageCode);
    if (LANGUAGES[languageCode]) {
      setCurrentLanguage(languageCode);
      setLanguage(languageCode);
      localStorage.setItem('rikuest-language', languageCode);
      console.log('Language changed successfully');
    }
  }, [setLanguage]);

  // Translation function
  const t = useCallback((key, fallback = key) => {
    if (isLoading) return fallback;
    
    const translation = getNestedValue(translations, key);
    return translation || fallback;
  }, [translations, isLoading]);

  // Get current language info
  const currentLanguageInfo = LANGUAGES[currentLanguage];

  return {
    t,
    currentLanguage,
    currentLanguageInfo,
    changeLanguage,
    isLoading,
    availableLanguages: Object.values(LANGUAGES)
  };
};

// Higher-order component for translation
export const withTranslation = (Component) => {
  return function TranslatedComponent(props) {
    const translation = useTranslation();
    return React.createElement(Component, { ...props, ...translation });
  };
};

// Hook for getting specific translation
export const useT = () => {
  const { t } = useTranslation();
  return t;
};
