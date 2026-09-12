import { prisma } from '../db/prisma';

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  ownerId: string;
  snippet: string;
  rank: number;
}

/**
 * Full-text search over nodes.content, restricted to what the user can see:
 * nodes they own, nodes explicitly shared with them, and anything nested
 * under one of those (permission inheritance means access to a folder
 * implies access to everything inside it).
 *
 * The "visible" CTE expands from directly-visible roots down through all
 * descendants in one query, then the final SELECT filters by tsvector match
 * against just that visible set. $queryRaw's tagged-template form
 * parameterizes every interpolated value, so the user's search string can
 * never break out into raw SQL.
 */
export async function searchNodes(userId: string, query: string): Promise<SearchResult[]> {
  return prisma.$queryRaw<SearchResult[]>`
    WITH RECURSIVE visible_roots AS (
      SELECT id FROM nodes WHERE owner_id = ${userId}::uuid AND deleted_at IS NULL
      UNION
      SELECT node_id FROM permissions WHERE user_id = ${userId}::uuid
    ),
    visible AS (
      SELECT id FROM visible_roots
      UNION
      SELECT n.id FROM nodes n
      INNER JOIN visible v ON n.parent_id = v.id
      WHERE n.deleted_at IS NULL
    )
    SELECT
      n.id,
      n.name,
      n.type,
      n.parent_id AS "parentId",
      n.owner_id AS "ownerId",
      ts_headline('english', coalesce(n.content, ''), plainto_tsquery('english', ${query}), 'MaxFragments=1,MaxWords=20') AS snippet,
      ts_rank(n.search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM nodes n
    WHERE n.id IN (SELECT id FROM visible)
      AND n.deleted_at IS NULL
      AND n.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT 50;
  `;
}
