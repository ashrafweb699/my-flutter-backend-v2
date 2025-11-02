const { pool } = require('../config/db');

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM advertisements 
      WHERE active = 1
      ORDER BY created_at DESC
    `);
    
    // Format the response
    const advertisements = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl ? `${req.protocol}://${req.get('host')}/uploads/${row.imageUrl}` : null,
      link: row.link,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
};

// Get advertisement by ID
exports.getAdvertisementById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM advertisements WHERE id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    const advertisement = rows[0];
    res.json({
      id: advertisement.id,
      title: advertisement.title,
      description: advertisement.description,
      imageUrl: advertisement.imageUrl ? `${req.protocol}://${req.get('host')}/uploads/${advertisement.imageUrl}` : null,
      link: advertisement.link,
      createdAt: advertisement.created_at,
      updatedAt: advertisement.updated_at
    });
  } catch (error) {
    console.error('Error fetching advertisement:', error);
    res.status(500).json({ error: 'Failed to fetch advertisement' });
  }
};

// Create a new advertisement
exports.createAdvertisement = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Get the image URL from the uploaded file (if any)
    const imageUrl = req.file ? req.file.filename : null;
    
    const [result] = await pool.query(`
      INSERT INTO advertisements (title, description, imageUrl, link) 
      VALUES (?, ?, ?, ?)
    `, [title, description || null, imageUrl, link || null]);
    
    res.status(201).json({
      id: result.insertId,
      title,
      description,
      imageUrl: imageUrl ? `${req.protocol}://${req.get('host')}/uploads/${imageUrl}` : null,
      link
    });
  } catch (error) {
    console.error('Error creating advertisement:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
};

// Update an advertisement
exports.updateAdvertisement = async (req, res) => {
  try {
    const { title, description, link, imageUrl } = req.body;
    const advertisementId = req.params.id;
    
    // Check if the advertisement exists
    const [checkRows] = await pool.query('SELECT * FROM advertisements WHERE id = ?', [advertisementId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    const existingAdvertisement = checkRows[0];
    
    // Handle image - prioritize uploaded file, then imageUrl from body, then existing image
    let finalImageUrl = existingAdvertisement.imageUrl;
    
    if (req.file) {
      // If a new file was uploaded
      finalImageUrl = req.file.filename;
      console.log('Using newly uploaded file:', finalImageUrl);
    } else if (imageUrl && imageUrl !== existingAdvertisement.imageUrl && imageUrl.trim() !== '') {
      // If imageUrl was provided and is different from existing
      // Check if it's a full URL or just a filename
      if (imageUrl.includes('/uploads/')) {
        // Extract just the filename if it's a full URL
        const urlParts = imageUrl.split('/uploads/');
        finalImageUrl = urlParts[urlParts.length - 1];
      } else if (imageUrl.includes('://')) {
        // Extract just the filename if it's a full URL
        const urlParts = imageUrl.split('/');
        finalImageUrl = urlParts[urlParts.length - 1];
      } else {
        finalImageUrl = imageUrl;
      }
      console.log('Using imageUrl from request:', finalImageUrl);
    }
    
    // Update the advertisement
    await pool.query(`
      UPDATE advertisements 
      SET title = ?, description = ?, imageUrl = ?, link = ?, updated_at = NOW() 
      WHERE id = ?
    `, [
      title || existingAdvertisement.title,
      description !== undefined ? description : existingAdvertisement.description,
      finalImageUrl,
      link !== undefined ? link : existingAdvertisement.link,
      advertisementId
    ]);
    
    res.json({
      id: advertisementId,
      title: title || existingAdvertisement.title,
      description: description !== undefined ? description : existingAdvertisement.description,
      imageUrl: finalImageUrl ? `${req.protocol}://${req.get('host')}/uploads/${finalImageUrl}` : null,
      link: link !== undefined ? link : existingAdvertisement.link,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating advertisement:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
};

// Delete an advertisement
exports.deleteAdvertisement = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    
    // Check if the advertisement exists
    const [checkRows] = await pool.query('SELECT * FROM advertisements WHERE id = ?', [advertisementId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    // Soft delete by setting active to 0
    await pool.query('UPDATE advertisements SET active = 0, updated_at = NOW() WHERE id = ?', [advertisementId]);
    
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
}; 