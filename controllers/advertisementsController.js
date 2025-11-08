const { pool } = require('../config/db');

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM advertisements 
      ORDER BY created_at DESC
    `);
    
    // Format the response
    const advertisements = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl || null,
      link: row.link,
      isActive: row.active === 1,
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
      imageUrl: advertisement.imageUrl || null,
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
    const { title, description, link, isActive } = req.body;
    
    console.log('📢 Creating advertisement:', { title, description, link, isActive, hasFile: !!req.file });
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Get the image URL from Cloudinary (if any)
    const imageUrl = req.file ? req.file.path : null;
    
    // Parse isActive (comes as string from multipart form)
    const active = isActive === '1' || isActive === 'true' || isActive === true ? 1 : 0;
    
    const [result] = await pool.query(`
      INSERT INTO advertisements (title, description, imageUrl, link, active) 
      VALUES (?, ?, ?, ?, ?)
    `, [title, description || null, imageUrl, link || null, active]);
    
    console.log('✅ Advertisement created with ID:', result.insertId);
    
    res.status(201).json({
      id: result.insertId,
      title,
      description,
      imageUrl: imageUrl || null,
      link,
      isActive: active === 1
    });
  } catch (error) {
    console.error('❌ Error creating advertisement:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
};

// Update an advertisement
exports.updateAdvertisement = async (req, res) => {
  try {
    const { title, description, link, imageUrl, isActive } = req.body;
    const advertisementId = req.params.id;
    
    console.log('📝 Updating advertisement:', { id: advertisementId, title, description, link, isActive, hasFile: !!req.file });
    
    // Check if the advertisement exists
    const [checkRows] = await pool.query('SELECT * FROM advertisements WHERE id = ?', [advertisementId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    const existingAdvertisement = checkRows[0];
    
    // Handle image - prioritize uploaded file, then imageUrl from body, then existing image
    let finalImageUrl = existingAdvertisement.imageUrl;
    
    if (req.file) {
      // If a new file was uploaded to Cloudinary
      finalImageUrl = req.file.path;
      console.log('Using newly uploaded Cloudinary URL:', finalImageUrl);
    } else if (imageUrl && imageUrl !== existingAdvertisement.imageUrl && imageUrl.trim() !== '') {
      // If imageUrl was provided and is different from existing
      finalImageUrl = imageUrl;
      console.log('Using imageUrl from request:', finalImageUrl);
    }
    
    // Parse isActive (comes as string from multipart form)
    const active = isActive !== undefined 
      ? (isActive === '1' || isActive === 'true' || isActive === true ? 1 : 0)
      : existingAdvertisement.active;
    
    // Update the advertisement
    await pool.query(`
      UPDATE advertisements 
      SET title = ?, description = ?, imageUrl = ?, link = ?, active = ?, updated_at = NOW() 
      WHERE id = ?
    `, [
      title || existingAdvertisement.title,
      description !== undefined ? description : existingAdvertisement.description,
      finalImageUrl,
      link !== undefined ? link : existingAdvertisement.link,
      active,
      advertisementId
    ]);
    
    console.log('✅ Advertisement updated successfully');
    
    res.json({
      id: advertisementId,
      title: title || existingAdvertisement.title,
      description: description !== undefined ? description : existingAdvertisement.description,
      imageUrl: finalImageUrl || null,
      link: link !== undefined ? link : existingAdvertisement.link,
      isActive: active === 1,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('❌ Error updating advertisement:', error);
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