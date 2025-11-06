-- Add last_location_update column to drivers table if it doesn't exist
-- Run this SQL directly on Railway MySQL database

-- Check if column exists first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'drivers' 
  AND COLUMN_NAME = 'last_location_update';

-- If the above query returns no results, run this:
ALTER TABLE drivers
ADD COLUMN last_location_update DATETIME NULL DEFAULT CURRENT_TIMESTAMP;

-- Verify the column was added
DESCRIBE drivers;

-- Update existing records (if any) to have current timestamp
UPDATE drivers 
SET last_location_update = CURRENT_TIMESTAMP 
WHERE last_location_update IS NULL;

-- Optional: Make it NOT NULL with default after updating existing records
-- ALTER TABLE drivers
-- MODIFY COLUMN last_location_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
