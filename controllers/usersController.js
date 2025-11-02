const db = require('../db/connection');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    console.log('📋 Fetching all users...');
    
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.user_type,
        u.created_at,
        u.updated_at,
        u.fcm_token,
        up.user_image,
        up.mobile_number,
        up.address
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      ORDER BY u.created_at DESC
    `;
    
    const [users] = await db.execute(query);
    
    console.log(`✅ Found ${users.length} users`);
    
    res.status(200).json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Fetching user with ID: ${id}`);
    
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.user_type,
        u.created_at,
        u.updated_at,
        u.fcm_token,
        up.user_image,
        up.mobile_number,
        up.address
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.id = ?
    `;
    
    const [users] = await db.execute(query, [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    console.log(`✅ Found user: ${users[0].name}`);
    
    res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user',
      message: error.message 
    });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, user_type, mobile_number, address, user_image } = req.body;
    
    console.log(`📝 Updating user ${id}:`, { name, email, user_type, mobile_number });
    
    // Check if user exists
    const checkQuery = 'SELECT id FROM users WHERE id = ?';
    const [existingUser] = await db.execute(checkQuery, [id]);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Update users table
    const userUpdates = [];
    const userValues = [];
    
    if (name !== undefined) {
      userUpdates.push('name = ?');
      userValues.push(name);
    }
    if (email !== undefined) {
      userUpdates.push('email = ?');
      userValues.push(email);
    }
    if (user_type !== undefined) {
      userUpdates.push('user_type = ?');
      userValues.push(user_type);
    }
    
    if (userUpdates.length > 0) {
      userValues.push(id);
      const updateUserQuery = `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`;
      await db.execute(updateUserQuery, userValues);
    }
    
    // Update user_profile table
    const profileUpdates = [];
    const profileValues = [];
    
    if (mobile_number !== undefined) {
      profileUpdates.push('mobile_number = ?');
      profileValues.push(mobile_number);
    }
    if (address !== undefined) {
      profileUpdates.push('address = ?');
      profileValues.push(address);
    }
    if (user_image !== undefined) {
      profileUpdates.push('user_image = ?');
      profileValues.push(user_image);
    }
    
    if (profileUpdates.length > 0) {
      // Check if profile exists
      const [profileExists] = await db.execute(
        'SELECT id FROM user_profile WHERE user_id = ?',
        [id]
      );
      
      if (profileExists.length > 0) {
        // Update existing profile
        profileValues.push(id);
        const updateProfileQuery = `UPDATE user_profile SET ${profileUpdates.join(', ')} WHERE user_id = ?`;
        await db.execute(updateProfileQuery, profileValues);
      } else {
        // Create new profile
        await db.execute(
          'INSERT INTO user_profile (user_id, mobile_number, address, user_image) VALUES (?, ?, ?, ?)',
          [id, mobile_number || null, address || null, user_image || null]
        );
      }
    }
    
    // Fetch updated user with profile
    const [updatedUser] = await db.execute(
      `SELECT 
        u.id, u.name, u.email, u.user_type, u.created_at, u.updated_at,
        up.user_image, up.mobile_number, up.address
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.id = ?`,
      [id]
    );
    
    console.log(`✅ User updated successfully`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user',
      message: error.message 
    });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting user ${id}`);
    
    // Check if user exists
    const checkQuery = 'SELECT id, name FROM users WHERE id = ?';
    const [existingUser] = await db.execute(checkQuery, [id]);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Delete user
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    await db.execute(deleteQuery, [id]);
    
    console.log(`✅ User deleted: ${existingUser[0].name}`);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: existingUser[0]
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user',
      message: error.message 
    });
  }
};

// Get users by type (customer, vendor, driver, admin)
exports.getUsersByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    console.log(`📋 Fetching ${type} users...`);
    
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.user_type,
        u.created_at,
        u.updated_at,
        u.fcm_token,
        up.user_image,
        up.mobile_number,
        up.address
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.user_type = ?
      ORDER BY u.created_at DESC
    `;
    
    const [users] = await db.execute(query, [type]);
    
    console.log(`✅ Found ${users.length} ${type} users`);
    
    res.status(200).json({
      success: true,
      count: users.length,
      type: type,
      users: users
    });
  } catch (error) {
    console.error('❌ Error fetching users by type:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
};
