const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All chat routes require authentication
router.use(protect);

// Get all conversations for logged in user
router.get('/conversations', chatController.getConversations);

// Get admin user for starting chat
router.get('/admin', chatController.getAdminForChat);

// Get all users who have chatted with admin (admin only)
router.get('/admin/users', chatController.getAdminChatUsers);

// Get or create conversation with another user
router.get('/conversation/:otherUserId', chatController.getOrCreateConversation);

// Get messages in a conversation
router.get('/conversation/:conversationId/messages', chatController.getMessages);

// Send a message
router.post('/conversation/:conversationId/message', chatController.sendMessage);

// Mark messages as read
router.put('/conversation/:conversationId/read', chatController.markAsRead);

// Delete a conversation
router.delete('/conversation/:conversationId', chatController.deleteConversation);

module.exports = router;
