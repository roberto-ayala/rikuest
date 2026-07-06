import React from 'react';
import { cn } from '../../lib/utils';
import { useUISize } from '../../hooks/useUISize';

// Shared visual language with the Select primitive (bg-background, rounded,
// border-input, ring-2 focus ring). Sizing comes from useUISize so the field
// scales with the app's UI-size setting instead of a fixed height.
const inputBase =
  "w-full bg-background text-foreground border border-input rounded transition-colors hover:border-input/80 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium";

// Chromeless variant for inline/search inputs (GlobalSearch, ResponsePanel).
const inputBorderless =
  "w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef(({ className, type, variant = 'default', ...props }, ref) => {
  const { input } = useUISize();
  return (
    <input
      type={type}
      className={cn(
        variant === 'borderless' ? inputBorderless : cn(input, inputBase),
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
