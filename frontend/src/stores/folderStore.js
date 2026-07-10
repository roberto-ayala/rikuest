import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';

export const useFolderStore = create((set, get) => ({
  folders: [],
  loading: false,
  error: null,

  fetchFolders: (projectId) =>
    asyncAction(set, async (adapter) => {
      const folders = await adapter.getFolders(projectId);
      set({ folders: folders || [] });
    }, { label: 'folderStore: Failed to fetch folders' }),

  createFolder: (folderData) =>
    asyncAction(set, async (adapter) => {
      const newFolder = await adapter.createFolder(folderData);

      set((state) => ({
        folders: [...state.folders, newFolder]
      }));

      return newFolder;
    }, { rethrow: true, label: 'folderStore: Failed to create folder' }),

  updateFolder: (folderId, folderData) =>
    asyncAction(set, async (adapter) => {
      const updatedFolder = await adapter.updateFolder(folderId, folderData);

      set((state) => ({
        folders: state.folders.map(folder =>
          folder.id === folderId ? updatedFolder : folder
        )
      }));

      return updatedFolder;
    }, { rethrow: true, label: 'Failed to update folder' }),

  deleteFolder: (folderId) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteFolder(folderId);

      set((state) => ({
        folders: state.folders.filter(folder => folder.id !== folderId)
      }));
    }, { rethrow: true, label: 'Failed to delete folder' }),

  moveRequest: (requestId, folderId, position) =>
    asyncAction(set, async (adapter) => {
      await adapter.moveRequest(requestId, folderId, position);
    }, { loadingKey: null, rethrow: true, label: 'Failed to move request' }),

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
