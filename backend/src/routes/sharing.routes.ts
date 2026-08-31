import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/authenticate';
import { requireNodeRole } from '../middleware/rbac';
import { requireUuidParams } from '../middleware/validateUuidParams';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { setPublicBody, shareNodeBody } from '../validators/sharing.validators';

// Mounted at /api/nodes alongside nodesRouter — every route here starts
// with /:nodeId/<something>, so there's no pattern overlap with nodesRouter's
// bare "/:nodeId" or "/:nodeId/move" etc.
export const sharingRouter = Router();
sharingRouter.use(authenticate);

sharingRouter.get(
  '/:nodeId/share',
  requireUuidParams('nodeId'),
  requireNodeRole('manager'),
  asyncHandler(async (req, res) => {
    const grants = await prisma.permission.findMany({
      where: { nodeId: req.params.nodeId },
      include: { user: { select: { id: true, username: true, email: true } } },
    });
    res.json({ grants });
  })
);

sharingRouter.post(
  '/:nodeId/share',
  requireUuidParams('nodeId'),
  requireNodeRole('manager'),
  validate({ body: shareNodeBody }),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    const { username, role } = req.body as { username: string; role: 'viewer' | 'editor' | 'manager' };

    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) throw new NotFoundError('No user with that username');
    if (targetUser.id === node.ownerId) throw new BadRequestError('The owner already has full access');

    const grant = await prisma.permission.upsert({
      where: { nodeId_userId: { nodeId: node.id, userId: targetUser.id } },
      update: { role },
      create: { nodeId: node.id, userId: targetUser.id, role },
    });

    res.status(201).json({ grant });
  })
);

sharingRouter.delete(
  '/:nodeId/share/:userId',
  requireUuidParams('nodeId', 'userId'),
  requireNodeRole('manager'),
  asyncHandler(async (req, res) => {
    await prisma.permission.deleteMany({
      where: { nodeId: req.params.nodeId, userId: req.params.userId },
    });
    res.status(204).send();
  })
);

sharingRouter.patch(
  '/:nodeId/public',
  requireUuidParams('nodeId'),
  requireNodeRole('manager'),
  validate({ body: setPublicBody }),
  asyncHandler(async (req, res) => {
    const node = res.locals.node;
    const { isPublic } = req.body as { isPublic: boolean };

    const updated = await prisma.node.update({
      where: { id: node.id },
      data: {
        isPublic,
        publicLinkId: isPublic ? node.publicLinkId ?? uuidv4() : node.publicLinkId,
      },
    });

    res.json({ node: updated });
  })
);

// Mounted separately at /api/shared-with-me (top-level, not nested under
// /api/nodes) to keep it well clear of the /:nodeId patterns above.
export const sharedWithMeRouter = Router();
sharedWithMeRouter.use(authenticate);

sharedWithMeRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const grants = await prisma.permission.findMany({
      where: { userId: req.user!.id },
      include: { node: true },
    });

    const nodes = grants.map((g) => g.node).filter((n) => n.ownerId !== req.user!.id && !n.deletedAt);
    res.json({ nodes });
  })
);
