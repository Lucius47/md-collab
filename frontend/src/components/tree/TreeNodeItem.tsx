import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, File, Folder, FolderOpen, MoreHorizontal, Plus } from 'lucide-react';
import type { ApiNode } from '../../types/api';
import { createNode, listNodes, moveNode, renameNode, trashNode } from '../../lib/api';
import { PromptModal } from '../common/PromptModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MoveNodeModal } from './MoveNodeModal';

interface TreeNodeItemProps {
  node: ApiNode;
  depth: number;
  onChanged: () => void;
}

export function TreeNodeItem({ node, depth, onChanged }: TreeNodeItemProps) {
  const navigate = useNavigate();
  const { nodeId } = useParams();
  const isActive = nodeId === node.id;
  const isFolder = node.type === 'folder';
  const indent = 6 + depth * 14;

  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ApiNode[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);
  const [moving, setMoving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const refreshChildren = async () => {
    const { nodes } = await listNodes(node.id);
    setChildren(nodes);
  };

  const toggle = async () => {
    if (!isFolder) {
      navigate(`/nodes/${node.id}`);
      return;
    }
    if (!expanded && children === null) {
      setLoadingChildren(true);
      try {
        await refreshChildren();
      } finally {
        setLoadingChildren(false);
      }
    }
    setExpanded((e) => !e);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded py-1 pr-1 text-sm ${
          isActive
            ? 'bg-pine-50 text-pine-700 dark:bg-pine-700/20 dark:text-pine-300'
            : 'hover:bg-paper-surface dark:hover:bg-night-surface'
        }`}
        style={{ paddingLeft: indent }}
      >
        <button onClick={toggle} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {isFolder ? (
            <ChevronRight
              size={14}
              className={`shrink-0 text-ink-soft/60 transition-transform dark:text-mist-soft/60 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          {isFolder ? (
            expanded ? (
              <FolderOpen size={15} className="shrink-0 text-pine-600 dark:text-pine-400" />
            ) : (
              <Folder size={15} className="shrink-0 text-pine-600 dark:text-pine-400" />
            )
          ) : (
            <File size={15} className="shrink-0 text-ink-soft dark:text-mist-soft" />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          {isFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreating('file');
              }}
              title="New note here"
              className="rounded p-1 text-ink-soft hover:bg-paper dark:text-mist-soft dark:hover:bg-night"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            title="More actions"
            className="rounded p-1 text-ink-soft hover:bg-paper dark:text-mist-soft dark:hover:bg-night"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ marginLeft: indent + 20 }} className="mb-1 flex gap-3 text-xs text-ink-soft dark:text-mist-soft">
          <button
            className="hover:text-pine-600 dark:hover:text-pine-400"
            onClick={() => {
              setRenaming(true);
              setMenuOpen(false);
            }}
          >
            Rename
          </button>
          <button
            className="hover:text-pine-600 dark:hover:text-pine-400"
            onClick={() => {
              setMoving(true);
              setMenuOpen(false);
            }}
          >
            Move to…
          </button>
          <button
            className="hover:text-red-600"
            onClick={() => {
              setConfirmingDelete(true);
              setMenuOpen(false);
            }}
          >
            Move to trash
          </button>
        </div>
      )}

      {isFolder && expanded && (
        <div>
          {loadingChildren && (
            <div className="py-1 text-xs text-ink-soft/60 dark:text-mist-soft/60" style={{ paddingLeft: indent + 14 }}>
              Loading…
            </div>
          )}
          {children?.length === 0 && !loadingChildren && (
            <div
              className="py-1 text-xs italic text-ink-soft/50 dark:text-mist-soft/50"
              style={{ paddingLeft: indent + 14 }}
            >
              Empty folder
            </div>
          )}
          {children?.map((child) => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} onChanged={refreshChildren} />
          ))}
        </div>
      )}

      {renaming && (
        <PromptModal
          title="Rename"
          label="Name"
          initialValue={node.name}
          onClose={() => setRenaming(false)}
          onConfirm={async (value) => {
            await renameNode(node.id, value);
            setRenaming(false);
            onChanged();
          }}
        />
      )}

      {creating && isFolder && (
        <PromptModal
          title={creating === 'file' ? 'New note' : 'New folder'}
          label="Name"
          confirmLabel="Create"
          onClose={() => setCreating(null)}
          onConfirm={async (value) => {
            await createNode({ type: creating, name: value, parentId: node.id });
            setCreating(null);
            setExpanded(true);
            await refreshChildren();
          }}
        />
      )}

      {moving && (
        <MoveNodeModal
          node={node}
          onClose={() => setMoving(false)}
          onMove={async (destinationId) => {
            await moveNode(node.id, destinationId);
            setMoving(false);
            onChanged();
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Move to trash"
          message={`"${node.name}" will move to trash and be permanently deleted after 30 days.`}
          confirmLabel="Move to trash"
          onClose={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await trashNode(node.id);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
