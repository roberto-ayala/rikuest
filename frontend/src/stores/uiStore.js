import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getBackgroundColors, getColorConfig, getSizeConfig } from '../lib/uiConfig.js';

export const useUIStore = create(
  persist(
    (set) => ({
      uiSize: 'md',
      theme: 'system',
      primaryColor: 'slate',
      layout: 'default', // 'default' or 'compact'
      language: 'en', // default language
      backgroundColorLight: 'default',
      backgroundColorDark: 'default',
      setUISize: (size) => set({ uiSize: size }),
      setLayout: (layout) => set({ layout }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setBackgroundColorLight: (color) => set({ backgroundColorLight: color }),
      setBackgroundColorDark: (color) => set({ backgroundColorDark: color }),

      // Static config lookups (see src/lib/uiConfig.js) exposed on the store
      // because components read them via the useUIStore hook.
      getBackgroundColors,
      getColorConfig,
      getSizeConfig
    }),
    {
      name: 'ui-settings',
    }
  )
);
