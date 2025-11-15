-- Migration: Fix missing columns in driver_locations and order_tracking tables
-- This migration adds missing columns that are referenced in the code

-- Add last_seen column to driver_locations if it doesn't exist
ALTER TABLE driver_locations 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add tracking_start_time column to order_tracking if it doesn't exist
ALTER TABLE order_tracking 
ADD COLUMN IF NOT EXISTS tracking_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add accepted_by column to order_tracking if it doesn't exist (for tracking who accepted the order)
ALTER TABLE order_tracking 
ADD COLUMN IF NOT EXISTS accepted_by INT;

-- Add order_type column to order_tracking if it doesn't exist
ALTER TABLE order_tracking 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'product';

-- Create index on last_seen for better query performance
ALTER TABLE driver_locations 
ADD INDEX IF NOT EXISTS idx_last_seen (last_seen);

-- Verify the columns exist
SHOW COLUMNS FROM driver_locations;
SHOW COLUMNS FROM order_tracking;
