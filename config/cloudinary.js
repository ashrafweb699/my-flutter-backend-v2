const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage configuration for services
const servicesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gwadar-services',
    // Include gif so admin can upload animated/service GIFs
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  },
});

// Storage configuration for profiles
const profilesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gwadar-profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  },
});

// Storage configuration for chat images
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gwadar-chat',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  },
});

// Storage configuration for chat documents (PDFs, DOCs, etc.)
const chatDocumentsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat/documents',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
    resource_type: 'raw', // Important for non-image files
    access_mode: 'public', // Make documents publicly accessible
  },
});

// Storage configuration for products
const productsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gwadar-products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  },
});

// Storage configuration for advertisements
const advertisementsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gwadar-advertisements',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 600, crop: 'limit' }]
  },
});

// Create multer upload instances
const uploadService = multer({ storage: servicesStorage });
const uploadProfile = multer({ storage: profilesStorage });
const uploadChat = multer({ storage: chatStorage });
const uploadChatDocument = multer({ storage: chatDocumentsStorage });
const uploadProduct = multer({ storage: productsStorage });
const uploadAdvertisement = multer({ storage: advertisementsStorage });

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Image deleted from Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      // Get folder/filename without extension
      const pathParts = parts.slice(uploadIndex + 2);
      const fullPath = pathParts.join('/');
      // Remove file extension
      return fullPath.replace(/\.[^/.]+$/, '');
    }
    return null;
  } catch (error) {
    console.error('❌ Error extracting public_id:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadService,
  uploadProfile,
  uploadChat,
  uploadChatDocument,
  uploadProduct,
  uploadAdvertisement,
  deleteImage,
  getPublicIdFromUrl
};
