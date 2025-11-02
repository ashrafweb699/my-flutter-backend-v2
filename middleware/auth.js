const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// JWT secret - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'gwadar_online_bazaar_secret_key';

/**
 * Middleware to protect routes
 * Verifies the JWT token and attaches the user to the request object
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // For mobile apps that might send token in a custom header or in the query string
    else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.query.token) {
      token = req.query.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists
    const [users] = await pool.query('SELECT id, name, email, user_type FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists'
      });
    }

    // Attach user to request object
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Specific error for expired token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired. Please log in again.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
    });
  }
};

/**
 * Middleware to restrict access to specific user types
 */
exports.restrictTo = (...userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Admin authentication middleware - combines protect and admin role check
exports.adminAuth = [exports.protect, exports.restrictTo('admin')];

// User authentication middleware - anyone logged in can access
exports.userAuth = [exports.protect];
