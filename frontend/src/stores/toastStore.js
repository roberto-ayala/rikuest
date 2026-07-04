import { create } from 'zustand';

let nextToastId = 1;

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;

export const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Adds a toast notification and schedules its auto-dismissal.
   *
   * @param {'error'|'success'|'info'} type
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.duration] - ms before auto-dismiss (errors default to 8000)
   * @returns {number} the toast id
   */
  addToast: (type, message, options = {}) => {
    const { duration = type === 'error' ? ERROR_DURATION : DEFAULT_DURATION } = options;
    const id = nextToastId++;

    set((state) => ({
      toasts: [...state.toasts, { id, type, message }]
    }));

    if (duration > 0) {
      setTimeout(() => get().dismissToast(id), duration);
    }

    return id;
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}));

// Convenience helper for non-React modules (stores, async helpers)
export const addToast = (type, message, options) =>
  useToastStore.getState().addToast(type, message, options);
