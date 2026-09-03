import { API_URL } from '../config';
import type {
  ApiNode,
  ApiUser,
  Favorite,
  PermissionGrant,
  PermissionRole,
  SearchResult,
  Version,
} from '../types/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.message ?? res.statusText, err?.code, err?.details);
  }

  return body as T;
}

// --- Auth ---
// Login is a full-page redirect (Auth0's hosted login), not a fetch call —
// see AuthContext. This just centralizes the URL it navigates to.
export const loginUrl = `${API_URL}/api/auth/login`;

export const getMe = () => request<{ user: ApiUser }>('/api/auth/me');
export const logout = () => request<{ logoutUrl: string }>('/api/auth/logout', { method: 'POST' });

// --- Nodes ---
export const listNodes = (parentId?: string | null) =>
  request<{ nodes: ApiNode[] }>(`/api/nodes${parentId ? `?parentId=${parentId}` : ''}`);

export const getNode = (id: string) => request<{ node: ApiNode; role: PermissionRole }>(`/api/nodes/${id}`);

export const createNode = (input: { type: 'file' | 'folder'; name: string; parentId: string | null }) =>
  request<{ node: ApiNode }>('/api/nodes', { method: 'POST', body: JSON.stringify(input) });

export const renameNode = (id: string, name: string) =>
  request<{ node: ApiNode }>(`/api/nodes/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });

export const updateNodeContent = (id: string, content: string) =>
  request<{ node: ApiNode }>(`/api/nodes/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) });

export const moveNode = (id: string, parentId: string | null) =>
  request<{ node: ApiNode }>(`/api/nodes/${id}/move`, { method: 'PATCH', body: JSON.stringify({ parentId }) });

export const trashNode = (id: string) => request<void>(`/api/nodes/${id}`, { method: 'DELETE' });

export const restoreNode = (id: string) => request<{ node: ApiNode }>(`/api/nodes/${id}/restore`, { method: 'POST' });

export const permanentlyDeleteNode = (id: string) =>
  request<void>(`/api/nodes/${id}/permanent`, { method: 'DELETE' });

export const downloadUrl = (id: string) => `${API_URL}/api/nodes/${id}/download`;
export const downloadZipUrl = (id: string) => `${API_URL}/api/nodes/${id}/download-zip`;

// --- Sharing ---
export const listShareGrants = (id: string) => request<{ grants: PermissionGrant[] }>(`/api/nodes/${id}/share`);

export const shareNode = (id: string, username: string, role: PermissionRole) =>
  request<{ grant: PermissionGrant }>(`/api/nodes/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ username, role }),
  });

export const revokeShare = (id: string, userId: string) =>
  request<void>(`/api/nodes/${id}/share/${userId}`, { method: 'DELETE' });

export const setPublic = (id: string, isPublic: boolean) =>
  request<{ node: ApiNode }>(`/api/nodes/${id}/public`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublic }),
  });

// --- Versions ---
export const listVersions = (id: string) => request<{ versions: Version[] }>(`/api/nodes/${id}/versions`);

export const restoreVersion = (id: string, versionId: string) =>
  request<{ node: ApiNode }>(`/api/nodes/${id}/versions/${versionId}/restore`, { method: 'POST' });

// --- Shared with me / trash / favorites ---
export const getSharedWithMe = () => request<{ nodes: ApiNode[] }>('/api/shared-with-me');
export const getTrash = () => request<{ nodes: ApiNode[] }>('/api/trash');

export const listFavorites = () => request<{ favorites: Favorite[] }>('/api/favorites');
export const addFavorite = (id: string) => request<{ favorite: Favorite }>(`/api/favorites/${id}`, { method: 'POST' });
export const removeFavorite = (id: string) => request<void>(`/api/favorites/${id}`, { method: 'DELETE' });

// --- Search ---
export const search = (q: string) => request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`);

// --- Public links (unauthenticated) ---
export const getPublicByLink = (publicLinkId: string) =>
  request<{ node: ApiNode; children: Array<Pick<ApiNode, 'id' | 'name' | 'type'>> }>(`/api/public/${publicLinkId}`);

export const getPublicNode = (nodeId: string) =>
  request<{ node: ApiNode; children: Array<Pick<ApiNode, 'id' | 'name' | 'type'>> }>(`/api/public/nodes/${nodeId}`);

export const publicDownloadUrl = (nodeId: string) => `${API_URL}/api/public/nodes/${nodeId}/download`;
