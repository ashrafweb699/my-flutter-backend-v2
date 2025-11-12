const { pool } = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { 
      service_id, service_name, sub_item_name, description, image_url, 
      price, unit, min_quantity,
      available_time, rating, available_24_hours 
    } = req.body;
    
    // Prefer service_id, but fallback to service_name for backward compatibility
    let finalServiceId = service_id;
    if (!finalServiceId && service_name) {
      // Find service_id from service_name
      const [services] = await pool.query('SELECT id FROM services WHERE service_name = ? LIMIT 1', [service_name]);
      if (services.length > 0) {
        finalServiceId = services[0].id;
      }
    }
    
    if (!finalServiceId || !sub_item_name) {
      return res.status(400).json({ message: 'Missing required fields (service_id or service_name, and sub_item_name)' });
    }
    
    // Handle image upload
    let finalImageUrl = image_url || '';
    if (req.file) {
      // If file was uploaded through multer
      finalImageUrl = `uploads/services/${req.file.filename}`;
      console.log('✅ Service item image uploaded:', finalImageUrl);
    } else if (image_url) {
      console.log('📝 Using provided image URL:', image_url);
    }
    
    const [r] = await pool.query(
      `INSERT INTO service_items 
       (service_id, service_name, sub_item_name, description, image_url, price, unit, min_quantity, available_time, rating, available_24_hours)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        finalServiceId,
        service_name || null, // Keep for backward compatibility
        sub_item_name, 
        description || '', 
        finalImageUrl, 
        price || 0, 
        unit || '', 
        min_quantity || 0,
        available_time || null,
        rating || null,
        available_24_hours || 0
      ]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('serviceItems.create error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const { service_id, service_name } = req.query;
    
    let q, params;
    if (service_id) {
      // Filter by service_id (preferred)
      q = `SELECT si.*, s.service_name 
           FROM service_items si 
           LEFT JOIN services s ON si.service_id = s.id 
           WHERE si.service_id = ? 
           ORDER BY si.id DESC`;
      params = [service_id];
    } else if (service_name) {
      // Filter by service_name (backward compatibility)
      q = `SELECT si.*, s.service_name 
           FROM service_items si 
           LEFT JOIN services s ON si.service_id = s.id 
           WHERE s.service_name = ? 
           ORDER BY si.id DESC`;
      params = [service_name];
    } else {
      // Get all items
      q = `SELECT si.*, s.service_name 
           FROM service_items si 
           LEFT JOIN services s ON si.service_id = s.id 
           ORDER BY si.id DESC`;
      params = [];
    }
    
    const [rows] = await pool.query(q, params);
    res.json({ items: rows });
  } catch (e) {
    console.error('serviceItems.list error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM service_items WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('serviceItems.getOne error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { 
      service_id, service_name, sub_item_name, description, image_url, 
      price, unit, min_quantity,
      available_time, rating, available_24_hours 
    } = req.body;
    
    // Prefer service_id, but fallback to service_name for backward compatibility
    let finalServiceId = service_id;
    if (!finalServiceId && service_name) {
      // Find service_id from service_name
      const [services] = await pool.query('SELECT id FROM services WHERE service_name = ? LIMIT 1', [service_name]);
      if (services.length > 0) {
        finalServiceId = services[0].id;
      }
    }
    
    // Handle image upload
    let finalImageUrl = image_url || '';
    if (req.file) {
      // If new file was uploaded through multer
      finalImageUrl = `uploads/services/${req.file.filename}`;
      console.log('✅ Service item image updated:', finalImageUrl);
    } else if (image_url) {
      // Keep existing image URL
      finalImageUrl = image_url;
      console.log('📝 Keeping existing image URL:', image_url);
    } else {
      // No image provided, fetch existing one
      const [existing] = await pool.query('SELECT image_url FROM service_items WHERE id = ?', [req.params.id]);
      if (existing.length > 0) {
        finalImageUrl = existing[0].image_url || '';
        console.log('📝 Keeping existing image from DB:', finalImageUrl);
      }
    }
    
    await pool.query(
      `UPDATE service_items 
       SET service_id=?, service_name=?, sub_item_name=?, description=?, image_url=?, price=?, unit=?, min_quantity=?,
           available_time=?, rating=?, available_24_hours=?
       WHERE id=?`,
      [
        finalServiceId,
        service_name || null, // Keep for backward compatibility
        sub_item_name, 
        description || '', 
        finalImageUrl, 
        price || 0, 
        unit || '', 
        min_quantity || 0,
        available_time || null,
        rating || null,
        available_24_hours || 0,
        req.params.id
      ]
    );
    res.json({ updated: true });
  } catch (e) {
    console.error('serviceItems.update error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query(`DELETE FROM service_items WHERE id = ?`, [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('serviceItems.remove error', e);
    res.status(500).json({ message: 'Server error' });
  }
};


