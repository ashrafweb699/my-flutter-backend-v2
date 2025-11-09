const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Proxy endpoint to download documents from Cloudinary
 * Bypasses Cloudinary ACL restrictions by fetching server-side
 */
router.get('/document', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('📥 Proxying document download:', url);
    
    // Fetch document from Cloudinary
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000, // 30 second timeout
    });
    
    // Get content type from Cloudinary response
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', response.data.length);
    
    // Send file
    res.send(response.data);
    
    console.log('✅ Document proxied successfully:', filename);
    
  } catch (error) {
    console.error('❌ Error proxying document:', error.message);
    
    if (error.response) {
      // Cloudinary returned an error
      return res.status(error.response.status).json({
        error: 'Failed to fetch document from Cloudinary',
        details: error.message,
      });
    }
    
    // Network or other error
    res.status(500).json({
      error: 'Failed to proxy document',
      details: error.message,
    });
  }
});

module.exports = router;
