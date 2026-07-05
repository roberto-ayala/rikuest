import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';

export const useCookieStore = create((set) => ({
  cookies: [],
  loading: false,
  error: null,

  fetchCookies: (projectId) =>
    asyncAction(set, async (adapter) => {
      const cookies = await adapter.getCookies(projectId);
      set({ cookies: cookies || [] });
    }, {
      label: 'Failed to fetch cookies',
      onError: () => set({ cookies: [] })
    }),

  deleteCookie: (id) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteCookie(id);
      set(state => ({ cookies: state.cookies.filter(c => c.id !== id) }));
    }, { loadingKey: null, rethrow: true, label: 'Failed to delete cookie' }),

  clearCookies: (projectId) =>
    asyncAction(set, async (adapter) => {
      await adapter.clearProjectCookies(projectId);
      set({ cookies: [] });
    }, { loadingKey: null, rethrow: true, label: 'Failed to clear cookies' }),
}));
