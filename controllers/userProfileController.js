const { pool } = require('../config/db');

/**
 * Get user profile details from user_profile table
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // First get user data (including mobile_number if exists in users table)
    const [users] = await pool.query('SELECT id, name, email, user_type, mobile_number, created_at FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = users[0];

    // Then get profile data
    const [profiles] = await pool.query('SELECT * FROM user_profile WHERE user_id = ?', [userId]);
    
    // Combine user and profile data
    // Profile data overrides user data if both have mobile_number
    const profileData = profiles.length > 0 ? profiles[0] : {};
    
    res.json({
      success: true,
      data: {
        ...userData,
        ...profileData,
        // Ensure mobile_number is set from either source
        mobile_number: profileData.mobile_number || userData.mobile_number || null
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update user profile in user_profile table
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { mobile_number, address, city, state, postal_code, country, user_image } = req.body;
    const userId = req.user.id;

    console.log('📝 Updating user profile for user:', userId);
    console.log('📝 Profile data:', { mobile_number, address, city, state, postal_code, country, user_image });

    // Check if profile exists
    const [existingProfiles] = await pool.query('SELECT * FROM user_profile WHERE user_id = ?', [userId]);
    
    if (existingProfiles.length === 0) {
      // Create new profile
      await pool.query(
        'INSERT INTO user_profile (user_id, mobile_number, address, city, state, postal_code, country, user_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [userId, mobile_number, address, city, state, postal_code, country, user_image]
      );
      console.log('✅ New profile created');
    } else {
      // Update existing profile
      await pool.query(
        'UPDATE user_profile SET mobile_number = ?, address = ?, city = ?, state = ?, postal_code = ?, country = ?, user_image = ? WHERE user_id = ?',
        [mobile_number, address, city, state, postal_code, country, user_image, userId]
      );
      console.log('✅ Profile updated');
    }

    // Get updated user data (including mobile_number if exists in users table)
    const [users] = await pool.query('SELECT id, name, email, user_type, mobile_number, created_at FROM users WHERE id = ?', [userId]);
    
    // Get updated profile data
    const [profiles] = await pool.query('SELECT * FROM user_profile WHERE user_id = ?', [userId]);
    
    // Combine user and profile data
    const userData = users[0];
    const profileData = profiles.length > 0 ? profiles[0] : {};
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...userData,
        ...profileData,
        // Ensure mobile_number is set from either source
        mobile_number: profileData.mobile_number || userData.mobile_number || null
      }
    });
  } catch (error) {
    console.error('❌ Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Upload profile image
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imagePath = req.file.path.replace(/\\/g, '/');
    console.log('📸 Profile image uploaded:', imagePath);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('❌ Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
