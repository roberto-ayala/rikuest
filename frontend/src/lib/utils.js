import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Shared HTTP method color classes (used by RequestBuilder and FolderTree)
export function getMethodColor(method) {
  const colors = {
    'GET': 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    'POST': 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800',
    'PUT': 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
    'DELETE': 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
    'PATCH': 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    'HEAD': 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800',
    'OPTIONS': 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800'
  };
  return colors[method] || 'text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800';
}

// Short labels for the method badge. DELETE and OPTIONS are long enough to
// force the badge out of proportion with every other method, so they get the
// conventional abbreviation and the badge keeps one width for all of them.
const METHOD_LABELS = {
  DELETE: 'DEL',
  OPTIONS: 'OPT',
};

export function getMethodLabel(method) {
  return METHOD_LABELS[method] || method;
}

// Status color classes for history items
export function getHistoryStatusColor(status) {
  if (status >= 200 && status < 300) return 'text-emerald-600 dark:text-emerald-400';
  if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
  if (status >= 400 && status < 500) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

// Human-readable byte size formatting
export function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Keyboard navigation for custom role="menu" context menus (right-click
// menus positioned at the cursor, where Headless UI's Menu can't anchor to
// an arbitrary point). Wire to onKeyDown on the menu container: Escape closes
// it, ArrowUp/ArrowDown move focus between role="menuitem" children.
export function handleMenuKeyDown(e, onClose) {
  if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = Array.from(e.currentTarget.querySelectorAll('[role="menuitem"]'));
  if (items.length === 0) return;
  const currentIndex = items.indexOf(document.activeElement);
  const delta = e.key === 'ArrowDown' ? 1 : -1;
  const nextIndex = (currentIndex + delta + items.length) % items.length;
  items[nextIndex].focus();
}

// Recursively collects the ids of `folderId` and every descendant folder
// (walking `parent_id` chains), in tree order (parent before children).
export function collectFolderAndDescendantIds(folderId, folders) {
  const ids = [folderId];
  const children = folders
    .filter((f) => f.parent_id === folderId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (const child of children) {
    ids.push(...collectFolderAndDescendantIds(child.id, folders));
  }
  return ids;
}

// Walks the parent_id chain to build the path from the root folder down to
// `folderId` (inclusive), returning the folder objects in root-first order.
// Guards against cycles so a corrupt parent_id can't loop forever.
export function getFolderPath(folderId, folders) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path = [];
  const seen = new Set();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_id != null ? byId.get(current.parent_id) : null;
  }
  return path;
}

// Zero-based nesting depth of a folder (a root-level folder is depth 0).
export function getFolderDepth(folderId, folders) {
  return Math.max(0, getFolderPath(folderId, folders).length - 1);
}

// Builds the ordered list of requests to run for the Collection Runner: every
// request whose folder_id falls under `folder` (itself or any descendant),
// grouped by folder in tree order and sorted by position within each folder.
export function collectRunnableRequests(folder, folders, requests) {
  if (!folder) return [];
  const folderIds = collectFolderAndDescendantIds(folder.id, folders);
  const ordered = [];
  for (const folderId of folderIds) {
    const inFolder = requests
      .filter((r) => r.folder_id === folderId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    ordered.push(...inFolder);
  }
  return ordered;
}

// Creates a key/value row with a stable client-side id (_id) so React lists
// can use it as a key without breaking input focus on insert/delete.
// The _id is stripped before data is sent to the server.
export function createRow(fields) {
  return { _id: crypto.randomUUID(), ...fields };
}