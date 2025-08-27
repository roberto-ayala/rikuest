import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';
import ColorSelector from './ColorSelector';
import UISizeSelector from './UISizeSelector';

const SettingsModal = ({ isOpen, onClose }) => {
  const { text, spacing, button } = useUISize();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header - Fixed */}
        <div className={`flex items-center justify-between flex-shrink-0 border-b border-border ${spacing(3)} sm:${spacing(4)}`}>
          <h2 className={`${text('lg')} font-semibold text-foreground`}>Settings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className={`flex-1 overflow-y-auto ${spacing(3)} sm:${spacing(4)}`}>
          <div className="space-y-6">
            {/* UI Size Section */}
            <div>
              <h3 className={`${text('base')} font-medium text-foreground mb-3`}>Interface Size</h3>
              <p className={`${text('sm')} text-muted-foreground mb-4`}>
                Choose the size of text, buttons, and other interface elements.
              </p>
              <UISizeSelector modal={true} />
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Primary Color Section */}
            <div>
              <h3 className={`${text('base')} font-medium text-foreground mb-3`}>Primary Color</h3>
              <p className={`${text('sm')} text-muted-foreground mb-4`}>
                Select the primary color for buttons, links, and highlights.
              </p>
              <ColorSelector modal={true} />
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className={`flex justify-end flex-shrink-0 border-t border-border ${spacing(3)} sm:${spacing(4)}`}>
          <Button onClick={onClose} className={button}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;