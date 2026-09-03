import { useState } from 'react';
import { File, Folder, RotateCcw, Trash2 } from 'lucide-react';
import { useTrash } from '../hooks/useFavorites';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { permanentlyDeleteNode, restoreNode } from '../lib/api';
import type { ApiNode } from '../types/api';
import { formatRelativeTime } from '../lib/time';

export function TrashView() {
  const { items, loading, reload } = useTrash();
  const [purging, setPurging] = useState<ApiNode | null>(null);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title="Trash is empty"
        description="Deleted notes and folders stay here for 30 days before they're purged automatically."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-1 font-serif text-lg font-semibold">Trash</h1>
      <p className="mb-3 text-xs text-ink-soft dark:text-mist-soft">
        Items are permanently deleted 30 days after being trashed.
      </p>
      <div className="space-y-1">
        {items.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper-surface dark:hover:bg-night-surface"
          >
            {n.type === 'folder' ? (
              <Folder size={15} className="shrink-0 text-pine-600 dark:text-pine-400" />
            ) : (
              <File size={15} className="shrink-0 text-ink-soft dark:text-mist-soft" />
            )}
            <span className="min-w-0 flex-1 truncate">{n.name}</span>
            <span className="shrink-0 text-xs text-ink-soft/60 dark:text-mist-soft/60">
              Trashed {n.deletedAt ? formatRelativeTime(n.deletedAt) : ''}
            </span>
            <button
              onClick={async () => {
                await restoreNode(n.id);
                reload();
              }}
              title="Restore"
              className="shrink-0 rounded p-1 text-ink-soft hover:text-pine-600 dark:text-mist-soft dark:hover:text-pine-400"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setPurging(n)}
              title="Delete permanently"
              className="shrink-0 rounded p-1 text-ink-soft hover:text-red-600 dark:text-mist-soft"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {purging && (
        <ConfirmDialog
          title="Delete permanently?"
          message={`"${purging.name}" will be permanently deleted right away. This can't be undone.`}
          confirmLabel="Delete permanently"
          onClose={() => setPurging(null)}
          onConfirm={async () => {
            await permanentlyDeleteNode(purging.id);
            reload();
          }}
        />
      )}
    </div>
  );
}
