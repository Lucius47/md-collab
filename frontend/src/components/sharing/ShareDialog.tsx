import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { listShareGrants, revokeShare, setPublic, shareNode } from '../../lib/api';
import { ApiError } from '../../lib/api';
import type { ApiNode, PermissionGrant, PermissionRole } from '../../types/api';
import { Avatar } from '../common/Avatar';

export function ShareDialog({ node, onClose }: { node: ApiNode; onClose: () => void }) {
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<PermissionRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublicState] = useState(node.isPublic);
  const [publicLinkId, setPublicLinkId] = useState(node.publicLinkId);
  const [copied, setCopied] = useState(false);

  const reload = () => listShareGrants(node.id).then((r) => setGrants(r.grants));

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [node.id]);

  const handleShare = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await shareNode(node.id, username.trim(), role);
      setUsername('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not share — try again');
    }
  };

  const togglePublic = async () => {
    const { node: updated } = await setPublic(node.id, !isPublic);
    setIsPublicState(updated.isPublic);
    setPublicLinkId(updated.publicLinkId);
  };

  const publicUrl = publicLinkId ? `${window.location.origin}/public/${publicLinkId}` : null;

  return (
    <Modal title={`Share "${node.name}"`} onClose={onClose}>
      <form onSubmit={handleShare} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="min-w-0 flex-1 rounded border border-paper-border bg-paper px-2.5 py-1.5 text-sm dark:border-night-border dark:bg-night"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as PermissionRole)}
          className="rounded border border-paper-border bg-paper px-2 py-1.5 text-sm dark:border-night-border dark:bg-night"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="manager">Manager</option>
        </select>
        <button
          type="submit"
          disabled={!username.trim()}
          className="rounded bg-pine-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pine-700 disabled:opacity-50 dark:bg-pine-500"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <div className="mt-3 max-h-48 overflow-y-auto">
        {loading && <p className="py-2 text-sm text-ink-soft dark:text-mist-soft">Loading…</p>}
        {!loading && grants.length === 0 && (
          <p className="py-2 text-sm italic text-ink-soft/60 dark:text-mist-soft/60">
            Not shared with anyone yet — inherited access from a parent folder still applies.
          </p>
        )}
        {grants.map((g) => (
          <div key={g.userId} className="flex items-center gap-2 py-1.5">
            <Avatar userId={g.user.id} username={g.user.username} size={22} />
            <span className="flex-1 truncate text-sm">{g.user.username}</span>
            <span className="text-xs capitalize text-ink-soft dark:text-mist-soft">{g.role}</span>
            <button
              onClick={async () => {
                await revokeShare(node.id, g.userId);
                await reload();
              }}
              title="Remove access"
              className="rounded p-1 text-ink-soft hover:bg-paper-surface hover:text-red-600 dark:text-mist-soft dark:hover:bg-night"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-paper-border pt-3 dark:border-night-border">
        <label className="flex items-center justify-between">
          <span className="text-sm">Public read-only link</span>
          <button
            role="switch"
            aria-checked={isPublic}
            onClick={togglePublic}
            className={`h-5 w-9 rounded-full transition-colors ${isPublic ? 'bg-pine-600 dark:bg-pine-500' : 'bg-paper-border dark:bg-night-border'}`}
          >
            <span
              className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-4' : ''}`}
            />
          </button>
        </label>
        {isPublic && publicUrl && (
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 truncate rounded border border-paper-border bg-paper-surface px-2 py-1 text-xs dark:border-night-border dark:bg-night"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night"
            >
              {copied ? <Check size={14} className="text-pine-600 dark:text-pine-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
