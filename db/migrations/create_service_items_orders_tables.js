const { pool } = require('../../config/db');

module.exports = async function createServiceItemsAndOrdersTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_name VARCHAR(100) NOT NULL,
        sub_item_name VARCHAR(150) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        unit VARCHAR(50) NOT NULL,
        min_quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (service_name),
        INDEX (sub_item_name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        items JSON NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending','confirmed','canceled') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (status)
      );
    `);

    // Optional cart_orders table for persisting carts prior to order placement
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        item_id INT NOT NULL,
        item_name VARCHAR(150) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        unit VARCHAR(50) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending','confirmed','canceled') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (service_name),
        INDEX (item_id),
        INDEX (status)
      );
    `);

    console.log('Service items, orders and cart_orders tables created/verified');
  } catch (error) {
    console.error('Error creating service_items/orders tables:', error);
    throw error;
  }
}


