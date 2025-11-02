const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the folder specified in the request to create subfolders
    let uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // If targetFolder is specified, use it (supports nested subfolders like "drivers/123456/profile.jpg")
    if (req.body && req.body.targetFolder) {
      // Remove any file component and extract just the folder path
      const folderPath = path.dirname(req.body.targetFolder);
      uploadDir = path.join(uploadDir, folderPath);
    }
    // Otherwise use the regular folder parameter
    else if (req.body && req.body.folder) {
      uploadDir = path.join(uploadDir, req.body.folder);
    }
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    console.log(`Destination folder: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let finalFilename;
    
    // If targetFolder is specified, extract the filename from it
    if (req.body && req.body.targetFolder) {
      const targetFilename = path.basename(req.body.targetFolder);
      if (targetFilename) {
        // Keep the original target filename but add timestamp prefix for uniqueness
        finalFilename = `${Date.now()}-${targetFilename}`;
      } else {
        // Fallback to unique name with original extension
        finalFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      }
    } else {
      // Default behavior - unique name with original extension
      finalFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    }
    
    console.log(`Generated filename: ${finalFilename}`);
    console.log(`Original filename: ${file.originalname}`);
    cb(null, finalFilename);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  console.log(`Filtering file: ${file.originalname}, mimetype: ${file.mimetype}`);
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  // Check extension and mimetype
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Accept valid image extensions even if mimetype is octet-stream (fix for mobile app uploads)
  if (extname && (allowedTypes.test(file.mimetype) || file.mimetype === 'application/octet-stream')) {
    console.log(`File accepted: ${file.originalname}`);
    return cb(null, true);
  } else {
    console.log(`File rejected: ${file.originalname}, invalid type or extension`);
    console.log(`Extension valid: ${extname}, Mimetype: ${file.mimetype}`);
    return cb(new Error('Only image files are allowed!'), false);
  }
};

// Create the multer upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: fileFilter
});

module.exports = upload; 