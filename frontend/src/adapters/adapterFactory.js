import { APIAdapter } from './apiAdapter.js';
import { WailsAdapter } from './wailsAdapter.js';

class AdapterFactory {
  constructor() {
    this.adapter = null;
    this.initialized = false;
    
    // Don't access window.go in constructor - wait for actual usage
    console.log('AdapterFactory constructor called - waiting for first usage');
  }

  async getAdapter() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.adapter;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    // If we detect Wails context, wait a bit for runtime to be ready
    if (window.__WAILS_CONTEXT__) {
      console.log('Wails context detected, waiting for runtime to be ready...');
      
      // Wait up to 3 seconds for Go bindings to be available
      let attempts = 0;
      while (attempts < 30 && !window.go?.main?.App) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.go?.main?.App) {
        console.warn('Wails Go bindings not available after 3 seconds, falling back to HTTP');
      }
    }

    const isWails = window.__WAILS_CONTEXT__ && window.go?.main?.App;
    
    console.log('Adapter Factory initializing...', {
      wailsContext: !!window.__WAILS_CONTEXT__,
      goBindings: !!window.go?.main?.App,
      selectedAdapter: isWails ? 'WailsAdapter' : 'APIAdapter',
      waitAttempts: window.__WAILS_CONTEXT__ ? attempts : 0
    });

    if (isWails) {
      // Use Wails native bindings
      this.adapter = new WailsAdapter();
      console.log('Using Wails native adapter');
    } else {
      // Use HTTP REST API
      this.adapter = new APIAdapter();
      console.log('Using HTTP REST API adapter');
    }

    this.initialized = true;
  }
}

// Export singleton instance
export const adapterFactory = new AdapterFactory();
export default adapterFactory;