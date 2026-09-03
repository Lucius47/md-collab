import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type * as Y from 'yjs';
import { listVersions, restoreVersion } from '../../lib/api';
import type { Version } from '../../types/api';
import { Spinner } from '../common/Spinner';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatRelativeTime } from '../../lib/time';

interface VersionHistoryPanelProps {
  nodeId: string;
  ytext: Y.Text;
  onClose: () => void;
}

export function VersionHistoryPanel({ nodeId, ytext, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [restoring, setRestoring] = useState<Version | null>(null);

  useEffect(() => {
    listVersions(nodeId).then((r) => setVersions(r.versions));
  }, [nodeId]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-paper-border dark:border-night-border">
      <div className="flex items-center justify-between border-b border-paper-border px-3 py-2 dark:border-night-border">
        <h2 className="text-sm font-semibold">Version history</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {versions === null && (
          <div className="flex justify-center py-6">
            <Spinner size={16} />
          </div>
        )}
        {versions?.length === 0 && (
          <p className="px-3 py-4 text-xs italic text-ink-soft/60 dark:text-mist-soft/60">
            No checkpoints yet — one is saved roughly every 15 minutes of active editing.
          </p>
        )}
        {versions?.map((v) => (
          <button
            key={v.id}
            onClick={() => setRestoring(v)}
            className="block w-full border-b border-paper-border px-3 py-2 text-left text-xs hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
          >
            <div className="font-medium">{formatRelativeTime(v.createdAt)}</div>
            <div className="text-ink-soft dark:text-mist-soft">by {v.user.username}</div>
          </button>
        ))}
      </div>

      {restoring && (
        <ConfirmDialog
          title="Restore this version?"
          message={`This replaces the current content with the version from ${formatRelativeTime(
            restoring.createdAt
          )}. The current content is saved as a new checkpoint first, so nothing is lost.`}
          confirmLabel="Restore"
          danger={false}
          onClose={() => setRestoring(null)}
          onConfirm={async () => {
            const { node } = await restoreVersion(nodeId, restoring.id);
            // Also replay into the live shared doc, so this tab — and
            // anyone else currently in the room — sees the restore
            // immediately, as a normal collaborative edit.
            ytext.doc?.transact(() => {
              ytext.delete(0, ytext.length);
              ytext.insert(0, node.content ?? '');
            });
          }}
        />
      )}
    </aside>
  );
}
