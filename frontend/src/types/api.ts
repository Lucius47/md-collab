export type NodeType = 'file' | 'folder';
export type PermissionRole = 'viewer' | 'editor' | 'manager';

export interface ApiNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  ownerId: string;
  s3Key: string | null;
  content: string | null;
  isPublic: boolean;
  publicLinkId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUser {
  id: string;
  username: string;
  email: string;
}

export interface PermissionGrant {
  nodeId: string;
  userId: string;
  role: PermissionRole;
  user: ApiUser;
}

export interface Favorite {
  userId: string;
  nodeId: string;
  createdAt: string;
  node: ApiNode;
}

export interface Version {
  id: string;
  nodeId: string;
  s3Key: string;
  userId: string;
  createdAt: string;
  user: { id: string; username: string };
}

export interface SearchResult {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  ownerId: string;
  snippet: string;
  rank: number;
}
