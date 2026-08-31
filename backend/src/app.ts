import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, generalLimiter, writeLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth.routes';
import { nodesRouter } from './routes/nodes.routes';
import { sharingRouter, sharedWithMeRouter } from './routes/sharing.routes';
import { versionsRouter } from './routes/versions.routes';
import { trashRouter } from './routes/trash.routes';
import { favoritesRouter } from './routes/favorites.routes';
import { searchRouter } from './routes/search.routes';
import { publicRouter } from './routes/public.routes';

/** Applies the write-rate-limiter only to non-GET requests. */
function writesOnly(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET') return next();
  return writeLimiter(req, res, next);
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '6mb' }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Order matters below only in that nodesRouter/sharingRouter/versionsRouter
  // share the /api/nodes prefix — see the comments in sharing.routes.ts and
  // versions.routes.ts for why their patterns never collide with each other.
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/nodes', writesOnly, nodesRouter);
  app.use('/api/nodes', writesOnly, sharingRouter);
  app.use('/api/nodes', writesOnly, versionsRouter);
  app.use('/api/shared-with-me', sharedWithMeRouter);
  app.use('/api/trash', trashRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/public', publicRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);

  return app;
}
