import { File, Folder, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';

export function FavoritesView() {
  const { items, loading } = useFavorites();

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
        icon={Star}
        title="No favorites yet"
        description="Star a note or folder to pin it here for quick access."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-3 font-serif text-lg font-semibold">Favorites</h1>
      <div className="space-y-1">
        {items.map((f) => (
          <Link
            key={f.nodeId}
            to={`/nodes/${f.nodeId}`}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper-surface dark:hover:bg-night-surface"
          >
            {f.node.type === 'folder' ? (
              <Folder size={15} className="text-pine-600 dark:text-pine-400" />
            ) : (
              <File size={15} className="text-ink-soft dark:text-mist-soft" />
            )}
            {f.node.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
