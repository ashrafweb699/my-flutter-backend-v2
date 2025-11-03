-- Fix profile image paths if they're incorrect

-- If images are stored as just filename (profile-xyz.png)
-- Update to include path (uploads/profiles/profile-xyz.png)
UPDATE users 
SET profile_image = CONCAT('uploads/profiles/', profile_image)
WHERE profile_image IS NOT NULL 
  AND profile_image NOT LIKE 'uploads/%'
  AND profile_image NOT LIKE 'http%';

-- If images are stored as full URL, extract relative path
-- This assumes URL format: http://domain.com/uploads/profiles/profile-xyz.png
UPDATE users 
SET profile_image = SUBSTRING_INDEX(profile_image, '/uploads/', -1)
WHERE profile_image LIKE 'http%';

-- Add uploads/ prefix if missing
UPDATE users 
SET profile_image = CONCAT('uploads/', profile_image)
WHERE profile_image IS NOT NULL 
  AND profile_image NOT LIKE 'uploads/%';

-- Check results
SELECT id, name, user_type, profile_image FROM users WHERE profile_image IS NOT NULL;
