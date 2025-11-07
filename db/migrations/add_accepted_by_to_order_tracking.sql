-- Migration: Add accepted_by column to order_tracking table
-- This column stores the user_id of admin or delivery_boy who accepted the order
-- Different from driver_id which is used for cab bookings

ALTER TABLE order_tracking 
ADD COLUMN accepted_by INT NULL AFTER driver_id,
ADD FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL,
ADD INDEX idx_accepted_by (accepted_by);

-- Update existing records: if driver_id exists, copy it to accepted_by
UPDATE order_tracking 
SET accepted_by = driver_id 
WHERE driver_id IS NOT NULL AND accepted_by IS NULL;
