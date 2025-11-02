const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// JWT secret - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'gwadar_online_bazaar_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, user_type = 'user' } = req.body;

    console.log('📝 Registration attempt:', { name, email, user_type, hasPassword: !!password });

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Validation failed - missing fields:', { 
        hasName: !!name, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    // Check valid user_type
    const validUserTypes = ['admin', 'user', 'driver', 'shopkeeper', 'bus_manager'];
    if (!validUserTypes.includes(user_type)) {
      console.log('❌ Invalid user type:', user_type);
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    console.log('✅ Validation passed, creating user...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, user_type) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, user_type]
    );

    const userId = result.insertId;

    // Store FCM token if provided
    if (req.body.fcm_token) {
      await storeFcmToken(userId, req.body.fcm_token);
    }

    // Generate token
    const token = generateToken(userId, user_type);

    console.log('✅ User registered successfully:', { userId, email, user_type });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        name,
        email,
        user_type
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password, fcm_token } = req.body;

    console.log(`🔑 Login attempt for: ${email}`);
    console.log(`🔔 FCM token received: ${fcm_token ? fcm_token.substring(0, 20) + '...' : 'NULL'}`);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email'
      });
    }

    const user = users[0];

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Update FCM token if provided
    if (fcm_token) {
      console.log(`💾 Storing FCM token for user ${user.id}...`);
      await storeFcmToken(user.id, fcm_token);
    } else {
      console.log(`⚠️ No FCM token provided in login request`);
    }

    // Generate token
    const token = generateToken(user.id, user.user_type);

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, user_type, created_at FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update'
      });
    }

    // Check if email already exists (if trying to change email)
    if (email) {
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ? AND id != ?', [email, userId]);
      
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Build update query dynamically
    let updateQuery = 'UPDATE users SET ';
    const updateValues = [];
    
    if (name) {
      updateQuery += 'name = ?, ';
      updateValues.push(name);
    }
    
    if (email) {
      updateQuery += 'email = ?, ';
      updateValues.push(email);
    }
    
    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    // Add WHERE clause
    updateQuery += ' WHERE id = ?';
    updateValues.push(userId);
    
    // Execute update query
    await pool.query(updateQuery, updateValues);
    
    // Get updated user
    const [users] = await pool.query('SELECT id, name, email, user_type, created_at FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user with password
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Generate JWT token
 */
function generateToken(userId, userType) {
  return jwt.sign(
    { id: userId, type: userType }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Store or update FCM token (users table only)
 */
async function storeFcmToken(userId, token) {
  try {
    // Detach token from any other accounts to avoid cross-account mixups
    await pool.query(
      'UPDATE users SET fcm_token = NULL WHERE fcm_token = ? AND id <> ?',
      [token, userId]
    );

    // Update on this user
    await pool.query('UPDATE users SET fcm_token = ? WHERE id = ?', [token, userId]);
    console.log(`New FCM token stored for user ${userId}`);
  } catch (error) {
    console.error('Error storing FCM token:', error);
    // Don't throw error, just log it - this shouldn't break the auth flow
  }
}

/**
 * Clear FCM token on logout
 */
exports.clearFcmToken = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.id;
    
    await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ?', [userId]);
    console.log(`FCM token cleared for user ${userId} on logout`);
    
    res.json({
      success: true,
      message: 'FCM token cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear FCM token',
      error: error.message
    });
  }
};

/**
 * Update FCM token after login (when Firebase initializes late)
 */
exports.updateFcmToken = async (req, res) => {
  try {
    const { userId, fcm_token } = req.body;
    
    if (!fcm_token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }
    
    const userIdToUpdate = userId || req.user.id;
    
    console.log(`🔄 Updating FCM token for user ${userIdToUpdate} (post-login)`);
    console.log(`🔔 Token: ${fcm_token.substring(0, 20)}...`);
    
    // Store the token
    await storeFcmToken(userIdToUpdate, fcm_token);
    
    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
};
