import { z } from 'zod';

export const shareNodeBody = z.object({
  username: z.string().trim().min(1),
  role: z.enum(['viewer', 'editor', 'manager']),
});

export const setPublicBody = z.object({
  isPublic: z.boolean(),
});
