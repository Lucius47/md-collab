import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import type { Room } from './room';
import { prisma } from '../db/prisma';
import * as s3 from '../services/s3.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const timers = new Map<string, NodeJS.Timeout>();
const lastVersionAt = new Map<string, number>();
const VERSION_MIN_INTERVAL_MS = 15 * 60 * 1000; // at most one checkpoint per 15 min of active editing

/** Called on every doc update — (re)starts the debounce window. */
export function schedulePersist(room: Room): void {
  const existing = timers.get(room.nodeId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    timers.delete(room.nodeId);
    persistRoom(room).catch((err) => logger.error('Debounced persist failed', { nodeId: room.nodeId, err }));
  }, env.COLLAB_PERSIST_DEBOUNCE_MS);

  timers.set(room.nodeId, timer);
}

/** Called when the last client leaves a room — flush immediately, no debounce wait. */
export async function flushRoom(room: Room): Promise<void> {
  const existing = timers.get(room.nodeId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(room.nodeId);
  }
  await persistRoom(room);
}

async function persistRoom(room: Room): Promise<void> {
  const node = await prisma.node.findUnique({ where: { id: room.nodeId } });
  if (!node || node.type !== 'file') return;

  const content = room.doc.getText('content').toString();
  const state = Y.encodeStateAsUpdate(room.doc);

  if (node.s3Key) await s3.putText(node.s3Key, content);
  await s3.putBinary(s3.yjsStateKey(room.nodeId), state);
  await prisma.node.update({ where: { id: room.nodeId }, data: { content } });

  const lastEditorId = room.lastEditorUserId ?? node.ownerId;
  const lastVersion = lastVersionAt.get(room.nodeId) ?? 0;

  if (Date.now() - lastVersion >= VERSION_MIN_INTERVAL_MS) {
    const versionId = uuidv4();
    const key = s3.versionKey(room.nodeId, versionId);
    await s3.putText(key, content);
    await prisma.version.create({
      data: { id: versionId, nodeId: room.nodeId, userId: lastEditorId, s3Key: key },
    });
    lastVersionAt.set(room.nodeId, Date.now());
  }
}
