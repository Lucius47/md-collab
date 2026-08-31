import http from 'http';
import { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import cookie from 'cookie';
import * as Y from 'yjs';
import { PermissionRole } from '@prisma/client';
import { env } from '../config/env';
import { verifyAppToken } from '../services/token.service';
import { prisma } from '../db/prisma';
import { resolveEffectiveRole, roleAtLeast } from '../services/permissions.service';
import * as s3 from '../services/s3.service';
import { Room } from './room';
import { logger } from '../utils/logger';

const rooms = new Map<string, Room>();
const NODE_ID_PATH = /^\/ws\/([0-9a-fA-F-]{36})$/;

/**
 * Attaches the collaboration WebSocket server to the same HTTP server as
 * Express, using `noServer: true` so we can authenticate + resolve the
 * room during the upgrade handshake before ws takes over the socket.
 */
export function attachWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on(
    'connection',
    (ws: WebSocket, room: Room, userId: string, username: string, role: PermissionRole) => {
      room.addClient(ws, userId, username, role);

      ws.on('message', (data: Buffer) => {
        try {
          room.handleMessage(ws, new Uint8Array(data));
        } catch (err) {
          logger.error('Error handling websocket message', { nodeId: room.nodeId, err });
        }
      });

      ws.on('close', () => {
        room.removeClient(ws);
        scheduleRoomEviction(room);
      });

      ws.on('error', (err) => logger.error('WebSocket connection error', { nodeId: room.nodeId, err }));
    }
  );

  server.on('upgrade', (req, socket, head) => {
    handleUpgrade(req, socket as Duplex, head, wss).catch((err) => {
      logger.error('WebSocket upgrade failed', { err });
      try {
        socket.destroy();
      } catch {
        /* noop */
      }
    });
  });

  return wss;
}

function scheduleRoomEviction(room: Room): void {
  // Short grace period in case of a fast reconnect (e.g. brief network
  // blip) before dropping the in-memory doc and forcing a re-hydrate.
  setTimeout(() => {
    if (room.clients.size === 0) rooms.delete(room.nodeId);
  }, 30_000);
}

async function getOrCreateRoom(nodeId: string): Promise<Room> {
  const existing = rooms.get(nodeId);
  if (existing) return existing;

  const room = new Room(nodeId);
  rooms.set(nodeId, room);
  await hydrateRoom(room);
  return room;
}

async function hydrateRoom(room: Room): Promise<void> {
  const existingState = await s3.getBinary(s3.yjsStateKey(room.nodeId));

  if (existingState) {
    Y.applyUpdate(room.doc, existingState, 'server-hydrate');
  } else {
    const node = await prisma.node.findUnique({ where: { id: room.nodeId } });
    if (node?.content) room.doc.getText('content').insert(0, node.content);
  }
  room.loaded = true;
}

async function handleUpgrade(
  req: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
  wss: WebSocketServer
): Promise<void> {
  const { pathname } = parse(req.url ?? '');
  const match = pathname?.match(NODE_ID_PATH);
  if (!match) return reject(socket, 404, 'Not Found');
  const nodeId = match[1];

  const cookies = cookie.parse(req.headers.cookie ?? '');
  const token = cookies[env.COOKIE_NAME];
  if (!token) return reject(socket, 401, 'Unauthorized');

  let userId: string;
  try {
    userId = verifyAppToken(token).sub;
  } catch {
    return reject(socket, 401, 'Unauthorized');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return reject(socket, 401, 'Unauthorized');

  const node = await prisma.node.findFirst({ where: { id: nodeId, deletedAt: null } });
  if (!node || node.type !== 'file') return reject(socket, 404, 'Not Found');

  const role = await resolveEffectiveRole(nodeId, user.id);
  if (!roleAtLeast(role, 'viewer')) return reject(socket, 403, 'Forbidden');

  const room = await getOrCreateRoom(nodeId);

  wss.handleUpgrade(req, req.socket, head, (ws) => {
    wss.emit('connection', ws, room, user.id, user.username, role as PermissionRole);
  });
}

function reject(socket: Duplex, code: number, statusText: string): void {
  socket.write(`HTTP/1.1 ${code} ${statusText}\r\n\r\n`);
  socket.destroy();
}
