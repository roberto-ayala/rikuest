import React from 'react';
import { Clock } from 'lucide-react';
import { useUISize } from '../hooks/useUISize';
import { useTranslation } from '../hooks/useTranslation';
import RequestTimeoutSelector from './RequestTimeoutSelector';

const ParametersSettings = () => {
  const { text, spacing } = useUISize();
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Request Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className={`${text('lg')} font-semibold text-foreground`}>
            {t('settings.requestSettings')}
          </h3>
        </div>
        <p className={`${text('sm')} text-muted-foreground`}>
          {t('settings.requestSettingsDescription')}
        </p>
        
        <div className="pt-2">
          <RequestTimeoutSelector modal={true} />
        </div>
      </div>

      {/* Future sections can be added here */}
      {/* Example:
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className={`${text('lg')} font-semibold text-foreground`}>
            {t('settings.anotherSection')}
          </h3>
        </div>
        <p className={`${text('sm')} text-muted-foreground`}>
          {t('settings.anotherSectionDescription')}
        </p>
        <div className="pt-2">
      
        </div>
      </div>
      */}
    </div>
  );
};

export default ParametersSettings;

