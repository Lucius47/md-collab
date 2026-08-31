import { NextFunction, Request, Response } from 'express';
import { PermissionRole } from '@prisma/client';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { resolveEffectiveRole, roleAtLeast } from '../services/permissions.service';
import { prisma } from '../db/prisma';

interface RequireNodeRoleOptions {
  nodeIdParam?: string;
  /** Allow matching a soft-deleted node — needed for restore / permanent-delete. */
  includeTrashed?: boolean;
}

/**
 * Express middleware factory: requires the authenticated user to hold at
 * least `minRole` on the node identified by req.params[nodeIdParam] (default
 * param name: "nodeId"). On success, stashes the node and resolved role on
 * res.locals so the route handler doesn't have to look them up again.
 */
export function requireNodeRole(minRole: PermissionRole, options: RequireNodeRoleOptions = {}) {
  const { nodeIdParam = 'nodeId', includeTrashed = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const nodeId = req.params[nodeIdParam];

      const node = await prisma.node.findFirst({
        where: includeTrashed ? { id: nodeId } : { id: nodeId, deletedAt: null },
      });
      if (!node) throw new NotFoundError('Node not found');

      const role = await resolveEffectiveRole(nodeId, req.user.id);
      if (!roleAtLeast(role, minRole)) throw new ForbiddenError();

      res.locals.node = node;
      res.locals.effectiveRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
