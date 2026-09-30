-- Migration 150: Populate Test Staff Data
-- Purpose: Create test staff users for the staff management page
-- Creates staff users with various positions for each school

BEGIN;

-- Get list of schools to populate with test staff
WITH schools_to_populate AS (
  SELECT DISTINCT school_id FROM users WHERE school_id IS NOT NULL AND school_id != 'public'
)

-- Insert test staff users - Principal
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mr. John Adeyemi (Principal)',
  CONCAT('principal-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Male',
  '+2348012345601',
  '123 School Avenue',
  'Lagos',
  'Ikoyi',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Vice Principal
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mrs. Funke Okafor (Vice Principal)',
  CONCAT('vice-principal-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Female',
  '+2348012345602',
  '124 School Avenue',
  'Lagos',
  'Victoria Island',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Head of Academic Affairs
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Dr. Chukwu Emeka (Head of Academics)',
  CONCAT('head-academics-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Male',
  '+2348012345603',
  '125 School Avenue',
  'Lagos',
  'Lekki',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Registrar
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mr. Tunde Akinbile (Registrar)',
  CONCAT('registrar-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Male',
  '+2348012345604',
  '126 School Avenue',
  'Lagos',
  'Surulere',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Bursar
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Miss Amara Okonkwo (Bursar)',
  CONCAT('bursar-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Female',
  '+2348012345605',
  '127 School Avenue',
  'Lagos',
  'Ikeja',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Guidance Counselor
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mrs. Ada Obi (Guidance Counselor)',
  CONCAT('counselor-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Female',
  '+2348012345606',
  '128 School Avenue',
  'Ogun',
  'Abeokuta',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - IT Administrator
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mr. Seun Adekunle (IT Admin)',
  CONCAT('it-admin-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Male',
  '+2348012345607',
  '129 School Avenue',
  'Lagos',
  'Yaba',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Insert test staff users - Librarian
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  school_id,
  'Mrs. Grace Adebayo (Librarian)',
  CONCAT('librarian-', school_id, '@school.local'),
  'STAFF',
  'ACTIVE',
  'Female',
  '+2348012345608',
  '130 School Avenue',
  'Oyo',
  'Ibadan',
  NOW(),
  NOW()
FROM schools_to_populate
ON CONFLICT (email) DO NOTHING;

-- Now insert corresponding staff records with employment details
WITH inserted_staff_users AS (
  SELECT id, school_id, full_name FROM users 
  WHERE role = 'STAFF' AND status = 'ACTIVE' AND created_at >= NOW() - INTERVAL '5 minutes'
)

INSERT INTO staff (user_id, school_id, position, employment_date, status, created_at, updated_at)
SELECT 
  isu.id,
  isu.school_id,
  CASE 
    WHEN isu.full_name LIKE '%Principal%' THEN 'Principal'
    WHEN isu.full_name LIKE '%Vice Principal%' THEN 'Vice Principal'
    WHEN isu.full_name LIKE '%Head of%' THEN 'Head of Academics'
    WHEN isu.full_name LIKE '%Registrar%' THEN 'Registrar'
    WHEN isu.full_name LIKE '%Bursar%' THEN 'Bursar'
    WHEN isu.full_name LIKE '%Counselor%' THEN 'Guidance Counselor'
    WHEN isu.full_name LIKE '%IT%' THEN 'IT Administrator'
    WHEN isu.full_name LIKE '%Librarian%' THEN 'Librarian'
    ELSE 'Staff'
  END,
  NOW() - INTERVAL '2 years',
  'ACTIVE',
  NOW(),
  NOW()
FROM inserted_staff_users isu
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
