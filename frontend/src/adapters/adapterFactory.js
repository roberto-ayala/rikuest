import { APIAdapter } from './apiAdapter.js';
import { WailsAdapter } from './wailsAdapter.js';

class AdapterFactory {
  constructor() {
    this.adapter = null;
    this.initialized = false;
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

    // Dev-only guard: both adapters must expose the same method set, since
    // stores are written against a single implicit contract.
    if (import.meta.env.DEV) {
      const methodsOf = (cls) =>
        Object.getOwnPropertyNames(cls.prototype).filter(
          (m) => m !== 'constructor' && m !== 'request'
        );
      const apiMethods = methodsOf(APIAdapter);
      const wailsMethods = methodsOf(WailsAdapter);
      const missing = [
        ...apiMethods.filter((m) => !wailsMethods.includes(m)).map((m) => `WailsAdapter.${m}`),
        ...wailsMethods.filter((m) => !apiMethods.includes(m)).map((m) => `APIAdapter.${m}`),
      ];
      if (missing.length > 0) {
        console.warn('Adapter parity broken, missing:', missing);
      }
    }

    if (isWails) {
      // Use Wails native bindings
      this.adapter = new WailsAdapter();
    } else {
      // Use HTTP REST API
      this.adapter = new APIAdapter();
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
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }
}

// Export singleton instance
export const adapterFactory = new AdapterFactory();
export default adapterFactory;