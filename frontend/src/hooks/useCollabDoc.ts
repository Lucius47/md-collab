import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WS_URL } from '../config';
import { colorForUser } from '../lib/color';
import type { ApiUser } from '../types/api';

export type CollabStatus = 'connecting' | 'connected' | 'disconnected';

export interface CollabPeer {
  clientId: number;
  userId?: string;
  username?: string;
  color?: string;
}

export interface CollabDoc {
  ydoc: Y.Doc;
  ytext: Y.Text;
  provider: WebsocketProvider;
  status: CollabStatus;
  synced: boolean;
  offlineReady: boolean;
  peers: CollabPeer[];
}

interface Session {
  nodeId: string;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
}

/**
 * Opens (or reuses) the collaboration session for a single file node: a
 * Y.Doc synced over WebSocket to our backend's /ws/:nodeId room, mirrored
 * to IndexedDB for offline edits, with the local user's presence published
 * to awareness. Recreated whenever `nodeId` changes.
 *
 * Everything that opens an actual network/IndexedDB connection is created
 * and torn down inside a single effect (not useMemo, which React does not
 * guarantee runs exactly once per dependency change — notably under
 * StrictMode's dev-mode double-invoke, which could otherwise leak an
 * orphaned WebSocket).
 *
 * The backend hand-rolls its WebSocket server to speak the same wire
 * protocol as `y-websocket`'s client provider expects (see backend
 * src/websocket/room.ts), so the standard provider below works unmodified
 * against it.
 */
export function useCollabDoc(nodeId: string | null, user: ApiUser | null): CollabDoc | null {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<CollabStatus>('connecting');
  const [synced, setSynced] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [peers, setPeers] = useState<CollabPeer[]>([]);

  useEffect(() => {
    if (!nodeId) {
      setSession(null);
      return;
    }

    setStatus('connecting');
    setSynced(false);
    setOfflineReady(false);
    setPeers([]);

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(`${WS_URL}/ws`, nodeId, ydoc, { connect: true });
    const idb = new IndexeddbPersistence(`mdc-doc-${nodeId}`, ydoc);

    setSession({ nodeId, ydoc, provider });

    idb.on('synced', () => setOfflineReady(true));

    const onStatus = (e: { status: CollabStatus }) => setStatus(e.status);
    const onSync = (isSynced: boolean) => setSynced(isSynced);
    provider.on('status', onStatus);
    provider.on('sync', onSync);

    if (user) {
      const { color, colorLight } = colorForUser(user.id);
      provider.awareness.setLocalStateField('user', {
        userId: user.id,
        username: user.username,
        // "name"/"color"/"colorLight" are what y-codemirror.next's remote
        // cursor renderer reads directly — verify these field names against
        // the installed y-codemirror.next version if cursors render
        // unstyled; the sync itself doesn't depend on them.
        name: user.username,
        color,
        colorLight,
      });
    }

    const updatePeers = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      setPeers(
        states
          .filter(([clientId]) => clientId !== ydoc.clientID)
          .map(([clientId, state]) => {
            const info = (state as { user?: { userId?: string; username?: string; color?: string } }).user;
            return { clientId, userId: info?.userId, username: info?.username, color: info?.color };
          })
      );
    };
    provider.awareness.on('change', updatePeers);
    updatePeers();

    return () => {
      provider.awareness.off('change', updatePeers);
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.destroy();
      idb.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, user]);

  // Guards the brief window during a nodeId change where state still holds
  // the previous session but the effect for the new one hasn't run yet.
  if (!nodeId || !session || session.nodeId !== nodeId) return null;

  return {
    ydoc: session.ydoc,
    ytext: session.ydoc.getText('content'),
    provider: session.provider,
    status,
    synced,
    offlineReady,
    peers,
  };
}
