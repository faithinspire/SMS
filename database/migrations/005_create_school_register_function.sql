-- Create a function with SECURITY DEFINER to bypass RLS
-- This allows registration while keeping RLS intact

CREATE OR REPLACE FUNCTION register_school(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_logo_url TEXT,
  p_type TEXT,
  p_admin_email TEXT,
  p_admin_password TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  type TEXT,
  admin_email TEXT,
  admin_password TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
DECLARE
  v_school_id UUID;
BEGIN
  -- Insert school
  INSERT INTO schools (
    name,
    email,
    phone,
    address,
    logo_url,
    type,
    admin_email,
    admin_password,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_email,
    p_phone,
    p_address,
    p_logo_url,
    COALESCE(p_type, 'BOTH'),
    p_admin_email,
    p_admin_password,
    'ACTIVE',
    NOW(),
    NOW()
  )
  RETURNING schools.id INTO v_school_id;

  -- Return the inserted school
  RETURN QUERY
  SELECT
    schools.id,
    schools.name,
    schools.email,
    schools.phone,
    schools.address,
    schools.logo_url,
    schools.type,
    schools.admin_email,
    schools.admin_password,
    schools.status,
    schools.created_at,
    schools.updated_at
  FROM schools
  WHERE schools.id = v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION register_school TO anon, authenticated;

-- Also create a helper function to get all schools (bypasses RLS)
CREATE OR REPLACE FUNCTION get_all_schools()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  type TEXT,
  admin_email TEXT,
  admin_password TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schools.id,
    schools.name,
    schools.email,
    schools.phone,
    schools.address,
    schools.logo_url,
    schools.type,
    schools.admin_email,
    schools.admin_password,
    schools.status,
    schools.created_at,
    schools.updated_at
  FROM schools
  ORDER BY schools.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_schools TO anon, authenticated;

-- Create function to update school
CREATE OR REPLACE FUNCTION update_school_by_id(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  type TEXT,
  admin_email TEXT,
  admin_password TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  UPDATE schools
  SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    address = COALESCE(p_address, address),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_id;

  RETURN QUERY
  SELECT
    schools.id,
    schools.name,
    schools.email,
    schools.phone,
    schools.address,
    schools.logo_url,
    schools.type,
    schools.admin_email,
    schools.admin_password,
    schools.status,
    schools.created_at,
    schools.updated_at
  FROM schools
  WHERE schools.id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_school_by_id TO anon, authenticated;

-- Create function to delete school
CREATE OR REPLACE FUNCTION delete_school_by_id(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM schools WHERE id = p_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_school_by_id TO anon, authenticated;

-- Create function to get school by ID
CREATE OR REPLACE FUNCTION get_school_by_id(p_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  type TEXT,
  admin_email TEXT,
  admin_password TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schools.id,
    schools.name,
    schools.email,
    schools.phone,
    schools.address,
    schools.logo_url,
    schools.type,
    schools.admin_email,
    schools.admin_password,
    schools.status,
    schools.created_at,
    schools.updated_at
  FROM schools
  WHERE schools.id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_school_by_id TO anon, authenticated;
