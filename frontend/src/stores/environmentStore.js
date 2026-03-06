import { create } from 'zustand';
import { adapterFactory } from '../adapters/adapterFactory.js';

export const useEnvironmentStore = create((set, get) => ({
  environments: [],
  activeEnvironment: null,
  folderVariables: {}, // { [folderId]: Variable[] }
  loading: false,

  fetchEnvironments: async (projectId) => {
    set({ loading: true });
    try {
      const adapter = await adapterFactory.getAdapter();
      const envs = await adapter.getEnvironments(projectId);
      const list = envs || [];
      const active = list.find(e => e.is_active) || null;
      set({ environments: list, activeEnvironment: active });
    } catch (error) {
      console.error('Failed to fetch environments:', error);
      set({ environments: [], activeEnvironment: null });
    } finally {
      set({ loading: false });
    }
  },

  createEnvironment: async (projectId, name) => {
    const adapter = await adapterFactory.getAdapter();
    const env = await adapter.createEnvironment(projectId, name);
    set(state => ({ environments: [...state.environments, env] }));
    return env;
  },

  updateEnvironmentName: async (id, name) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.updateEnvironment(id, name);
    set(state => ({
      environments: state.environments.map(e =>
        e.id === id ? { ...e, name } : e
      )
    }));
  },

  deleteEnvironment: async (id) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.deleteEnvironment(id);
    set(state => {
      const environments = state.environments.filter(e => e.id !== id);
      const activeEnvironment = state.activeEnvironment?.id === id ? null : state.activeEnvironment;
      return { environments, activeEnvironment };
    });
  },

  setActiveEnvironment: async (projectId, environmentId) => {
    const adapter = await adapterFactory.getAdapter();
    const envs = await adapter.setActiveEnvironment(environmentId, projectId);
    const list = envs || [];
    const active = list.find(e => e.is_active) || null;
    set({ environments: list, activeEnvironment: active });
  },

  deactivateAllEnvironments: async (projectId) => {
    const adapter = await adapterFactory.getAdapter();
    const envs = await adapter.deactivateAllEnvironments(projectId);
    const list = envs || [];
    set({ environments: list, activeEnvironment: null });
  },

  updateEnvironmentVariables: async (environmentId, variables) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.updateEnvironmentVariables(environmentId, variables);
    set(state => {
      const environments = state.environments.map(e =>
        e.id === environmentId ? { ...e, variables } : e
      );
      const activeEnvironment = state.activeEnvironment?.id === environmentId
        ? { ...state.activeEnvironment, variables }
        : state.activeEnvironment;
      return { environments, activeEnvironment };
    });
  },

  fetchFolderVariables: async (folderId) => {
    try {
      const adapter = await adapterFactory.getAdapter();
      const vars = await adapter.getFolderVariables(folderId);
      set(state => ({
        folderVariables: { ...state.folderVariables, [folderId]: vars || [] }
      }));
    } catch (error) {
      console.error('Failed to fetch folder variables:', error);
    }
  },

  updateFolderVariables: async (folderId, variables) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.updateFolderVariables(folderId, variables);
    set(state => ({
      folderVariables: { ...state.folderVariables, [folderId]: variables }
    }));
  },
}));
