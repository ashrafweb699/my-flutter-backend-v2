-- Migration: Add delivery charges columns to orders table
-- This migration adds columns to track delivery charges and delivery boy earnings

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2) DEFAULT 100.00;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_boy_earning DECIMAL(10, 2) DEFAULT 0.00;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_charge_paid BOOLEAN DEFAULT FALSE;

-- Add index for delivery charge queries
ALTER TABLE orders 
ADD INDEX IF NOT EXISTS idx_delivery_charge (delivery_charge);

-- Verify columns exist
SHOW COLUMNS FROM orders;
