import { create } from 'zustand';
import { asyncAction } from './createAsyncAction.js';
import { useEnvironmentStore } from './environmentStore.js';

// --- Tab persistence (per project, localStorage) ------------------------
// Keeps `openTabIds`/`activeTabId` around across reloads/project switches so
// re-opening a project restores the tabs the user had open.
const tabsStorageKey = (projectId) => `rikuest-tabs-${projectId}`;

// True when the execution stored at least one value in the active environment.
// Only `applied` counts: the other statuses report why a rule did nothing, so
// nothing changed on the server and there is nothing to reload.
const capturedIntoEnvironment = (response) =>
  Array.isArray(response?.captures) && response.captures.some(c => c.status === 'applied');

const persistTabs = (projectId, openTabIds, activeTabId) => {
  if (!projectId) return;
  try {
    localStorage.setItem(tabsStorageKey(projectId), JSON.stringify({ openTabIds, activeTabId }));
  } catch {
    // localStorage unavailable (e.g. private browsing) - not fatal, just skip persistence.
  }
};

const loadPersistedTabs = (projectId) => {
  if (!projectId) return { openTabIds: [], activeTabId: null };
  try {
    const raw = localStorage.getItem(tabsStorageKey(projectId));
    if (!raw) return { openTabIds: [], activeTabId: null };
    const parsed = JSON.parse(raw);
    return {
      openTabIds: Array.isArray(parsed.openTabIds) ? parsed.openTabIds : [],
      activeTabId: parsed.activeTabId ?? null
    };
  } catch {
    return { openTabIds: [], activeTabId: null };
  }
};

// Loads the "last response" for a request (from its history) into the
// `responses` map, unless already cached. Only mirrored into `currentResponse`
// if the request is still the active tab once the fetch resolves (the user
// may have switched tabs while this was in flight).
const loadResponseForRequest = async (set, get, requestId) => {
  if (Object.prototype.hasOwnProperty.call(get().responses, requestId)) {
    if (get().activeTabId === requestId) {
      set({ currentResponse: get().responses[requestId] });
    }
    return;
  }

  await asyncAction(set, async (adapter) => {
    const history = await adapter.getRequestHistory(requestId);
    const response = history && history.length > 0
      ? { ...history[0].response, executed_at: history[0].executed_at }
      : null;

    set((state) => ({
      responses: { ...state.responses, [requestId]: response },
      currentResponse: state.activeTabId === requestId ? response : state.currentResponse
    }));
  }, { loadingKey: null, errorKey: null, label: 'Failed to load request history' });
};

