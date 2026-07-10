import React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './Label';

// Label + control + optional hint/error, laid out consistently. Pass the
// control as children; `htmlFor`/`id` wiring is the caller's responsibility.
function Field({ label, htmlFor, hint, error, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { Field };
