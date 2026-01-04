-- Create app_role enum for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles - only admins can view
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create photos table
CREATE TABLE public.photos (
    id TEXT PRIMARY KEY,
    file_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    layout_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Photos are publicly readable (for /p/:id page)
CREATE POLICY "Photos are publicly readable"
ON public.photos
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert photos (via edge function with service role)
CREATE POLICY "Admins can insert photos"
ON public.photos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous inserts for photo uploads (will use edge function)
CREATE POLICY "Allow anonymous photo inserts"
ON public.photos
FOR INSERT
TO anon
WITH CHECK (true);

-- Only admins can delete photos
CREATE POLICY "Admins can delete photos"
ON public.photos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create stickers table
CREATE TABLE public.stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stickers
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Stickers are publicly readable
CREATE POLICY "Stickers are publicly readable"
ON public.stickers
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage stickers
CREATE POLICY "Admins can insert stickers"
ON public.stickers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update stickers"
ON public.stickers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stickers"
ON public.stickers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true);

-- Storage policies for photos bucket
CREATE POLICY "Photos are publicly accessible"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'photos');

CREATE POLICY "Anyone can upload photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Admins can delete photos from storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for stickers bucket
CREATE POLICY "Stickers are publicly accessible"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'stickers');

CREATE POLICY "Admins can upload stickers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stickers from storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'stickers' AND public.has_role(auth.uid(), 'admin'));