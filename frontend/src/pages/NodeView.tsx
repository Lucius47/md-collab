import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, File as FileIcon, Folder, FolderOpen, Plus } from 'lucide-react';
import { useNode } from '../hooks/useNode';
import { useCollabDoc } from '../hooks/useCollabDoc';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { SplitEditor } from '../components/editor/SplitEditor';
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { createNode, downloadZipUrl, ApiError } from '../lib/api';
import { PromptModal } from '../components/common/PromptModal';

export function NodeView() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { node, role, children, loading, error, reload } = useNode(nodeId ?? null);
  const { items: favorites, reload: reloadFavorites } = useFavorites();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);

  const isFile = node?.type === 'file';
  const collab = useCollabDoc(isFile && node ? node.id : null, user);
  const isFavorite = !!node && favorites.some((f) => f.nodeId === node.id);

  const handleChanged = () => {
    reload();
    reloadFavorites();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    const forbidden = error instanceof ApiError && error.status === 403;
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState
        icon={FileIcon}
        title={forbidden ? "You don't have access" : notFound ? 'Not found' : "Couldn't open that"}
        description={
          forbidden
            ? 'Ask the owner to share this note or folder with you.'
            : notFound
              ? 'This may have moved to trash or been deleted.'
              : error.message
        }
      />
    );
  }

  // Folder view — including the workspace root, where node is null.
  if (!node || node.type === 'folder') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-paper-border px-4 py-3 dark:border-night-border">
          <h1 className="truncate font-serif text-lg font-semibold">{node ? node.name : 'Workspace'}</h1>
          <div className="flex shrink-0 gap-1.5">
            {node && (
              <a
                href={downloadZipUrl(node.id)}
                title="Download as .zip"
                className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
              >
                <Download size={16} />
              </a>
            )}
            <button
              onClick={() => setCreating('file')}
              className="flex items-center gap-1 rounded border border-paper-border px-2.5 py-1.5 text-xs font-medium hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
            >
              <Plus size={13} /> Note
            </button>
            <button
              onClick={() => setCreating('folder')}
              className="flex items-center gap-1 rounded border border-paper-border px-2.5 py-1.5 text-xs font-medium hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
            >
              <Plus size={13} /> Folder
            </button>
          </div>
        </div>

        {children.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="This folder is empty"
            description="Create a note or a subfolder to get started."
          />
        ) : (
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
            {children.map((child) => (
              <Link
                key={child.id}
                to={`/nodes/${child.id}`}
                className="flex flex-col items-start gap-2 rounded border border-paper-border p-3 hover:border-pine-400 hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
              >
                {child.type === 'folder' ? (
                  <Folder size={20} className="text-pine-600 dark:text-pine-400" />
                ) : (
                  <FileIcon size={20} className="text-ink-soft dark:text-mist-soft" />
                )}
                <span className="w-full truncate text-sm">{child.name}</span>
              </Link>
            ))}
          </div>
        )}

        {creating && (
          <PromptModal
            title={creating === 'file' ? 'New note' : 'New folder'}
            label="Name"
            confirmLabel="Create"
            onClose={() => setCreating(null)}
            onConfirm={async (value) => {
              await createNode({ type: creating, name: value, parentId: node?.id ?? null });
              setCreating(null);
              reload();
            }}
          />
        )}
      </div>
    );
  }

  // File view — the collaborative editor.
  if (!collab || !role) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorToolbar
        node={node}
        role={role}
        peers={collab.peers}
        status={collab.status}
        offlineReady={collab.offlineReady}
        isFavorite={isFavorite}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        onChanged={handleChanged}
        onDeleted={() => navigate('/')}
      />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <SplitEditor ytext={collab.ytext} awareness={collab.provider.awareness} editable={role !== 'viewer'} />
        </div>
        {historyOpen && (
          <VersionHistoryPanel nodeId={node.id} ytext={collab.ytext} onClose={() => setHistoryOpen(false)} />
        )}
      </div>
    </div>
  );
}
