import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { PermissionRole } from '@prisma/client';
import { schedulePersist, flushRoom } from './persistence';
import { roleAtLeast } from '../services/permissions.service';
import { logger } from '../utils/logger';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export interface RoomClient {
  ws: WebSocket;
  userId: string;
  username: string;
  role: PermissionRole;
}

/**
 * One collaboration room per node_id. Speaks the same wire protocol as the
 * `y-websocket` npm package's client provider (message type 0 = sync,
 * 1 = awareness; sync sub-messages via y-protocols/sync), so the frontend
 * can use that provider unmodified against this hand-rolled server.
 */
export class Room {
  readonly nodeId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly clients = new Map<WebSocket, RoomClient>();
  lastEditorUserId: string | null = null;
  loaded = false;

  private controlledAwarenessIds = new Map<WebSocket, Set<number>>();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin instanceof WebSocket) {
        const client = this.clients.get(origin);
        if (client) this.lastEditorUserId = client.userId;
      }
      this.broadcastSyncUpdate(update, origin);
      schedulePersist(this);
    });

    this.awareness.on(
      'update',
      (changes: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        if (origin instanceof WebSocket) {
          const ids = this.controlledAwarenessIds.get(origin) ?? new Set<number>();
          for (const id of changes.added.concat(changes.updated)) ids.add(id);
          for (const id of changes.removed) ids.delete(id);
          this.controlledAwarenessIds.set(origin, ids);
        }

        const changedIds = changes.added.concat(changes.updated, changes.removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedIds)
        );
        const message = encoding.toUint8Array(encoder);
        for (const [ws] of this.clients) {
          if (ws !== origin && ws.readyState === WebSocket.OPEN) ws.send(message);
        }
      }
    );
  }

  private broadcastSyncUpdate(update: Uint8Array, origin: unknown) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    for (const [ws] of this.clients) {
      if (ws !== origin && ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }

  addClient(ws: WebSocket, userId: string, username: string, role: PermissionRole) {
    this.clients.set(ws, { ws, userId, username, role });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));

    const states = this.awareness.getStates();
    if (states.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(states.keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
    const ids = this.controlledAwarenessIds.get(ws);
    this.controlledAwarenessIds.delete(ws);
    if (ids && ids.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(ids), null);
    }
    if (this.clients.size === 0) {
      flushRoom(this).catch((err) =>
        logger.error('Failed to flush room on empty', { nodeId: this.nodeId, err })
      );
    }
  }

  handleMessage(ws: WebSocket, data: Uint8Array) {
    const client = this.clients.get(ws);
    if (!client) return;

    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const syncType = decoding.readVarUint(decoder);

        if (syncType === syncProtocol.messageYjsSyncStep1) {
          // Read-only: the peer is telling us what it has, we reply with
          // whatever it's missing. Always allowed, even for viewers.
          const remoteStateVector = decoding.readVarUint8Array(decoder);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep2);
          encoding.writeVarUint8Array(encoder, Y.encodeStateAsUpdate(this.doc, remoteStateVector));
          ws.send(encoding.toUint8Array(encoder));
        } else if (
          syncType === syncProtocol.messageYjsSyncStep2 ||
          syncType === syncProtocol.messageYjsUpdate
        ) {
          // These carry actual document mutations — gate on role. A viewer
          // is still fully synced (via step1/step2 above) and sees live
          // updates from others, but can't inject their own.
          const update = decoding.readVarUint8Array(decoder);
          if (roleAtLeast(client.role, 'editor')) {
            Y.applyUpdate(this.doc, update, ws);
          } else {
            logger.warn('Dropped edit from a viewer-only connection', {
              nodeId: this.nodeId,
              userId: client.userId,
            });
          }
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        // Presence/cursors are not access-sensitive — allowed for all roles.
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), ws);
        break;
      }
      default:
        logger.warn('Unknown websocket message type', { nodeId: this.nodeId, messageType });
    }
  }
}
