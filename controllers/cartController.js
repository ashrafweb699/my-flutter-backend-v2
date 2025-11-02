const { pool } = require('../config/db');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { userId, serviceName, itemId, itemName, quantity, unit, totalPrice } = req.body;
    
    console.log('🛒 CartController.addToCart called');
    console.log('🛒 Data:', { userId, serviceName, itemId, itemName, quantity, unit, totalPrice });
    
    // Validate required fields (itemId can be 0 for some edge cases, but must exist)
    if (!userId || !serviceName || itemId === undefined || itemId === null || !itemName || !quantity || !unit || !totalPrice) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if item already exists in cart for this user
    const [existing] = await pool.query(
      `SELECT * FROM cart_orders WHERE user_id = ? AND item_id = ? AND status = 'pending'`,
      [userId, itemId]
    );

    console.log('🛒 Existing items:', existing.length);

    if (existing.length > 0) {
      // Update existing item
      console.log('🛒 Updating existing item');
      await pool.query(
        `UPDATE cart_orders SET quantity = ?, total_price = ? WHERE user_id = ? AND item_id = ? AND status = 'pending'`,
        [quantity, totalPrice, userId, itemId]
      );
    } else {
      // Add new item
      console.log('🛒 Adding new item');
      await pool.query(
        `INSERT INTO cart_orders (user_id, service_name, item_id, item_name, quantity, unit, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, serviceName, itemId, itemName, quantity, unit, totalPrice]
      );
    }

    console.log('✅ Item added/updated successfully');
    res.json({ success: true, message: 'Item added to cart' });
  } catch (e) {
    console.error('❌ cart.addToCart error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's cart items
exports.getUserCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('🛒 CartController.getUserCart called for userId:', userId);
    
    if (!userId) return res.status(400).json({ message: 'userId required' });
    
    const [rows] = await pool.query(
      `SELECT * FROM cart_orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC`,
      [userId]
    );
    
    console.log('🛒 Found', rows.length, 'cart items for user', userId);
    res.json({ items: rows });
  } catch (e) {
    console.error('❌ cart.getUserCart error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    
    if (!userId || itemId === undefined || itemId === null) {
      return res.status(400).json({ message: 'userId and itemId required' });
    }

    await pool.query(
      `DELETE FROM cart_orders WHERE user_id = ? AND item_id = ? AND status = 'pending'`,
      [userId, itemId]
    );

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (e) {
    console.error('cart.removeFromCart error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear user's cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    
    await pool.query(
      `DELETE FROM cart_orders WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    res.json({ success: true, message: 'Cart cleared' });
  } catch (e) {
    console.error('cart.clearCart error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
