import React from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '../../lib/utils';

// Accessible toggle built on Headless UI's Switch — replaces the hand-rolled
// peer-based checkbox toggle in TelemetrySettings.
function Switch({ checked, onChange, disabled = false, className }) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'bg-muted data-[checked]:bg-primary',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-background shadow transition-transform group-data-[checked]:translate-x-[1.375rem]"
      />
    </HeadlessSwitch>
  );
}

export { Switch };
