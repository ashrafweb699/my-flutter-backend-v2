const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload image and return URL
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // File was already saved by multer middleware
    // Just return the relative path without leading slash
    const relativePath = req.file.path.replace(/\\/g, '/').split('uploads/')[1];
    const imageUrl = relativePath; // Return just the relative path like "services/filename.png"
    
    res.status(201).json({ 
      success: true, 
      imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};
