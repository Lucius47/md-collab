import { Node as NodeModel } from '@prisma/client';
import { prisma } from '../db/prisma';
import * as s3 from './s3.service';

/**
 * Every non-deleted FILE nested under `rootId` (rootId itself is assumed to
 * be a folder). Used for zip downloads.
 */
export async function collectDescendantFiles(rootId: string): Promise<NodeModel[]> {
  const files: NodeModel[] = [];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await prisma.node.findMany({
      where: { parentId: { in: frontier }, deletedAt: null },
    });
    files.push(...children.filter((n) => n.type === 'file'));
    frontier = children.filter((n) => n.type === 'folder').map((n) => n.id);
  }

  return files;
}

/** Every descendant node (files AND folders, including soft-deleted ones). */
async function collectAllDescendants(rootId: string): Promise<NodeModel[]> {
  const all: NodeModel[] = [];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await prisma.node.findMany({ where: { parentId: { in: frontier } } });
    all.push(...children);
    frontier = children.map((n) => n.id);
  }

  return all;
}

/** Rebuilds `folder/subfolder/file.md` relative to `rootId` for zip entries. */
export async function buildRelativePath(node: NodeModel, rootId: string): Promise<string> {
  const segments: string[] = [`${node.name}.md`];
  let cursor = node.parentId;

  while (cursor && cursor !== rootId) {
    const parent = await prisma.node.findUnique({
      where: { id: cursor },
      select: { name: true, parentId: true },
    });
    if (!parent) break;
    segments.unshift(parent.name);
    cursor = parent.parentId;
  }

  return segments.join('/');
}

/**
 * Permanently removes a node — and everything under it, if it's a folder —
 * from S3 and Postgres. Shared by the manual "empty trash" endpoint and the
 * nightly trash-purge cron job.
 */
export async function purgeNodePermanently(nodeId: string): Promise<void> {
  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node) return;

  const descendants = node.type === 'folder' ? await collectAllDescendants(nodeId) : [];
  const allNodes = [node, ...descendants];

  const versions = await prisma.version.findMany({
    where: { nodeId: { in: allNodes.map((n) => n.id) } },
  });

  const keysToDelete: string[] = [];
  for (const n of allNodes) {
    if (n.s3Key) keysToDelete.push(n.s3Key, s3.yjsStateKey(n.id));
  }
  for (const v of versions) keysToDelete.push(v.s3Key);

  await s3.deleteObjects(keysToDelete);

  // Deleting the root row cascades to descendants (and their permissions /
  // favorites / versions) via the FK onDelete: Cascade rules in the schema.
  await prisma.node.delete({ where: { id: nodeId } });
}
