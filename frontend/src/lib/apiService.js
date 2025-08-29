import axios from 'axios';

class APIService {
  constructor() {
    this.baseURL = '';
    this.initialized = false;
    this.initPromise = null;
    
    // Auto-initialize when the service is created
    setTimeout(() => this.initialize(), 100);
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initializeInternal();
    await this.initPromise;
  }

  async _initializeInternal() {
    try {
      console.log('API Service initializing...', {
        wailsContext: !!window.__WAILS_CONTEXT__,
        goObject: !!window.go,
        appObject: !!window.go?.main?.App,
        getAPIBaseURL: !!window.go?.main?.App?.GetAPIBaseURL,
        currentURL: window.location.href
      });

      if (window.__WAILS_CONTEXT__) {
        // Running in Wails desktop app
        // In development mode, always use localhost:8080 directly
        if (window.location.href.includes('localhost') || window.location.href.includes('wails://')) {
          console.log('Wails development mode detected, using localhost:8080');
          this.baseURL = 'http://localhost:8080';
        } else if (window.go?.main?.App?.GetAPIBaseURL) {
          // Production mode - try to get the API URL
          try {
            this.baseURL = await window.go.main.App.GetAPIBaseURL();
            console.log('API Service initialized for Wails app, baseURL:', this.baseURL);
          } catch (apiError) {
            console.log('GetAPIBaseURL failed, using localhost fallback:', apiError);
            this.baseURL = 'http://localhost:8080';
          }
        } else {
          console.log('Go bindings not available, using localhost fallback');
          this.baseURL = 'http://localhost:8080';
        }
      } else {
        // Running in web browser (development or web build)
        // Use relative URLs which work with Vite proxy or web server
        this.baseURL = '';
        console.log('API Service initialized for web app');
      }
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      // Fallback to localhost:8080 for desktop app
      this.baseURL = window.__WAILS_CONTEXT__ ? 'http://localhost:8080' : '';
      console.log('Using fallback baseURL:', this.baseURL);
    }

    this.initialized = true;
  }

  async request(config) {
    await this.initialize();
    
    const fullConfig = {
      ...config,
      url: this.baseURL + config.url
    };

    console.log('Making API request:', {
      originalUrl: config.url,
      baseURL: this.baseURL,
      fullUrl: fullConfig.url,
      method: config.method || 'GET'
    });

    try {
      const response = await axios(fullConfig);
      console.log('API request successful:', response.status);
      return response;
    } catch (error) {
      console.error('API request failed:', {
        originalUrl: config.url,
        fullUrl: fullConfig.url,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

export const apiService = new APIService();
export default apiService;