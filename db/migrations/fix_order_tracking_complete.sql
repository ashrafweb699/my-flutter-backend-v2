-- ========================================
-- Complete Migration for Order Tracking
-- ========================================

-- Step 1: Add accepted_by column to order_tracking
-- Run this first, ignore error if column already exists
ALTER TABLE order_tracking 
ADD COLUMN accepted_by INT NULL AFTER driver_id;

-- Step 2: Add index for accepted_by
ALTER TABLE order_tracking
ADD INDEX idx_accepted_by (accepted_by);

-- Step 3: Add foreign key constraint
ALTER TABLE order_tracking
ADD CONSTRAINT fk_order_tracking_accepted_by 
FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Update existing records
UPDATE order_tracking 
SET accepted_by = driver_id 
WHERE driver_id IS NOT NULL AND accepted_by IS NULL;

-- ========================================
-- Fix driver_locations table
-- ========================================

-- Drop and recreate driver_locations table with correct structure
DROP TABLE IF EXISTS driver_locations;

CREATE TABLE driver_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL UNIQUE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    speed DECIMAL(8, 2),
    heading DECIMAL(8, 2),
    is_online BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_driver_id (driver_id),
    INDEX idx_is_online (is_online),
    INDEX idx_last_seen (last_seen)
);
