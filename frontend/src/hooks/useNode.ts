import { useCallback, useEffect, useState } from 'react';
import { getNode, listNodes } from '../lib/api';
import type { ApiNode, PermissionRole } from '../types/api';

interface NodeState {
  node: ApiNode | null;
  role: PermissionRole | null;
  children: ApiNode[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** Loads a node by id (or the workspace root when `nodeId` is null). */
export function useNode(nodeId: string | null): NodeState {
  const [node, setNode] = useState<ApiNode | null>(null);
  const [role, setRole] = useState<PermissionRole | null>(null);
  const [children, setChildren] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        if (nodeId) {
          const [{ node, role }, childList] = await Promise.all([
            getNode(nodeId),
            listNodes(nodeId).catch(() => ({ nodes: [] as ApiNode[] })),
          ]);
          if (cancelled) return;
          setNode(node);
          setRole(role);
          setChildren(node.type === 'folder' ? childList.nodes : []);
        } else {
          const { nodes } = await listNodes();
          if (cancelled) return;
          setNode(null);
          setRole('manager');
          setChildren(nodes);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Failed to load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [nodeId, version]);

  return { node, role, children, loading, error, reload };
}
