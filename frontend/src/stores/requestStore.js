import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';

export const useRequestStore = create((set, get) => ({
  requests: [],
  currentRequest: null,
  currentResponse: null,
  loading: false,
  executing: false,
  error: null,

  fetchRequests: (projectId) =>
    asyncAction(set, async (adapter) => {
      const requests = await adapter.getRequests(projectId);
      set({ requests: requests || [] });
    }, {
      label: 'Failed to fetch requests',
      onError: () => set({ requests: [] })
    }),

  createRequest: (request) =>
    asyncAction(set, async (adapter) => {
      const newRequest = await adapter.createRequest(request);
      set((state) => ({
        requests: [newRequest, ...state.requests]
      }));
      return newRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to create request' }),

  updateRequest: (id, request) =>
    asyncAction(set, async (adapter) => {
      const updatedRequest = await adapter.updateRequest(id, request);
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? updatedRequest : r),
        currentRequest: state.currentRequest && state.currentRequest.id === id ? updatedRequest : state.currentRequest
      }));
      return updatedRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to update request' }),

  // Optimistic save - saves to server and updates local data after success
  saveRequestOptimistic: (id, request) =>
    asyncAction(set, async (adapter) => {
      const updatedRequest = await adapter.updateRequest(id, request);

      // Update local data silently (for data consistency when switching requests)
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? updatedRequest : r),
        // Don't update currentRequest to avoid re-rendering current component
      }));

      return updatedRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to save request' }),

  deleteRequest: (id) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteRequest(id);
      set((state) => ({
        requests: state.requests.filter(r => r.id !== id),
        currentRequest: state.currentRequest && state.currentRequest.id === id ? null : state.currentRequest,
        currentResponse: state.currentRequest && state.currentRequest.id === id ? null : state.currentResponse
      }));
    }, { loadingKey: null, rethrow: true, label: 'Failed to delete request' }),

  fetchRequest: (id) =>
    asyncAction(set, async (adapter) => {
      const request = await adapter.getRequest(id);
      set({ currentRequest: request });
      return request;
    }, { loadingKey: null, rethrow: true, label: 'Failed to fetch request' }),

  executeRequest: (id) => {
    set({ currentResponse: null }); // Clear current response to show loading state
    return asyncAction(set, async (adapter) => {
      const response = await adapter.executeRequest(id);
      const responseWithTimestamp = {
        ...response,
        executed_at: new Date().toISOString()
      };
      set({ currentResponse: responseWithTimestamp });
      return responseWithTimestamp;
    }, { loadingKey: 'executing', rethrow: true, label: 'Failed to execute request' });
  },

  setCurrentRequest: async (request) => {
    set({
      currentRequest: request,
      currentResponse: null
    });

    // Auto-load the last response from history
    if (request && request.id) {
      await asyncAction(set, async (adapter) => {
        const history = await adapter.getRequestHistory(request.id);
        if (history && history.length > 0) {
          // Set the most recent response (first item in history)
          const lastResponse = {
            ...history[0].response,
            executed_at: history[0].executed_at
          };
          set({ currentResponse: lastResponse });
        }
      }, { loadingKey: null, errorKey: null, label: 'Failed to load request history' });
    }
  },

  clearCurrentRequest: () => {
    set({
      currentRequest: null,
      currentResponse: null
    });
  },

  setCurrentResponse: (response) => {
    set({ currentResponse: response });
  },

  // Helper function to organize requests by folder
  getRequestsByFolder: () => {
    const { requests } = get();

    // Ensure requests is an array
    if (!Array.isArray(requests)) {
      return { root: [], folders: {} };
    }

    const requestsByFolder = {
      root: [], // Requests without folder
      folders: {} // Requests grouped by folder ID
    };

    requests.forEach(request => {
      if (request.folder_id === null || request.folder_id === undefined) {
        requestsByFolder.root.push(request);
      } else {
        if (!requestsByFolder.folders[request.folder_id]) {
          requestsByFolder.folders[request.folder_id] = [];
        }
        requestsByFolder.folders[request.folder_id].push(request);
      }
    });

    // Sort by position within each group
    requestsByFolder.root.sort((a, b) => (a.position || 0) - (b.position || 0));
    Object.keys(requestsByFolder.folders).forEach(folderId => {
      requestsByFolder.folders[folderId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return requestsByFolder;
  }
}));
