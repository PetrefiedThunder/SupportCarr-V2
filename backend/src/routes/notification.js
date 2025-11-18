import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.userId);
  res.json({ success: true, data: result });
}));

// Mark notification as read
router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.userId);
  res.json({ success: true, message: 'Marked as read' });
}));

// Mark all as read
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.userId);
  res.json({ success: true, message: 'All marked as read' });
}));

// Get unread count
router.get('/unread/count', authenticate, asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.userId);
  res.json({ success: true, data: { count } });
}));

export default router;
