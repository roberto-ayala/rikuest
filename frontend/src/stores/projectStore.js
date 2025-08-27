import { create } from 'zustand';
import axios from 'axios';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/api/projects');
      set({ projects: response.data || [] });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ projects: [] });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (project) => {
    const response = await axios.post('/api/projects', project);
    const newProject = response.data;
    set((state) => ({
      projects: [newProject, ...state.projects]
    }));
    return newProject;
  },

  updateProject: async (id, project) => {
    const response = await axios.put(`/api/project/${id}`, project);
    const updatedProject = response.data;
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? updatedProject : p)
    }));
    return updatedProject;
  },

  deleteProject: async (id) => {
    await axios.delete(`/api/project/${id}`);
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id)
    }));
  },

  fetchProject: async (id) => {
    try {
      const response = await axios.get(`/api/project/${id}`);
      set({ currentProject: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch project:', error);
      throw error;
    }
  }
}));