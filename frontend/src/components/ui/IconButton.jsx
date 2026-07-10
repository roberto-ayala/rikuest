import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { useUISize } from '../../hooks/useUISize';

// Square, size-aware ghost button for icons (modal close, row delete, …).
// Wraps Button so it inherits focus ring, disabled and variant handling; the
// useUISize `iconButton` sizing overrides Button's default padding via twMerge.
const IconButton = React.forwardRef(({ className, variant = 'ghost', children, ...props }, ref) => {
  const { iconButton } = useUISize();
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn(iconButton, 'flex-shrink-0', className)}
      {...props}
    >
      {children}
    </Button>
  );
});

IconButton.displayName = "IconButton";

export { IconButton };
