import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Send, Plus, Trash2, Loader2, BarChart3, Clock, History, X, Timer, HardDrive, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import JsonEditor from './JsonEditor';
import { useRequestStore } from '../stores/requestStore';
import { useUISize } from '../hooks/useUISize';
import { useUIStore } from '../stores/uiStore';
import hljs from 'highlight.js';
// import 'highlight.js/styles/github.css';
// import 'highlight.js/styles/github-dark.css';
import { adapterFactory } from '../adapters/adapterFactory.js';

// Optimized code highlighting component using highlight.js
const HighlightedCode = React.memo(({ content, language, formatJson, textSize, config }) => {
  const codeRef = useRef(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  // Subscribe to store changes to get background color settings
  const { theme, backgroundColorLight, backgroundColorDark, getBackgroundColors } = useUIStore();
  
  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  
  // Helper to convert HSL to hex
  const hslToHex = useCallback((h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }, []);
  
  // Get app background color from configuration - directly from settings
  const backgroundColor = useMemo(() => {
    if (typeof window === 'undefined') return isDark ? '#020617' : '#ffffff';
    
    // Use isDark directly (it reflects the actual DOM state)
    const effectiveTheme = isDark ? 'dark' : 'light';
    
    // Get background colors and find current selection from settings
    const backgroundColors = getBackgroundColors();
    const currentBgId = isDark ? backgroundColorDark : backgroundColorLight;
    const currentBgConfig = backgroundColors[effectiveTheme]?.find(bg => bg.id === currentBgId);
    
    // Return the exact color from settings configuration
    if (currentBgConfig && currentBgConfig.preview) {
      return currentBgConfig.preview;
    }
    
    // Fallback to CSS variable if no background selection
    const root = getComputedStyle(document.documentElement);
    let bgColor = root.getPropertyValue('--background').trim();
    
    if (bgColor) {
      // Handle HSL format: "220 14% 96%" or "hsl(220, 14%, 96%)"
      if (bgColor.includes(' ')) {
        // Remove any hsl() wrapper if present
        bgColor = bgColor.replace(/^hsl\(|\)$/g, '');
        const values = bgColor.split(/[\s,]+/).map(v => v.replace('%', ''));
        
        if (values.length >= 3) {
          const h = parseFloat(values[0]);
          const s = parseFloat(values[1]);
          const l = parseFloat(values[2]);
          return hslToHex(h, s, l);
        }
      }
      
      // Handle hex colors directly
      if (bgColor.startsWith('#')) {
        return bgColor;
      }
      
      // Handle rgb format
      if (bgColor.startsWith('rgb')) {
        const match = bgColor.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0]);
          const g = parseInt(match[1]);
          const b = parseInt(match[2]);
          return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
      }
    }
    
    // Fallback colors - use default dark background
    return isDark ? '#020617' : '#ffffff';
  }, [isDark, backgroundColorLight, backgroundColorDark, getBackgroundColors, hslToHex]);

  
  // Memoize the highlighted HTML
  const highlightedContent = useMemo(() => {
    if (!content) return '';
    
    const processedContent = language === 'json' ? formatJson(content) : content;
    
    if (language === 'text' || !language) {
      return processedContent;
    }
    
    try {
      // Use highlight.js to highlight the code
      // Map language names to highlight.js supported languages
      let hljsLanguage = language;
      if (language === 'javascript') hljsLanguage = 'js';
      if (language === 'http') hljsLanguage = 'http';
      
      const highlighted = hljs.highlight(processedContent, { 
        language: hljsLanguage,
        ignoreIllegals: true
      });
      return highlighted.value;
    } catch (error) {
      // If highlighting fails, return plain text
      return processedContent;
    }
  }, [content, language, formatJson]);
  
  // Apply highlighting when content changes
  useEffect(() => {
    if (codeRef.current && language !== 'text' && language && highlightedContent) {
      codeRef.current.innerHTML = highlightedContent;
    }
  }, [highlightedContent, language]);
  
  const fontSize = config.text.sm.includes('text-xs') ? '0.75rem' : 
                   config.text.sm.includes('text-sm') ? '0.875rem' :
                   config.text.sm.includes('text-base') ? '1rem' : '1.125rem';
  
  if (language === 'text' || !language) {
    return (
      <div className="h-full overflow-y-auto">
        <pre 
          className={`${textSize} p-4 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap break-words`}
          style={{ fontSize, backgroundColor }}
        >
          {content}
        </pre>
      </div>
    );
  }
  
  return (
    <div className={`h-full overflow-y-auto hljs-container ${isDark ? 'hljs-theme-dark' : 'hljs-theme-light'}`}>
      <pre 
        className={`${textSize} p-4 rounded-lg overflow-x-auto font-mono`}
        style={{ 
          fontSize, 
          backgroundColor,
          ['--hljs-bg']: backgroundColor
        }}
      >
        <code 
          ref={codeRef}
          className={`hljs language-${language}`}
        />
      </pre>
    </div>
  );
});

