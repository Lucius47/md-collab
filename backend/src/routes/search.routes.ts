import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { searchQuery } from '../validators/nodes.validators';
import { searchNodes } from '../services/search.service';

export const searchRouter = Router();
searchRouter.use(authenticate);

searchRouter.get(
  '/',
  validate({ query: searchQuery }),
  asyncHandler(async (req, res) => {
    const { q } = req.query as unknown as { q: string };
    const results = await searchNodes(req.user!.id, q);
    res.json({ results });
  })
);