export const useRequestStore = create((set, get) => ({
  requests: [],
  currentRequest: null,
  currentResponse: null,
  loading: false,
  executing: false,
  error: null,

  // --- Multi-tab state ---------------------------------------------------
  // `openTabIds`/`activeTabId` drive the tab bar. `responses`/`executingIds`
  // hold per-request state so background tabs never clobber the active
  // tab's view; `currentResponse`/`executing` are convenience mirrors of the
  // active tab's entry so existing consumers (RequestBuilder, ResponsePanel)
  // don't need to read from the maps directly.
  openTabIds: [],
  activeTabId: null,
  responses: {},
  executingIds: [],
  currentProjectId: null,

  fetchRequests: (projectId) =>
    asyncAction(set, async (adapter) => {
      const requests = await adapter.getRequests(projectId);
      set({ requests: requests || [] });
    }, {
      label: 'Failed to fetch requests',
      onError: () => set({ requests: [] })
    }),

  createRequest: (request) =>
    asyncAction(set, async (adapter) => {
      const newRequest = await adapter.createRequest(request);
      set((state) => ({
        requests: [newRequest, ...state.requests]
      }));
      return newRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to create request' }),

  updateRequest: (id, request) =>
    asyncAction(set, async (adapter) => {
      const updatedRequest = await adapter.updateRequest(id, request);
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? updatedRequest : r),
        currentRequest: state.currentRequest && state.currentRequest.id === id ? updatedRequest : state.currentRequest
      }));
      return updatedRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to update request' }),

  // Optimistic save - saves to server and updates local data after success
  saveRequestOptimistic: (id, request) =>
    asyncAction(set, async (adapter) => {
      const updatedRequest = await adapter.updateRequest(id, request);

      // Update local data silently (for data consistency when switching requests)
      set((state) => ({
        requests: state.requests.map(r => r.id === id ? updatedRequest : r),
        // Don't update currentRequest to avoid re-rendering current component
      }));

      return updatedRequest;
    }, { loadingKey: null, rethrow: true, label: 'Failed to save request' }),

  deleteRequest: (id) =>
    asyncAction(set, async (adapter) => {
      await adapter.deleteRequest(id);

      const state = get();
      const wasActive = state.activeTabId === id;
      const nextOpenTabIds = state.openTabIds.filter(tid => tid !== id);
      const { [id]: _removedResponse, ...restResponses } = state.responses;

      let nextActiveId = state.activeTabId;
      let nextCurrentRequest = state.currentRequest;
      let nextCurrentResponse = state.currentResponse;
      let nextExecuting = state.executing;

      if (wasActive) {
        const idx = state.openTabIds.indexOf(id);
        nextActiveId = idx + 1 < state.openTabIds.length
          ? state.openTabIds[idx + 1]
          : (idx - 1 >= 0 ? state.openTabIds[idx - 1] : null);
        nextCurrentRequest = nextActiveId ? (state.requests.find(r => r.id === nextActiveId) || null) : null;
        nextCurrentResponse = nextActiveId ? (restResponses[nextActiveId] ?? null) : null;
        nextExecuting = nextActiveId ? state.executingIds.includes(nextActiveId) : false;
      }

      set({
        requests: state.requests.filter(r => r.id !== id),
        openTabIds: nextOpenTabIds,
        activeTabId: nextActiveId,
        currentRequest: nextCurrentRequest,
        currentResponse: nextCurrentResponse,
        executing: nextExecuting,
        responses: restResponses,
        executingIds: state.executingIds.filter(eid => eid !== id)
      });

      persistTabs(state.currentProjectId, nextOpenTabIds, nextActiveId);

      if (wasActive && nextActiveId) {
        loadResponseForRequest(set, get, nextActiveId);
      }
    }, { loadingKey: null, rethrow: true, label: 'Failed to delete request' }),

  fetchRequest: (id) =>
    asyncAction(set, async (adapter) => {
      const request = await adapter.getRequest(id);
      set({ currentRequest: request });
      return request;
    }, { loadingKey: null, rethrow: true, label: 'Failed to fetch request' }),

  executeRequest: (id) => {
    set((state) => ({
      executingIds: state.executingIds.includes(id) ? state.executingIds : [...state.executingIds, id],
      executing: state.activeTabId === id ? true : state.executing,
      // Clear current response to show loading state, but only for the active tab.
      currentResponse: state.activeTabId === id ? null : state.currentResponse
    }));

    const clearExecuting = () => set((state) => ({
      executingIds: state.executingIds.filter(eid => eid !== id),
      // Re-check activeTabId at completion time (not capture time): the user
      // may have switched tabs while the request was in flight.
      executing: state.activeTabId === id ? false : state.executing
    }));

    return asyncAction(set, async (adapter) => {
      const response = await adapter.executeRequest(id);
      const responseWithTimestamp = {
        ...response,
        executed_at: new Date().toISOString()
      };
      set((state) => ({
        responses: { ...state.responses, [id]: responseWithTimestamp },
        currentResponse: state.activeTabId === id ? responseWithTimestamp : state.currentResponse
      }));

      // A capture writes straight into the active environment's row in the
      // database, so the store's copy is stale the moment one applies —
      // including for variables the capture just created. Reloading here (and
      // not in the component that happened to trigger the run) keeps the
      // environment editor and every {{name}} autocomplete in sync no matter
      // which tab or panel executed the request.
      if (capturedIntoEnvironment(responseWithTimestamp)) {
        const { currentProjectId } = get();
        if (currentProjectId) {
          await useEnvironmentStore.getState().fetchEnvironments(currentProjectId);
        }
      }
      return responseWithTimestamp;
    }, { loadingKey: null, rethrow: true, label: 'Failed to execute request' })
      .finally(clearExecuting);
  },

  // Opens (or focuses, if already open) a tab for `request`. Replaces the
  // single-current-request model with an ordered list of open tabs.
  // `null` clears the active selection without touching other open tabs.
  openTab: (request) => {
    const { currentProjectId } = get();

    if (!request) {
      set({ currentRequest: null, currentResponse: null, activeTabId: null, executing: false });
      persistTabs(currentProjectId, get().openTabIds, null);
      return;
    }

    const { openTabIds } = get();
    const nextOpenTabIds = openTabIds.includes(request.id) ? openTabIds : [...openTabIds, request.id];

    set((state) => ({
      openTabIds: nextOpenTabIds,
      activeTabId: request.id,
      currentRequest: request,
      currentResponse: state.responses[request.id] ?? null,
      executing: state.executingIds.includes(request.id)
    }));

    persistTabs(currentProjectId, nextOpenTabIds, request.id);
    loadResponseForRequest(set, get, request.id);
  },

  // Alias kept for existing call sites (Project.jsx etc.) - same behavior as openTab.
  setCurrentRequest: (request) => get().openTab(request),

  // Switches to an already-open tab. If the request no longer exists
  // (e.g. deleted from another view), drops it from openTabIds instead of crashing.
  activateTab: (id) => {
    const { requests, openTabIds, currentProjectId } = get();
    const request = requests.find(r => r.id === id);

    if (!request) {
      const idx = openTabIds.indexOf(id);
      const nextOpenTabIds = openTabIds.filter(tid => tid !== id);
      const wasActive = get().activeTabId === id;
      let nextActiveId = get().activeTabId;

      if (wasActive) {
        nextActiveId = idx > -1 && idx + 1 < openTabIds.length
          ? openTabIds[idx + 1]
          : (idx - 1 >= 0 ? openTabIds[idx - 1] : null);
      }

      const nextRequest = nextActiveId ? (requests.find(r => r.id === nextActiveId) || null) : null;
      set((state) => ({
        openTabIds: nextOpenTabIds,
        activeTabId: nextActiveId,
        currentRequest: nextRequest,
        currentResponse: nextActiveId ? (state.responses[nextActiveId] ?? null) : null,
        executing: nextActiveId ? state.executingIds.includes(nextActiveId) : false
      }));

      persistTabs(currentProjectId, nextOpenTabIds, nextActiveId);
      if (nextActiveId) loadResponseForRequest(set, get, nextActiveId);
      return;
    }

    set((state) => ({
      activeTabId: id,
      currentRequest: request,
      currentResponse: state.responses[id] ?? null,
      executing: state.executingIds.includes(id)
    }));

    persistTabs(currentProjectId, openTabIds, id);
    loadResponseForRequest(set, get, id);
  },

  // Closes a tab. If it was active, activates the tab to the right, else the
  // one to the left, else clears the selection entirely.
  closeTab: (id) => {
    const { openTabIds, activeTabId, currentProjectId, requests } = get();
    const idx = openTabIds.indexOf(id);
    if (idx === -1) return;

    const nextOpenTabIds = openTabIds.filter(tid => tid !== id);

    set((state) => {
      const { [id]: _removedResponse, ...restResponses } = state.responses;
      return {
        responses: restResponses,
        executingIds: state.executingIds.filter(eid => eid !== id)
      };
    });

    if (activeTabId !== id) {
      set({ openTabIds: nextOpenTabIds });
      persistTabs(currentProjectId, nextOpenTabIds, activeTabId);
      return;
    }

    const nextActiveId = idx + 1 < openTabIds.length
      ? openTabIds[idx + 1]
      : (idx - 1 >= 0 ? openTabIds[idx - 1] : null);
    const nextRequest = nextActiveId ? (requests.find(r => r.id === nextActiveId) || null) : null;

    set((state) => ({
      openTabIds: nextOpenTabIds,
      activeTabId: nextActiveId,
      currentRequest: nextRequest,
      currentResponse: nextActiveId ? (state.responses[nextActiveId] ?? null) : null,
      executing: nextActiveId ? state.executingIds.includes(nextActiveId) : false
    }));

    persistTabs(currentProjectId, nextOpenTabIds, nextActiveId);
    if (nextActiveId) loadResponseForRequest(set, get, nextActiveId);
  },

  // Restores the tabs persisted for `projectId`, intersected with the
  // requests that still exist (call after `fetchRequests` resolves so
  // `get().requests` reflects the new project).
  loadTabsForProject: (projectId) => {
    const { requests } = get();
    const persisted = loadPersistedTabs(projectId);
    const validIds = new Set(requests.map(r => r.id));
    const filteredOpenTabIds = persisted.openTabIds.filter(id => validIds.has(id));
    const activeTabId = persisted.activeTabId && filteredOpenTabIds.includes(persisted.activeTabId)
      ? persisted.activeTabId
      : (filteredOpenTabIds[0] ?? null);
    const currentRequest = activeTabId ? (requests.find(r => r.id === activeTabId) || null) : null;

    set({
      currentProjectId: projectId,
      openTabIds: filteredOpenTabIds,
      activeTabId,
      currentRequest,
      currentResponse: null,
      executing: false,
      responses: {},
      executingIds: []
    });

    persistTabs(projectId, filteredOpenTabIds, activeTabId);

    if (activeTabId) {
      loadResponseForRequest(set, get, activeTabId);
    }
  },

  clearCurrentRequest: () => {
    get().openTab(null);
  },

  setCurrentResponse: (response) => {
    set({ currentResponse: response });
  },

  // Helper function to organize requests by folder
  getRequestsByFolder: () => {
    const { requests } = get();

    // Ensure requests is an array
    if (!Array.isArray(requests)) {
      return { root: [], folders: {} };
    }

    const requestsByFolder = {
      root: [], // Requests without folder
      folders: {} // Requests grouped by folder ID
    };

    requests.forEach(request => {
      if (request.folder_id === null || request.folder_id === undefined) {
        requestsByFolder.root.push(request);
      } else {
        if (!requestsByFolder.folders[request.folder_id]) {
          requestsByFolder.folders[request.folder_id] = [];
        }
        requestsByFolder.folders[request.folder_id].push(request);
      }
    });

    // Sort by position within each group
    requestsByFolder.root.sort((a, b) => (a.position || 0) - (b.position || 0));
    Object.keys(requestsByFolder.folders).forEach(folderId => {
      requestsByFolder.folders[folderId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return requestsByFolder;
  }
}));
