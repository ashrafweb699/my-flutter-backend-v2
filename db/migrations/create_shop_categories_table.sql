-- Create shop_categories table
CREATE TABLE IF NOT EXISTS shop_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_category_name ON shop_categories(category_name);
