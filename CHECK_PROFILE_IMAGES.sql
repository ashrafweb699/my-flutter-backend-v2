-- Check profile images in database

-- Check which users have profile images
SELECT id, name, user_type, profile_image 
FROM users 
WHERE profile_image LIKE '%profile-1762155017186%';

-- Check all users' profile images
SELECT id, name, user_type, profile_image 
FROM users 
WHERE profile_image IS NOT NULL 
ORDER BY id;

-- Check if profile image files exist
SELECT 
    id, 
    name, 
    user_type, 
    profile_image,
    CASE 
        WHEN profile_image LIKE 'uploads/%' THEN 'Relative path (correct)'
        WHEN profile_image LIKE 'http%' THEN 'Full URL (wrong - should be relative)'
        WHEN profile_image LIKE '%profile%' THEN 'Filename only (wrong - needs path)'
        ELSE 'Unknown format'
    END as path_format
FROM users 
WHERE profile_image IS NOT NULL 
ORDER BY id;
