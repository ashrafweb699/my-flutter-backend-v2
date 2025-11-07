const { pool } = require('../config/db');
const path = require('path');
const bcrypt = require('bcryptjs');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, u.name, u.email 
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `);
    
    // Helper function to build correct image URLs
    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      
      // If the path already starts with 'uploads/', don't add it again
      const path = imagePath.startsWith('uploads/') ? imagePath : `uploads/${imagePath}`;
      return `${req.protocol}://${req.get('host')}/${path}`;
    };
    
    // Format the response
    const drivers = rows.map(row => {
      return {
        id: row.id,
        driverId: row.id.toString(),
        userId: row.user_id,
        name: row.name,
        phone: row.mobile_number,
        email: row.email,
        profileImg: buildImageUrl(row.profile_image),
        cnicFront: buildImageUrl(row.cnic_front_image),
        cnicBack: buildImageUrl(row.cnic_back_image),
        vehicleNumber: row.vehicle_number,
        licenseNumber: row.licence_number,
        licenseImage: buildImageUrl(row.licence_image),
        expiryDate: row.licence_expiry,
        rating: parseFloat(row.rating || 0),
        approval: row.approval_status || 'pending',
        onlineStatus: row.online_status || 'offline',
        currentLatitude: parseFloat(row.current_latitude || 0),
        currentLongitude: parseFloat(row.current_longitude || 0),
        createdAt: row.created_at,
        lastLocationUpdate: row.last_location_update
      };
    });
    
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};

