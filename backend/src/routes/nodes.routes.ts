import { Router } from 'express';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/authenticate';
import { requireNodeRole } from '../middleware/rbac';
import { requireUuidParams } from '../middleware/validateUuidParams';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { createNodeBody, listNodesQuery, moveNodeBody, updateNodeBody } from '../validators/nodes.validators';
import { resolveEffectiveRole, roleAtLeast } from '../services/permissions.service';
import { buildRelativePath, collectDescendantFiles, purgeNodePermanently } from '../services/nodes.service';
import * as s3 from '../services/s3.service';

export const nodesRouter = Router();
nodesRouter.use(authenticate);

// List children of a folder, or the caller's own workspace root when
// parentId is omitted (root = nodes they own with parentId = null).
nodesRouter.get(
  '/',
  validate({ query: listNodesQuery }),
  asyncHandler(async (req, res) => {
    const { parentId } = req.query as unknown as { parentId?: string };
    const userId = req.user!.id;

    if (parentId) {
      const role = await resolveEffectiveRole(parentId, userId);
      if (!roleAtLeast(role, 'viewer')) throw new ForbiddenError();
    }

    const nodes = await prisma.node.findMany({
      where: parentId
        ? { parentId, deletedAt: null }
        : { parentId: null, ownerId: userId, deletedAt: null },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    res.json({ nodes });
  })
);

nodesRouter.post(
  '/',
  validate({ body: createNodeBody }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { type, name, parentId } = req.body as {
      type: 'file' | 'folder';
      name: string;
      parentId: string | null;
    };

    if (parentId) {
      const role = await resolveEffectiveRole(parentId, userId);
      if (!roleAtLeast(role, 'editor')) throw new ForbiddenError();
      const parent = await prisma.node.findFirst({ where: { id: parentId, deletedAt: null } });
      if (!parent) throw new NotFoundError('Parent folder not found');
      if (parent.type !== 'folder') throw new BadRequestError('Parent must be a folder');
    }

    // Whoever creates a node owns it, even inside someone else's shared
    // folder — matches how most "shared drive" style tools behave.
    const id = uuidv4();
    const node = await prisma.node.create({
      data: {
        id,
        type,
        name,
        parentId,
        ownerId: userId,
        s3Key: type === 'file' ? s3.markdownKey(id) : null,
        content: type === 'file' ? '' : null,
      },
    });

    if (type === 'file' && node.s3Key) await s3.putText(node.s3Key, '');

    res.status(201).json({ node });
  })
);

nodesRouter.get(
  '/:nodeId',
  requireUuidParams('nodeId'),
  requireNodeRole('viewer'),
  asyncHandler(async (req, res) => {
    res.json({ node: res.locals.node, role: res.locals.effectiveRole });
  })
);

// Rename and/or update content over plain REST. Live collaborative edits go
// through the WebSocket layer (src/websocket) instead, with its own 5s
// debounce; this endpoint covers non-realtime clients and renames, which
// the collab doc doesn't carry.
nodesRouter.patch(
  '/:nodeId',
  requireUuidParams('nodeId'),
  requireNodeRole('editor'),
  validate({ body: updateNodeBody }),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    const { name, content } = req.body as { name?: string; content?: string };
    const data: { name?: string; content?: string } = {};

    if (name !== undefined) data.name = name;
    if (content !== undefined) {
      if (node.type !== 'file') throw new BadRequestError('Only files have content');
      data.content = content;
      if (node.s3Key) await s3.putText(node.s3Key, content);
    }

    const updated = await prisma.node.update({ where: { id: node.id }, data });
    res.json({ node: updated });
  })
);

nodesRouter.patch(
  '/:nodeId/move',
  requireUuidParams('nodeId'),
  requireNodeRole('editor'),
  validate({ body: moveNodeBody }),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    const userId = req.user!.id;
    const { parentId } = req.body as { parentId: string | null };

    if (parentId) {
      if (parentId === node.id) throw new BadRequestError('A node cannot be its own parent');

      const destRole = await resolveEffectiveRole(parentId, userId);
      if (!roleAtLeast(destRole, 'editor')) throw new ForbiddenError('No access to destination folder');

      const dest = await prisma.node.findFirst({ where: { id: parentId, deletedAt: null } });
      if (!dest) throw new NotFoundError('Destination folder not found');
      if (dest.type !== 'folder') throw new BadRequestError('Destination must be a folder');

      if (node.type === 'folder') {
        let cursor: string | null = parentId;
        while (cursor) {
          if (cursor === node.id) {
            throw new BadRequestError('Cannot move a folder into its own descendant');
          }
          const p: { parentId: string | null } | null = await prisma.node.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
          cursor = p?.parentId ?? null;
        }
      }
    }

    const updated = await prisma.node.update({ where: { id: node.id }, data: { parentId } });
    res.json({ node: updated });
  })
);

nodesRouter.delete(
  '/:nodeId',
  requireUuidParams('nodeId'),
  requireNodeRole('manager'),
  asyncHandler(async (req, res) => {
    await prisma.node.update({ where: { id: res.locals.node.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

nodesRouter.post(
  '/:nodeId/restore',
  requireUuidParams('nodeId'),
  requireNodeRole('manager', { includeTrashed: true }),
  asyncHandler(async (req, res) => {
    const updated = await prisma.node.update({
      where: { id: res.locals.node.id },
      data: { deletedAt: null },
    });
    res.json({ node: updated });
  })
);

// Manual "empty trash" action — the cron job (src/jobs/trashPurge.job.ts)
// does this automatically after TRASH_RETENTION_DAYS, this just lets a user
// jump the queue for an item already sitting in their trash.
nodesRouter.delete(
  '/:nodeId/permanent',
  requireUuidParams('nodeId'),
  requireNodeRole('manager', { includeTrashed: true }),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    if (!node.deletedAt) throw new BadRequestError('Move to trash before permanently deleting');
    await purgeNodePermanently(node.id);
    res.status(204).send();
  })
);

nodesRouter.get(
  '/:nodeId/download',
  requireUuidParams('nodeId'),
  requireNodeRole('viewer'),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    if (node.type !== 'file') throw new BadRequestError('Only files can be downloaded directly');
    if (!node.s3Key) throw new NotFoundError('File has no stored content');

    const stream = await s3.getObjectStream(node.s3Key);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(node.name)}.md"`);
    stream.pipe(res);
  })
);

nodesRouter.get(
  '/:nodeId/download-zip',
  requireUuidParams('nodeId'),
  requireNodeRole('viewer'),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    if (node.type !== 'folder') throw new BadRequestError('Only folders can be downloaded as zip');

    const files = await collectDescendantFiles(node.id);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(node.name)}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);

    // Content comes from the DB's `content` mirror column rather than
    // hitting S3 per file — much faster for folders with many notes, and
    // that column is kept in sync on every save specifically for this kind
    // of read.
    for (const file of files) {
      const relativePath = await buildRelativePath(file, node.id);
      archive.append(file.content ?? '', { name: relativePath });
    }

    await archive.finalize();
  })
);

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-');
}
