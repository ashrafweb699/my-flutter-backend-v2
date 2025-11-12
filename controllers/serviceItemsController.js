const { pool } = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { 
      service_name, service_id, sub_item_name, description, image_url, 
      price, unit, min_quantity,
      available_time, rating, available_24_hours 
    } = req.body;
    
    // Resolve service name from ID if provided
    let finalServiceName = service_name;
    if (!finalServiceName && service_id) {
      const [s] = await pool.query('SELECT service_name FROM services WHERE id = ?', [service_id]);
      if (s.length) {
        finalServiceName = s[0].service_name;
      }
    }

    if (!finalServiceName || !sub_item_name) {
      return res.status(400).json({ message: 'Missing required fields' });
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
       (service_name, sub_item_name, description, image_url, price, unit, min_quantity, available_time, rating, available_24_hours)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        finalServiceName, 
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
    const { service_name, service_id } = req.query;
    let finalServiceName = service_name;
    if (service_id) {
      const [s] = await pool.query('SELECT service_name FROM services WHERE id = ?', [service_id]);
      if (s.length) finalServiceName = s[0].service_name;
    }

    // If no filter provided, return all
    if (!finalServiceName) {
      const [allRows] = await pool.query(`SELECT * FROM service_items ORDER BY id DESC`);
      return res.json({ items: allRows });
    }

    // 1) Exact match with TRIM/LOWER
    const name = String(finalServiceName).trim();
    const [rowsExact] = await pool.query(
      `SELECT * FROM service_items WHERE LOWER(TRIM(service_name)) = LOWER(TRIM(?)) ORDER BY id DESC`,
      [name]
    );
    if (rowsExact.length) return res.json({ items: rowsExact });

    // 2) Try plural/singular alternatives
    const lower = name.toLowerCase();
    const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
    const plural = lower.endsWith('s') ? lower : `${lower}s`;
    const [rowsAlt] = await pool.query(
      `SELECT * FROM service_items WHERE LOWER(TRIM(service_name)) IN (?, ?) ORDER BY id DESC`,
      [singular, plural]
    );
    if (rowsAlt.length) return res.json({ items: rowsAlt });

    // 3) LIKE-based token search (handles names like "Fresh Vegetables & Fruits")
    const tokens = lower
      .split(/\s*&\s*|\s+and\s+|\s*,\s*|\s+/)
      .filter(t => t && t.length >= 3);
    if (tokens.length) {
      const likeClauses = tokens.map(() => 'LOWER(service_name) LIKE ?').join(' OR ');
      const likeParams = tokens.map(t => `%${t}%`);
      const [rowsLike] = await pool.query(
        `SELECT * FROM service_items WHERE ${likeClauses} ORDER BY id DESC`,
        likeParams
      );
      if (rowsLike.length) return res.json({ items: rowsLike });
    }

    // Nothing found
    return res.json({ items: [] });
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
      service_name, service_id, sub_item_name, description, image_url, 
      price, unit, min_quantity,
      available_time, rating, available_24_hours 
    } = req.body;
    
    // Resolve service name if only ID provided
    let finalServiceName = service_name;
    if (!finalServiceName && service_id) {
      const [s] = await pool.query('SELECT service_name FROM services WHERE id = ?', [service_id]);
      if (s.length) finalServiceName = s[0].service_name;
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
       SET service_name=?, sub_item_name=?, description=?, image_url=?, price=?, unit=?, min_quantity=?,
           available_time=?, rating=?, available_24_hours=?
       WHERE id=?`,
      [
        finalServiceName, 
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


