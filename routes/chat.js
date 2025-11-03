const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Create upload directories for chat media
const chatUploadsDir = path.join(__dirname, '../uploads/chat');
const imageDir = path.join(chatUploadsDir, 'images');
const audioDir = path.join(chatUploadsDir, 'audio');

[chatUploadsDir, imageDir, audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage for chat
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'image';
    const uploadPath = fileType === 'audio' ? audioDir : imageDir;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileType = req.body.fileType || 'image';
    const extension = path.extname(file.originalname);
    const filename = `${fileType}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// File filter for images and audio
const chatFileFilter = (req, file, cb) => {
  const fileType = req.body.fileType;
  
  if (fileType === 'image') {
    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = imageTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  } else if (fileType === 'audio') {
    const audioTypes = /mp3|m4a|aac|wav|ogg/;
    const extname = audioTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files (mp3, m4a, aac, wav, ogg) are allowed'));
    }
  } else {
    cb(new Error('Invalid file type'));
  }
};

// Configure multer
const chatUpload = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All chat routes require authentication
router.use(protect);

// Upload chat media (images and audio)
router.post('/upload', chatUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return relative path from uploads directory
    const relativePath = req.file.path.replace(/\\/g, '/').split('uploads/')[1];
    const fileUrl = `uploads/${relativePath}`;
    
    console.log('✅ File uploaded:', fileUrl);
    
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

module.exports = router;
