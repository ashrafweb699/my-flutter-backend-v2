-- Debug FCM tokens for notifications

-- Check User (ID 5) token
SELECT 
    id, 
    name, 
    email,
    user_type,
    SUBSTRING(fcm_token, 1, 30) as token_preview,
    LENGTH(fcm_token) as token_length,
    fcm_token IS NOT NULL as has_token
FROM users 
WHERE id = 5;

-- Check Admin (ID 1) token
SELECT 
    id, 
    name, 
    email,
    user_type,
    SUBSTRING(fcm_token, 1, 30) as token_preview,
    LENGTH(fcm_token) as token_length,
    fcm_token IS NOT NULL as has_token
FROM users 
WHERE id = 1;

-- Get all user type='user' tokens (what notification query uses)
SELECT 
    id,
    name,
    user_type,
    SUBSTRING(fcm_token, 1, 30) as token_preview
FROM users 
WHERE user_type = 'user' 
  AND fcm_token IS NOT NULL 
  AND fcm_token != '';

-- Check if ID 5 has user_type = 'user'
SELECT id, name, email, user_type 
FROM users 
WHERE id = 5;

-- Get count of tokens for each user type
SELECT 
    user_type,
    COUNT(*) as total_users,
    SUM(CASE WHEN fcm_token IS NOT NULL AND fcm_token != '' THEN 1 ELSE 0 END) as users_with_tokens
FROM users 
GROUP BY user_type;
