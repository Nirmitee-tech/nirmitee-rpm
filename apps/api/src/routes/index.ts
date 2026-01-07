import { Router } from 'express';
import v1Routes from './v1';

const router = Router();

// Mount versioned routes
router.use('/v1', v1Routes);

// Default to v1 for backwards compatibility
router.use('/', v1Routes);

export default router;
