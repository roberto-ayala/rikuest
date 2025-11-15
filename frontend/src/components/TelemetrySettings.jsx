import React, { useEffect, useState } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';

const TelemetrySettings = () => {
  const { enabled, loading, fetchTelemetryStatus, setEnabled } = useTelemetryStore();
  const { text, spacing, button, input } = useUISize();
  const { t } = useTranslation();
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => {
    fetchTelemetryStatus();
  }, [fetchTelemetryStatus]);

  useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  const handleToggle = async () => {
    const newValue = !localEnabled;
    setLocalEnabled(newValue);
    await setEnabled(newValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>
              {t('settings.telemetry')}
            </h3>
            <p className={`${text('sm')} text-muted-foreground`}>
              {t('settings.telemetryDescription')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localEnabled}
              onChange={handleToggle}
              disabled={loading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className={`${spacing(4)} bg-muted/50 rounded-lg border border-border`}>
          <p className={`${text('sm')} text-muted-foreground mb-2`}>
            {t('settings.telemetryInfo')}
          </p>
          <ul className={`${text('sm')} text-muted-foreground list-disc list-inside space-y-1`}>
            <li>{t('settings.telemetryInfo1')}</li>
            <li>{t('settings.telemetryInfo2')}</li>
            <li>{t('settings.telemetryInfo3')}</li>
          </ul>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${localEnabled ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border'}`}>
          <p className={`${text('sm')} ${localEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
            {localEnabled ? t('settings.telemetryEnabled') : t('settings.telemetryDisabled')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelemetrySettings;

