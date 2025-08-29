import { APIAdapter } from './apiAdapter.js';
import { WailsAdapter } from './wailsAdapter.js';

class AdapterFactory {
  constructor() {
    this.adapter = null;
    this.initialized = false;
    
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

    // Try to detect Wails by checking if Go bindings are actually available
    const isWails = await this.detectWailsEnvironment();
    
    console.log('Adapter Factory initializing...', {
      selectedAdapter: isWails ? 'WailsAdapter' : 'APIAdapter'
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

  async detectWailsEnvironment() {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
      return false;
    }

    // Wait a bit for potential Wails runtime to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if Go bindings are available
    if (!window.go?.main?.App) {
      return false;
    }

    // Try to call a simple method to verify the bindings actually work
    try {
      // Use a simple method that should always be available
      const testMethod = window.go.main.App.GetProjects;
      if (typeof testMethod === 'function') {
        console.log('Wails Go bindings detected and verified');
        return true;
      }
    } catch (error) {
      console.log('Wails Go bindings detected but not functional:', error);
      return false;
    }

    return false;
  }
}

// Export singleton instance
export const adapterFactory = new AdapterFactory();
export default adapterFactory;