// Get driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, u.name, u.email 
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const driver = rows[0];
    
    // Helper function to build correct image URLs
    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      
      // If the path already starts with 'uploads/', don't add it again
      const path = imagePath.startsWith('uploads/') ? imagePath : `uploads/${imagePath}`;
      return `${req.protocol}://${req.get('host')}/${path}`;
    };
    
    res.json({
      id: driver.id,
      driverId: driver.id.toString(),
      userId: driver.user_id,
      name: driver.name,
      phone: driver.mobile_number,
      email: driver.email,
      profileImg: buildImageUrl(driver.profile_image),
      cnicFront: buildImageUrl(driver.cnic_front_image),
      cnicBack: buildImageUrl(driver.cnic_back_image),
      vehicleNumber: driver.vehicle_number,
      licenseNumber: driver.licence_number,
      licenseImage: buildImageUrl(driver.licence_image),
      expiryDate: driver.licence_expiry,
      rating: parseFloat(driver.rating || 0),
      approval: driver.approval_status || 'pending',
      onlineStatus: driver.online_status || 'offline',
      currentLatitude: parseFloat(driver.current_latitude || 0),
      currentLongitude: parseFloat(driver.current_longitude || 0),
      createdAt: driver.created_at,
      lastLocationUpdate: driver.last_location_update
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
};

// Create a new driver
exports.createDriver = async (req, res) => {
  try {
    const { 
      driver_id, 
      name, 
      phone, 
      email,
      password,
      image, 
      cnic_front, 
      cnic_back,
      cnic_number,
      vehicle_number,
      license_number, 
      license_image, 
      expiry_date,
      current_latitude,
      current_longitude,
      rating,
      approval = 'pending'
    } = req.body;
    
    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    console.log('Creating driver with data:', req.body);
    
    // Check if user exists in users table with this email
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let userId;
    if (existingUsers.length > 0) {
      // If a user exists already, ensure there is NOT already a driver mapped to this email/phone
      const [existingDriversByUser] = await pool.query(
        'SELECT d.* FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = ? OR d.mobile_number = ? LIMIT 1',
        [email, phone]
      );
      if (existingDriversByUser.length > 0) {
        // Driver already exists for this email/phone -> conflict as before (cleanup not needed because we will not fail silently)
        const filesToDelete = [];
        const fs = require('fs');
        const uploadsDir = path.join(__dirname, '../uploads/drivers');
        if (fs.existsSync(uploadsDir)) {
          try {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
              if (file.includes(driver_id) || (Date.now() - parseInt(file.split('-')[0])) < 60000) {
                filesToDelete.push(path.join('uploads/drivers', file));
              }
            }
          } catch (err) {
            console.error('Error reading uploads directory:', err);
          }
        }
        if (image) filesToDelete.push(image.startsWith('uploads/') ? image : path.join('uploads', image));
        if (cnic_front) filesToDelete.push(cnic_front.startsWith('uploads/') ? cnic_front : path.join('uploads', cnic_front));
        if (cnic_back) filesToDelete.push(cnic_back.startsWith('uploads/') ? cnic_back : path.join('uploads', cnic_back));
        if (license_image) filesToDelete.push(license_image.startsWith('uploads/') ? license_image : path.join('uploads', license_image));
        const { deleteUploadedFiles } = require('../utils/file_cleanup');
        console.log('Files to delete for failed registration:', filesToDelete);
        await deleteUploadedFiles(filesToDelete);
        return res.status(409).json({ 
          error: 'Driver already exists for this email/phone', 
          exists: true,
          message: `This email/phone is already associated with a driver account.`
        });
      }

      // Reuse existing user: update name and set user_type='driver', optionally update password if provided
      userId = existingUsers[0].id;
      if (name) {
        await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
      }
      await pool.query("UPDATE users SET user_type = 'driver' WHERE id = ?", [userId]);
      if (password) {
        const hashedExisting = await bcrypt.hash(password, 10);
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedExisting, userId]);
      }
    }

    // Check if a driver already exists with this phone number
    const [existingDrivers] = await pool.query('SELECT d.*, u.email, u.name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.mobile_number = ? OR u.email = ?', [phone, email]);
    if (existingDrivers.length > 0) {
      const existingDriver = existingDrivers[0];
      
      // Collect uploaded files for cleanup - we need to be more thorough here
      const filesToDelete = [];
      
      // Look for all possible image files with driver ID in their paths
      const fs = require('fs');
      const uploadsDir = path.join(__dirname, '../uploads/drivers');
      
      if (fs.existsSync(uploadsDir)) {
        try {
          const files = fs.readdirSync(uploadsDir);
          for (const file of files) {
            // Check if the file was uploaded as part of this registration attempt
            // Look for files uploaded in the last 60 seconds or containing the driver_id
            if (file.includes(driver_id) || (Date.now() - parseInt(file.split('-')[0])) < 60000) {
              filesToDelete.push(path.join('uploads/drivers', file));
            }
          }
        } catch (err) {
          console.error('Error reading uploads directory:', err);
        }
      }
      
      // Also add any specific files mentioned in the request
      if (image) filesToDelete.push(image.startsWith('uploads/') ? image : path.join('uploads', image));
      if (cnic_front) filesToDelete.push(cnic_front.startsWith('uploads/') ? cnic_front : path.join('uploads', cnic_front));
      if (cnic_back) filesToDelete.push(cnic_back.startsWith('uploads/') ? cnic_back : path.join('uploads', cnic_back));
      if (license_image) filesToDelete.push(license_image.startsWith('uploads/') ? license_image : path.join('uploads', license_image));
      
      // Import the cleanup utility
      const { deleteUploadedFiles } = require('../utils/file_cleanup');
      
      // Delete all uploaded files since registration will fail
      console.log('Files to delete for failed registration:', filesToDelete);
      await deleteUploadedFiles(filesToDelete);
      
      // Check if this is the same email
      if (existingDriver.email === email) {
        return res.status(409).json({ 
          error: 'Email already registered', 
          exists: true,
          approval: existingDriver.approval_status,
          message: `This email is already registered. Account status: ${existingDriver.approval_status}`
        });
      }
      
      // Check if this is the same phone
      if (existingDriver.mobile_number === phone) {
        return res.status(409).json({ 
          error: 'Phone number already registered', 
          exists: true,
          approval: existingDriver.approval_status,
          message: `This phone number is already registered. Account status: ${existingDriver.approval_status}`
        });
      }
      
      // If we get here, there's another conflict we didn't account for
      return res.status(409).json({
        error: 'Driver information conflicts with existing records',
        exists: true,
        message: 'Some of your information conflicts with existing driver records. Please check your details and try again.'
      });
    }
    
    // Add final safeguard to clean up driver-specific folder
    try {
      if (driver_id) {
        // Import our enhanced cleanup utility
        const { cleanupDriverFiles } = require('../utils/file_cleanup');
        
        // Clean up all files related to this driver ID
        await cleanupDriverFiles(driver_id);
        console.log(`Performed final cleanup check for driver_id: ${driver_id}`);
      }
    } catch (cleanupError) {
      console.error('Error in final driver files cleanup:', cleanupError);
      // Don't block registration for cleanup errors
    }
    
    // If we didn't reuse an existing user, create a new one now
    let userResult;
    if (!userId) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userInsertQuery = `
        INSERT INTO users 
        (name, email, password, user_type) 
        VALUES (?, ?, ?, 'driver')
      `;
      const insertResp = await pool.query(userInsertQuery, [
        name,
        email,
        hashedPassword
      ]);
      userResult = insertResp[0];
      userId = userResult.insertId;
    }
    
    // Then insert into drivers table
    const driverInsertQuery = `
      INSERT INTO drivers 
      (user_id, mobile_number, cnic_number, licence_number, vehicle_number, licence_expiry, 
       profile_image, cnic_front_image, cnic_back_image, licence_image, 
       approval_status, rating, online_status, current_latitude, current_longitude, last_location_update) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, NOW())
    `;
    
    // Process image paths - extract just the relative path from full URLs
    const processImagePath = (url) => {
      if (!url) return '';
      
      // If it's already a relative path (starts with 'uploads/'), return as is
      if (url.startsWith('uploads/')) {
        return url;
      }
      
      try {
        // Extract the path from a full URL (e.g., http://example.com/uploads/drivers/123/profile.jpg)
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // If pathname starts with /uploads/, remove the leading slash
        if (pathname.startsWith('/uploads/')) {
          return pathname.substring(1); // Remove the leading slash
        }
        
        // Otherwise return the whole pathname, or empty string if something went wrong
        return pathname || url || '';
      } catch (e) {
        // If URL parsing fails, return the original string or empty string
        console.log(`Failed to parse image URL: ${url}`, e);
        return url || '';
      }
    };
    
    const [result] = await pool.query(driverInsertQuery, [
      userId,
      phone,
      cnic_number || '',
      license_number || '',
      vehicle_number || '',
      expiry_date || new Date().toISOString().split('T')[0],
      processImagePath(image),  // Process profile_image path
      processImagePath(cnic_front),  // Process cnic_front path
      processImagePath(cnic_back),  // Process cnic_back path
      processImagePath(license_image),  // Process license_image path
      approval === 'pending' ? 'pending' : (approval === 'YES' ? 'approved' : 'rejected'),
      rating || 5,
      current_latitude || 0,
      current_longitude || 0
    ]);
    
    // Notify admins: always create bell entries for ALL admins, and send FCM only to admins with valid tokens
    try {
      // 1) Fetch all admins (for bell entries)
      const [allAdmins] = await pool.query("SELECT id, fcm_token FROM users WHERE user_type='admin'");

      // 1.a) Insert bell notifications for every admin regardless of token
      for (const adminRow of allAdmins) {
        try {
          await pool.query(
            `INSERT INTO user_notifications (user_id, title, message, type, is_read)
             VALUES (?, ?, ?, 'new_driver', 0)`,
            [adminRow.id, 'New Driver Registration', `${name} registered and is awaiting approval.`]
          );
        } catch (e) {
          console.error('Failed to insert admin bell notification:', e.message);
        }
      }

      // 2) Prepare FCM tokens (only non-empty)
      const tokens = allAdmins
        .map(a => a.fcm_token)
        .filter(t => t && t.trim() !== '')
        .map(t => t.trim());

      // 3) Send FCM if Firebase Admin is initialized and we have tokens
      if (global.firebaseAdmin && tokens.length > 0) {
        const notification = {
          title: 'New Driver Registration',
          body: `${name} has registered as a driver and is awaiting approval.`,
        };

        const message = {
          notification: notification,
          data: {
            type: 'new_driver',
            driver_id: result.insertId.toString(),
            user_id: userId.toString(),
            driver_name: name,
            driver_phone: phone,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
          tokens: tokens
        };

        await global.firebaseAdmin.messaging().sendEachForMulticast(message);
        console.log('✅ Notification sent to admins about new driver registration');

        // Additionally, send to admin_notifications topic (optional)
        await global.firebaseAdmin.messaging().send({
          notification: {
            title: 'New Driver Registration',
            body: `${name} has registered as a driver and is awaiting approval.`
          },
          data: {
            type: 'new_driver',
            driver_id: result.insertId.toString(),
            user_id: userId.toString(),
            driver_name: name,
            driver_phone: phone,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
          topic: 'admin_notifications'
        });
        console.log('Notification sent to admin_notifications topic');
      } else if (!global.firebaseAdmin) {
        console.log('Firebase Admin SDK not initialized; FCM skipped but bell entries created.');
      }
    } catch (notificationError) {
      console.error('Error notifying admins:', notificationError);
      // Do not fail the main request
    }
    
    res.status(201).json({
      success: true,
      message: 'Driver registration successful! Your account is pending approval by admin.',
      driverId: result.insertId,
      userId: userId,
      approval: 'pending'
    });
    
  } catch (error) {
    console.error('Error creating driver:', error);
    
    // If there was an error during registration, make sure to clean up uploaded files
    try {
      // Use the driver_id from request body instead of undefined variable
      const driverId = req.body.driver_id;
      if (driverId) {
        // Import our enhanced cleanup utility if not already imported
        let cleanupUtil;
        try {
          cleanupUtil = require('../utils/file_cleanup');
        } catch (importError) {
          console.error('Failed to import cleanup utility:', importError);
        }
        
        if (cleanupUtil && cleanupUtil.cleanupDriverFiles) {
          console.log(`Performing error cleanup for driver_id: ${driverId}`);
          await cleanupUtil.cleanupDriverFiles(driverId);
        }
      }
      
      // Also try to clean up any specific files mentioned in the request
      const filesToDelete = [];
      if (image) filesToDelete.push(image.startsWith('uploads/') ? image : path.join('uploads', image));
      if (cnic_front) filesToDelete.push(cnic_front.startsWith('uploads/') ? cnic_front : path.join('uploads', cnic_front));
      if (cnic_back) filesToDelete.push(cnic_back.startsWith('uploads/') ? cnic_back : path.join('uploads', cnic_back));
      if (license_image) filesToDelete.push(license_image.startsWith('uploads/') ? license_image : path.join('uploads', license_image));
      
      if (filesToDelete.length > 0) {
        const { deleteUploadedFiles } = require('../utils/file_cleanup');
        await deleteUploadedFiles(filesToDelete);
      }
      
      // If a user was created but driver creation failed, clean up the user too
      if (userResult && userResult.insertId) {
        console.log(`Rolling back user creation with ID: ${userResult.insertId}`);
        try {
          await pool.query('DELETE FROM users WHERE id = ?', [userResult.insertId]);
          console.log(`Deleted orphaned user with ID: ${userResult.insertId}`);
        } catch (userDeleteError) {
          console.error(`Failed to clean up orphaned user: ${userDeleteError.message}`);
        }
      }
    } catch (cleanupError) {
      console.error('Error in error handler cleanup:', cleanupError);
    }
    
    res.status(500).json({ error: 'Failed to create driver', details: error.message });
  }
};

