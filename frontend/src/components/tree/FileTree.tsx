import { useEffect, useState } from 'react';
import { FilePlus, FolderPlus } from 'lucide-react';
import { createNode, listNodes } from '../../lib/api';
import type { ApiNode } from '../../types/api';
import { TreeNodeItem } from './TreeNodeItem';
import { Spinner } from '../common/Spinner';
import { PromptModal } from '../common/PromptModal';

export function FileTree() {
  const [nodes, setNodes] = useState<ApiNode[] | null>(null);
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);

  useEffect(() => {
    listNodes().then(({ nodes }) => setNodes(nodes));
  }, [version]);

  const reload = () => setVersion((v) => v + 1);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft/70 dark:text-mist-soft/70">
          Workspace
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setCreating('file')}
            title="New note"
            className="rounded p-1 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => setCreating('folder')}
            title="New folder"
            className="rounded p-1 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {nodes === null && (
        <div className="flex justify-center py-4">
          <Spinner size={16} />
        </div>
      )}

      {nodes?.length === 0 && (
        <p className="px-2 py-3 text-xs italic text-ink-soft/60 dark:text-mist-soft/60">
          Nothing here yet — start your first note.
        </p>
      )}

      {nodes?.map((node) => (
        <TreeNodeItem key={node.id} node={node} depth={0} onChanged={reload} />
      ))}

      {creating && (
        <PromptModal
          title={creating === 'file' ? 'New note' : 'New folder'}
          label="Name"
          confirmLabel="Create"
          onClose={() => setCreating(null)}
          onConfirm={async (value) => {
            await createNode({ type: creating, name: value, parentId: null });
            setCreating(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
