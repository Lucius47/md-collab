import { Node as NodeModel, PermissionRole } from '@prisma/client';
import { prisma } from '../db/prisma';

const ROLE_RANK: Record<PermissionRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
};

export function roleAtLeast(role: PermissionRole | null | undefined, min: PermissionRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Resolves what role `userId` effectively holds on `nodeId`.
 *
 * Resolution order:
 *   1. Node owner -> always 'manager' (full control).
 *   2. An explicit Permission row on the node itself -> that role wins
 *      outright, even if it's *less* permissive than something inherited.
 *   3. Otherwise walk up parent_id -> parent_id -> ... and use the role
 *      from the NEAREST ancestor that has an explicit Permission row for
 *      this user (nearest = most specific, same idea as CSS specificity).
 *   4. No grant anywhere in the chain -> null (no access).
 *
 * This directly implements the spec's "permissions propagate downwards from
 * folders to notes unless explicitly overridden" rule. Each step is one
 * query; for typical folder depths that's fine. For very deep trees this
 * could be collapsed into a single recursive CTE.
 */
export async function resolveEffectiveRole(
  nodeId: string,
  userId: string
): Promise<PermissionRole | null> {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    select: { id: true, parentId: true, ownerId: true },
  });
  if (!node) return null;
  if (node.ownerId === userId) return 'manager';

  let cursor: string | null = node.id;
  while (cursor) {
    const grant = await prisma.permission.findUnique({
      where: { nodeId_userId: { nodeId: cursor, userId } },
      select: { role: true },
    });
    if (grant) return grant.role;

    const parent: Pick<NodeModel, 'parentId'> | null = await prisma.node.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }

  return null;
}

/**
 * Public-link equivalent of resolveEffectiveRole: is `nodeId` reachable as
 * "public" via itself or any ancestor with is_public = true? Mirrors the
 * same walk-up-the-tree shape so a public folder's contents are readable
 * too, not just the folder itself.
 */
export async function resolvePublicAccess(nodeId: string): Promise<boolean> {
  let cursor: string | null = nodeId;
  while (cursor) {
    const node: Pick<NodeModel, 'isPublic' | 'parentId'> | null = await prisma.node.findUnique({
      where: { id: cursor },
      select: { isPublic: true, parentId: true },
    });
    if (!node) return false;
    if (node.isPublic) return true;
    cursor = node.parentId;
  }
  return false;
}
