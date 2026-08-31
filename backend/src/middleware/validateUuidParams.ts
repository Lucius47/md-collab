import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../utils/errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rejects the request with a clean 400 if any of the named route params
 * isn't UUID-shaped, instead of letting a malformed id reach Prisma and
 * surface as a raw Postgres "invalid input syntax for type uuid" 500.
 */
export function requireUuidParams(...paramNames: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (!value || !UUID_RE.test(value)) {
        return next(new BadRequestError(`"${name}" must be a valid id`));
      }
    }
    next();
  };
}
