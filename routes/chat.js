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
const videoDir = path.join(chatUploadsDir, 'videos');
const documentDir = path.join(chatUploadsDir, 'documents');

[chatUploadsDir, imageDir, audioDir, videoDir, documentDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage for chat
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'image';
    let uploadPath = imageDir;
    
    if (fileType === 'audio') uploadPath = audioDir;
    else if (fileType === 'video') uploadPath = videoDir;
    else if (fileType === 'document') uploadPath = documentDir;
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileType = req.body.fileType || 'image';
    const extension = path.extname(file.originalname);
    const filename = `${fileType}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// File filter for all media types
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
  } else if (fileType === 'video') {
    const videoTypes = /mp4|mov|avi|mkv|webm|3gp/;
    const extname = videoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files (mp4, mov, avi, mkv, webm, 3gp) are allowed'));
    }
  } else if (fileType === 'document') {
    const documentTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|apk|zip/;
    const extname = documentTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, apk, zip) are allowed'));
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
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos and documents
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

// Clear all messages in a conversation
router.delete('/conversation/:conversationId/messages', chatController.clearAllMessages);

// Delete a single message
router.delete('/message/:messageId', chatController.deleteMessage);

module.exports = router;
