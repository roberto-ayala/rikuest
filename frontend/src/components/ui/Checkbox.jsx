import React from 'react';
import { cn } from '../../lib/utils';

// Canonical checkbox — replaces the raw `<input type="checkbox">` blocks that
// repeated this exact class string across RequestTabs and OpenAPIImportModal.
const Checkbox = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'w-4 h-4 text-primary bg-background border-border rounded cursor-pointer',
        'focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };
