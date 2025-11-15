const { pool } = require('../config/db');

// Get all shopkeepers
exports.getAllShopkeepers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM shopkeepers
      ORDER BY created_at DESC
    `);
    
    // Helper function to build correct image URLs
    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      
      // If the path already starts with 'uploads/', don't add it again
      const path = imagePath.startsWith('uploads/') ? imagePath : `uploads/${imagePath}`;
      return `${req.protocol}://${req.get('host')}/${path}`;
    };
    
    // Format the response
    const shopkeepers = rows.map(row => {
      return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        mobile_number: row.phone,
        shop_name: row.shop_name,
        shop_address: row.shop_address,
        category: row.category,
        profile_image: buildImageUrl(row.profile_image),
        shop_image: buildImageUrl(row.shop_image),
        cnic_front_image: buildImageUrl(row.cnic_front_image),
        cnic_back_image: buildImageUrl(row.cnic_back_image),
        approval_status: row.approval_status || 'pending',
        address: row.address,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    res.json({ shopkeepers });
  } catch (error) {
    console.error('Error fetching shopkeepers:', error);
    res.status(500).json({ error: 'Failed to fetch shopkeepers' });
  }
};

// Get shopkeeper by ID
exports.getShopkeeperById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM shopkeepers WHERE id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Shopkeeper not found' });
    }
    
    const shopkeeper = rows[0];
    
    // Helper function to build correct image URLs
    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      
      // If the path already starts with 'uploads/', don't add it again
      const path = imagePath.startsWith('uploads/') ? imagePath : `uploads/${imagePath}`;
      return `${req.protocol}://${req.get('host')}/${path}`;
    };
    
    res.json({
      id: shopkeeper.id,
      user_id: shopkeeper.user_id,
      name: shopkeeper.name,
      email: shopkeeper.email,
      phone: shopkeeper.phone,
      mobile_number: shopkeeper.phone,
      shop_name: shopkeeper.shop_name,
      shop_address: shopkeeper.shop_address,
      category: shopkeeper.category,
      profile_image: buildImageUrl(shopkeeper.profile_image),
      shop_image: buildImageUrl(shopkeeper.shop_image),
      cnic_front_image: buildImageUrl(shopkeeper.cnic_front_image),
      cnic_back_image: buildImageUrl(shopkeeper.cnic_back_image),
      approval_status: shopkeeper.approval_status || 'pending',
      address: shopkeeper.address,
      created_at: shopkeeper.created_at,
      updated_at: shopkeeper.updated_at
    });
  } catch (error) {
    console.error('Error fetching shopkeeper:', error);
    res.status(500).json({ error: 'Failed to fetch shopkeeper' });
  }
};

// Register new shopkeeper (4-step process)
exports.registerShopkeeper = async (req, res) => {
  try {
    const {
      full_name,
      username,
      mobile_number,
      shop_name,
      shop_address,
      password,
      selected_service,
      selected_product_category,
      fcm_token
    } = req.body;

    if (!full_name || !username || !mobile_number || !shop_name || !shop_address || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const bcrypt = require('bcryptjs');

    // Check if username already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const [userResult] = await pool.query(
      "INSERT INTO users (name, email, password, user_type, fcm_token) VALUES (?, ?, ?, 'shopkeeper', ?)",
      [full_name, username, hashed, fcm_token || null]
    );
    const userId = userResult.insertId;

    // Determine category based on service/product selection
    let category = selected_service || selected_product_category || 'General';

    // Create shopkeeper record
    const [shopResult] = await pool.query(`
      INSERT INTO shopkeepers (
        user_id, name, email, phone, shop_name, shop_address, 
        category, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      userId, full_name, username, mobile_number, shop_name, shop_address, category
    ]);

    res.status(201).json({
      success: true,
      message: 'Shopkeeper registered successfully. Awaiting approval.',
      shopkeeper_id: shopResult.insertId,
      user_id: userId
    });
  } catch (error) {
    console.error('Error registering shopkeeper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register shopkeeper',
      error: error.message
    });
  }
};

// Create a new shopkeeper
exports.createShopkeeper = async (req, res) => {
  try {
    const {
      user_id,
      name,
      email,
      phone,
      password,
      shop_name,
      shop_address,
      category,
      profile_image,
      shop_image,
      cnic_front_image,
      cnic_back_image,
      address,
      fcm_token
    } = req.body;
    
    const bcrypt = require('bcryptjs');
    
    // Create or update user with user_type shopkeeper
    let userId = user_id;
    if (!userId) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        userId = existing[0].id;
        await pool.query("UPDATE users SET name=?, user_type='shopkeeper' WHERE id=?", [name, userId]);
        if (fcm_token) {
          await pool.query("UPDATE users SET fcm_token = ? WHERE id = ?", [fcm_token, userId]);
          console.log(`✅ Updated FCM token for existing shopkeeper user ${userId}`);
        }
      } else {
        const hashed = password ? await bcrypt.hash(password, 10) : null;
        const [result] = await pool.query(
          "INSERT INTO users (name, email, password, user_type, fcm_token) VALUES (?, ?, ?, 'shopkeeper', ?)",
          [name, email, hashed, fcm_token || null]
        );
        userId = result.insertId;
        console.log(`✅ Created shopkeeper user ${userId} with FCM token: ${fcm_token ? fcm_token.substring(0, 20) + '...' : 'none'}`);
      }
    } else if (fcm_token) {
      await pool.query("UPDATE users SET fcm_token = ? WHERE id = ?", [fcm_token, userId]);
      console.log(`✅ Updated FCM token for shopkeeper user ${userId}`);
    }
    
    const [result] = await pool.query(`
      INSERT INTO shopkeepers (
        user_id, name, email, phone, shop_name, shop_address, 
        category, profile_image, shop_image, cnic_front_image, 
        cnic_back_image, address, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      userId, name, email, phone, shop_name, shop_address,
      category, profile_image, shop_image, cnic_front_image,
      cnic_back_image, address
    ]);
    
    res.status(201).json({
      message: 'Shopkeeper created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating shopkeeper:', error);
    res.status(500).json({ error: 'Failed to create shopkeeper' });
  }
};

// Update a shopkeeper
exports.updateShopkeeper = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      shop_name,
      shop_address,
      category,
      profile_image,
      shop_image,
      cnic_front_image,
      cnic_back_image,
      address
    } = req.body;
    
    await pool.query(`
      UPDATE shopkeepers 
      SET name = ?, email = ?, phone = ?, shop_name = ?, shop_address = ?,
          category = ?, profile_image = ?, shop_image = ?, 
          cnic_front_image = ?, cnic_back_image = ?, address = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      name, email, phone, shop_name, shop_address, category,
      profile_image, shop_image, cnic_front_image, cnic_back_image,
      address, req.params.id
    ]);
    
    res.json({ message: 'Shopkeeper updated successfully' });
  } catch (error) {
    console.error('Error updating shopkeeper:', error);
    res.status(500).json({ error: 'Failed to update shopkeeper' });
  }
};

// Update shopkeeper approval status
exports.updateShopkeeperApproval = async (req, res) => {
  try {
    const { approval_status } = req.body;
    const id = req.params.id;
    
    if (!['pending', 'approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }
    
    // Get shopkeeper details
    const [rows] = await pool.query('SELECT * FROM shopkeepers WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Shopkeeper not found' });
    }
    
    const shopkeeper = rows[0];
    
    // ✅ If rejected, delete shopkeeper and user records
    if (approval_status === 'rejected') {
      console.log(`❌ Shopkeeper ${id} rejected - deleting records`);
      
      // Get FCM token before deletion for notification
      const [users] = await pool.query('SELECT id, fcm_token FROM users WHERE id=?', [shopkeeper.user_id]);
      const userFcmToken = users.length ? users[0].fcm_token : null;
      
      // Send rejection notification before deletion
      if (userFcmToken && global.firebaseAdmin) {
        try {
          await global.firebaseAdmin.messaging().send({
            token: userFcmToken,
            notification: { title: 'Application Rejected', body: 'Afsos! Aap ka shopkeeper application reject ho gaya hai. Admin se contact karein.' },
            data: { type: 'shopkeeper_rejection', status: 'rejected' }
          });
          console.log(`✅ Sent rejection notification to shopkeeper ${id}`);
        } catch (notifError) {
          console.error('Error sending rejection notification:', notifError);
        }
      }
      
      // Delete shopkeeper record
      await pool.query('DELETE FROM shopkeepers WHERE id = ?', [id]);
      
      // Delete user record
      if (shopkeeper.user_id) {
        await pool.query('DELETE FROM users WHERE id = ?', [shopkeeper.user_id]);
        console.log(`✅ Deleted user ${shopkeeper.user_id} from users table`);
      }
      
      return res.json({ 
        success: true,
        message: 'Shopkeeper application rejected and records deleted',
        approval_status: 'rejected'
      });
    }
    
    await pool.query(`
      UPDATE shopkeepers 
      SET approval_status = ?, updated_at = NOW()
      WHERE id = ?
    `, [approval_status, id]);
    
    res.json({ 
      message: 'Shopkeeper approval status updated successfully',
      approval_status 
    });
  } catch (error) {
    console.error('Error updating shopkeeper approval:', error);
    res.status(500).json({ error: 'Failed to update shopkeeper approval' });
  }
};

// Delete a shopkeeper
exports.deleteShopkeeper = async (req, res) => {
  try {
    await pool.query('DELETE FROM shopkeepers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Shopkeeper deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopkeeper:', error);
    res.status(500).json({ error: 'Failed to delete shopkeeper' });
  }
};
