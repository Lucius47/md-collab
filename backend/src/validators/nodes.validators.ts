import { z } from 'zod';

export const createNodeBody = z.object({
  type: z.enum(['file', 'folder']),
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().nullable().default(null),
});

export const updateNodeBody = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    content: z.string().max(5_000_000).optional(),
  })
  .refine((data) => data.name !== undefined || data.content !== undefined, {
    message: 'Provide at least one of name or content',
  });

export const moveNodeBody = z.object({
  parentId: z.string().uuid().nullable(),
});

export const listNodesQuery = z.object({
  parentId: z.string().uuid().optional(),
});

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(200),
});
