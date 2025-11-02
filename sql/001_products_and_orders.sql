-- ====================================================================
-- Gwadar Online Bazaar - SQL Setup for Products Items + Orders Support
-- MySQL 8.0+
-- This script creates products_items and order-related tables and indexes.
-- Safe to run multiple times (uses IF NOT EXISTS where supported).
-- ====================================================================

-- 0) PRODUCTS TABLE (intermediate level between categories and items)
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT NULL,
  image_url   VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category_id),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES products_categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1) PRODUCTS SUB-ITEMS (now references products instead of categories directly)
CREATE TABLE IF NOT EXISTS products_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,           -- Now references products table
  sub_item_name VARCHAR(150) NOT NULL,
  description   TEXT NULL,
  image_url     VARCHAR(255) NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit          VARCHAR(50) NOT NULL,
  min_quantity  DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_items_product (product_id),
  CONSTRAINT fk_products_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration: Update existing products_items to use products table
-- (This will need to be run manually after creating sample products)
-- For existing data migration, we'll temporarily keep category_id column
ALTER TABLE products_items 
  ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER id,
  ADD INDEX IF NOT EXISTS idx_products_items_category_legacy (category_id);


-- 2) ORDERS: add helpful indexes + optional lifecycle timestamps
-- Safe to run multiple times - checks for existing indexes first

-- Add indexes only if they don't exist
SET @sql = (
  SELECT IF(
    (
      SELECT COUNT(*) 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = 'orders' 
        AND index_name = 'idx_orders_status'
    ) = 0,
    'ALTER TABLE orders ADD INDEX idx_orders_status (status)',
    'SELECT "Index idx_orders_status already exists"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    (
      SELECT COUNT(*) 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = 'orders' 
        AND index_name = 'idx_orders_timestamp'
    ) = 0,
    'ALTER TABLE orders ADD INDEX idx_orders_timestamp (timestamp)',
    'SELECT "Index idx_orders_timestamp already exists"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    (
      SELECT COUNT(*) 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = 'orders' 
        AND index_name = 'idx_orders_userId'
    ) = 0,
    'ALTER TABLE orders ADD INDEX idx_orders_userId (userId)',
    'SELECT "Index idx_orders_userId already exists"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    (
      SELECT COUNT(*) 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = 'orders' 
        AND index_name = 'idx_orders_category'
    ) = 0,
    'ALTER TABLE orders ADD INDEX idx_orders_category (category)',
    'SELECT "Index idx_orders_category already exists"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional: lifecycle timestamps (use IF NOT EXISTS to avoid duplicate column errors)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL AFTER timestamp,
  ADD COLUMN IF NOT EXISTS canceled_at DATETIME NULL AFTER accepted_at,
  ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL AFTER canceled_at;


-- 3) ORDER ITEMS: relational storage of each item in an order (services or products)
CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  service_name VARCHAR(100) NULL,        -- services flow
  category_id  INT NULL,                  -- products flow (FK to product categories)
  item_id      INT NOT NULL,              -- service_items.id or products_items.id
  item_name    VARCHAR(150) NOT NULL,
  unit         VARCHAR(50) NOT NULL,
  quantity     DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_item_id (item_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 4) ORDER STATUS HISTORY: timeline of order status changes
CREATE TABLE IF NOT EXISTS order_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  status      VARCHAR(50) NOT NULL,   -- pending, confirmed, delivered, canceled
  note        VARCHAR(255) NULL,
  changed_by  VARCHAR(50) NOT NULL,   -- 'system' | 'admin' | 'user' | 'driver'
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_history_order (order_id, created_at),
  INDEX idx_status_history_status (status),
  CONSTRAINT fk_status_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5) ORDER ASSIGNMENTS (optional): driver assignment lifecycle
CREATE TABLE IF NOT EXISTS order_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL,
  driver_id     INT NOT NULL,
  assigned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at   DATETIME NULL,
  picked_at     DATETIME NULL,
  delivered_at  DATETIME NULL,
  status        VARCHAR(50) NOT NULL DEFAULT 'assigned', -- assigned/accepted/picked/delivered
  INDEX idx_assign_order (order_id),
  INDEX idx_assign_driver (driver_id),
  CONSTRAINT fk_assign_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 6) NOTIFICATIONS (if not already present): user/admin notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL,
  order_id    INT NULL,
  title       VARCHAR(150) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL, -- 'order_update', 'promo', etc.
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read, created_at),
  CONSTRAINT fk_notif_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 7) SAMPLE DATA FOR NEW STRUCTURE (uncomment if needed)
-- Example: Laptop Category -> Laptop Product -> Various Laptop Models

-- First create a product under laptop category
-- INSERT INTO products (category_id, name, description, image_url) 
-- VALUES (2, 'Laptop', 'Various laptop brands and models', 'uploads/products/laptop.png');

-- Then create sub-items for that product
-- INSERT INTO products_items (product_id, sub_item_name, description, image_url, price, unit, min_quantity)
-- VALUES 
--   (1, 'HP-Laptop i5', 'HP Laptop with Intel i5 processor', 'uploads/products/hp-i5.png', 45000.00, 'Item', 1.00),
--   (1, 'Dell-Laptop i3', 'Dell Laptop with Intel i3 processor', 'uploads/products/dell-i3.png', 35000.00, 'Item', 1.00),
--   (1, 'Acer-Laptop i7', 'Acer Laptop with Intel i7 processor', 'uploads/products/acer-i7.png', 55000.00, 'Item', 1.00);

-- Order status example
-- INSERT INTO order_status_history (order_id, status, note, changed_by)
-- VALUES (1, 'pending', 'Order created', 'system');

-- ====================================================================
-- END OF SCRIPT
-- ====================================================================
