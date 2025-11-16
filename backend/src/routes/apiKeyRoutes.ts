import express from 'express';
import { getApiKey, regenerateApiKey } from '../controllers/apiKeyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/apikey
 * @desc    Get user's primary API key
 * @access  Private
 */
router.get('/', authenticate, getApiKey);

/**
 * @route   POST /api/apikey/regenerate
 * @desc    Regenerate user's primary API key
 * @access  Private
 */
router.post('/regenerate', authenticate, regenerateApiKey);

export default router;
