import React from 'react';
import { cn } from '../../lib/utils';
import { useUISize } from '../../hooks/useUISize';

const Label = React.forwardRef(({ className, ...props }, ref) => {
  const { text } = useUISize();
  return (
    <label
      ref={ref}
      className={cn(text('sm'), 'font-medium text-foreground', className)}
      {...props}
    />
  );
});

Label.displayName = "Label";

export { Label };
