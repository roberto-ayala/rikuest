import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      uiSize: 'md',
      theme: 'light',
      primaryColor: 'slate',
      responseTheme: 'auto', // auto, or theme name
      responseThemeLight: 'tomorrow', // default light theme
      responseThemeDark: 'twilight', // default dark theme
      defaultResponseThemeLight: 'tomorrow', // user-defined default light theme
      defaultResponseThemeDark: 'twilight', // user-defined default dark theme
      setUISize: (size) => set({ uiSize: size }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setResponseTheme: (responseTheme) => set({ responseTheme }),
      setResponseThemeLight: (responseThemeLight) => set({ responseThemeLight }),
      setResponseThemeDark: (responseThemeDark) => set({ responseThemeDark }),
      setDefaultResponseThemeLight: (defaultResponseThemeLight) => set({ defaultResponseThemeLight }),
      setDefaultResponseThemeDark: (defaultResponseThemeDark) => set({ defaultResponseThemeDark }),
      
      // Response syntax highlighting themes
      getAvailableResponseThemes: () => ({
        light: [
          { id: 'tomorrow', name: 'Tomorrow' },
          { id: 'prism', name: 'Prism' },
          { id: 'coy', name: 'Coy' },
          { id: 'solarizedlight', name: 'Solarized Light' },
          { id: 'base16AteliersulphurpoolLight', name: 'Base16 Light' },
          { id: 'cb', name: 'CB' },
          { id: 'duotoneLight', name: 'Duotone Light' },
          { id: 'ghcolors', name: 'GitHub Colors' },
          { id: 'pojoaque', name: 'Pojoaque' },
          { id: 'vs', name: 'Visual Studio' },
          { id: 'coldarkCold', name: 'Coldark Cold' },
          { id: 'materialLight', name: 'Material Light' },
          { id: 'oneLight', name: 'One Light' }
        ],
        dark: [
          { id: 'twilight', name: 'Twilight' },
          { id: 'dark', name: 'Dark' },
          { id: 'funky', name: 'Funky' },
          { id: 'okaidia', name: 'Okaidia' },
          { id: 'atomDark', name: 'Atom Dark' },
          { id: 'duotoneDark', name: 'Duotone Dark' },
          { id: 'hopscotch', name: 'Hopscotch' },
          { id: 'xonokai', name: 'Xonokai' },
          { id: 'coldarkDark', name: 'Coldark Dark' },
          { id: 'a11yDark', name: 'A11y Dark' },
          { id: 'dracula', name: 'Dracula' },
          { id: 'materialDark', name: 'Material Dark' },
          { id: 'materialOceanic', name: 'Material Oceanic' },
          { id: 'vscDarkPlus', name: 'VS Code Dark+' },
          { id: 'synthwave84', name: 'Synthwave 84' },
          { id: 'nightOwl', name: 'Night Owl' },
          { id: 'nord', name: 'Nord' },
          { id: 'lucario', name: 'Lucario' },
          { id: 'oneDark', name: 'One Dark' }
        ]
      }),
      
      // Color configurations
      getColorConfig: (colorName = 'slate') => {
        const colors = {
          blue: {
            name: 'Blue',
            light: { primary: '221 83% 53%', foreground: '210 40% 98%' },
            dark: { primary: '221 83% 63%', foreground: '222 84% 5%' }
          },
          petroleum: {
            name: 'Petroleum Blue',
            light: { primary: '195 85% 41%', foreground: '210 40% 98%' },
            dark: { primary: '195 85% 52%', foreground: '222 84% 5%' }
          },
          teal: {
            name: 'Teal',
            light: { primary: '173 80% 40%', foreground: '210 40% 98%' },
            dark: { primary: '173 80% 50%', foreground: '222 84% 5%' }
          },
          green: {
            name: 'Green',
            light: { primary: '142 76% 36%', foreground: '210 40% 98%' },
            dark: { primary: '142 76% 46%', foreground: '222 84% 5%' }
          },
          purple: {
            name: 'Purple',
            light: { primary: '262 83% 58%', foreground: '210 40% 98%' },
            dark: { primary: '262 83% 68%', foreground: '222 84% 5%' }
          },
          indigo: {
            name: 'Indigo',
            light: { primary: '239 84% 67%', foreground: '210 40% 98%' },
            dark: { primary: '239 84% 75%', foreground: '222 84% 5%' }
          },
          pink: {
            name: 'Pink',
            light: { primary: '330 81% 60%', foreground: '210 40% 98%' },
            dark: { primary: '330 81% 70%', foreground: '222 84% 5%' }
          },
          orange: {
            name: 'Orange',
            light: { primary: '25 95% 53%', foreground: '210 40% 98%' },
            dark: { primary: '25 95% 63%', foreground: '222 84% 5%' }
          },
          red: {
            name: 'Red',
            light: { primary: '0 84% 60%', foreground: '210 40% 98%' },
            dark: { primary: '0 84% 70%', foreground: '222 84% 5%' }
          },
          slate: {
            name: 'Slate',
            light: { primary: '215 28% 17%', foreground: '210 40% 98%' },
            dark: { primary: '215 28% 27%', foreground: '210 40% 98%' }
          }
        };
        return colors[colorName] || colors.slate;
      },
      
      // UI size configurations
      getSizeConfig: (size = 'md') => {
        const configs = {
          xs: {
            text: {
              xs: 'text-xs',
              sm: 'text-xs',
              base: 'text-sm',
              lg: 'text-sm',
              xl: 'text-base',
              '2xl': 'text-lg'
            },
            spacing: {
              1: 'p-1',
              2: 'p-1.5',
              3: 'p-2',
              4: 'p-2.5',
              6: 'p-3'
            },
            components: {
              button: 'h-7 px-2 text-xs',
              input: 'h-7 px-2 text-xs',
              select: 'h-7 px-2 text-xs bg-background text-foreground border border-input rounded transition-colors hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              tab: 'px-2 py-1 text-xs',
              card: 'p-2',
              sidebar: 'w-64'
            }
          },
          sm: {
            text: {
              xs: 'text-xs',
              sm: 'text-sm',
              base: 'text-sm',
              lg: 'text-base',
              xl: 'text-lg',
              '2xl': 'text-xl'
            },
            spacing: {
              1: 'p-1.5',
              2: 'p-2',
              3: 'p-2.5',
              4: 'p-3',
              6: 'p-3.5'
            },
            components: {
              button: 'h-8 px-2.5 text-sm',
              input: 'h-8 px-2.5 text-sm',
              select: 'h-8 px-2.5 text-sm bg-background text-foreground border border-input rounded transition-colors hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              tab: 'px-3 py-1.5 text-sm',
              card: 'p-3',
              sidebar: 'w-72'
            }
          },
          md: {
            text: {
              xs: 'text-xs',
              sm: 'text-sm',
              base: 'text-base',
              lg: 'text-lg',
              xl: 'text-xl',
              '2xl': 'text-2xl'
            },
            spacing: {
              1: 'p-2',
              2: 'p-2.5',
              3: 'p-3',
              4: 'p-4',
              6: 'p-6'
            },
            components: {
              button: 'h-9 px-3 text-sm',
              input: 'h-9 px-3 text-sm',
              select: 'h-9 px-3 text-sm bg-background text-foreground border border-input rounded transition-colors hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              tab: 'px-4 py-2 text-sm',
              card: 'p-4',
              sidebar: 'w-80'
            }
          },
          lg: {
            text: {
              xs: 'text-sm',
              sm: 'text-base',
              base: 'text-lg',
              lg: 'text-xl',
              xl: 'text-2xl',
              '2xl': 'text-3xl'
            },
            spacing: {
              1: 'p-2.5',
              2: 'p-3',
              3: 'p-4',
              4: 'p-5',
              6: 'p-7'
            },
            components: {
              button: 'h-10 px-4 text-base',
              input: 'h-10 px-4 text-base',
              select: 'h-10 px-4 text-base bg-background text-foreground border border-input rounded transition-colors hover:border-input/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              tab: 'px-5 py-2.5 text-base',
              card: 'p-5',
              sidebar: 'w-96'
            }
          }
        };
        
        return configs[size] || configs.md;
      }
    }),
    {
      name: 'ui-settings',
    }
  )
);