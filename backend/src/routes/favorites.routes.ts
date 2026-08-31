import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/authenticate';
import { requireUuidParams } from '../middleware/validateUuidParams';
import { asyncHandler } from '../utils/asyncHandler';
import { resolveEffectiveRole, roleAtLeast } from '../services/permissions.service';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export const favoritesRouter = Router();
favoritesRouter.use(authenticate);

favoritesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { node: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ favorites: favorites.filter((f) => !f.node.deletedAt) });
  })
);

favoritesRouter.post(
  '/:nodeId',
  requireUuidParams('nodeId'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const nodeId = req.params.nodeId;

    const node = await prisma.node.findFirst({ where: { id: nodeId, deletedAt: null } });
    if (!node) throw new NotFoundError('Node not found');

    const role = await resolveEffectiveRole(nodeId, userId);
    if (!roleAtLeast(role, 'viewer')) throw new ForbiddenError();

    const favorite = await prisma.favorite.upsert({
      where: { userId_nodeId: { userId, nodeId } },
      update: {},
      create: { userId, nodeId },
    });

    res.status(201).json({ favorite });
  })
);

favoritesRouter.delete(
  '/:nodeId',
  requireUuidParams('nodeId'),
  asyncHandler(async (req, res) => {
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, nodeId: req.params.nodeId } });
    res.status(204).send();
  })
);
