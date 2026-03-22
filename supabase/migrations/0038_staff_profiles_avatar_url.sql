-- Add avatar_url column to staff_profiles.
-- The 0035_staff_avatars migration created the storage bucket but omitted
-- the column itself, causing all login queries (which SELECT avatar_url)
-- to fail with a PostgREST 400 "column does not exist" error.

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;
