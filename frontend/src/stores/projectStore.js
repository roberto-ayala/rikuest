import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';

export const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: () =>
    asyncAction(set, async (adapter) => {
      const projects = await adapter.getProjects();
      set({ projects: projects || [] });
    }, {
      label: 'Failed to fetch projects',
      onError: () => set({ projects: [] })
    }),

  createProject: (project) =>
    asyncAction(set, async (adapter) => {
      const newProject = await adapter.createProject(project);
      set((state) => ({
        projects: [newProject, ...state.projects]
      }));
      return newProject;
    }, { loadingKey: null, rethrow: true, label: 'Failed to create project' }),

  updateProject: (id, project) =>
    asyncAction(set, async (adapter) => {
      const updatedProject = await adapter.updateProject(id, project);
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? updatedProject : p)
      }));
      return updatedProject;
    }, { loadingKey: null, rethrow: true, label: 'Failed to update project' }),

  deleteProject: (id) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      }));
    }, { loadingKey: null, rethrow: true, label: 'Failed to delete project' }),

  fetchProject: (id) =>
    asyncAction(set, async (adapter) => {
      const project = await adapter.getProject(id);
      set({ currentProject: project });
      return project;
    }, { loadingKey: null, rethrow: true, label: 'Failed to fetch project' })
}));
