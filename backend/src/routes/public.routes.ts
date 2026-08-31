import { Router } from 'express';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/errors';
import { requireUuidParams } from '../middleware/validateUuidParams';
import { resolvePublicAccess } from '../services/permissions.service';
import * as s3 from '../services/s3.service';

export const publicRouter = Router();

// Entry point: resolve whatever node someone shared a public link to.
publicRouter.get(
  '/:publicLinkId',
  asyncHandler(async (req, res) => {
    const node = await prisma.node.findFirst({
      where: { publicLinkId: req.params.publicLinkId, isPublic: true, deletedAt: null },
    });
    if (!node) throw new NotFoundError('This link is invalid or is no longer public');

    const children =
      node.type === 'folder'
        ? await prisma.node.findMany({
            where: { parentId: node.id, deletedAt: null },
            select: { id: true, name: true, type: true },
          })
        : [];

    res.json({ node, children });
  })
);

// Browsing further into a public folder: any node reachable through a
// public ancestor chain is fair game, not only nodes with their own link —
// a public folder's contents are public too.
publicRouter.get(
  '/nodes/:nodeId',
  requireUuidParams('nodeId'),
  asyncHandler(async (req, res) => {
    const isPublic = await resolvePublicAccess(req.params.nodeId);
    if (!isPublic) throw new NotFoundError('This content is not public');

    const node = await prisma.node.findFirst({ where: { id: req.params.nodeId, deletedAt: null } });
    if (!node) throw new NotFoundError('Not found');

    const children =
      node.type === 'folder'
        ? await prisma.node.findMany({
            where: { parentId: node.id, deletedAt: null },
            select: { id: true, name: true, type: true },
          })
        : [];

    res.json({ node, children });
  })
);

publicRouter.get(
  '/nodes/:nodeId/download',
  requireUuidParams('nodeId'),
  asyncHandler(async (req, res) => {
    const isPublic = await resolvePublicAccess(req.params.nodeId);
    if (!isPublic) throw new NotFoundError('This content is not public');

    const node = await prisma.node.findFirst({ where: { id: req.params.nodeId, deletedAt: null } });
    if (!node || node.type !== 'file' || !node.s3Key) throw new NotFoundError('Not found');

    const stream = await s3.getObjectStream(node.s3Key);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${node.name.replace(/[/\\?%*:|"<>]/g, '-')}.md"`
    );
    stream.pipe(res);
  })
);
