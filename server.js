const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { uploadService } = require('./config/cloudinary');
const createDriverRegTable = require('./db/migrations/create_driver_reg_table');
const createDriverLocationsTable = require('./db/migrations/create_driver_locations_table');
const createDeliveryBoysTable = require('./db/migrations/create_delivery_boys_table');
const createCabBookingsTable = require('./db/migrations/create_cab_bookings_table');
const createCabDriverOffersTable = require('./db/migrations/create_cab_driver_offers_table');
const createAuthTables = require('./db/migrations/create_auth_tables');
const createUserProfileTable = require('./db/migrations/create_user_profile_table');
const createRatingsTable = require('./db/migrations/create_ratings_table');
const createProductsTables = require('./db/migrations/create_products_tables');
const createServiceItemsOrdersTables = require('./db/migrations/create_service_items_orders_tables');
const createUserNotificationsTable = require('./db/migrations/create_user_notifications_table');
const createBusManagerTables = require('./db/migrations/create_bus_manager_tables');
const createShopkeeperTables = require('./db/migrations/create_shopkeeper_tables');
const createChatTables = require('./db/migrations/create_chat_tables');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK (optional)
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  
  // Try to get service account from environment variable first, then fallback to file
  let serviceAccount = null;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use environment variable (Railway/production)
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✅ Using Firebase credentials from environment variable');
    } catch (parseError) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', parseError.message);
    }
  } else {
    // Use file (local development)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = require(path.resolve(serviceAccountPath));
      console.log('✅ Using Firebase credentials from file:', serviceAccountPath);
    } else {
      console.log(`⚠️ Service account file not found at ${serviceAccountPath}`);
      console.log('To use Firebase Admin SDK:');
      console.log('1. Go to Firebase Console → Project Settings → Service accounts');
      console.log('2. Click "Generate new private key"');
      console.log('3. Save as "firebase-service-account.json" in backend directory');
      console.log('   OR set FIREBASE_SERVICE_ACCOUNT environment variable with JSON content');
      console.log('4. Restart the server');
    }
  }
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    firebaseAdmin = admin;
  } else {
    // Try to initialize with default credentials as last resort
    try {
      admin.initializeApp();
      console.log('⚠️ Firebase Admin SDK initialized with default credentials');
      firebaseAdmin = admin;
    } catch (innerError) {
      console.error('❌ Could not initialize Firebase Admin SDK:', innerError.message);
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
  console.log('Server will continue without Firebase Admin functionality');
}

// Make firebaseAdmin available globally
global.firebaseAdmin = firebaseAdmin;

// Import routes
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const servicesRoutes = require('./routes/services');
const advertisementsRoutes = require('./routes/advertisements');
const driversRoutes = require('./routes/drivers');
const shopkeepersRoutes = require('./routes/shopkeepers');
const bookingsRoutes = require('./routes/bookings');
const authRoutes = require('./routes/auth');
const userProfileRoutes = require('./routes/user-profile');
const usersRoutes = require('./routes/users');

// DISABLED: FCM Token Cleanup Job 
// Reason: Automatic cleanup was deleting tokens for logged-in users
// Now tokens only cleared on explicit logout
// If manual cleanup needed, call: FCMCleanupJob.runNow()
/* 
try {
  const FCMCleanupJob = require('./jobs/fcmTokenCleanup');
  FCMCleanupJob.start();
  console.log(' FCM token cleanup job started');
} catch (error) {
  console.log(' FCM cleanup job not started:', error.message);
}
*/
console.log('⚠️ FCM automatic cleanup DISABLED - tokens cleared only on logout');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// Make io available in app for controllers
app.set('io', io);

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
// This ensures images are accessible via /uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Run migrations
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Run migrations in sequence
    await createAuthTables();
    await createDriverRegTable();
    await createDriverLocationsTable();
    await createCabBookingsTable();
    await createCabDriverOffersTable();
    await createUserProfileTable();
    await createDeliveryBoysTable();
    await createProductsTables();
    await createUserNotificationsTable();
    if (typeof createServiceItemsOrdersTables === 'function') {
      await createServiceItemsOrdersTables();
      console.log('Service items and orders tables check/creation completed');
    }
    if (typeof createBusManagerTables === 'function') {
      await createBusManagerTables();
      console.log('Bus manager tables check/creation completed');
    }
    if (typeof createChatTables === 'function') {
      await createChatTables();
      console.log('Chat tables check/creation completed');
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// Execute migrations
runMigrations();
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/advertisements', advertisementsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/shopkeepers', shopkeepersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/cab-bookings', require('./routes/cab-bookings'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/simple-upload', require('./routes/simple-upload'));
app.use('/basic-upload', require('./routes/basic-upload'));
app.use('/api', require('./routes/service-items'));
app.use('/api', require('./routes/product-items'));
app.use('/api', require('./routes/orderTracking')(io));
// Orders routes (create order, admin list, user list)
app.use('/api', require('./routes/orders')(io));
// Cart routes
app.use('/api', require('./routes/cart'));
// Notifications routes
app.use('/api/notifications', require('./routes/notifications'));
// FCM routes
app.use('/api/fcm', require('./routes/fcm'));
// FCM Token Health Management routes
app.use('/api/fcm-health', require('./routes/fcm-token-health'));
// Delivery boys routes
app.use('/api/delivery-boys', require('./routes/deliveryBoys'));
app.use('/api', require('./routes/bus')(io));
// Team routes (drivers, delivery boys, bus managers, shopkeepers)
app.use('/api/team', require('./routes/teamRoutes'));
// Chat/Messaging routes
app.use('/api/chat', require('./routes/chat'));
// Call notifications routes
app.use('/api/call-notifications', require('./routes/callNotifications'));

// Dedicated upload endpoint for images
app.post('/upload', uploadService.single('image'), async (req, res) => {
  try {
    console.log('Upload request received:');
    console.log('Request files:', req.files);
    console.log('Request file:', req.file);
    console.log('Request headers:', req.headers);
    
    if (!req.file) {
      console.log('No file received in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded successfully to Cloudinary:', req.file);
    
    // Cloudinary returns the full URL in req.file.path
    const cloudinaryUrl = req.file.path;
    
    console.log('✅ Cloudinary URL:', cloudinaryUrl);
    
    res.status(200).json({
      success: true,
      fileUrl: cloudinaryUrl,
      imageUrl: cloudinaryUrl,
      url: cloudinaryUrl,
      message: 'File uploaded successfully to Cloudinary'
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Gwadar Online Bazaar API',
    endpoints: {
      categories: '/api/categories',
      products: '/api/products',
      services: '/api/services',
      advertisements: '/api/advertisements',
      bookings: '/api/bookings',
      upload: '/upload'
    },
    uploads: '/uploads'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Store user socket connections and active calls
const userSockets = {}; // { userId: socketId }
const activeCalls = {}; // { userId: { roomName, otherUserId, callType, startTime } }

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);
  
  // Register user with their socket ID
  socket.on('register_user', (data) => {
    const { userId } = data;
    userSockets[userId] = socket.id;
    console.log(`👤 User ${userId} registered with socket ${socket.id}`);
  });
  
  // Order status updates
  socket.on('order_status_update', (payload) => {
    io.emit('order_status_update', payload);
  });
  
  // ============================================
  // VOICE CALL REQUEST
  // ============================================
  socket.on('voice_call_request', async (data) => {
    const { conversationId, roomName, callerId, callerName, receiverId, receiverName } = data;
    
    console.log('📞 VOICE CALL REQUEST:');
    console.log(`   From: ${callerName} (ID: ${callerId})`);
    console.log(`   To: ${receiverName} (ID: ${receiverId})`);
    console.log(`   Room: ${roomName}`);
    console.log(`   Conversation: ${conversationId}`);
    
    // Check if receiver is already in a call
    if (activeCalls[receiverId]) {
      console.log(`⚠️ User ${receiverId} is already in a call`);
      const callerSocketId = userSockets[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_busy', {
          message: `${receiverName} is currently on another call`,
          receiverId,
          receiverName,
        });
      }
      return;
    }
    
    // Mark both users as in call
    activeCalls[callerId] = {
      roomName,
      otherUserId: receiverId,
      callType: 'voice',
      startTime: Date.now(),
    };
    activeCalls[receiverId] = {
      roomName,
      otherUserId: callerId,
      callType: 'voice',
      startTime: Date.now(),
    };
    
    console.log(`✅ Call state created for users ${callerId} and ${receiverId}`);
    
    // Get receiver's socket ID
    const receiverSocketId = userSockets[receiverId];
    
    if (receiverSocketId) {
      // Receiver is online - send Socket.IO notification
      io.to(receiverSocketId).emit('incoming_voice_call', {
        conversationId,
        roomName,
        callerId,
        callerName,
        receiverId,
        receiverName,
      });
      
      console.log(`✅ Voice call notification sent to user ${receiverId} via Socket.IO`);
    } else {
      // Receiver is offline - send FCM notification
      console.log(`⚠️ User ${receiverId} not connected via socket - sending FCM`);
      
      if (firebaseAdmin) {
        try {
          const { pool } = require('./config/db');
          const [users] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [receiverId]);
          
          if (users.length > 0 && users[0].fcm_token) {
            const message = {
              notification: {
                title: `📞 Incoming Call from ${callerName}`,
                body: 'Voice call',
              },
              data: {
                type: 'voice_call',
                roomName,
                callerId: callerId.toString(),
                callerName,
                conversationId: conversationId.toString(),
              },
              token: users[0].fcm_token,
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'cab_booking_channel_v4',
                },
              },
            };
            
            await firebaseAdmin.messaging().send(message);
            console.log(`✅ FCM notification sent to user ${receiverId}`);
          } else {
            console.log(`⚠️ No FCM token for user ${receiverId}`);
          }
        } catch (error) {
          console.error(`❌ Error sending FCM to user ${receiverId}:`, error);
        }
      }
    }
  });
  
  // ============================================
  // VIDEO CALL REQUEST
  // ============================================
  socket.on('video_call_request', async (data) => {
    const { conversationId, roomName, callerId, callerName, receiverId, receiverName } = data;
    
    console.log('📹 VIDEO CALL REQUEST:');
    console.log(`   From: ${callerName} (ID: ${callerId})`);
    console.log(`   To: ${receiverName} (ID: ${receiverId})`);
    console.log(`   Room: ${roomName}`);
    console.log(`   Conversation: ${conversationId}`);
    
    // Check if receiver is already in a call
    if (activeCalls[receiverId]) {
      console.log(`⚠️ User ${receiverId} is already in a call`);
      const callerSocketId = userSockets[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_busy', {
          message: `${receiverName} is currently on another call`,
          receiverId,
          receiverName,
        });
      }
      return;
    }
    
    // Mark both users as in call
    activeCalls[callerId] = {
      roomName,
      otherUserId: receiverId,
      callType: 'video',
      startTime: Date.now(),
    };
    activeCalls[receiverId] = {
      roomName,
      otherUserId: callerId,
      callType: 'video',
      startTime: Date.now(),
    };
    
    console.log(`✅ Call state created for users ${callerId} and ${receiverId}`);
    
    // Get receiver's socket ID
    const receiverSocketId = userSockets[receiverId];
    
    if (receiverSocketId) {
      // Receiver is online - send Socket.IO notification
      io.to(receiverSocketId).emit('incoming_video_call', {
        conversationId,
        roomName,
        callerId,
        callerName,
        receiverId,
        receiverName,
      });
      
      console.log(`✅ Video call notification sent to user ${receiverId} via Socket.IO`);
    } else {
      // Receiver is offline - send FCM notification
      console.log(`⚠️ User ${receiverId} not connected via socket - sending FCM`);
      
      if (firebaseAdmin) {
        try {
          const { pool } = require('./config/db');
          const [users] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [receiverId]);
          
          if (users.length > 0 && users[0].fcm_token) {
            const message = {
              notification: {
                title: `📹 Incoming Call from ${callerName}`,
                body: 'Video call',
              },
              data: {
                type: 'video_call',
                roomName,
                callerId: callerId.toString(),
                callerName,
                conversationId: conversationId.toString(),
              },
              token: users[0].fcm_token,
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'cab_booking_channel_v4',
                },
              },
            };
            
            await firebaseAdmin.messaging().send(message);
            console.log(`✅ FCM notification sent to user ${receiverId}`);
          } else {
            console.log(`⚠️ No FCM token for user ${receiverId}`);
          }
        } catch (error) {
          console.error(`❌ Error sending FCM to user ${receiverId}:`, error);
        }
      }
    }
  });
  
  // ============================================
  // CALL END
  // ============================================
  socket.on('call_ended', (data) => {
    const { userId, roomName } = data;
    
    console.log(`📴 Call ended by user ${userId} in room ${roomName}`);
    
    // Get the other user in the call
    const callInfo = activeCalls[userId];
    if (callInfo) {
      const otherUserId = callInfo.otherUserId;
      
      // Remove both users from active calls
      delete activeCalls[userId];
      delete activeCalls[otherUserId];
      
      console.log(`✅ Call state cleared for users ${userId} and ${otherUserId}`);
      
      // Notify the other user that call ended
      const otherSocketId = userSockets[otherUserId];
      if (otherSocketId) {
        io.to(otherSocketId).emit('call_ended_by_other', {
          userId,
          roomName,
        });
      }
    }
  });
  
  // ============================================
  // CALL DECLINED
  // ============================================
  socket.on('call_declined', (data) => {
    const { callerId, receiverId, roomName } = data;
    
    console.log(`❌ Call declined by user ${receiverId}`);
    
    // Remove both users from active calls
    delete activeCalls[callerId];
    delete activeCalls[receiverId];
    
    console.log(`✅ Call state cleared after decline`);
    
    // Notify caller that call was declined
    const callerSocketId = userSockets[callerId];
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_declined_by_receiver', {
        receiverId,
        roomName,
      });
    }
  });
  
  // ============================================
  // WEBRTC SIGNALING - OFFER
  // ============================================
  socket.on('webrtc_offer', (data) => {
    const { roomName, offer, callerId, receiverId } = data;
    
    console.log(`📡 WebRTC OFFER from user ${callerId} to ${receiverId} in room ${roomName}`);
    
    // Forward offer to receiver
    const receiverSocketId = userSockets[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc_offer', {
        roomName,
        offer,
        callerId,
      });
      console.log(`✅ Offer forwarded to user ${receiverId}`);
    } else {
      console.log(`⚠️ Receiver ${receiverId} not connected`);
    }
  });
  
  // ============================================
  // WEBRTC SIGNALING - ANSWER
  // ============================================
  socket.on('webrtc_answer', (data) => {
    const { roomName, answer, receiverId, callerId } = data;
    
    console.log(`📡 WebRTC ANSWER from user ${receiverId} to ${callerId} in room ${roomName}`);
    
    // Forward answer to caller
    const callerSocketId = userSockets[callerId];
    if (callerSocketId) {
      io.to(callerSocketId).emit('webrtc_answer', {
        roomName,
        answer,
        receiverId,
      });
      console.log(`✅ Answer forwarded to user ${callerId}`);
    } else {
      console.log(`⚠️ Caller ${callerId} not connected`);
    }
  });
  
  // ============================================
  // WEBRTC SIGNALING - ICE CANDIDATE
  // ============================================
  socket.on('webrtc_ice_candidate', (data) => {
    const { roomName, candidate, fromUserId, toUserId } = data;
    
    console.log(`🧊 ICE Candidate from user ${fromUserId} to ${toUserId} in room ${roomName}`);
    
    // Forward ICE candidate to the other user
    const targetSocketId = userSockets[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_ice_candidate', {
        roomName,
        candidate,
        fromUserId,
      });
      console.log(`✅ ICE candidate forwarded to user ${toUserId}`);
    } else {
      console.log(`⚠️ Target user ${toUserId} not connected`);
    }
  });
  
  // ============================================
  // MESSAGE EDITED
  // ============================================
  socket.on('message_edited', (data) => {
    const { messageId, newText, editedAt, conversationId, receiverId } = data;
    
    console.log(`✏️ Message ${messageId} edited in conversation ${conversationId}`);
    
    // Notify receiver
    const receiverSocketId = userSockets[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message_edited', {
        messageId,
        newText,
        editedAt,
        conversationId,
      });
      console.log(`✅ Edit notification sent to user ${receiverId}`);
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    // Remove user from socket mapping
    for (const [userId, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        delete userSockets[userId];
        
        // If user was in a call, end it
        if (activeCalls[userId]) {
          const otherUserId = activeCalls[userId].otherUserId;
          delete activeCalls[userId];
          delete activeCalls[otherUserId];
          
          // Notify other user
          const otherSocketId = userSockets[otherUserId];
          if (otherSocketId) {
            io.to(otherSocketId).emit('call_ended_by_other', {
              userId,
              reason: 'disconnect',
            });
          }
          
          console.log(`📴 Call ended due to disconnect of user ${userId}`);
        }
        
        console.log(`❌ User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server accessible at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  
  console.log('IMPORTANT: If testing on real devices, make sure:');
  console.log('1. Devices are on the same WiFi network');
  console.log(`2. Windows Firewall allows incoming connections on port ${PORT}`);
  console.log('3. Any antivirus software is not blocking Node.js');
  
  // Create tables in sequence
  try {
    console.log('Starting database table creation process...');
    
    // Create driver registration table
    if (typeof createDriverRegTable === 'function') {
      await createDriverRegTable();
      console.log('Driver registration table check/creation completed');
    }
    
    // Create driver locations table
    if (typeof createDriverLocationsTable === 'function') {
      await createDriverLocationsTable();
      console.log('Driver locations table check/creation completed');
    }
    
    // Create cab bookings table
    if (typeof createCabBookingsTable === 'function') {
      await createCabBookingsTable();
      console.log('Cab bookings table check/creation completed');
    }
    
    // Create cab driver offers table
    if (typeof createCabDriverOffersTable === 'function') {
      await createCabDriverOffersTable();
      console.log('Cab driver offers table check/creation completed');
    }
    
    // Create ratings table
    if (typeof createRatingsTable === 'function') {
      await createRatingsTable();
      console.log('Ratings table check/creation completed');
    }
    
    // Create products tables
    if (typeof createProductsTables === 'function') {
      await createProductsTables();
      console.log('Products tables check/creation completed');
    }
    
    console.log('All database tables created/verified successfully');
    console.log('Server is ready to accept requests');
    console.log('test server side code update or not update');
    
  } catch (error) {
    console.error('Error setting up database tables:', error);
  }
});