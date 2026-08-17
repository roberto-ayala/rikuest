import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';

// Folder variables are stored per scope: environmentId 0 is the default shared
// by every environment, any other value is that environment's own overrides.
// Both live in the same cache, keyed by folder + scope.
export const folderScopeKey = (folderId, environmentId = 0) => `${folderId}:${environmentId || 0}`;

export const useEnvironmentStore = create((set) => ({
  environments: [],
  activeEnvironment: null,
  folderVariables: {}, // { [`${folderId}:${environmentId}`]: Variable[] }
  loading: false,
  error: null,

  fetchEnvironments: (projectId) =>
    asyncAction(set, async (adapter) => {
      const envs = await adapter.getEnvironments(projectId);
      const list = envs || [];
      const active = list.find(e => e.is_active) || null;
      set({ environments: list, activeEnvironment: active });
    }, {
      label: 'Failed to fetch environments',
      onError: () => set({ environments: [], activeEnvironment: null })
    }),

  createEnvironment: (projectId, name) =>
    asyncAction(set, async (adapter) => {
      const env = await adapter.createEnvironment(projectId, name);
      set(state => ({ environments: [...state.environments, env] }));
      return env;
    }, { loadingKey: null, rethrow: true, label: 'Failed to create environment' }),

  updateEnvironmentName: (id, name) =>
    asyncAction(set, async (adapter) => {
      await adapter.updateEnvironment(id, name);
      set(state => ({
        environments: state.environments.map(e =>
          e.id === id ? { ...e, name } : e
        )
      }));
    }, { loadingKey: null, rethrow: true, label: 'Failed to update environment' }),

  deleteEnvironment: (id) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteEnvironment(id);
      set(state => {
        const environments = state.environments.filter(e => e.id !== id);
        const activeEnvironment = state.activeEnvironment?.id === id ? null : state.activeEnvironment;
        return { environments, activeEnvironment };
      });
    }, { loadingKey: null, rethrow: true, label: 'Failed to delete environment' }),

  setActiveEnvironment: (projectId, environmentId) =>
    asyncAction(set, async (adapter) => {
      const envs = await adapter.setActiveEnvironment(environmentId, projectId);
      const list = envs || [];
      const active = list.find(e => e.is_active) || null;
      set({ environments: list, activeEnvironment: active });
    }, { loadingKey: null, rethrow: true, label: 'Failed to set active environment' }),

  deactivateAllEnvironments: (projectId) =>
    asyncAction(set, async (adapter) => {
      const envs = await adapter.deactivateAllEnvironments(projectId);
      const list = envs || [];
      set({ environments: list, activeEnvironment: null });
    }, { loadingKey: null, rethrow: true, label: 'Failed to deactivate environments' }),

  updateEnvironmentVariables: (environmentId, variables) =>
    asyncAction(set, async (adapter) => {
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
    }, { loadingKey: null, rethrow: true, label: 'Failed to update environment variables' }),

  fetchFolderVariables: (folderId, environmentId = 0) =>
    asyncAction(set, async (adapter) => {
      const vars = await adapter.getFolderVariables(folderId, environmentId);
      set(state => ({
        folderVariables: {
          ...state.folderVariables,
          [folderScopeKey(folderId, environmentId)]: vars || []
        }
      }));
    }, { loadingKey: null, label: 'Failed to fetch folder variables' }),

  updateFolderVariables: (folderId, environmentId, variables) =>
    asyncAction(set, async (adapter) => {
      await adapter.updateFolderVariables(folderId, environmentId, variables);
      set(state => ({
        folderVariables: {
          ...state.folderVariables,
          [folderScopeKey(folderId, environmentId)]: variables
        }
      }));
    }, { loadingKey: null, rethrow: true, label: 'Failed to update folder variables' }),
}));
