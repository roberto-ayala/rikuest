import { create } from 'zustand';
import { adapterFactory } from '../adapters/adapterFactory.js';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const adapter = await adapterFactory.getAdapter();
      const projects = await adapter.getProjects();
      set({ projects: projects || [] });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ projects: [] });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (project) => {
    const adapter = await adapterFactory.getAdapter();
    const newProject = await adapter.createProject(project);
    set((state) => ({
      projects: [newProject, ...state.projects]
    }));
    return newProject;
  },

  updateProject: async (id, project) => {
    const adapter = await adapterFactory.getAdapter();
    const updatedProject = await adapter.updateProject(id, project);
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? updatedProject : p)
    }));
    return updatedProject;
  },

  deleteProject: async (id) => {
    const adapter = await adapterFactory.getAdapter();
    await adapter.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id)
    }));
  },

  fetchProject: async (id) => {
    try {
      const adapter = await adapterFactory.getAdapter();
      const project = await adapter.getProject(id);
      set({ currentProject: project });
      return project;
    } catch (error) {
      console.error('Failed to fetch project:', error);
      throw error;
    }
  }
}));