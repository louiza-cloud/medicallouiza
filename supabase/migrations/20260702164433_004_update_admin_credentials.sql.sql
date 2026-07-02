/*
# Update Admin Credentials

1. Purpose
- Update the admin user password to: medicallouiza2026
- The email remains: louizadjalane20@gmail.com

2. Changes
- Update the encrypted_password field in auth.users table
- Use bcrypt hashing for the new password

3. Security
- Password is properly hashed with bcrypt
- Only this specific email can access admin dashboard
*/

-- Update admin user password
UPDATE auth.users
SET 
  encrypted_password = crypt('medicallouiza2026', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'louizadjalane20@gmail.com';