import { create } from 'zustand';
import { adapterFactory } from '../adapters/adapterFactory.js';

export const useTelemetryStore = create((set, get) => ({
  enabled: true, // Default enabled
  loading: false,
  error: null,

  fetchTelemetryStatus: async () => {
    set({ loading: true, error: null });
    try {
      const adapter = await adapterFactory.getAdapter();
      if (adapter.getTelemetryEnabled) {
        const enabled = await adapter.getTelemetryEnabled();
        set({ enabled, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Failed to fetch telemetry status:', error);
      set({ error: error.message || 'Failed to fetch telemetry status', loading: false });
    }
  },

  setEnabled: async (enabled) => {
    set({ loading: true, error: null });
    try {
      const adapter = await adapterFactory.getAdapter();
      if (adapter.setTelemetryEnabled) {
        await adapter.setTelemetryEnabled(enabled);
        set({ enabled, loading: false });
      } else {
        set({ enabled, loading: false });
      }
    } catch (error) {
      console.error('Failed to update telemetry status:', error);
      set({ error: error.message || 'Failed to update telemetry status', loading: false });
    }
  },

  reportError: async (error, stackTrace) => {
    try {
      const adapter = await adapterFactory.getAdapter();
      if (adapter.reportError && get().enabled) {
        await adapter.reportError(error.message || String(error), stackTrace || '');
      }
    } catch (err) {
      // Silently fail - don't disrupt the app
      console.error('Failed to report error:', err);
    }
  },

  reportUsageEvent: async (eventType, metadata = {}) => {
    try {
      const adapter = await adapterFactory.getAdapter();
      if (adapter.reportUsageEvent && get().enabled) {
        await adapter.reportUsageEvent(eventType, metadata);
      }
    } catch (err) {
      // Silently fail - don't disrupt the app
      console.error('Failed to report usage event:', err);
    }
  },
}));

