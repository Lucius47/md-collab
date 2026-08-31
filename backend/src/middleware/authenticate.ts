import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { verifyAppToken } from '../services/token.service';
import { prisma } from '../db/prisma';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) throw new UnauthorizedError();

    const payload = verifyAppToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, email: true },
    });
    if (!user) throw new UnauthorizedError();

    req.user = user;
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

/**
 * Same as `authenticate`, but never rejects the request — it just attaches
 * req.user when a valid session cookie happens to be present. Not currently
 * wired to any route, but handy if a "public but personalized" endpoint
 * comes up later (e.g. showing "you have edit access" on a public link).
 */
export async function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) return next();
    const payload = verifyAppToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, email: true },
    });
    if (user) req.user = user;
  } catch {
    // Invalid/expired token on an optional-auth route just means "anonymous".
  }
  next();
}
