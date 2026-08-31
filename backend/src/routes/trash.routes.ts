import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../utils/asyncHandler';

export const trashRouter = Router();
trashRouter.use(authenticate);

trashRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const nodes = await prisma.node.findMany({
      where: { ownerId: req.user!.id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    res.json({ nodes });
  })
);
