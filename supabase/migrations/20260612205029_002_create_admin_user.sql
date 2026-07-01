/*
# Create Admin User

1. Purpose
- Create admin user for medical dashboard access
- Email: louizadjalane20@gmail.com
- Password: Admin2026!
- Email confirmation bypassed (email_confirmed_at set to NOW)

2. Security
- User created directly in auth.users table
- Password hashed with bcrypt
- Email marked as confirmed to skip email verification
- Only this specific email can access admin dashboard

3. Notes
- Uses pgcrypto extension for password hashing
- User is created as auto-generated UUID
- Sets raw_app_meta_data with role
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin user with hashed password
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'louizadjalane20@gmail.com',
  crypt('Admin2026!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
  '{"full_name": "Dr. Aziz Djalane"}'::jsonb,
  false,
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'louizadjalane20@gmail.com'
);

-- Create identity for the user (required for email auth)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  'louizadjalane20@gmail.com',
  jsonb_build_object('sub', u.id::text, 'email', 'louizadjalane20@gmail.com'),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'louizadjalane20@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);