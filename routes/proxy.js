const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

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
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Fetch document from Cloudinary using native https
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://my-flutter-backend-v2-production.up.railway.app/',
      },
    }, (cloudinaryRes) => {
      
      if (cloudinaryRes.statusCode !== 200) {
        console.error('❌ Cloudinary error:', cloudinaryRes.statusCode);
        return res.status(cloudinaryRes.statusCode).json({
          error: 'Failed to fetch document from Cloudinary',
          statusCode: cloudinaryRes.statusCode,
        });
      }
      
      // Get content type from Cloudinary response
      const contentType = cloudinaryRes.headers['content-type'] || 'application/octet-stream';
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (cloudinaryRes.headers['content-length']) {
        res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
      }
      
      // Pipe the response directly
      cloudinaryRes.pipe(res);
      
      cloudinaryRes.on('end', () => {
        console.log('✅ Document proxied successfully:', filename);
      });
      
    }).on('error', (err) => {
      console.error('❌ Network error:', err.message);
      res.status(500).json({
        error: 'Failed to fetch document',
        details: err.message,
      });
    });
    
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
