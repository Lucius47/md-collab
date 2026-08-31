import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { purgeNodePermanently } from '../services/nodes.service';
import { logger } from '../utils/logger';

export function startTrashPurgeJob(): void {
  cron.schedule(env.TRASH_PURGE_CRON, () => {
    logger.info('Trash purge job starting');
    purgeExpiredTrash().catch((err) => logger.error('Trash purge job failed', err));
  });
  logger.info('Trash purge job scheduled', { cron: env.TRASH_PURGE_CRON, retentionDays: env.TRASH_RETENTION_DAYS });
}

export async function purgeExpiredTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - env.TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.node.findMany({
    where: { deletedAt: { lte: cutoff } },
    select: { id: true, parentId: true },
  });

  // Only purge the TOP of each trashed subtree — deleting a folder root
  // cascades to its already-trashed children in Postgres, so purging a
  // child separately would just race against its parent's purge.
  const candidateIds = new Set(candidates.map((c) => c.id));
  const roots = candidates.filter((c) => !c.parentId || !candidateIds.has(c.parentId));

  let purged = 0;
  for (const root of roots) {
    try {
      await purgeNodePermanently(root.id);
      purged += 1;
    } catch (err) {
      logger.error('Failed to purge node', { nodeId: root.id, err });
    }
  }

  logger.info('Trash purge job finished', { purged, candidates: candidates.length });
}
