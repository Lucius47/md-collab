import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { attachWebSocketServer } from './websocket';
import { startTrashPurgeJob } from './jobs/trashPurge.job';
import { logger } from './utils/logger';
import { prisma } from './db/prisma';

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  attachWebSocketServer(server);
  startTrashPurgeJob();

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
