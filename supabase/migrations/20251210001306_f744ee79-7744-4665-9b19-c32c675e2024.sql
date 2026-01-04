-- Insert admin role for the first admin user
-- First, you need to create a user in Supabase Auth dashboard
-- Then get the user's UUID and update this INSERT statement

-- For testing purposes, let's also create an RPC function to make admin setup easier
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from auth.users by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role (or ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute permission only to authenticated users (for setup only)
-- In production, you might want to restrict this further
REVOKE ALL ON FUNCTION public.make_user_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.make_user_admin(text) TO service_role;