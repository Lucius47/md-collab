import { useEffect, useState } from 'react';
import { ChevronRight, Folder, Home } from 'lucide-react';
import { Modal } from '../common/Modal';
import { listNodes } from '../../lib/api';
import type { ApiNode } from '../../types/api';

interface MoveNodeModalProps {
  node: ApiNode;
  onClose: () => void;
  onMove: (destinationId: string | null) => void;
}

export function MoveNodeModal({ node, onClose, onMove }: MoveNodeModalProps) {
  const [path, setPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: 'Workspace' }]);
  const [folders, setFolders] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);

  const current = path[path.length - 1];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listNodes(current.id ?? undefined)
      .then(({ nodes }) => {
        if (!cancelled) setFolders(nodes.filter((n) => n.type === 'folder' && n.id !== node.id));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current.id, node.id]);

  return (
    <Modal
      title={`Move "${node.name}"`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night"
          >
            Cancel
          </button>
          <button
            onClick={() => onMove(current.id)}
            disabled={current.id === node.parentId}
            className="rounded bg-pine-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pine-700 disabled:opacity-50 dark:bg-pine-500"
          >
            Move here
          </button>
        </>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-ink-soft dark:text-mist-soft">
        {path.map((p, i) => (
          <span key={p.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} />}
            <button
              className="hover:text-pine-600 dark:hover:text-pine-400"
              onClick={() => setPath(path.slice(0, i + 1))}
            >
              {i === 0 ? <Home size={12} /> : p.name}
            </button>
          </span>
        ))}
      </div>
      <div className="max-h-64 overflow-auto rounded border border-paper-border dark:border-night-border">
        {loading && <div className="p-3 text-sm text-ink-soft dark:text-mist-soft">Loading…</div>}
        {!loading && folders.length === 0 && (
          <div className="p-3 text-sm italic text-ink-soft/60 dark:text-mist-soft/60">No subfolders here</div>
        )}
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setPath([...path, { id: f.id, name: f.name }])}
            className="flex w-full items-center gap-2 border-b border-paper-border px-3 py-2 text-left text-sm last:border-0 hover:bg-paper-surface dark:border-night-border dark:hover:bg-night"
          >
            <Folder size={14} className="text-pine-600 dark:text-pine-400" />
            {f.name}
          </button>
        ))}
      </div>
    </Modal>
  );
}
