import { adapterFactory } from '../adapters/adapterFactory.js';

/**
 * Wraps the common async-store boilerplate:
 *   set loading true + error null -> resolve adapter -> run fn(adapter)
 *   -> on error: console.error + store error.message -> finally loading false.
 *
 * @param {Function} set - zustand set function
 * @param {Function} fn - async (adapter) => result
 * @param {Object} [options]
 * @param {string|null} [options.loadingKey='loading'] - state key toggled while running; pass null to skip loading updates
 * @param {string|null} [options.errorKey='error'] - state key storing error.message; pass null to skip storing
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
    if (onError) onError(error);
    if (rethrow) throw error;
  } finally {
    if (loadingKey) set({ [loadingKey]: false });
  }
};
