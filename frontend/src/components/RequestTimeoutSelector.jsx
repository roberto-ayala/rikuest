import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import { adapterFactory } from '../adapters/adapterFactory';

const RequestTimeoutSelector = ({ modal = false }) => {
  const { text, input, button } = useUISize();
  const { t } = useTranslation();
  const [timeoutSeconds, setTimeoutSeconds] = useState(300);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTimeout();
  }, []);

  const loadTimeout = async () => {
    try {
      setLoading(true);
      const adapter = await adapterFactory.getAdapter();
      const timeout = await adapter.getRequestTimeout();
      setTimeoutSeconds(timeout || 300);
    } catch (error) {
      console.error('Failed to load request timeout:', error);
      setTimeoutSeconds(300);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (timeoutSeconds < 1 || timeoutSeconds > 10800) {
      setMessage(t('settings.timeoutInvalid'));
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const adapter = await adapterFactory.getAdapter();
      await adapter.setRequestTimeout(timeoutSeconds);
      setMessage(t('settings.timeoutSaved'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save request timeout:', error);
      setMessage(t('settings.timeoutSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const formatTimeout = (seconds) => {
    if (seconds < 60) {
      return `${seconds} ${t('settings.seconds')}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} ${t('settings.minutes')}`;
      }
      return `${minutes} ${t('settings.minutes')} ${remainingSeconds} ${t('settings.seconds')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      if (remainingMinutes === 0) {
        return `${hours} ${t('settings.hours')}`;
      }
      return `${hours} ${t('settings.hours')} ${remainingMinutes} ${t('settings.minutes')}`;
    }
  };

  const presetTimeouts = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 },
    { label: '15m', value: 900 },
    { label: '30m', value: 1800 },
    { label: '1h', value: 3600 },
    { label: '2h', value: 7200 },
    { label: '3h', value: 10800 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className={`${text('sm')} text-muted-foreground`}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={`${text('sm')} font-medium mb-2 block text-foreground`}>
          {t('settings.requestTimeout')}
        </label>
        <p className={`${text('xs')} text-muted-foreground mb-4`}>
          {t('settings.requestTimeoutDescription')}
        </p>

        <div className="space-y-4">
          <div>
            <label className={`${text('sm')} font-medium mb-2 block text-foreground`}>
              {t('settings.timeoutSeconds')}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="10800"
                value={timeoutSeconds}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 1 && value <= 10800) {
                    setTimeoutSeconds(value);
                    setMessage('');
                  }
                }}
                className={`${input} w-32`}
                placeholder="300"
              />
              <span className={`${text('sm')} text-muted-foreground`}>
                = {formatTimeout(timeoutSeconds)}
              </span>
            </div>
            <p className={`${text('xs')} text-muted-foreground mt-2`}>
              {t('settings.timeoutRange')}
            </p>
          </div>

          <div>
            <label className={`${text('sm')} font-medium mb-2 block text-foreground`}>
              {t('settings.presetTimeouts')}
            </label>
            <div className="flex flex-wrap gap-2">
              {presetTimeouts.map((preset) => (
                <Button
                  key={preset.value}
                  variant={timeoutSeconds === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTimeoutSeconds(preset.value);
                    setMessage('');
                  }}
                  className={button}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.includes('Error') || message.includes('Invalid')
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <p className={`${text('sm')}`}>{message}</p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || timeoutSeconds < 1 || timeoutSeconds > 10800}
            className={button}
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestTimeoutSelector;