HighlightedCode.displayName = 'HighlightedCode';

function RequestBuilder() {
  const { currentRequest, currentResponse, executing, updateRequest, saveRequestOptimistic, executeRequest, setCurrentResponse } = useRequestStore();
  const { text, spacing, button, input, select, tab: tabStyle, theme, config } = useUISize();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  

  
  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);
  
  // Local state for the request data
  const [requestData, setRequestData] = useState({
    id: null,
    project_id: null,
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    headers_array: [{ key: '', value: '' }], // UI representation of headers
    body: '',
    query_params: [{ key: '', value: '', enabled: true }],
    auth_type: 'none',
    bearer_token: '',
    basic_auth: { username: '', password: '' },
    body_type: 'none',
    form_data: []
  });

  // Tabs
  const [activeRequestTab, setActiveRequestTab] = useState('params');
  const [activeResponseTab, setActiveResponseTab] = useState('body');
  const [history, setHistory] = useState([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { historyId, historyItem }
  const tabsContainerRef = React.useRef(null);

  // Panel resizing with percentage-based persistence
  const [leftPanelWidth, setLeftPanelWidth] = useState(500); // Initial pixel value
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = React.useRef(null);

  // Save panel width percentage to localStorage
  const saveWidthPercentage = React.useCallback((width) => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const percentage = (width / containerWidth) * 100;
      localStorage.setItem('requestBuilder-leftPanelPercentage', percentage.toString());
    }
  }, []);

  // Load and apply saved percentage
  const loadSavedWidth = React.useCallback(() => {
    if (containerRef.current) {
      const savedPercentage = localStorage.getItem('requestBuilder-leftPanelPercentage');
      if (savedPercentage) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const percentage = parseFloat(savedPercentage);
        
        // Apply constraints
        const constrainedPercentage = Math.min(Math.max(percentage, 30), 80);
        const newWidth = (constrainedPercentage / 100) * containerWidth;
        
        setLeftPanelWidth(newWidth);
      } else {
        // Default to 40% if no saved value
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        setLeftPanelWidth(containerWidth * 0.4);
      }
    }
  }, []);

  // Handle resizing
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    // Calculate percentage constraints (30% to 80%)
    const minWidth = containerWidth * 0.3;
    const maxWidth = containerWidth * 0.8;
    
    // Clamp the width between min and max
    const newWidth = Math.min(Math.max(mouseX, minWidth), maxWidth);
    
    setLeftPanelWidth(newWidth);
    saveWidthPercentage(newWidth);
  }, [isResizing, saveWidthPercentage]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Initialize panel width responsively and load saved width
  React.useEffect(() => {
    const handleResize = () => {
      loadSavedWidth();
    };

    // Load saved width on mount
    loadSavedWidth();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loadSavedWidth]);

  // Auto-scroll to active tab when panel width changes or tab changes
  const scrollToActiveTab = React.useCallback(() => {
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

  React.useEffect(() => {
    scrollToActiveTab();
  }, [activeRequestTab, leftPanelWidth, scrollToActiveTab]);

  // Initialize request data when currentRequest changes
  useEffect(() => {
    if (currentRequest) {
      isInitializing.current = true;
      
      // Convert headers object to array for UI
      const headersObj = currentRequest.headers || {};
      const headersArray = Object.keys(headersObj).length > 0 
        ? Object.entries(headersObj).map(([key, value]) => ({ key, value }))
        : [{ key: '', value: '' }];
      // Always ensure at least one empty row
      if (headersArray.every(h => h.key.trim() || h.value.trim())) {
        headersArray.push({ key: '', value: '' });
      }

      const newRequestData = {
        id: currentRequest.id,
        project_id: currentRequest.project_id,
        folder_id: currentRequest.folder_id || null,
        name: currentRequest.name || '',
        method: currentRequest.method || 'GET',
        url: currentRequest.url || '',
        headers: { ...(currentRequest.headers || {}) },
        headers_array: headersArray,
        body: currentRequest.body || '',
        query_params: currentRequest.query_params && currentRequest.query_params.length > 0 
          ? [...currentRequest.query_params] 
          : [{ key: '', value: '', enabled: true }],
        auth_type: currentRequest.auth_type || 'none',
        bearer_token: currentRequest.bearer_token || '',
        basic_auth: { ...(currentRequest.basic_auth || { username: '', password: '' }) },
        body_type: currentRequest.body_type || 'none',
        form_data: currentRequest.form_data ? [...currentRequest.form_data] : []
      };
      
      setRequestData(newRequestData);
      
      // Set normalized data for comparison - only meaningful content
      const meaningfulHeadersArray = headersArray.filter(h => 
        (h.key && h.key.trim()) && (h.value && h.value.trim())
      );
      
      const normalizedData = {
        ...newRequestData,
        headers_array: meaningfulHeadersArray,
        query_params: newRequestData.query_params.filter(p => 
          (p.key && p.key.trim()) || (p.value && p.value.trim())
        ),
        form_data: newRequestData.form_data.filter(item => 
          (item.key && item.key.trim()) || (item.value && item.value.trim())
        )
      };
      
      // Remove headers object from comparison
      delete normalizedData.headers;
      lastSavedData.current = JSON.stringify(normalizedData);
      
      // Reset initialization flag after a brief delay
      setTimeout(() => {
        isInitializing.current = false;
      }, 100);
    }
  }, [currentRequest]);

  // Save request changes (debounced)
  const saveTimeout = React.useRef(null);
  const isInitializing = React.useRef(false);
  const lastSavedData = React.useRef(null);

  const saveRequest = useCallback(async () => {
    if (!requestData.id || isInitializing.current) return;
    
    // Create normalized data for comparison - only include meaningful content
    const meaningfulHeadersArray = requestData.headers_array.filter(h => 
      (h.key && h.key.trim()) && (h.value && h.value.trim()) // Both key AND value must have content
    );
    
    const normalizedData = {
      ...requestData,
      headers_array: meaningfulHeadersArray, // Only compare meaningful headers
      query_params: requestData.query_params.filter(p => 
        (p.key && p.key.trim()) || (p.value && p.value.trim())
      ),
      form_data: requestData.form_data.filter(item => 
        (item.key && item.key.trim()) || (item.value && item.value.trim())
      )
    };
    
    // Remove headers object from comparison to avoid conflicts
    delete normalizedData.headers;
    
    const currentDataString = JSON.stringify(normalizedData);
    if (lastSavedData.current === currentDataString) return;
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(async () => {
      try {
        // Sync headers object from headers_array before saving
        const filteredHeaders = {};
        requestData.headers_array.forEach(h => {
          if (h.key && h.key.trim() && h.value && h.value.trim()) {
            filteredHeaders[h.key.trim()] = h.value.trim();
          }
        });
        
        const filteredQueryParams = requestData.query_params.filter(p => 
          (p.key && p.key.trim()) || (p.value && p.value.trim())
        );
        // Always ensure at least one empty param exists for UI, but don't save it
        if (filteredQueryParams.length === 0) {
          filteredQueryParams.push({ key: '', value: '', enabled: true });
        }
            
        const filteredFormData = requestData.form_data.filter(item => 
          (item.key && item.key.trim()) || (item.value && item.value.trim())
        );
        
        const requestToSave = {
          ...requestData,
          headers: filteredHeaders,
          query_params: filteredQueryParams,
          form_data: filteredFormData
        };
        
        // Optimistic update - save to server and update background data
        const updatedRequest = await saveRequestOptimistic(requestData.id, requestToSave);
        
        // Update the comparison data to prevent unnecessary saves
        lastSavedData.current = currentDataString;
      } catch (error) {
        console.error('Failed to save request:', error);
      }
    }, 500); // Reduced debounce since UI is now optimistic
  }, [requestData, saveRequestOptimistic]);

  // No automatic sync - headers object will only be updated during save to avoid interference

  // Auto-save when requestData changes (optimistic UI - no re-renders after save)
  useEffect(() => {
    if (requestData.id && !isInitializing.current) {
      saveRequest();
    }
  }, [requestData, saveRequest]);

  const updateRequestData = (updates) => {
    setRequestData(prev => ({ ...prev, ...updates }));
  };

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
      'POST': 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800',
      'PUT': 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
      'DELETE': 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
      'PATCH': 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
      'HEAD': 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800',
      'OPTIONS': 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800'
    };
    return colors[method] || 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800';
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 300 && status < 400) return 'text-yellow-600 bg-yellow-50';
    if (status >= 400) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatSize = useCallback((bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  const formatJson = (jsonString) => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  const getResponseLanguage = () => {
    if (!currentResponse || !currentResponse.body) return 'text';
    
    const contentType = currentResponse.headers?.['content-type'] || '';
    const body = currentResponse.body.trim();
    
    // Check content type first
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      return 'json';
    }
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      return 'html';
    }
    if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
      return 'xml';
    }
    if (contentType.includes('text/css')) {
      return 'css';
    }
    if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
      return 'javascript';
    }
    
    // Fallback: detect by content structure
    try {
      JSON.parse(body);
      return 'json';
    } catch {
      if (body.startsWith('<!DOCTYPE') || body.startsWith('<html') || /<[^>]+>/.test(body)) {
        return 'html';
      }
      if (body.startsWith('<?xml') || /<[^>]+>/.test(body)) {
        return 'xml';
      }
    }
    
    return 'text';
  };


  // Query parameters
  const addQueryParam = () => {
    updateRequestData({
      query_params: [...requestData.query_params, { key: '', value: '', enabled: true }]
    });
  };

  const deleteQueryParam = (index) => {
    const newParams = requestData.query_params.filter((_, i) => i !== index);
    if (newParams.length === 0) {
      newParams.push({ key: '', value: '', enabled: true });
    }
    updateRequestData({ query_params: newParams });
  };

  // Headers
  const addHeader = () => {
    setRequestData(prev => ({
      ...prev,
      headers_array: [...prev.headers_array, { key: '', value: '' }]
    }));
  };

  const deleteHeader = (index) => {
    const newHeadersArray = requestData.headers_array.filter((_, i) => i !== index);
    if (newHeadersArray.length === 0) {
      newHeadersArray.push({ key: '', value: '' });
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
      updates.form_data = [{ key: '', value: '' }];
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
        // Update existing Content-Type
        newHeadersArray[contentTypeIndex] = { key: 'Content-Type', value: contentType };
      } else {
        // Add new Content-Type header, but first ensure there's space
        const hasEmptyRow = newHeadersArray.some(h => !h.key.trim() && !h.value.trim());
        if (hasEmptyRow) {
          // Replace the first empty row
          const emptyIndex = newHeadersArray.findIndex(h => !h.key.trim() && !h.value.trim());
          newHeadersArray[emptyIndex] = { key: 'Content-Type', value: contentType };
        } else {
          // Insert before the last row (which should be empty)
          newHeadersArray.splice(-1, 0, { key: 'Content-Type', value: contentType });
        }
      }
    } else if (contentTypeIndex >= 0) {
      // Remove Content-Type header for 'none' type
      newHeadersArray.splice(contentTypeIndex, 1);
      // Ensure there's always at least one empty row
      if (newHeadersArray.length === 0 || newHeadersArray.every(h => h.key.trim() || h.value.trim())) {
        newHeadersArray.push({ key: '', value: '' });
      }
    }
    
    updateHeadersFromArray(newHeadersArray);
  };

  // Form data functions
  const addFormDataItem = () => {
    updateRequestData({
      form_data: [...requestData.form_data, { key: '', value: '' }]
    });
  };

  const deleteFormDataItem = (index) => {
    const newFormData = requestData.form_data.filter((_, i) => i !== index);
    if (newFormData.length === 0) {
      newFormData.push({ key: '', value: '' });
    }
    updateRequestData({ form_data: newFormData });
  };

  // Execute request
  const handleExecuteRequest = async () => {
    if (!requestData.id) return;
    
    try {
      await executeRequest(requestData.id);
      loadHistory();
    } catch (error) {
      console.error('Failed to execute request:', error);
    }
  };

  // Load history
  const loadHistory = useCallback(async () => {
    if (!requestData.id) return;
    
    try {
      const adapter = await adapterFactory.getAdapter();
      const history = await adapter.getRequestHistory(requestData.id);
      setHistory(history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, [requestData.id]);

  // Memoized utility functions for history items
  const getHistoryStatusColor = useCallback((status) => {
    if (status >= 200 && status < 300) return 'text-emerald-600 dark:text-emerald-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }, []);


  // Load history automatically when request changes
  useEffect(() => {
    if (requestData.id) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [requestData.id, loadHistory]);

  // Handle history item selection
  const handleHistoryItemSelect = async (historyItem) => {
    setLoadingHistoryItem(true);
    
    // Close drawer immediately to show loader
    setIsHistoryDrawerOpen(false);
    
    // Switch to response view
    setActiveResponseTab('body');
    
    try {
      // Small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // The history item contains a "response" object with the actual response data
      const response = {
        ...historyItem.response,
        executed_at: historyItem.executed_at // Add the execution timestamp
      };
      
      // Update the current response with the history item's response
      setCurrentResponse(response);
    } finally {
      setLoadingHistoryItem(false);
    }
  };

  // Handle history item deletion
  const handleDeleteHistoryItem = async (historyId, historyItem) => {
    setDeleteConfirmation({ historyId, historyItem });
  };

  const confirmDeleteHistoryItem = async () => {
    if (!deleteConfirmation) return;
    
    try {
      const adapter = await adapterFactory.getAdapter();
      await adapter.deleteRequestHistoryItem(requestData.id, deleteConfirmation.historyId);
      
      // Reload history
      await loadHistory();
      
      // Clear current response if it matches the deleted item
      if (currentResponse && currentResponse.executed_at === deleteConfirmation.historyItem.executed_at) {
        setCurrentResponse(null);
      }
    } catch (error) {
      console.error('Failed to delete history item:', error);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const cancelDeleteHistoryItem = () => {
    setDeleteConfirmation(null);
  };

  const requestTabs = [
    { 
      id: 'params', 
      label: 'Params', 
      count: requestData.query_params.filter(p => p.key && p.value).length || null 
    },
    { 
      id: 'headers', 
      label: 'Headers', 
      count: requestData.headers_array.filter(h => h.key && h.value).length || null 
    },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Authorization' }
  ];

  const responseTabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
    { id: 'raw', label: 'Raw Request' }
  ];

  const bodyTypes = [
    { id: 'none', label: 'None' },
    { id: 'json', label: 'JSON' },
    { id: 'text', label: 'Text' },
    { id: 'form', label: 'Form Data' }
  ];

  if (!currentRequest) {
    return <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">No request selected</p>
    </div>;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Request Header */}
      <div className={`border-b border-border bg-background ${spacing(4)}`}>
        <div className="flex items-center space-x-3 mb-3">
          <select
            value={requestData.method}
            onChange={(e) => updateRequestData({ method: e.target.value })}
            className={`${select} font-medium min-w-[90px] ${getMethodColor(requestData.method)}`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          
          <Input
            value={requestData.url}
            onChange={(e) => updateRequestData({ url: e.target.value })}
            placeholder="Enter request URL"
            className={`flex-1 ${input} not-box-shadow`}
          />
          
          <Button
            onClick={handleExecuteRequest}
            disabled={!requestData.url?.trim() || executing}
            className={`min-w-[100px] ${button}`}
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-between flex-1">
          <Input
            value={requestData.name}
            onChange={(e) => updateRequestData({ name: e.target.value })}
            placeholder="Request name"
            className={`${text('lg')} font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 shadow-none flex-1 mr-3`}
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
            title="Request History"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex flex-1 overflow-hidden w-full min-h-0 relative"
      >
        {/* Request Configuration Panel */}
        <div 
          className="flex-shrink-0 flex flex-col min-h-0"
          style={{ width: leftPanelWidth + 'px' }}
        >
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
                    <div key={index} className="flex items-center space-x-2">
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
                        placeholder="Parameter name"
                        className={`flex-1 ${input}`}
                      />
                      <Input
                        value={param.value}
                        onChange={(e) => {
                          const newParams = [...requestData.query_params];
                          newParams[index].value = e.target.value;
                          updateRequestData({ query_params: newParams });
                        }}
                        placeholder="Parameter value"
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
                    Add Parameter
                  </Button>
                </div>
              </div>
            )}

            {/* Headers Tab */}
            {activeRequestTab === 'headers' && (
              <div className={`h-full overflow-y-auto ${spacing(4)}`}>
                <div className="space-y-3">
                  {requestData.headers_array.map((header, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={header.key}
                        onChange={(e) => {
                          const newHeadersArray = [...requestData.headers_array];
                          newHeadersArray[index] = { ...header, key: e.target.value };
                          updateHeadersFromArray(newHeadersArray);
                        }}
                        placeholder="Header name"
                        className={`flex-1 ${input}`}
                      />
                      <Input
                        value={header.value}
                        onChange={(e) => {
                          const newHeadersArray = [...requestData.headers_array];
                          newHeadersArray[index] = { ...header, value: e.target.value };
                          updateHeadersFromArray(newHeadersArray);
                        }}
                        placeholder="Header value"
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
                    Add Header
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
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={item.key}
                            onChange={(e) => {
                              const newFormData = [...requestData.form_data];
                              newFormData[index] = { ...item, key: e.target.value };
                              updateRequestData({ form_data: newFormData });
                            }}
                            placeholder="Key"
                            className={`flex-1 ${input}`}
                          />
                          <Input
                            value={item.value}
                            onChange={(e) => {
                              const newFormData = [...requestData.form_data];
                              newFormData[index] = { ...item, value: e.target.value };
                              updateRequestData({ form_data: newFormData });
                            }}
                            placeholder="Value"
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
                        Add Form Field
                      </Button>
                    </div>
                  )}

                  {requestData.body_type === 'json' && (
                    <div className="h-full">
                      <JsonEditor
                        value={requestData.body}
                        onChange={(e) => updateRequestData({ body: e.target.value })}
                        placeholder="Enter JSON body"
                      />
                    </div>
                  )}

                  {requestData.body_type === 'text' && (
                    <Textarea
                      value={requestData.body}
                      onChange={(e) => updateRequestData({ body: e.target.value })}
                      placeholder="Enter text body"
                      className={`min-h-[200px] font-mono ${text('sm')} resize-none ${input}`}
                    />
                  )}
                </div>
              </div>
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
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>

                  {requestData.auth_type === 'bearer' && (
                    <div className="space-y-3">
                      <label className={`${text('sm')} font-medium`}>Token</label>
                      <Input
                        value={requestData.bearer_token}
                        onChange={(e) => updateRequestData({ bearer_token: e.target.value })}
                        placeholder="Enter bearer token"
                        className={input}
                      />
                    </div>
                  )}

                  {requestData.auth_type === 'basic' && (
                    <div className="space-y-3">
                      <div>
                        <label className={`${text('sm')} font-medium`}>Username</label>
                        <Input
                          value={requestData.basic_auth.username}
                          onChange={(e) => updateRequestData({ 
                            basic_auth: { ...requestData.basic_auth, username: e.target.value }
                          })}
                          placeholder="Enter username"
                          className={input}
                        />
                      </div>
                      <div>
                        <label className={`${text('sm')} font-medium`}>Password</label>
                        <Input
                          value={requestData.basic_auth.password}
                          onChange={(e) => updateRequestData({ 
                            basic_auth: { ...requestData.basic_auth, password: e.target.value }
                          })}
                          type="password"
                          placeholder="Enter password"
                          className={input}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={`w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group ${
            isResizing ? 'bg-primary' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-0 w-3 -translate-x-1 z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-muted-foreground/30 rounded-full group-hover:bg-primary/70 transition-colors" />
        </div>

        {/* Response Area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {loadingHistoryItem ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className={`${text('lg')} font-medium text-foreground`}>Loading History Item</h3>
                  <p className={`${text('sm')} text-muted-foreground`}>Loading response from history...</p>
                </div>
              </div>
            </div>
          ) : executing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <div>
                  <h3 className={`${text('lg')} font-medium text-foreground`}>Executing Request</h3>
                  <p className={`${text('sm')} text-muted-foreground`}>Please wait while the request is being processed...</p>
                </div>
              </div>
            </div>
          ) : !currentResponse ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className={`${text('lg')} font-medium text-foreground`}>No Response</h3>
                  <p className={`${text('sm')} text-muted-foreground`}>Send a request to see the response here</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 h-full">
              {/* Response Header */}
              <div className="border-b border-border p-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded ${text('sm')} font-bold ${getStatusColor(currentResponse.status)}`}>
                      {currentResponse.status_text}
                    </div>
                    <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
                      <Timer className="h-3 w-3" />
                      {currentResponse.duration}ms
                    </span>
                    <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
                      <HardDrive className="h-3 w-3" />
                      {formatSize(currentResponse.size)}
                    </span>
                    {currentResponse.executed_at && (
                      <span className={`${text('sm')} text-muted-foreground flex items-center gap-1`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(currentResponse.executed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Response Tabs */}
              <div className="border-b border-border flex-shrink-0">
                <div className="flex">
                  {responseTabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`${tabStyle} font-medium border-b-2 transition-colors ${
                        activeResponseTab === tab.id 
                          ? 'border-primary text-primary bg-primary/5' 
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setActiveResponseTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeResponseTab === 'body' && (
                  <HighlightedCode
                    content={currentResponse.body}
                    language={getResponseLanguage()}
                    formatJson={formatJson}
                    textSize={text('sm')}
                    config={config}
                  />
                )}

                {activeResponseTab === 'headers' && (
                  <div className="h-full overflow-y-auto p-4">
                    <div className="space-y-2">
                      {Object.entries(currentResponse.headers || {}).map(([key, value]) => (
                        <div key={key} className="flex py-2 border-b border-border last:border-b-0">
                          <div className={`w-1/3 font-medium ${text('sm')} text-foreground flex-shrink-0`}>{key}</div>
                          <div className={`flex-1 ${text('sm')} text-muted-foreground font-mono break-all`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeResponseTab === 'raw' && (
                  <div className="h-full overflow-y-auto p-4">
                    {currentResponse.raw_request ? (
                      <HighlightedCode
                        content={currentResponse.raw_request}
                        language="http"
                        formatJson={formatJson}
                        textSize={text('sm')}
                        config={config}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Send className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className={`${text('sm')} text-muted-foreground`}>Raw request not available</p>
                        <p className={`${text('xs')} text-muted-foreground`}>This might be an older request or the backend doesn't support raw request logging yet</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Drawer */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80"
            onClick={() => setIsHistoryDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="relative ml-auto w-96 h-full bg-card border-l border-border shadow-lg flex flex-col">
            {/* Header */}
            <div className={`flex items-center justify-between border-b border-border ${spacing(4)}`}>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className={`${text('lg')} font-semibold text-foreground`}>Request History</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto ${spacing(4)}`}>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className={`${text('sm')} text-muted-foreground mb-2`}>No request history</p>
                  <p className={`${text('xs')} text-muted-foreground`}>Execute this request to see its history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="relative border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 group hover:shadow-sm"
                    >
                      <button
                        onClick={() => handleHistoryItemSelect(item)}
                        className="w-full p-3 pr-12 text-left rounded-lg hover:bg-transparent transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`${text('xs')} text-muted-foreground`}>
                            {new Date(item.executed_at).toLocaleString()}
                          </span>
                          <span className={`${text('sm')} font-medium ${getHistoryStatusColor(item.response.status)}`}>
                            {item.response.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`${text('xs')} text-muted-foreground flex items-center gap-2`}>
                            <BarChart3 className="h-3 w-3" />
                            <span>{item.response.duration}ms</span>
                          </div>
                          <div className={`${text('xs')} text-muted-foreground`}>
                            {formatSize(item.response.size)}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item.id, item);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 transition-all duration-200 shadow-sm border border-red-200 dark:border-red-800 bg-white dark:bg-card opacity-95 hover:opacity-100"
                        title="Delete history item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelDeleteHistoryItem}
          />
          
          {/* Modal */}
          <div className="relative bg-card border border-border rounded-lg shadow-lg p-6 m-4 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className={`${text('lg')} font-semibold text-foreground mb-2`}>
                  Delete History Item
                </h3>
                <p className={`${text('sm')} text-muted-foreground mb-4`}>
                  Are you sure you want to delete this history item? This action cannot be undone.
                </p>
                <div className={`${text('xs')} text-muted-foreground p-2 bg-muted rounded border mb-4`}>
                  <div className="flex justify-between items-center mb-1">
                    <span>Executed:</span>
                    <span>{new Date(deleteConfirmation.historyItem.executed_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <span className={`font-medium ${getHistoryStatusColor(deleteConfirmation.historyItem.response.status)}`}>
                      {deleteConfirmation.historyItem.response.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelDeleteHistoryItem}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={confirmDeleteHistoryItem}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestBuilder;