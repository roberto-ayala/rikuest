// Wails Native Bindings Adapter for desktop mode
import * as App from '../../wailsjs/go/main/App.js';

export class WailsAdapter {
  constructor() {
    this.app = window.go.main.App;
    this.bindings = App;
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
    try {
      const response = await this.bindings.ExecuteRequest(id);
      // Add timestamp for consistency with API adapter
      return {
        ...response,
        executed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to execute request in native mode:', error);
      throw error;
    }
  }

  async getRequestHistory(id) {
    return await this.app.GetRequestHistory(id);
  }

  async deleteRequestHistoryItem(requestId, historyId) {
    try {
      await this.bindings.DeleteRequestHistoryItem(requestId, historyId);
    } catch (error) {
      console.error('Failed to delete history item in native mode:', error);
      throw error;
    }
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

  async copyRequestFormats(requestID, format) {
    return await this.app.CopyRequest(requestID, format);
  }

  async copyAllRequestFormats(requestID) {
    return await this.app.CopyAllRequestFormats(requestID);
  }

  // ===== CONFIG METHODS =====
  async getRequestTimeout() {
    return await this.app.GetRequestTimeout();
  }

  async setRequestTimeout(seconds) {
    await this.app.SetRequestTimeout(seconds);
  
  }
  // ===== TELEMETRY METHODS =====
  async getTelemetryEnabled() {
    return await this.app.GetTelemetryEnabled();
  }

  async setTelemetryEnabled(enabled) {
    await this.app.SetTelemetryEnabled(enabled);
  }

  async reportError(errorMsg, stackTrace) {
    await this.app.ReportError(errorMsg, stackTrace);
  }

  async reportUsageEvent(eventType, metadata) {
    await this.app.ReportUsageEvent(eventType, metadata);
  }
}