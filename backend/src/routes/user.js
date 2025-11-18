import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// User routes
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Get user by ID' });
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Update user' });
}));

export default router;