// Update driver approval status
exports.updateDriverApproval = async (req, res) => {
  try {
    const { approval } = req.body;
    const driverId = req.params.id;
    
    if (!approval || !['pending', 'YES', 'NO'].includes(approval)) {
      return res.status(400).json({ error: 'Valid approval status is required (pending, YES, NO)' });
    }
    
    // Check if the driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driverId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const driver = checkRows[0];

    // Also fetch corresponding user row to get fcm_token if needed
    let userRow = null;
    try {
      const [userRows] = await pool.query('SELECT id, fcm_token, email, name FROM users WHERE id = ?', [driver.user_id]);
      if (userRows && userRows.length > 0) userRow = userRows[0];
    } catch (e) {
      console.error('Error fetching user for driver approval:', e.message);
    }
    
    // If approval is changing to YES, create the user in Firebase Auth
    if (approval === 'YES' && driver.approval_status !== 'approved' && driver.email && driver.password) {
      try {
        // Check if Firebase Admin is initialized
        if (global.firebaseAdmin) {
          // Check if user already exists in Firebase
          try {
            const userRecord = await global.firebaseAdmin.auth().getUserByEmail(driver.email);
            console.log('User already exists in Firebase:', userRecord.uid);
          } catch (firebaseError) {
            if (firebaseError.code === 'auth/user-not-found') {
              try {
                // Create user in Firebase Auth
                await global.firebaseAdmin.auth().createUser({
                  uid: driverId,
                  email: driver.email,
                  password: driver.password,
                  displayName: driver.fullname,
                  disabled: false
                });
                console.log('Created new Firebase user with ID:', driverId);
              } catch (createError) {
                console.error('Error creating Firebase user:', createError);
                // If password doesn't meet Firebase requirements, use a stronger default
                if (createError.code === 'auth/weak-password') {
                  try {
                    // Generate stronger password by combining parts of their info
                    const strongerPassword = `${driver.password}${driverId}#2023`;
                    await global.firebaseAdmin.auth().createUser({
                      uid: driverId,
                      email: driver.email,
                      password: strongerPassword,
                      displayName: driver.fullname,
                      disabled: false
                    });
                    // Update password in users table to match Firebase
                    await pool.query(`
                      UPDATE users
                      SET password = ?
                      WHERE id = ?
                    `, [strongerPassword, driver.user_id]);
                    console.log('Created Firebase user with stronger password:', driverId);
                  } catch (secondAttemptError) {
                    console.error('Second attempt to create Firebase user failed:', secondAttemptError);
                    // Continue with approval update even if Firebase operation fails
                  }
                }
              }
            } else {
              console.error('Firebase error checking user:', firebaseError);
              // Continue with approval update even if Firebase operation fails
            }
          }
        } else {
          console.log('Firebase Admin SDK not initialized. Skipping Firebase user creation.');
        }
      } catch (firebaseError) {
        console.error('Error creating Firebase user:', firebaseError);
        // Continue with approval update even if Firebase operation fails
      }
    }
    
    // Update the driver approval - map from YES/NO to approved/rejected for the database
    const dbApprovalValue = approval === 'YES' ? 'approved' : (approval === 'NO' ? 'rejected' : 'pending');
    
    // Log the approval values for debugging
    console.log(`Updating driver ${driverId} approval:
      - Original approval value: ${approval}
      - Mapped to database value: ${dbApprovalValue}
      - Current database value: ${driver.approval_status}
    `);
    
    await pool.query(`
      UPDATE drivers
      SET approval_status = ? 
      WHERE id = ?
    `, [dbApprovalValue, driverId]);
    
    // Send FCM notification to driver about status change
    try {
      if (global.firebaseAdmin) {
        // Notification message based on approval status
        let message = '';
        let title = '';
        
        if (approval === 'YES') {
          title = 'Driver Application Approved!';
          message = 'Your driver application has been approved. You can now log in to the app.';
        } else if (approval === 'NO') {
          title = 'Driver Application Rejected';
          message = 'Your driver application has been rejected. Please contact support for more information.';
        } else {
          title = 'Application Status Update';
          message = 'Your driver application status has been updated to: ' + approval;
        }
        
        // First check if driver has FCM token
        const targetToken = driver.fcm_token || (userRow && userRow.fcm_token);
        if (targetToken) {
          // Send direct message to the driver's token
          await global.firebaseAdmin.messaging().send({
            token: targetToken,
            notification: {
              title: title,
              body: message
            },
            data: {
              type: 'driver_approval',
              status: String(dbApprovalValue),
              driverId: String(driverId),
              route: 'driver_approval',
              entity: 'driver',
              target_id: String(driverId),
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            android: {
              priority: 'high'
            }
          });
          
          console.log(`Notification sent directly to driver's FCM token: ${targetToken}`);
        }
        
        // Also send to driver's topic as backup (in case app subscribes to topics by ID)
        const driverTopic = `driver_${driverId}`;
        
        // Send notification to driver's topic
        await global.firebaseAdmin.messaging().send({
          topic: driverTopic,
          notification: {
            title: title,
            body: message
          },
          data: {
            type: 'driver_approval',
            status: String(approval),
            driverId: String(driverId),
            route: 'driver_approval',
            entity: 'driver',
            target_id: String(driverId),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          android: {
            priority: 'high'
          }
        });
        
        console.log(`Driver notification sent to ${driverTopic} topic about approval status: ${approval}`);
      }
    } catch (fcmError) {
      console.error('Error sending FCM notification to driver:', fcmError);
      // Don't fail the update if notification fails
    }
    
    // Create a bell notification entry for the driver user
    try {
      await pool.query(
        `INSERT INTO user_notifications (user_id, title, message, type, is_read)
         VALUES (?, ?, ?, 'general', 0)`,
        [driver.user_id, 'Application Update', `Your driver application is ${dbApprovalValue}.`]
      );
    } catch (e) {
      console.error('Failed to insert driver bell notification:', e.message);
    }

    res.json({ 
      message: `Driver approval status updated to ${dbApprovalValue}`,
      driverId: driverId,
      approval: dbApprovalValue
    });
  } catch (error) {
    console.error('Error updating driver approval:', error);
    res.status(500).json({ error: 'Failed to update driver approval' });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { 
      name, 
      phone, 
      email,
      image, 
      cnic_front, 
      cnic_back, 
      vehicle_number,
      license_number, 
      license_image, 
      expiry_date,
      current_latitude,
      current_longitude,
      rating,
      online_status,
      approval
    } = req.body;
    
    // Check if the driver exists
    const [checkRows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const existingDriver = checkRows[0];
    
    // Update the driver
    await pool.query(`
      UPDATE drivers 
      SET 
        fullname = ?, 
        mobile_no = ?, 
        email = ?,
        profile_img = ?, 
        cnic_front = ?, 
        cnic_back = ?, 
        vehicle_no = ?,
        license_no = ?, 
        license_image = ?, 
        expiry_date = ?,
        current_latitude = ?,
        current_longitude = ?,
        rating = ?,
        online_status = ?,
        approval_status = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      name || existingDriver.fullname,
      phone || existingDriver.mobile_no,
      email !== undefined ? email : existingDriver.email,
      image || existingDriver.profile_img,
      cnic_front || existingDriver.cnic_front,
      cnic_back || existingDriver.cnic_back,
      vehicle_number || existingDriver.vehicle_no,
      license_number || existingDriver.license_no,
      license_image || existingDriver.license_image,
      expiry_date || existingDriver.expiry_date,
      current_latitude !== undefined ? current_latitude : existingDriver.current_latitude,
      current_longitude !== undefined ? current_longitude : existingDriver.current_longitude,
      rating !== undefined ? rating : existingDriver.rating,
      online_status || existingDriver.online_status,
      approval ? (approval === 'YES' ? 'approved' : (approval === 'NO' ? 'rejected' : 'pending')) : existingDriver.approval_status,
      driverId
    ]);
    
    // Get the updated driver
    const [updatedRows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    const updatedDriver = updatedRows[0];
    
    res.json({
      id: updatedDriver.id,
      driverId: updatedDriver.id.toString(),
      name: updatedDriver.fullname,
      phone: updatedDriver.mobile_no,
      email: updatedDriver.email,
      profileImg: updatedDriver.profile_img ? `${req.protocol}://${req.get('host')}/uploads/${updatedDriver.profile_img}` : null,
      cnicFront: updatedDriver.cnic_front ? `${req.protocol}://${req.get('host')}/uploads/${updatedDriver.cnic_front}` : null,
      cnicBack: updatedDriver.cnic_back ? `${req.protocol}://${req.get('host')}/uploads/${updatedDriver.cnic_back}` : null,
      vehicleNumber: updatedDriver.vehicle_no,
      licenseNumber: updatedDriver.license_no,
      licenseImage: updatedDriver.license_image ? `${req.protocol}://${req.get('host')}/uploads/${updatedDriver.license_image}` : null,
      expiryDate: updatedDriver.expiry_date,
      rating: parseFloat(updatedDriver.rating || 0),
      approval: updatedDriver.approval_status,
      onlineStatus: updatedDriver.online_status,
      currentLatitude: parseFloat(updatedDriver.current_latitude || 0),
      currentLongitude: parseFloat(updatedDriver.current_longitude || 0),
      updatedAt: updatedDriver.updated_at
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
};

// Delete a driver
exports.deleteDriver = async (req, res) => {
  try {
    const driverId = req.params.id;
    
    // Check if the driver exists
    const [checkRows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Delete the driver
    await pool.query('DELETE FROM drivers WHERE id = ?', [driverId]);
    
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
};

// Check driver email status
exports.checkDriverEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    // Check if a driver with this email exists
    const [drivers] = await pool.query('SELECT d.* FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = ?', [email]);
    
    if (drivers.length === 0) {
      return res.json({
        exists: false,
        approval: null,
        message: 'No driver account found with this email'
      });
    }
    
    const driver = drivers[0];
    
    return res.json({
      exists: true,
      approval: driver.approval_status,
      message: `Driver account found (Status: ${driver.approval_status})`
    });
    
  } catch (error) {
    console.error('Error checking driver email:', error);
    res.status(500).json({ error: 'Failed to check driver email', details: error.message });
  }
};

// Update driver FCM token
exports.updateDriverToken = async (req, res) => {
  try {
    const { token } = req.body;
    const driverId = req.params.id;
    
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    // Check if the driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driverId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    // Get driver's user_id
    const driver = checkRows[0];
    
    // Update FCM token in users table (not drivers table)
    await pool.query(`
      UPDATE users 
      SET fcm_token = ?
      WHERE id = ?
    `, [token, driver.user_id]);
    
    console.log(`✅ FCM token updated for driver ${driverId} (user_id: ${driver.user_id})`);
    
    res.status(200).json({ success: true, message: 'FCM token updated successfully' });
    
  } catch (error) {
    console.error('Error updating driver token:', error);
    res.status(500).json({ error: 'Failed to update driver FCM token' });
  }
};

// Update driver online status
exports.updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const driverId = req.params.id;
    
    // Validate status
    if (!status || (status !== 'online' && status !== 'offline')) {
      return res.status(400).json({ error: 'Status must be either "online" or "offline"' });
    }
    
    // Check if the driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driverId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Update driver's online status
    await pool.query(`
      UPDATE drivers 
      SET online_status = ?
      WHERE id = ?
    `, [status, driverId]);
    
    // Get FCM token from users table
    const driver = checkRows[0];
    let fcmToken = null;
    
    if (driver.user_id) {
      const [userRows] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [driver.user_id]);
      if (userRows.length > 0) {
        fcmToken = userRows[0].fcm_token;
      }
    }
    
    // If driver is going online, subscribe them to all_drivers topic in FCM
    if (status === 'online' && global.firebaseAdmin && fcmToken) {
      try {
        console.log(`Driver ${driverId} going online with FCM token: ${fcmToken}`);
        
        // Subscribe to all_drivers topic if Google FCM supports this
        // Note: Direct topic subscription is not supported via Admin SDK, 
        // clients should subscribe via the FCM client SDK instead
        
        // Just log the event for now
        console.log(`Driver ${driverId} is now ${status}`);
      } catch (fcmError) {
        console.error('Error with FCM for driver status update:', fcmError);
        // Don't fail the status update if FCM fails
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Driver status updated to ${status}`,
      driverId: driverId,
      status: status
    });
    
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Failed to update driver online status' });
  }
};

// Login driver
exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if the driver exists
    const [users] = await pool.query(`
      SELECT u.* FROM users u
      JOIN drivers d ON u.id = d.user_id
      WHERE u.email = ? AND u.user_type = 'driver'
    `, [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Driver not found with this email' });
    }
    
    const user = users[0];
    
    // Get driver details
    const [drivers] = await pool.query(`
      SELECT d.* FROM drivers d
      WHERE d.user_id = ?
    `, [user.id]);
    
    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver record not found' });
    }
    
    const driver = drivers[0];
    
    // Check if driver is approved
    if (driver.approval_status !== 'approved') {
      return res.status(403).json({ 
        error: 'Account not approved', 
        message: `Your account is ${driver.approval_status === 'pending' ? 'pending approval' : 'rejected'}` 
      });
    }
    
    // Set driver offline on login (they must manually toggle online)
    await pool.query(`
      UPDATE drivers SET online_status = 'offline' WHERE id = ?
    `, [driver.id]);
    console.log(`✅ Driver ${driver.id} set to offline on login`);

    // For approved drivers, authenticate with Firebase
    if (global.firebaseAdmin) {
      try {
        // Try to authenticate with Firebase
        const userRecord = await global.firebaseAdmin.auth().getUserByEmail(email);
        
        // Check if we got a user record
        if (userRecord) {
          // Now we need to verify the password
          // Firebase Admin SDK doesn't support direct password verification
          // So we need to check if password matches what's in our database using bcrypt
          const passwordMatch = await bcrypt.compare(password, users[0].password);
          if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
          }
          
          // Return driver data on successful authentication
          res.json({
            success: true,
            message: 'Login successful',
            driver: {
              id: driver.id,
              userId: user.id,
              name: user.name,
              phone: driver.mobile_number,
              email: user.email,
              profileImg: driver.profile_image ? `${req.protocol}://${req.get('host')}/${driver.profile_image}` : null,
              approval: driver.approval_status,
              onlineStatus: driver.online_status || 'offline'
            }
          });
        } else {
          // This should not happen since getUserByEmail throws if user not found
          // But just in case, create the Firebase user
          // Generate a random secure password for Firebase (since we can't use the hashed one)
          const securePassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await global.firebaseAdmin.auth().createUser({
            uid: driver.id.toString(),
            email: user.email,
            password: securePassword, // Use secure random password
            displayName: user.name,
            disabled: false
          });
          console.log(`Created Firebase user for previously approved driver ID: ${driver.id}`);
          
          // Return driver data on successful authentication
          res.json({
            success: true,
            message: 'Login successful',
            driver: {
              id: driver.id,
              name: user.name,
              phone: driver.mobile_number,
              email: user.email,
              profileImg: driver.profile_image ? `${req.protocol}://${req.get('host')}/${driver.profile_image}` : null,
              approval: driver.approval_status,
              onlineStatus: driver.online_status || 'offline'
            }
          });
        }
      } catch (firebaseError) {
        console.error('Firebase authentication error:', firebaseError);
        
        // If Firebase says invalid password, return auth error
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          return res.status(401).json({ error: 'Invalid password' });
        } 
        
        // If Firebase says user not found, we need to create the user
        if (firebaseError.code === 'auth/user-not-found') {
          try {
            // Check if password matches our database using bcrypt
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
              return res.status(401).json({ error: 'Invalid password' });
            }
            
            // Create user in Firebase Auth with a secure random password
            const securePassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await global.firebaseAdmin.auth().createUser({
              uid: driver.id.toString(),
              email: user.email,
              password: securePassword, // Use secure random password
              displayName: user.name,
              disabled: false
            });
            console.log(`Created Firebase user for approved driver ID: ${driver.id}`);
            
            // Now return success
            return res.json({
              success: true,
              message: 'Login successful',
              driver: {
                id: driver.id,
                userId: user.id,
                name: user.name,
                phone: driver.mobile_number,
                email: user.email,
                profileImg: driver.profile_image ? `${req.protocol}://${req.get('host')}/${driver.profile_image}` : null,
                approval: driver.approval_status,
                onlineStatus: driver.online_status || 'offline'
              }
            });
          } catch (createError) {
            console.error('Error creating Firebase user:', createError);
            return res.status(500).json({ error: 'Authentication error. Please try again later.' });
          }
        }
        
        return res.status(500).json({ error: 'Authentication error. Please try again later.' });
      }
    } else {
      // Fallback to legacy password check if Firebase admin is not initialized
      // Use bcrypt to compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      res.json({
        success: true,
        message: 'Login successful (legacy mode)',
        driver: {
          id: driver.id,
          userId: user.id,
          name: user.name,
          phone: driver.mobile_number,
          email: user.email,
          profileImg: driver.profile_image ? `${req.protocol}://${req.get('host')}/${driver.profile_image}` : null,
          approval: driver.approval_status,
          onlineStatus: driver.online_status || 'offline'
        }
      });
    }
  } catch (error) {
    console.error('Error logging in driver:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Ping server endpoint for API connectivity checks
exports.pingServer = async (req, res) => {
  try {
    // If driver_id is provided, check that driver's status too
    if (req.query.driver_id) {
      const [drivers] = await pool.query(`
        SELECT d.*, u.name, u.email 
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
      `, [req.query.driver_id]);
      
      if (drivers.length > 0) {
        const driver = drivers[0];
        return res.status(200).json({ 
          success: true, 
          message: 'Server is online',
          timestamp: new Date().toISOString(),
          driver_info: {
            id: driver.id,
            name: driver.name || driver.fullname,
            email: driver.email,
            approval_status: driver.approval_status,
            online_status: driver.online_status
          }
        });
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Server is online',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in ping server:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update driver location (API fallback when Firebase fails)
exports.updateDriverLocation = async (req, res) => {
  try {
    const { 
      driver_id,
      latitude, 
      longitude,
      heading,
      accuracy,
      speed,
      timestamp,
      driver_name,
      is_available
    } = req.body;
    
    if (!driver_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Driver ID, latitude and longitude are required' 
      });
    }

    // Check if driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driver_id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Driver not found' 
      });
    }

    // Update driver's location in the database
    await pool.query(`
      UPDATE drivers 
      SET current_latitude = ?, 
          current_longitude = ?,
          heading = ?,
          online_status = 'online',
          last_location_update = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [latitude, longitude, heading || 0, driver_id]);

    // Also update the driver_locations table for history
    await pool.query(`
      INSERT INTO driver_locations (
        driver_id, 
        latitude, 
        longitude, 
        heading, 
        accuracy, 
        speed, 
        timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      driver_id,
      latitude,
      longitude,
      heading || 0,
      accuracy || 0,
      speed || 0,
      timestamp ? new Date(timestamp) : new Date()
    ]);

    // If Firebase Admin is available, try to update Firebase as well as a backup
    if (global.firebaseAdmin) {
      try {
        const dbRef = global.firebaseAdmin.database().ref(`drivers_online/${driver_id}`);
        await dbRef.update({
          latitude: latitude,
          longitude: longitude,
          heading: heading || 0,
          accuracy: accuracy || 0,
          speed: speed || 0,
          timestamp: global.firebaseAdmin.database.ServerValue.TIMESTAMP,
          driver_name: driver_name || 'Unknown',
          driver_id: driver_id,
          is_available: is_available || true
        });
      } catch (firebaseError) {
        console.log('Could not update Firebase, but MySQL update succeeded:', firebaseError);
        // Don't fail the request if Firebase update fails
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'Driver location updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update driver location'
    });
  }
};

// Set driver as offline
exports.setDriverOffline = async (req, res) => {
  try {
    const { driver_id } = req.body;
    
    if (!driver_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Driver ID is required' 
      });
    }

    // Check if driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driver_id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Driver not found' 
      });
    }

    // Update driver status to offline
    await pool.query(`
      UPDATE drivers 
      SET online_status = 'offline'
      WHERE id = ?
    `, [driver_id]);

    // If Firebase Admin is available, try to remove from Firebase as well
    if (global.firebaseAdmin) {
      try {
        const dbRef = global.firebaseAdmin.database().ref(`drivers_online/${driver_id}`);
        await dbRef.remove();
      } catch (firebaseError) {
        console.log('Could not update Firebase, but MySQL update succeeded:', firebaseError);
        // Don't fail the request if Firebase update fails
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'Driver marked as offline'
    });
  } catch (error) {
    console.error('Error setting driver offline:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update driver status'
    });
  }
};

