import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import JsonEditor from '../JsonEditor';
import ResponseCapturesPanel from '../ResponseCapturesPanel';
import { useUISize } from '../../hooks/useUISize';
import { useTranslation } from '../../hooks/useTranslation';
import { createRow } from '../../lib/utils';

function RequestTabs({ requestData, updateRequestData, setRequestData, panelWidth }) {
  const { text, spacing, button, input, select, tab: tabStyle } = useUISize();
  const { t } = useTranslation();
  const [activeRequestTab, setActiveRequestTab] = useState('params');
  const tabsContainerRef = useRef(null);

  // Auto-scroll to active tab when panel width changes or tab changes
  const scrollToActiveTab = useCallback(() => {
    if (tabsContainerRef.current && activeRequestTab) {
      const activeButton = tabsContainerRef.current.querySelector(`[data-tab="${activeRequestTab}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeRequestTab]);

  useEffect(() => {
    scrollToActiveTab();
  }, [activeRequestTab, panelWidth, scrollToActiveTab]);

  // Query parameters
  const addQueryParam = () => {
    updateRequestData({
      query_params: [...requestData.query_params, createRow({ key: '', value: '', enabled: true })]
    });
  };

  const deleteQueryParam = (index) => {
    const newParams = requestData.query_params.filter((_, i) => i !== index);
    if (newParams.length === 0) {
      newParams.push(createRow({ key: '', value: '', enabled: true }));
    }
    updateRequestData({ query_params: newParams });
  };

  // Headers
  const addHeader = () => {
    setRequestData(prev => ({
      ...prev,
      headers_array: [...prev.headers_array, createRow({ key: '', value: '' })]
    }));
  };

  const deleteHeader = (index) => {
    const newHeadersArray = requestData.headers_array.filter((_, i) => i !== index);
    if (newHeadersArray.length === 0) {
      newHeadersArray.push(createRow({ key: '', value: '' }));
    }

    setRequestData(prev => ({
      ...prev,
      headers_array: newHeadersArray
    }));
  };

  const updateHeadersFromArray = (newHeadersArray) => {
    setRequestData(prev => ({
      ...prev,
      headers_array: newHeadersArray
    }));
  };

  // Body type functions
  const handleBodyTypeChange = (newBodyType) => {
    const updates = { body_type: newBodyType };

    // Initialize form_data if switching to form
    if (newBodyType === 'form' && (!requestData.form_data || requestData.form_data.length === 0)) {
      updates.form_data = [createRow({ key: '', value: '' })];
    }

    // Clear body content when switching to form or none
    if (newBodyType === 'form' || newBodyType === 'none') {
      updates.body = '';
    }

    updateRequestData(updates);

    // Automatically set appropriate Content-Type header
    updateContentTypeHeader(newBodyType);
  };

  const updateContentTypeHeader = (bodyType) => {
    let contentType = '';

    switch (bodyType) {
      case 'json':
        contentType = 'application/json';
        break;
      case 'text':
        contentType = 'text/plain';
        break;
      case 'form':
        contentType = 'application/x-www-form-urlencoded';
        break;
      default:
        // Remove Content-Type for 'none'
        break;
    }

    // Update headers_array to include/update Content-Type
    const newHeadersArray = [...requestData.headers_array];
    const contentTypeIndex = newHeadersArray.findIndex(h =>
      h.key && h.key.toLowerCase() === 'content-type'
    );

    if (contentType) {
      if (contentTypeIndex >= 0) {
        // Update existing Content-Type (keep row id so the input isn't remounted)
        newHeadersArray[contentTypeIndex] = { ...newHeadersArray[contentTypeIndex], key: 'Content-Type', value: contentType };
      } else {
        // Add new Content-Type header, but first ensure there's space
        const hasEmptyRow = newHeadersArray.some(h => !h.key.trim() && !h.value.trim());
        if (hasEmptyRow) {
          // Replace the first empty row
          const emptyIndex = newHeadersArray.findIndex(h => !h.key.trim() && !h.value.trim());
          newHeadersArray[emptyIndex] = { ...newHeadersArray[emptyIndex], key: 'Content-Type', value: contentType };
        } else {
          // Insert before the last row (which should be empty)
          newHeadersArray.splice(-1, 0, createRow({ key: 'Content-Type', value: contentType }));
        }
      }
    } else if (contentTypeIndex >= 0) {
      // Remove Content-Type header for 'none' type
      newHeadersArray.splice(contentTypeIndex, 1);
      // Ensure there's always at least one empty row
      if (newHeadersArray.length === 0 || newHeadersArray.every(h => h.key.trim() || h.value.trim())) {
        newHeadersArray.push(createRow({ key: '', value: '' }));
      }
    }

    updateHeadersFromArray(newHeadersArray);
  };

  // Form data functions
  const addFormDataItem = () => {
    updateRequestData({
      form_data: [...requestData.form_data, createRow({ key: '', value: '' })]
    });
  };

  const deleteFormDataItem = (index) => {
    const newFormData = requestData.form_data.filter((_, i) => i !== index);
    if (newFormData.length === 0) {
      newFormData.push(createRow({ key: '', value: '' }));
    }
    updateRequestData({ form_data: newFormData });
  };

  const requestTabs = [
    {
      id: 'params',
      label: t('request.tabParams'),
      count: requestData.query_params.filter(p => p.key && p.value).length || null
    },
    {
      id: 'headers',
      label: t('request.tabHeaders'),
      count: requestData.headers_array.filter(h => h.key && h.value).length || null
    },
    { id: 'body', label: t('request.tabBody') },
    { id: 'auth', label: t('request.tabAuthorization') },
    { id: 'captures', label: t('request.tabCaptures') },
  ];

  const bodyTypes = [
    { id: 'none', label: t('bodyTypes.none') },
    { id: 'json', label: 'JSON' },
    { id: 'text', label: t('bodyTypes.text') },
    { id: 'form', label: t('bodyTypes.form') }
  ];

  return (
    <>
      {/* Request Tabs */}
      <div className="border-b border-border flex-shrink-0">
        <div
          ref={tabsContainerRef}
          className="flex overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground"
          style={{ scrollbarWidth: 'thin' }}
        >
          {requestTabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              className={`${tabStyle} font-medium border-b-2 transition-colors flex-shrink-0 whitespace-nowrap ${
                activeRequestTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveRequestTab(tab.id)}
            >
              {tab.label}
              {tab.count && (
                <span className="ml-2 px-2 py-0.5 bg-muted text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Query Params Tab */}
        {activeRequestTab === 'params' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {requestData.query_params.map((param, index) => (
                <div key={param._id ?? index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => {
                      const newParams = [...requestData.query_params];
                      newParams[index].enabled = e.target.checked;
                      updateRequestData({ query_params: newParams });
                    }}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                  />
                  <Input
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...requestData.query_params];
                      newParams[index].key = e.target.value;
                      updateRequestData({ query_params: newParams });
                    }}
                    placeholder={t('request.paramName')}
                    className={`flex-1 ${input}`}
                  />
                  <Input
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...requestData.query_params];
                      newParams[index].value = e.target.value;
                      updateRequestData({ query_params: newParams });
                    }}
                    placeholder={t('request.paramValue')}
                    className={`flex-1 ${input}`}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => deleteQueryParam(index)}
                    className={button}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}

              <Button variant="ghost" onClick={addQueryParam} className={`w-full ${button}`}>
                <Plus className="h-4 w-4 mr-2" />
                {t('request.addParam')}
              </Button>
            </div>
          </div>
        )}

        {/* Headers Tab */}
        {activeRequestTab === 'headers' && (
          <div className={`h-full overflow-y-auto ${spacing(4)}`}>
            <div className="space-y-3">
              {requestData.headers_array.map((header, index) => (
                <div key={header._id ?? index} className="flex items-center space-x-2">
                  <Input
                    value={header.key}
                    onChange={(e) => {
                      const newHeadersArray = [...requestData.headers_array];
                      newHeadersArray[index] = { ...header, key: e.target.value };
                      updateHeadersFromArray(newHeadersArray);
                    }}
                    placeholder={t('request.headerName')}
                    className={`flex-1 ${input}`}
                  />
                  <Input
                    value={header.value}
                    onChange={(e) => {
                      const newHeadersArray = [...requestData.headers_array];
                      newHeadersArray[index] = { ...header, value: e.target.value };
                      updateHeadersFromArray(newHeadersArray);
                    }}
                    placeholder={t('request.headerValue')}
                    className={`flex-1 ${input}`}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => deleteHeader(index)}
                    className={button}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}

              <Button variant="ghost" onClick={addHeader} className={`w-full ${button}`}>
                <Plus className="h-4 w-4 mr-2" />
                {t('request.addHeader')}
              </Button>
            </div>
          </div>
        )}

        {/* Body Tab */}
        {activeRequestTab === 'body' && (
          <div className="h-full flex flex-col">
            <div className={`flex-shrink-0 ${spacing(3)}`}>
              <div className="flex space-x-2">
                {bodyTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`${spacing(1)} ${text('sm')} rounded transition-colors ${
                      requestData.body_type === type.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    onClick={() => handleBodyTypeChange(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={`flex-1 min-h-0 ${spacing(4)} pt-4`}>

              {requestData.body_type === 'form' && (
                <div className="space-y-3">
                  {requestData.form_data.map((item, index) => (
                    <div key={item._id ?? index} className="flex items-center space-x-2">
                      <Input
                        value={item.key}
                        onChange={(e) => {
                          const newFormData = [...requestData.form_data];
                          newFormData[index] = { ...item, key: e.target.value };
                          updateRequestData({ form_data: newFormData });
                        }}
                        placeholder={t('request.formKey')}
                        className={`flex-1 ${input}`}
                      />
                      <Input
                        value={item.value}
                        onChange={(e) => {
                          const newFormData = [...requestData.form_data];
                          newFormData[index] = { ...item, value: e.target.value };
                          updateRequestData({ form_data: newFormData });
                        }}
                        placeholder={t('request.formValue')}
                        className={`flex-1 ${input}`}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => deleteFormDataItem(index)}
                        className={button}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}

                  <Button variant="ghost" onClick={addFormDataItem} className={`w-full ${button}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('request.addFormField')}
                  </Button>
                </div>
              )}

              {requestData.body_type === 'json' && (
                <div className="h-full">
                  <JsonEditor
                    value={requestData.body}
                    onChange={(e) => updateRequestData({ body: e.target.value })}
                    placeholder={t('request.jsonPlaceholder')}
                  />
                </div>
              )}

              {requestData.body_type === 'text' && (
                <Textarea
                  value={requestData.body}
                  onChange={(e) => updateRequestData({ body: e.target.value })}
                  placeholder={t('request.textPlaceholder')}
                  className={`min-h-[200px] font-mono ${text('sm')} resize-none ${input}`}
                />
              )}
            </div>
          </div>
        )}

        {/* Captures Tab */}
        {activeRequestTab === 'captures' && (
          <ResponseCapturesPanel requestId={requestData.id} />
        )}

        {/* Auth Tab */}
        {activeRequestTab === 'auth' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <select
                value={requestData.auth_type}
                onChange={(e) => updateRequestData({ auth_type: e.target.value })}
                className={`w-full ${select}`}
              >
                <option value="none">{t('request.noAuth')}</option>
                <option value="bearer">{t('auth.bearer')}</option>
                <option value="basic">{t('auth.basic')}</option>
              </select>

              {requestData.auth_type === 'bearer' && (
                <div className="space-y-3">
                  <label className={`${text('sm')} font-medium`}>{t('request.token')}</label>
                  <Input
                    value={requestData.bearer_token}
                    onChange={(e) => updateRequestData({ bearer_token: e.target.value })}
                    placeholder={t('request.tokenPlaceholder')}
                    className={input}
                  />
                </div>
              )}

              {requestData.auth_type === 'basic' && (
                <div className="space-y-3">
                  <div>
                    <label className={`${text('sm')} font-medium`}>{t('request.username')}</label>
                    <Input
                      value={requestData.basic_auth.username}
                      onChange={(e) => updateRequestData({
                        basic_auth: { ...requestData.basic_auth, username: e.target.value }
                      })}
                      placeholder={t('request.usernamePlaceholder')}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={`${text('sm')} font-medium`}>{t('request.password')}</label>
                    <Input
                      value={requestData.basic_auth.password}
                      onChange={(e) => updateRequestData({
                        basic_auth: { ...requestData.basic_auth, password: e.target.value }
                      })}
                      type="password"
                      placeholder={t('request.passwordPlaceholder')}
                      className={input}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default RequestTabs;
