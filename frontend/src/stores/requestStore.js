import { create } from 'zustand';
import { adapterFactory } from '../adapters/adapterFactory.js';

export const useRequestStore = create((set, get) => ({
  requests: [],
  currentRequest: null,
  currentResponse: null,
  loading: false,
  executing: false,

  fetchRequests: async (projectId) => {
    set({ loading: true });
    try {
      const adapter = await adapterFactory.getAdapter();
      const requests = await adapter.getRequests(projectId);
      set({ requests: requests || [] });
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      set({ requests: [] });
    } finally {
      set({ loading: false });
    }
  },

  createRequest: async (request) => {
    const adapter = await adapterFactory.getAdapter();
    const newRequest = await adapter.createRequest(request);
    set((state) => ({
      requests: [newRequest, ...state.requests]
    }));
    return newRequest;
  },

  updateRequest: async (id, request) => {
    const adapter = await adapterFactory.getAdapter();
    const updatedRequest = await adapter.updateRequest(id, request);
    set((state) => ({
      requests: state.requests.map(r => r.id === id ? updatedRequest : r),
      currentRequest: state.currentRequest && state.currentRequest.id === id ? updatedRequest : state.currentRequest
    }));
    return updatedRequest;
  },

  // Optimistic save - saves to server and updates local data after success
  saveRequestOptimistic: async (id, request) => {
    const adapter = await adapterFactory.getAdapter();
    const updatedRequest = await adapter.updateRequest(id, request);
    
    // Update local data silently (for data consistency when switching requests)
    set((state) => ({
      requests: state.requests.map(r => r.id === id ? updatedRequest : r),
      // Don't update currentRequest to avoid re-rendering current component
    }));
    
    return updatedRequest;
  },

  deleteRequest: async (id) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.deleteRequest(id);
    set((state) => ({
      requests: state.requests.filter(r => r.id !== id),
      currentRequest: state.currentRequest && state.currentRequest.id === id ? null : state.currentRequest,
      currentResponse: state.currentRequest && state.currentRequest.id === id ? null : state.currentResponse
    }));
  },

  fetchRequest: async (id) => {
    try {
      const adapter = await adapterFactory.getAdapter();
      const request = await adapter.getRequest(id);
      set({ currentRequest: request });
      return request;
    } catch (error) {
      console.error('Failed to fetch request:', error);
      throw error;
    }
  },

  executeRequest: async (id) => {
    set({ executing: true });
    try {
      const adapter = await adapterFactory.getAdapter();
      const response = await adapter.executeRequest(id);
      const responseWithTimestamp = {
        ...response,
        executed_at: new Date().toISOString()
      };
      set({ currentResponse: responseWithTimestamp });
      return responseWithTimestamp;
    } catch (error) {
      console.error('Failed to execute request:', error);
      throw error;
    } finally {
      set({ executing: false });
    }
  },

  setCurrentRequest: (request) => {
    set({ 
      currentRequest: request, 
      currentResponse: null 
    });
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