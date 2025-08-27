import { create } from 'zustand';
import axios from 'axios';

export const useRequestStore = create((set, get) => ({
  requests: [],
  currentRequest: null,
  currentResponse: null,
  loading: false,
  executing: false,

  fetchRequests: async (projectId) => {
    set({ loading: true });
    try {
      const response = await axios.get(`/api/project/${projectId}/requests`);
      set({ requests: response.data || [] });
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      set({ requests: [] });
    } finally {
      set({ loading: false });
    }
  },

  createRequest: async (request) => {
    const response = await axios.post('/api/requests', request);
    const newRequest = response.data;
    set((state) => ({
      requests: [newRequest, ...state.requests]
    }));
    return newRequest;
  },

  updateRequest: async (id, request) => {
    const response = await axios.put(`/api/request/${id}`, request);
    const updatedRequest = response.data;
    set((state) => ({
      requests: state.requests.map(r => r.id === id ? updatedRequest : r),
      currentRequest: state.currentRequest && state.currentRequest.id === id ? updatedRequest : state.currentRequest
    }));
    return updatedRequest;
  },

  // Optimistic save - saves to server and updates local data after success
  saveRequestOptimistic: async (id, request) => {
    const response = await axios.put(`/api/request/${id}`, request);
    const updatedRequest = response.data;
    
    // Update local data silently (for data consistency when switching requests)
    set((state) => ({
      requests: state.requests.map(r => r.id === id ? updatedRequest : r),
      // Don't update currentRequest to avoid re-rendering current component
    }));
    
    return updatedRequest;
  },

  deleteRequest: async (id) => {
    await axios.delete(`/api/request/${id}`);
    set((state) => ({
      requests: state.requests.filter(r => r.id !== id),
      currentRequest: state.currentRequest && state.currentRequest.id === id ? null : state.currentRequest,
      currentResponse: state.currentRequest && state.currentRequest.id === id ? null : state.currentResponse
    }));
  },

  fetchRequest: async (id) => {
    try {
      const response = await axios.get(`/api/request/${id}`);
      set({ currentRequest: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch request:', error);
      throw error;
    }
  },

  executeRequest: async (id) => {
    set({ executing: true });
    try {
      const response = await axios.post(`/api/request/${id}/execute`);
      set({ currentResponse: response.data });
      return response.data;
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