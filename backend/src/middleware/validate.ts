import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

interface Schemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

// Synchronous throws inside Express handlers/middleware are caught by
// Express 4's router automatically and forwarded to error middleware, so
// ZodError from .parse() reaches errorHandler.ts without extra plumbing.
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
    next();
  };
}
