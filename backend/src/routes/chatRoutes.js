const express = require('express');
const router = express.Router();
const {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage
} = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);

router.get('/conversations', getUserConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', upload.single('file'), sendMessage);

module.exports = router;
