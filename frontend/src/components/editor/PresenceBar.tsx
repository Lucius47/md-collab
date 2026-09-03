import type { CollabPeer, CollabStatus } from '../../hooks/useCollabDoc';
import { Avatar } from '../common/Avatar';

interface PresenceBarProps {
  peers: CollabPeer[];
  status: CollabStatus;
  offlineReady: boolean;
}

export function PresenceBar({ peers, status, offlineReady }: PresenceBarProps) {
  const named = peers.filter((p) => p.userId && p.username);

  return (
    <div className="flex items-center gap-2">
      {named.length > 0 && (
        <div className="flex -space-x-1.5">
          {named.slice(0, 5).map((p) => (
            <div key={p.clientId} className="ring-2 ring-paper dark:ring-night-surface rounded-full">
              <Avatar userId={p.userId!} username={p.username!} size={22} />
            </div>
          ))}
        </div>
      )}
      <StatusDot status={status} offlineReady={offlineReady} />
    </div>
  );
}

function StatusDot({ status, offlineReady }: { status: CollabStatus; offlineReady: boolean }) {
  if (status === 'connected') {
    return <span className="text-xs text-ink-soft/70 dark:text-mist-soft/70">Synced</span>;
  }
  if (offlineReady) {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Offline — saved on this device
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-ink-soft/70 dark:text-mist-soft/70">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-soft/60 dark:bg-mist-soft/60" />
      Connecting…
    </span>
  );
}
