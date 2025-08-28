import React from 'react';
import { cn } from '../../lib/utils';
import { useUISize } from '../../hooks/useUISize';

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  const { select } = useUISize();
  
  return (
    <select
      className={cn(
        select,
        "focus-visible:ring-offset-background",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = "Select";

const SelectOption = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <option
      className={cn(
        "bg-background text-foreground",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </option>
  );
});

SelectOption.displayName = "SelectOption";

export { Select, SelectOption };