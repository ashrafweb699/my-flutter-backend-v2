-- Check services table schema

-- Show table structure
DESCRIBE services;

-- Show current ID type and constraints
SHOW CREATE TABLE services;

-- Check if UUID IDs exist
SELECT id, service_name, LENGTH(id) as id_length
FROM services
WHERE LENGTH(id) > 10
LIMIT 5;

-- Check max ID
SELECT MAX(id) as max_id FROM services;
