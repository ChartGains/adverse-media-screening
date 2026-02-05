-- Migration: Add manager_id column to user_profiles
-- Run this in Supabase SQL Editor to add manager support

-- Add manager_id column with self-referencing foreign key
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager ON public.user_profiles(manager_id);
