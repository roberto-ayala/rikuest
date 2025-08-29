// HTTP REST API Adapter for web mode
export class APIAdapter {
  constructor() {
    this.baseURL = '';
  }

  async request(url, options = {}) {
    const response = await fetch(this.baseURL + url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // ===== PROJECT METHODS =====
  async getProjects() {
    return this.request('/api/projects');
  }

  async getProject(id) {
    return this.request(`/api/project/${id}`);
  }

  async createProject(project) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }

  async updateProject(id, project) {
    return this.request(`/api/project/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project)
    });
  }

  async deleteProject(id) {
    await this.request(`/api/project/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== REQUEST METHODS =====
  async getRequests(projectId) {
    return this.request(`/api/project/${projectId}/requests`);
  }

  async getRequest(id) {
    return this.request(`/api/request/${id}`);
  }

  async createRequest(request) {
    return this.request('/api/requests', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async updateRequest(id, request) {
    return this.request(`/api/request/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }

  async deleteRequest(id) {
    await this.request(`/api/request/${id}`, {
      method: 'DELETE'
    });
  }

  async executeRequest(id) {
    return this.request(`/api/request/${id}/execute`, {
      method: 'POST'
    });
  }

  async getRequestHistory(id) {
    return this.request(`/api/request/${id}/history`);
  }

  async moveRequest(requestId, folderId, position) {
    return this.request('/api/request/move', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        folder_id: folderId,
        position: position
      })
    });
  }

  // ===== FOLDER METHODS =====
  async getFolders(projectId) {
    return this.request(`/api/project/${projectId}/folders`);
  }

  async createFolder(folder) {
    return this.request('/api/folders', {
      method: 'POST',
      body: JSON.stringify(folder)
    });
  }

  async updateFolder(id, folder) {
    return this.request(`/api/folder/${id}`, {
      method: 'PUT',
      body: JSON.stringify(folder)
    });
  }

  async deleteFolder(id) {
    await this.request(`/api/folder/${id}`, {
      method: 'DELETE'
    });
  }
}