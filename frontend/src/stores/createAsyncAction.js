import { adapterFactory } from '../adapters/adapterFactory.js';
import { addToast } from './toastStore.js';

// Labels like 'folderStore: Failed to fetch folders' keep the store prefix for
// console logs but drop it for the user-facing toast.
const toastMessageFor = (error, label) => {
  const cleanLabel = label.replace(/^\w+Store:\s*/, '');
  const detail = error && error.message;
  if (!detail || detail === cleanLabel) return cleanLabel;
  return `${cleanLabel}: ${detail}`;
};

/**
 * Wraps the common async-store boilerplate:
 *   set loading true + error null -> resolve adapter -> run fn(adapter)
 *   -> on error: console.error + store error.message + error toast
 *   -> finally loading false.
 *
 * @param {Function} set - zustand set function
 * @param {Function} fn - async (adapter) => result
 * @param {Object} [options]
 * @param {string|null} [options.loadingKey='loading'] - state key toggled while running; pass null to skip loading updates
 * @param {string|null} [options.errorKey='error'] - state key storing error.message; pass null to skip storing
 * @param {boolean} [options.toast=true] - show an error toast on failure (skipped when errorKey is null)
 * @param {string} [options.label='Async action failed'] - console.error prefix / fallback error message
 * @param {boolean} [options.rethrow=false] - rethrow the error so callers can react
 * @param {Function} [options.onError] - extra state cleanup on failure, receives the error
 * @returns {Promise<*>} the result of fn (undefined on swallowed errors)
 */
export const asyncAction = async (set, fn, options = {}) => {
  const {
    loadingKey = 'loading',
    errorKey = 'error',
    label = 'Async action failed',
    toast = true,
    rethrow = false,
    onError,
  } = options;

  const patch = {};
  if (loadingKey) patch[loadingKey] = true;
  if (errorKey) patch[errorKey] = null;
  if (Object.keys(patch).length > 0) set(patch);

  try {
    const adapter = await adapterFactory.getAdapter();
    return await fn(adapter);
  } catch (error) {
    console.error(`${label}:`, error);
    if (errorKey) set({ [errorKey]: error.message || label });
    // Surface the failure to the user; background actions opt out via
    // errorKey: null or toast: false.
    if (errorKey && toast) addToast('error', toastMessageFor(error, label));
    if (onError) onError(error);
    if (rethrow) throw error;
  } finally {
    if (loadingKey) set({ [loadingKey]: false });
  }
};
