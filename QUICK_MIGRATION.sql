-- Quick Migration: Add appointment fields to service_items
-- Run this directly in your database

-- Add new columns
ALTER TABLE service_items 
ADD COLUMN IF NOT EXISTS available_time VARCHAR(100) NULL COMMENT 'Available time slot (e.g., "10 AM - 3 PM")',
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 4.00 COMMENT 'Service provider rating (0.00 - 5.00)',
ADD COLUMN IF NOT EXISTS available_24_hours TINYINT(1) DEFAULT 0 COMMENT '1 if available 24 hours, 0 otherwise';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_items_rating ON service_items(rating);
CREATE INDEX IF NOT EXISTS idx_service_items_24hours ON service_items(available_24_hours);

-- Verify columns added
SELECT 'Migration completed successfully!' AS status;
DESCRIBE service_items;
