import { useCallback, useEffect, useState } from 'react';
import { getSharedWithMe, getTrash, listFavorites } from '../lib/api';
import type { ApiNode, Favorite } from '../types/api';

function useReloadableList<T>(loader: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loader()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return { items, loading, error, reload };
}

export function useFavorites() {
  return useReloadableList<Favorite>(() => listFavorites().then((r) => r.favorites));
}

export function useSharedWithMe() {
  return useReloadableList<ApiNode>(() => getSharedWithMe().then((r) => r.nodes));
}

export function useTrash() {
  return useReloadableList<ApiNode>(() => getTrash().then((r) => r.nodes));
}
