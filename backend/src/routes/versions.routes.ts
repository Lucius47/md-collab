import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/authenticate';
import { requireNodeRole } from '../middleware/rbac';
import { requireUuidParams } from '../middleware/validateUuidParams';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import * as s3 from '../services/s3.service';

// Mounted at /api/nodes too — patterns here are all 2+ segments starting
// with /:nodeId/versions, so no overlap with nodesRouter or sharingRouter.
export const versionsRouter = Router();
versionsRouter.use(authenticate);

versionsRouter.get(
  '/:nodeId/versions',
  requireUuidParams('nodeId'),
  requireNodeRole('viewer'),
  asyncHandler(async (req, res) => {
    const versions = await prisma.version.findMany({
      where: { nodeId: req.params.nodeId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true } } },
    });
    res.json({ versions });
  })
);

versionsRouter.post(
  '/:nodeId/versions/:versionId/restore',
  requireUuidParams('nodeId', 'versionId'),
  requireNodeRole('editor'),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    if (node.type !== 'file') throw new BadRequestError('Only files have versions');

    const version = await prisma.version.findFirst({
      where: { id: req.params.versionId, nodeId: node.id },
    });
    if (!version) throw new NotFoundError('Version not found');

    const content = await s3.getText(version.s3Key);
    if (node.s3Key) await s3.putText(node.s3Key, content);
    const updated = await prisma.node.update({ where: { id: node.id }, data: { content } });

    // Restoring is itself a new edit, so it gets its own checkpoint.
    const newVersionId = uuidv4();
    const key = s3.versionKey(node.id, newVersionId);
    await s3.putText(key, content);
    await prisma.version.create({
      data: { id: newVersionId, nodeId: node.id, userId: req.user!.id, s3Key: key },
    });

    // NOTE: this does not reach into an active live collaboration room. If
    // the file is open in a WebSocket session right now, that room's
    // in-memory Y.Doc stays the source of truth until it empties and
    // reloads or someone makes a further edit. Flagged in the README as a
    // known limitation worth closing before this ships alongside heavy
    // concurrent editing.
    res.json({ node: updated });
  })
);
