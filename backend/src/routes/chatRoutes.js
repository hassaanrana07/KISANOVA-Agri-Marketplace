const express = require('express');
const router = express.Router();
const {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage
} = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');
const { upload, validateUploadedFiles } = require('../middleware/upload');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema
} = require('../validators/chatSchemas');

router.use(requireAuth);
router.use(authenticatedLimiter);

router.get('/conversations', getUserConversations);
router.post('/conversations', validate({ body: createConversationSchema }), getOrCreateConversation);
router.get('/conversations/:conversationId/messages', validate({ params: conversationIdParamSchema }), getMessages);
router.post('/conversations/:conversationId/messages', upload.single('file'), validateUploadedFiles, validate({ params: conversationIdParamSchema, body: sendMessageSchema }), sendMessage);

module.exports = router;
