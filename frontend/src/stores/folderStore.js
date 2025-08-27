import { create } from 'zustand';
import axios from 'axios';

export const useFolderStore = create((set, get) => ({
  folders: [],
  loading: false,
  error: null,
  
  fetchFolders: async (projectId) => {
    console.log('folderStore: fetchFolders called for projectId:', projectId);
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/project/${projectId}/folders`);
      console.log('folderStore: received folders response:', response.data);
      set({ folders: response.data || [], loading: false });
    } catch (error) {
      console.error('folderStore: Failed to fetch folders:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to fetch folders', 
        loading: false 
      });
    }
  },
  
  createFolder: async (folderData) => {
    console.log('folderStore: createFolder called with data:', folderData);
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/folders', folderData);
      const newFolder = response.data;
      console.log('folderStore: created new folder:', newFolder);
      
      set((state) => ({
        folders: [...state.folders, newFolder],
        loading: false
      }));
      
      return newFolder;
    } catch (error) {
      console.error('folderStore: Failed to create folder:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to create folder', 
        loading: false 
      });
      throw error;
    }
  },
  
  updateFolder: async (folderId, folderData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`/api/folder/${folderId}`, folderData);
      const updatedFolder = response.data;
      
      set((state) => ({
        folders: state.folders.map(folder => 
          folder.id === folderId ? updatedFolder : folder
        ),
        loading: false
      }));
      
      return updatedFolder;
    } catch (error) {
      console.error('Failed to update folder:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to update folder', 
        loading: false 
      });
      throw error;
    }
  },
  
  deleteFolder: async (folderId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/folder/${folderId}`);
      
      set((state) => ({
        folders: state.folders.filter(folder => folder.id !== folderId),
        loading: false
      }));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      set({ 
        error: error.response?.data?.error || 'Failed to delete folder', 
        loading: false 
      });
      throw error;
    }
  },
  
  moveRequest: async (requestId, folderId, position) => {
    try {
      await axios.post('/api/request/move', {
        request_id: requestId,
        folder_id: folderId,
        position: position
      });
    } catch (error) {
      console.error('Failed to move request:', error);
      throw error;
    }
  },
  
  // Helper function to build folder tree
  getFolderTree: () => {
    const { folders } = get();
    
    // Ensure folders is an array
    if (!Array.isArray(folders)) {
      return [];
    }
    
    const buildTree = (parentId = null) => {
      return folders
        .filter(folder => folder.parent_id === parentId)
        .sort((a, b) => a.position - b.position)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }));
    };
    
    return buildTree();
  },
  
  clearError: () => set({ error: null })
}));