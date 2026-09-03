import { useState } from 'react';
import { Download, History, MoreHorizontal, Pencil, Share2, Star, Trash2 } from 'lucide-react';
import type { ApiNode, PermissionRole } from '../../types/api';
import type { CollabPeer, CollabStatus } from '../../hooks/useCollabDoc';
import { PresenceBar } from './PresenceBar';
import { addFavorite, downloadUrl, removeFavorite, renameNode, trashNode } from '../../lib/api';
import { PromptModal } from '../common/PromptModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ShareDialog } from '../sharing/ShareDialog';

interface EditorToolbarProps {
  node: ApiNode;
  role: PermissionRole;
  peers: CollabPeer[];
  status: CollabStatus;
  offlineReady: boolean;
  isFavorite: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}

export function EditorToolbar({
  node,
  role,
  peers,
  status,
  offlineReady,
  isFavorite,
  historyOpen,
  onToggleHistory,
  onChanged,
  onDeleted,
}: EditorToolbarProps) {
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = role === 'manager';
  const canEdit = role === 'editor' || role === 'manager';

  return (
    <div className="flex items-center justify-between gap-2 border-b border-paper-border px-3 py-2 dark:border-night-border">
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="truncate font-serif text-base font-semibold">{node.name}</h1>
        {canEdit && (
          <button
            onClick={() => setRenaming(true)}
            title="Rename"
            className="shrink-0 rounded p-1 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <PresenceBar peers={peers} status={status} offlineReady={offlineReady} />

        <button
          onClick={async () => {
            if (isFavorite) await removeFavorite(node.id);
            else await addFavorite(node.id);
            onChanged();
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`rounded p-1.5 ${
            isFavorite
              ? 'text-amber-500'
              : 'text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface'
          }`}
        >
          <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={onToggleHistory}
          title="Version history"
          className={`rounded p-1.5 ${
            historyOpen
              ? 'bg-pine-50 text-pine-700 dark:bg-pine-700/20 dark:text-pine-300'
              : 'text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface'
          }`}
        >
          <History size={16} />
        </button>

        <a
          href={downloadUrl(node.id)}
          title="Download .md"
          className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
        >
          <Download size={16} />
        </a>

        {canManage && (
          <button
            onClick={() => setSharing(true)}
            className="flex items-center gap-1 rounded bg-pine-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-pine-700 dark:bg-pine-500"
          >
            <Share2 size={13} /> Share
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded border border-paper-border bg-paper py-1 shadow-lg dark:border-night-border dark:bg-night-surface">
                <button
                  onClick={() => {
                    setConfirmingDelete(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-paper-surface dark:hover:bg-night"
                >
                  <Trash2 size={14} /> Move to trash
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
      {sharing && <ShareDialog node={node} onClose={() => setSharing(false)} />}
      {confirmingDelete && (
        <ConfirmDialog
          title="Move to trash"
          message={`"${node.name}" will move to trash and be permanently deleted after 30 days.`}
          confirmLabel="Move to trash"
          onClose={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await trashNode(node.id);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
