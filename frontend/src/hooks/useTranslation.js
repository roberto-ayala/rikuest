import React, { useCallback } from 'react';
import { create } from 'zustand';
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

// Detect initial language: UI store first, then localStorage, then browser language
const detectInitialLanguage = () => {
  const storeLanguage = useUIStore.getState().language;
  if (storeLanguage && LANGUAGES[storeLanguage]) {
    return storeLanguage;
  }

  const saved = localStorage.getItem('rikuest-language');
  if (saved && LANGUAGES[saved]) {
    return saved;
  }

  const browserLang = navigator.language.split('-')[0];
  return LANGUAGES[browserLang] ? browserLang : DEFAULT_LANGUAGE;
};

// Single shared translation state: one load per language for the whole app
// instead of one per hook consumer.
const useTranslationStore = create((set, get) => ({
  currentLanguage: detectInitialLanguage(),
  translations: {},
  isLoading: true,

  loadLanguage: async (language) => {
    set({ isLoading: true });
    try {
      const translationData = await loadTranslation(language);
      // Ignore stale loads if the language changed meanwhile
      if (get().currentLanguage === language) {
        set({ translations: translationData });
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      if (get().currentLanguage === language) {
        set({ isLoading: false });
      }
    }
  },

  setLanguage: (languageCode) => {
    if (!LANGUAGES[languageCode] || languageCode === get().currentLanguage) {
      return;
    }
    set({ currentLanguage: languageCode });
    get().loadLanguage(languageCode);
  }
}));

// Initial load
useTranslationStore.getState().loadLanguage(useTranslationStore.getState().currentLanguage);

// Keep in sync when the UI store language changes from anywhere
useUIStore.subscribe((state, prevState) => {
  if (state.language !== prevState.language && LANGUAGES[state.language]) {
    useTranslationStore.getState().setLanguage(state.language);
  }
});

// Save language preference and update shared state
const changeLanguage = (languageCode) => {
  if (LANGUAGES[languageCode]) {
    useTranslationStore.getState().setLanguage(languageCode);
    useUIStore.getState().setLanguage(languageCode);
    localStorage.setItem('rikuest-language', languageCode);
  }
};

// Custom hook for translations
export const useTranslation = () => {
  const currentLanguage = useTranslationStore((state) => state.currentLanguage);
  const translations = useTranslationStore((state) => state.translations);
  const isLoading = useTranslationStore((state) => state.isLoading);

  // Translation function
  const t = useCallback((key, fallback = key) => {
    if (isLoading) return fallback;

    const translation = getNestedValue(translations, key);
    return translation || fallback;
  }, [translations, isLoading]);

  return {
    t,
    currentLanguage,
    currentLanguageInfo: LANGUAGES[currentLanguage],
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
