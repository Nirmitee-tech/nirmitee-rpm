import { Router, Request, Response, NextFunction } from 'express';
import { searchService } from '../../services/search-service';
import { authenticate } from '../../middleware/auth-middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/search?q=query - Global search
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, entityTypes, limit, offset } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await searchService.search(q, {
      organizationId: req.organizationId!,
      entityTypes: entityTypes ? (entityTypes as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/search/:entityType?q=query - Search specific entity type
router.get('/:entityType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType } = req.params;
    const { q, limit, offset } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await searchService.search(q, {
      organizationId: req.organizationId!,
      entityTypes: [entityType],
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

export { router as searchRouter };
