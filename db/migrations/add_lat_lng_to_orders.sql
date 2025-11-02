-- Add latitude and longitude columns to orders table if not exist
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL;


