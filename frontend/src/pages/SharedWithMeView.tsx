import { File, Folder, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSharedWithMe } from '../hooks/useFavorites';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';

export function SharedWithMeView() {
  const { items, loading } = useSharedWithMe();

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
        icon={Users}
        title="Nothing shared with you yet"
        description="Notes and folders other people share with you will show up here."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-3 font-serif text-lg font-semibold">Shared with me</h1>
      <div className="space-y-1">
        {items.map((n) => (
          <Link
            key={n.id}
            to={`/nodes/${n.id}`}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper-surface dark:hover:bg-night-surface"
          >
            {n.type === 'folder' ? (
              <Folder size={15} className="text-pine-600 dark:text-pine-400" />
            ) : (
              <File size={15} className="text-ink-soft dark:text-mist-soft" />
            )}
            {n.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