// Fix drivers with empty approval_status
exports.fixDriversApprovalStatus = async (req, res) => {
  try {
    // Find drivers with empty approval_status
    const [drivers] = await pool.query(`
      SELECT * FROM drivers 
      WHERE approval_status IS NULL OR approval_status = ''
    `);
    
    if (drivers.length === 0) {
      return res.json({
        success: true,
        message: 'No drivers found with empty approval status',
        count: 0
      });
    }
    
    // Update drivers with default 'pending' status
    await pool.query(`
      UPDATE drivers
      SET approval_status = 'pending'
      WHERE approval_status IS NULL OR approval_status = ''
    `);
    
    res.json({
      success: true,
      message: `Fixed approval status for ${drivers.length} drivers`,
      fixedDrivers: drivers.map(d => ({
        id: d.id, 
        name: d.fullname,
        newStatus: 'pending'
      }))
    });
  } catch (error) {
    console.error('Error fixing driver approval status:', error);
    res.status(500).json({ error: 'Failed to fix driver approval status' });
  }
};

// Update driver password (syncs with Firebase)
exports.updateDriverPassword = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Check if the driver exists
    const [checkRows] = await pool.query(`
      SELECT * FROM drivers WHERE id = ?
    `, [driverId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const driver = checkRows[0];
    
    // Update password in users table - password should be in users table, not drivers table
    await pool.query(`
      UPDATE users
      SET password = ?
      WHERE id = ?
    `, [password, driver.user_id]);
    
    // If Firebase Admin is available, update the Firebase user password too
    if (global.firebaseAdmin) {
      try {
        // Check if user exists in Firebase
        try {
          await global.firebaseAdmin.auth().getUser(driverId);
          
          // User exists, update password
          await global.firebaseAdmin.auth().updateUser(driverId, {
            password: password
          });
          console.log(`Updated Firebase password for driver ID: ${driverId}`);
        } catch (userNotFoundError) {
          if (userNotFoundError.code === 'auth/user-not-found') {
            // User doesn't exist in Firebase, create them
            await global.firebaseAdmin.auth().createUser({
              uid: driverId,
              email: driver.email,
              password: password,
              displayName: driver.fullname,
              disabled: false
            });
            console.log(`Created Firebase user for driver ID: ${driverId}`);
          } else {
            throw userNotFoundError;
          }
        }
      } catch (firebaseError) {
        console.error('Firebase error updating password:', firebaseError);
        // Continue with MySQL update even if Firebase operation fails
        return res.status(207).json({ 
          success: true, 
          warning: 'Password updated in database but Firebase update failed',
          error: firebaseError.message
        });
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully in both database and Firebase'
    });
    
  } catch (error) {
    console.error('Error updating driver password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

// Get driver by user_id (for driver home screen to fetch driver ID)
exports.getDriverByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching driver for userId: ${userId}`);
    
    // Query database to get driver by user_id
    const [rows] = await pool.query(`
      SELECT d.*, u.name, u.email 
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.user_id = ?
      LIMIT 1
    `, [userId]);
    
    if (rows.length === 0) {
      console.log(`⚠️ No driver found for userId: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Driver not found for this user'
      });
    }
    
    const driver = rows[0];
    console.log(`✅ Found driver: ${driver.id} for userId: ${userId}`);
    
    // Helper function to build correct image URLs
    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      const path = imagePath.startsWith('uploads/') ? imagePath : `uploads/${imagePath}`;
      return `${req.protocol}://${req.get('host')}/${path}`;
    };
    
    res.json({
      success: true,
      driver: {
        id: driver.id,
        driverId: driver.id.toString(),
        userId: driver.user_id,
        name: driver.name,
        phone: driver.mobile_number,
        email: driver.email,
        profileImg: buildImageUrl(driver.profile_image),
        cnicFront: buildImageUrl(driver.cnic_front_image),
        cnicBack: buildImageUrl(driver.cnic_back_image),
        vehicleNumber: driver.vehicle_number,
        licenseNumber: driver.licence_number,
        licenseImage: buildImageUrl(driver.licence_image),
        expiryDate: driver.licence_expiry,
        rating: parseFloat(driver.rating || 0),
        approval: driver.approval_status || 'pending',
        onlineStatus: driver.online_status || 'offline',
        currentLatitude: parseFloat(driver.current_latitude || 0),
        currentLongitude: parseFloat(driver.current_longitude || 0),
        createdAt: driver.created_at,
        lastLocationUpdate: driver.last_location_update
      }
    });
  } catch (error) {
    console.error('❌ Error in /by-user endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 
