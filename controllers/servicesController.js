const { pool } = require('../config/db');

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    // Check if request is from admin (show all) or user (show only active)
    const isAdmin = req.query.admin === 'true';
    
    const query = isAdmin 
      ? `SELECT * FROM services ORDER BY display_order ASC, created_at DESC`
      : `SELECT * FROM services WHERE active = 1 ORDER BY display_order ASC, created_at DESC`;
    
    const [rows] = await pool.query(query);
    
    // Format the response
    const services = rows.map(row => {
      // Create a proper image URL if image exists
      let imageUrl = null;
      if (row.image) {
        console.log(`Processing service ${row.id} (${row.service_name}): raw image path = "${row.image}"`);
        
        // Make sure we're not adding /uploads/ to a path that already has it
        if (row.image.startsWith('http')) {
          imageUrl = row.image;
        } else if (row.image.startsWith('uploads/')) {
          // Already has uploads/ prefix, just add base URL
          imageUrl = `${req.protocol}://${req.get('host')}/${row.image}`;
        } else {
          imageUrl = `${req.protocol}://${req.get('host')}/uploads/${row.image}`;
        }
        
        console.log(`  → Final imageUrl = "${imageUrl}"`);
      }

      return {
        id: row.id,
        name: row.service_name,
        description: row.service_description,
        imageUrl: imageUrl,
        rating: parseFloat(row.rating || 0),
        active: row.active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM services WHERE id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const service = rows[0];
    
    // Create a proper image URL if image exists
    let imageUrl = null;
    if (service.image) {
      // Make sure we're not adding /uploads/ to a path that already has it
      if (service.image.startsWith('http')) {
        imageUrl = service.image;
      } else if (service.image.startsWith('uploads/')) {
        // Already has uploads/ prefix, just add base URL
        imageUrl = `${req.protocol}://${req.get('host')}/${service.image}`;
      } else {
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/${service.image}`;
      }
    }
    
    res.json({
      id: service.id,
      name: service.service_name,
      description: service.service_description,
      imageUrl: imageUrl,
      rating: parseFloat(service.rating || 0),
      active: service.active === 1,
      createdAt: service.created_at,
      updatedAt: service.updated_at
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { id, name, description, rating, imageUrl, isActive } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    console.log('Creating service with data:', req.body);
    console.log('File upload:', req.file);
    
    // Determine the image - prioritize uploaded file, then imageUrl from request body
    let finalImageUrl = 'placeholder.txt'; // Default to placeholder if no image
    
    if (req.file) {
      // If file was uploaded through multer
      // Always save with uploads/services/ prefix for consistency
      finalImageUrl = `uploads/services/${req.file.filename}`;
      console.log('Using uploaded file:', finalImageUrl);
    } else if (imageUrl && imageUrl.trim() !== '') {
      // If imageUrl was provided in the request body
      console.log('Processing provided imageUrl:', imageUrl);
      
      // Extract just the filename if it's a full URL
      if (imageUrl.includes('/uploads/')) {
        // Extract just the filename if it's a full URL with /uploads/
        const urlParts = imageUrl.split('/uploads/');
        finalImageUrl = urlParts[urlParts.length - 1];
        console.log('Extracted filename from /uploads/ path:', finalImageUrl);
      } else if (imageUrl.includes('://')) {
        // Extract just the filename if it's a full URL with protocol
        const urlParts = imageUrl.split('/');
        finalImageUrl = urlParts[urlParts.length - 1];
        console.log('Extracted filename from full URL:', finalImageUrl);
      } else {
        // It might be just a filename or some other format
        finalImageUrl = imageUrl;
        console.log('Using imageUrl as is:', finalImageUrl);
      }
      
      // Clean up any query parameters or hash fragments
      if (finalImageUrl.includes('?')) {
        finalImageUrl = finalImageUrl.split('?')[0];
      }
      if (finalImageUrl.includes('#')) {
        finalImageUrl = finalImageUrl.split('#')[0];
      }
      
      console.log('Final image filename to save:', finalImageUrl);
    } else {
      console.log('No image provided, using placeholder');
    }
    
    // Use provided ID or let MySQL generate one
    const serviceId = id || null;
    
    let query = '';
    let params = [];
    
    if (serviceId) {
      // If ID provided, use it (useful for syncing with other systems)
      query = `
        INSERT INTO services (id, service_name, service_description, image, rating, active) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        serviceId, 
        name, 
        description || '', 
        finalImageUrl, 
        rating || 0,
        isActive === false ? 0 : 1
      ];
    } else {
      // Let MySQL generate ID
      query = `
        INSERT INTO services (service_name, service_description, image, rating, active) 
        VALUES (?, ?, ?, ?, ?)
      `;
      params = [
        name, 
        description || '', 
        finalImageUrl, 
        rating || 0,
        isActive === false ? 0 : 1
      ];
    }
    
    const [result] = await pool.query(query, params);
    
    // Determine the ID (either provided or generated)
    const newServiceId = serviceId || result.insertId;
    
    // Log what was saved to the database
    console.log('Created service in database with image:', finalImageUrl);
    
    // Return the full URL in the response
    let fullImageUrl = null;
    if (finalImageUrl) {
      if (finalImageUrl.startsWith('http')) {
        fullImageUrl = finalImageUrl;
      } else if (finalImageUrl.startsWith('uploads/')) {
        fullImageUrl = `${req.protocol}://${req.get('host')}/${finalImageUrl}`;
      } else {
        fullImageUrl = `${req.protocol}://${req.get('host')}/uploads/${finalImageUrl}`;
      }
    }
    
    res.status(201).json({
      id: newServiceId,
      name,
      description: description || '',
      imageUrl: fullImageUrl,
      rating: parseFloat(rating || 0),
      active: isActive === false ? false : true
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service', details: error.message });
  }
};

// Update a service
exports.updateService = async (req, res) => {
  try {
    const { name, description, rating, imageUrl, isActive, image } = req.body;
    const serviceId = req.params.id;
    
    console.log('Updating service ID:', serviceId);
    console.log('Update data:', req.body);
    console.log('File upload:', req.file);
    
    // Check if the service exists
    const [checkRows] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const existingService = checkRows[0];
    
    // Determine the image - prioritize uploaded file, then imageUrl or image from body, then existing image
    let finalImageUrl = existingService.image || 'placeholder.txt';
    let imageChanged = false;
    
    if (req.file) {
      // If a new file was uploaded through multer
      // Always save with uploads/services/ prefix for consistency
      finalImageUrl = `uploads/services/${req.file.filename}`;
      imageChanged = true;
      console.log('Using newly uploaded file:', finalImageUrl);
    } else if (image && image.trim() !== '' && image !== existingService.image) {
      // If image field was provided in the request body
      finalImageUrl = image;
      imageChanged = true;
      console.log('Using image from request body:', finalImageUrl);
    } else if (imageUrl && imageUrl.trim() !== '') {
      // If imageUrl was provided and is different from existing
      console.log('Processing provided imageUrl:', imageUrl);
      imageChanged = true;
      
      // Check if it's a full URL or just a filename
      if (imageUrl.includes('/uploads/')) {
        // Extract just the filename if it's a full URL with /uploads/
        const urlParts = imageUrl.split('/uploads/');
        finalImageUrl = urlParts[urlParts.length - 1];
        console.log('Extracted filename from /uploads/ path:', finalImageUrl);
      } else if (imageUrl.includes('://')) {
        // Extract just the filename if it's a full URL with protocol
        const urlParts = imageUrl.split('/');
        finalImageUrl = urlParts[urlParts.length - 1];
        console.log('Extracted filename from full URL:', finalImageUrl);
      } else {
        // It might be just a filename or some other format
        finalImageUrl = imageUrl;
        console.log('Using imageUrl as is:', finalImageUrl);
      }
      
      // Clean up any query parameters or hash fragments
      if (finalImageUrl.includes('?')) {
        finalImageUrl = finalImageUrl.split('?')[0];
      }
      if (finalImageUrl.includes('#')) {
        finalImageUrl = finalImageUrl.split('#')[0];
      }
      
      console.log('Final image filename to save:', finalImageUrl);
    } else {
      console.log('No new image provided, keeping existing image:', finalImageUrl);
    }
    
    // Check if the image has changed and is not placeholder.txt
    if (imageChanged && finalImageUrl !== 'placeholder.txt') {
      console.log('Image has changed, updating to:', finalImageUrl);
    } else {
      console.log('Image unchanged or still using placeholder');
    }
    
    // Determine active status
    const activeStatus = isActive !== undefined ? (isActive ? 1 : 0) : existingService.active;
    
    // Update the service
    await pool.query(`
      UPDATE services 
      SET service_name = ?, service_description = ?, image = ?, rating = ?, active = ?, updated_at = NOW() 
      WHERE id = ?
    `, [
      name || existingService.service_name,
      description !== undefined ? description : existingService.service_description,
      finalImageUrl,
      rating !== undefined ? rating : existingService.rating,
      activeStatus,
      serviceId
    ]);
    
    // Log what was saved to the database
    console.log('Updated service in database with image:', finalImageUrl);
    
    // Return the full URL in the response
    let fullImageUrl = null;
    if (finalImageUrl) {
      if (finalImageUrl.startsWith('http')) {
        fullImageUrl = finalImageUrl;
      } else if (finalImageUrl.startsWith('uploads/')) {
        fullImageUrl = `${req.protocol}://${req.get('host')}/${finalImageUrl}`;
      } else {
        fullImageUrl = `${req.protocol}://${req.get('host')}/uploads/${finalImageUrl}`;
      }
    }
    
    res.json({
      id: serviceId,
      name: name || existingService.service_name,
      description: description !== undefined ? description : existingService.service_description,
      imageUrl: fullImageUrl,
      rating: parseFloat(rating !== undefined ? rating : existingService.rating),
      active: activeStatus === 1,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service', details: error.message });
  }
};

// Delete a service
exports.deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    // Check if the service exists
    const [checkRows] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Soft delete by setting active to 0
    await pool.query('UPDATE services SET active = 0, updated_at = NOW() WHERE id = ?', [serviceId]);
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};

// Update services display order
exports.updateServicesOrder = async (req, res) => {
  try {
    const { services } = req.body; // Array of {id, display_order}
    
    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'Services must be an array' });
    }
    
    console.log('Updating display order for services:', services);
    
    // Update each service's display_order
    for (const service of services) {
      await pool.query(
        'UPDATE services SET display_order = ?, updated_at = NOW() WHERE id = ?',
        [service.display_order, service.id]
      );
    }
    
    console.log('✅ Display order updated successfully');
    res.json({ success: true, message: 'Display order updated successfully' });
  } catch (error) {
    console.error('Error updating services order:', error);
    res.status(500).json({ error: 'Failed to update services order' });
  }
}; 