import { useUIStore } from '../stores/uiStore';

export function useUISize() {
  const { uiSize, theme, primaryColor, getSizeConfig, getColorConfig, setTheme, toggleTheme, setPrimaryColor } = useUIStore();
  const config = getSizeConfig(uiSize);
  const colorConfig = getColorConfig(primaryColor);

  return {
    size: uiSize,
    theme,
    primaryColor,
    config,
    colorConfig,
    setTheme,
    toggleTheme,
    setPrimaryColor,
    // Utility functions for common patterns
    text: (size = 'base') => config.text[size] || config.text.base,
    spacing: (level = 3) => config.spacing[level] || config.spacing[3],
    button: config.components.button,
    input: config.components.input,
    select: config.components.select,
    tab: config.components.tab,
    card: config.components.card,
    sidebar: config.components.sidebar,
    icon: config.components.icon,
    iconMd: config.components.iconMd,
    iconButton: config.components.iconButton,
    themeButton: config.components.themeButton,
    headerButton: config.components.headerButton,
    sidebarMinWidth: config.components.sidebarMinWidth,
    methodBadge: config.components.methodBadge,
    // One step below the row's own text: the badge is bold and uppercase, so at
    // the same size it reads larger than the request name next to it.
    methodBadgeText: config.components.methodBadgeText,
    // Fixed badge width, so request names line up in a column no matter which
    // method each row carries.
    methodBadgeWidth: config.components.methodBadgeWidth,
    itemSpacing: config.components.itemSpacing,
    menuItem: config.components.menuItem
  };
}