const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  notificationIdParamSchema,
  getNotificationsQuerySchema
} = require('../validators/notificationSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);

router.get('/', validate({ query: getNotificationsQuerySchema }), getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validate({ params: notificationIdParamSchema }), markAsRead);
router.delete('/:id', validate({ params: notificationIdParamSchema }), deleteNotification);

module.exports = router;
