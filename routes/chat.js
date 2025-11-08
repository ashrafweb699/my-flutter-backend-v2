const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { uploadChat } = require('../config/cloudinary');

// All chat routes require authentication
router.use(protect);

// Upload chat media (images and audio)
router.post('/upload', uploadChat.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Cloudinary returns the full URL in req.file.path
    const fileUrl = req.file.path;
    
    console.log('✅ File uploaded to Cloudinary:', fileUrl);
    
    res.status(200).json({
      success: true,
      fileUrl: fileUrl,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

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

// Clear all messages in a conversation
router.delete('/conversation/:conversationId/messages', chatController.clearAllMessages);

// Delete a single message
router.delete('/message/:messageId', chatController.deleteMessage);

// Edit a message
router.put('/message/:messageId', chatController.editMessage);

module.exports = router;
