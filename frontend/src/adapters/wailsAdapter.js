// Wails Native Bindings Adapter for desktop mode
export class WailsAdapter {
  constructor() {
    this.app = window.go.main.App;
  }

  // ===== PROJECT METHODS =====
  async getProjects() {
    return await this.app.GetProjects();
  }

  async getProject(id) {
    return await this.app.GetProject(id);
  }

  async createProject(project) {
    return await this.app.CreateProject(project);
  }

  async updateProject(id, project) {
    // Add the ID to the project object for the binding
    project.id = id;
    return await this.app.UpdateProject(project);
  }

  async deleteProject(id) {
    await this.app.DeleteProject(id);
  }

  // ===== REQUEST METHODS =====
  async getRequests(projectId) {
    return await this.app.GetRequests(projectId);
  }

  async getRequest(id) {
    return await this.app.GetRequest(id);
  }

  async createRequest(request) {
    return await this.app.CreateRequest(request);
  }

  async updateRequest(id, request) {
    // Add the ID to the request object for the binding
    request.id = id;
    return await this.app.UpdateRequest(request);
  }

  async deleteRequest(id) {
    await this.app.DeleteRequest(id);
  }

  async executeRequest(id) {
    // TODO: Implement request execution in Wails bindings
    // For now, we'll use a placeholder
    throw new Error('Request execution not yet implemented in native mode');
  }

  async getRequestHistory(id) {
    return await this.app.GetRequestHistory(id);
  }

  async moveRequest(requestId, folderId, position) {
    await this.app.MoveRequest(requestId, folderId, position);
  }

  // ===== FOLDER METHODS =====
  async getFolders(projectId) {
    return await this.app.GetFolders(projectId);
  }

  async createFolder(folder) {
    return await this.app.CreateFolder(folder);
  }

  async updateFolder(id, folder) {
    // Add the ID to the folder object for the binding
    folder.id = id;
    return await this.app.UpdateFolder(folder);
  }

  async deleteFolder(id) {
    await this.app.DeleteFolder(id);
  }
}