-- Rollback Migration 007: Remove appointment fields from service_items table
-- Date: 2024-11-07
-- Description: Rollback appointment-based service fields if needed

-- Drop indexes first
DROP INDEX IF EXISTS idx_service_items_rating ON service_items;
DROP INDEX IF EXISTS idx_service_items_24hours ON service_items;

-- Remove appointment columns
ALTER TABLE service_items 
DROP COLUMN IF EXISTS available_time,
DROP COLUMN IF EXISTS rating,
DROP COLUMN IF EXISTS available_24_hours;

-- Remove comments from existing columns
ALTER TABLE service_items 
MODIFY COLUMN price DECIMAL(10,2) NOT NULL,
MODIFY COLUMN unit VARCHAR(50) NOT NULL,
MODIFY COLUMN min_quantity DECIMAL(10,2) DEFAULT 1.00;

-- Success message
SELECT 'Migration 007 rollback completed successfully - Appointment fields removed from service_items table' AS message;
