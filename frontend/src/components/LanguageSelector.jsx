import React from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useUISize } from '../hooks/useUISize';

const LanguageSelector = () => {
  const { t, currentLanguage, changeLanguage, availableLanguages } = useTranslation();
  const { icon, iconButton, menuItem } = useUISize();

  return (
    <Menu as="div" className="relative">
      <MenuButton
        as={Button}
        variant="ghost"
        className={`${iconButton} bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground`}
        title={t('settings.language')}
      >
        <Globe className={icon} />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-lg focus:outline-none"
      >
        {availableLanguages.map((language) => (
          <MenuItem key={language.code}>
            <button
              onClick={() => changeLanguage(language.code)}
              className={`${menuItem} w-full text-left flex items-center space-x-2 rounded-sm data-[focus]:bg-accent data-[focus]:text-accent-foreground ${
                currentLanguage === language.code ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.name}</span>
              {currentLanguage === language.code && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};

export default LanguageSelector;
