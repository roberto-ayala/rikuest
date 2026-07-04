import { create } from 'zustand';
import { adapterFactory } from '../adapters/adapterFactory.js';
import { asyncAction } from './createAsyncAction.js';

export const useTelemetryStore = create((set, get) => ({
  enabled: true, // Default enabled
  loading: false,
  error: null,

  fetchTelemetryStatus: () =>
    asyncAction(set, async (adapter) => {
      if (adapter.getTelemetryEnabled) {
        const enabled = await adapter.getTelemetryEnabled();
        set({ enabled });
      }
    }, { label: 'Failed to fetch telemetry status' }),

  setEnabled: (enabled) =>
    asyncAction(set, async (adapter) => {
      if (adapter.setTelemetryEnabled) {
        await adapter.setTelemetryEnabled(enabled);
      }
      set({ enabled });
    }, { label: 'Failed to update telemetry status' }),

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
