const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const upload = require('./utils/upload');
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

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK (optional)
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  // Check if we have service account credentials
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
  
  if (fs.existsSync(serviceAccountPath)) {
    // Initialize with service account file (load JSON object, not path string)
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized with service account');
    firebaseAdmin = admin;
  } else {
    // Initialize with default credentials (for environments like Firebase hosting)
    console.log(`Service account file not found at ${serviceAccountPath}`);
    console.log('To use Firebase Admin SDK:');
    console.log('1. Go to Firebase Console -> Project Settings -> Service accounts');
    console.log('2. Click "Generate new private key"');
    console.log('3. Save the file as "firebase-service-account.json" in the backend directory');
    console.log('4. Restart the server');
    
    // Try to initialize anyway for development purposes
    try {
      admin.initializeApp();
      console.log('Firebase Admin SDK initialized with default credentials');
      firebaseAdmin = admin;
    } catch (innerError) {
      console.error('Could not initialize with default credentials:', innerError.message);
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

// Start FCM Token Cleanup Job (Daily at 3 AM)
try {
  const FCMCleanupJob = require('./jobs/fcmTokenCleanup');
  FCMCleanupJob.start();
  console.log(' FCM token cleanup job started');
} catch (error) {
  console.log(' FCM cleanup job not started:', error.message);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

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

// Dedicated upload endpoint for images
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received:');
    console.log('Request files:', req.files);
    console.log('Request file:', req.file);
    console.log('Request headers:', req.headers);
    
    if (!req.file) {
      console.log('No file received in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded successfully:', req.file);
    
    // Get the folder from request if provided (default to 'general')
    const folder = req.body.folder || 'general';
    
    // Get the target subfolder from request if provided
    const targetFolder = req.body.targetFolder;
    
    // If this is for driver registration, validate the email before accepting the upload
    if (folder === 'drivers' && targetFolder && targetFolder.includes('/')) {
      const parts = targetFolder.split('/');
      const driverId = parts[1]; // Format should be "drivers/123456/profile.jpg"
      const email = req.body.email;
      
      if (email) {
        try {
          // Check if driver with this email already exists
          const { pool } = require('./config/db');
          const [existingDrivers] = await pool.query('SELECT d.*, u.email FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = ?', [email]);
          
          if (existingDrivers.length > 0) {
            // Email already exists, delete the uploaded file
            const { deleteUploadedFiles } = require('./utils/file_cleanup');
            await deleteUploadedFiles([req.file.path]);
            
            return res.status(409).json({ 
              error: 'Email already registered',
              exists: true,
              approval: existingDrivers[0].approval_status,
              message: `This email is already registered. Account status: ${existingDrivers[0].approval_status}`
            });
          }
        } catch (error) {
          console.error('Error checking driver email:', error);
        }
      }
    }
    
    // Create the image URL - if file is in a subfolder, include it in the URL
    const uploadPath = req.file.path.replace(/\\/g, '/'); // Convert Windows backslashes to forward slashes
    let relativePath = uploadPath.replace('./uploads/', '').replace('uploads/', '');
    
    // Ensure the path includes the folder structure
    // If relativePath doesn't start with the folder, prepend it
    if (folder && folder !== 'general' && !relativePath.startsWith(folder + '/')) {
      relativePath = `${folder}/${relativePath}`;
    }
    
    const relativeFull = `uploads/${relativePath}`;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
    
    console.log('Generated image URL:', imageUrl);
    console.log('Relative path for database:', relativeFull);
    
    res.status(200).json({
      success: true,
      imageUrl: relativeFull,  // Return relative path instead of full URL
      filename: req.file.filename,
      relativePath: relativePath,
      relativeFull: relativeFull, // Include the full relative path for database storage
      url: relativeFull, // Adding this for compatibility with driver registration
      folder: folder
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

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('order_status_update', (payload) => {
    io.emit('order_status_update', payload);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server accessible at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log('test server side code update or not update');
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
    
  } catch (error) {
    console.error('Error setting up database tables:', error);
  }
}); 
