-- Migration: Add appointment fields to service_items table
-- Date: 2024-11-07
-- Description: Add support for appointment-based services (Doctor, Technical Expert, etc.)

-- Add new columns for appointment-based services
ALTER TABLE service_items 
ADD COLUMN available_time VARCHAR(100) NULL COMMENT 'Available time slot (e.g., "10 AM - 3 PM")',
ADD COLUMN rating DECIMAL(3,2) DEFAULT 4.00 COMMENT 'Service provider rating (0.00 - 5.00)',
ADD COLUMN available_24_hours TINYINT(1) DEFAULT 0 COMMENT '1 if available 24 hours, 0 otherwise';

-- Add index for better query performance
CREATE INDEX idx_service_items_rating ON service_items(rating);
CREATE INDEX idx_service_items_24hours ON service_items(available_24_hours);

-- Update existing records with default values
UPDATE service_items 
SET rating = 4.00, 
    available_24_hours = 0 
WHERE rating IS NULL;

-- Add comments to existing columns for clarity
ALTER TABLE service_items 
MODIFY COLUMN price DECIMAL(10,2) NOT NULL COMMENT 'Price per unit (for product-based services)',
MODIFY COLUMN unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement (for product-based services)',
MODIFY COLUMN min_quantity DECIMAL(10,2) DEFAULT 1.00 COMMENT 'Minimum order quantity (for product-based services)';

-- Success message
SELECT 'Migration 007 completed successfully - Appointment fields added to service_items table' AS message;
