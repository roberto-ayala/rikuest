import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      uiSize: 'md',
      theme: 'system',
      primaryColor: 'slate',
      layout: 'default', // 'default' or 'compact'
      backgroundColorLight: 'default',
      backgroundColorDark: 'default',
      responseTheme: 'auto', // auto, or theme name
      responseThemeLight: 'oneLight', // default light theme
      responseThemeDark: 'oneDark', // default dark theme
      defaultResponseThemeLight: 'oneLight', // user-defined default light theme
      defaultResponseThemeDark: 'oneDark', // user-defined default dark theme
      setUISize: (size) => set({ uiSize: size }),
      setLayout: (layout) => set({ layout }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setBackgroundColorLight: (color) => set({ backgroundColorLight: color }),
      setBackgroundColorDark: (color) => set({ backgroundColorDark: color }),
      setResponseTheme: (responseTheme) => set({ responseTheme }),
      setResponseThemeLight: (responseThemeLight) => set({ responseThemeLight }),
      setResponseThemeDark: (responseThemeDark) => set({ responseThemeDark }),
      setDefaultResponseThemeLight: (defaultResponseThemeLight) => set({ defaultResponseThemeLight }),
      setDefaultResponseThemeDark: (defaultResponseThemeDark) => set({ defaultResponseThemeDark }),
      
      // Background color palettes
      getBackgroundColors: () => ({
        light: [
          { id: 'default', name: 'Default', class: 'bg-white', preview: '#ffffff' },
          { id: 'warm', name: 'Warm', class: 'bg-orange-50', preview: '#fff7ed' },
          { id: 'cool', name: 'Cool', class: 'bg-blue-50', preview: '#eff6ff' },
          { id: 'neutral', name: 'Neutral', class: 'bg-gray-50', preview: '#f9fafb' },
          { id: 'sage', name: 'Sage', class: 'bg-green-50', preview: '#f0fdf4' },
          { id: 'lavender', name: 'Lavender', class: 'bg-purple-50', preview: '#faf5ff' },
          { id: 'rose', name: 'Rose', class: 'bg-pink-50', preview: '#fdf2f8' },
          { id: 'amber', name: 'Amber', class: 'bg-amber-50', preview: '#fffbeb' }
        ],
        dark: [
          { id: 'default', name: 'Default', class: 'bg-slate-950', preview: '#020617' },
          { id: 'charcoal', name: 'Charcoal', class: 'bg-gray-900', preview: '#111827' },
          { id: 'midnight', name: 'Midnight', class: 'bg-blue-950', preview: '#172554' },
          { id: 'forest', name: 'Forest', class: 'bg-green-950', preview: '#14532d' },
          { id: 'plum', name: 'Plum', class: 'bg-purple-950', preview: '#581c87' },
          { id: 'wine', name: 'Wine', class: 'bg-red-950', preview: '#7f1d1d' },
          { id: 'coffee', name: 'Coffee', class: 'bg-amber-950', preview: '#451a03' },
          { id: 'obsidian', name: 'Obsidian', class: 'bg-zinc-950', preview: '#09090b' }
        ]
      }),
      
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
              sidebar: 'w-64',
              sidebarMinWidth: 220,
              icon: 'h-3 w-3',
              iconMd: 'h-3.5 w-3.5',
              iconButton: 'h-6 w-6 p-0',
              themeButton: 'h-6 px-1.5 py-0',
              headerButton: 'h-6 px-2 py-0',
              methodBadge: 'px-1.5 py-0.5',
              itemSpacing: 'space-x-1.5',
              menuItem: 'px-2 py-1.5 text-xs'
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
              sidebar: 'w-72',
              sidebarMinWidth: 240,
              icon: 'h-3.5 w-3.5',
              iconMd: 'h-4 w-4',
              iconButton: 'h-7 w-7 p-0',
              themeButton: 'h-7 px-2 py-0',
              headerButton: 'h-7 px-2.5 py-0',
              methodBadge: 'px-2 py-1',
              itemSpacing: 'space-x-2',
              menuItem: 'px-2.5 py-2 text-sm'
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
              sidebar: 'w-80',
              sidebarMinWidth: 260,
              icon: 'h-4 w-4',
              iconMd: 'h-4 w-4',
              iconButton: 'h-8 w-8 p-0',
              themeButton: 'h-8 px-2.5 py-0',
              headerButton: 'h-8 px-3 py-0',
              methodBadge: 'px-2.5 py-1',
              itemSpacing: 'space-x-2',
              menuItem: 'px-3 py-2 text-sm'
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
              sidebar: 'w-96',
              sidebarMinWidth: 280,
              icon: 'h-4 w-4',
              iconMd: 'h-5 w-5',
              iconButton: 'h-9 w-9 p-0',
              themeButton: 'h-9 px-3 py-0',
              headerButton: 'h-9 px-4 py-0',
              methodBadge: 'px-3 py-1.5',
              itemSpacing: 'space-x-3',
              menuItem: 'px-4 py-2.5 text-base'
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