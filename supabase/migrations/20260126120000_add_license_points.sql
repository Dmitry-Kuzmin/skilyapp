-- Add license_points column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS license_points SMALLINT DEFAULT 8;

-- Add check constraint to ensure points are between 0 and 15
ALTER TABLE profiles 
ADD CONSTRAINT check_license_points_range 
CHECK (license_points >= 0 AND license_points <= 15);

-- Update existing profiles to have 8 points if they are null
UPDATE profiles 
SET license_points = 8 
WHERE license_points IS NULL;

-- Create a function to handle point changes safely
CREATE OR REPLACE FUNCTION update_license_points(user_id UUID, points_delta INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INT;
  new_points INT;
BEGIN
  -- Get current points
  SELECT license_points INTO current_points FROM profiles WHERE id = user_id;
  
  -- Calculate new points
  new_points := current_points + points_delta;
  
  -- Clamp between 0 and 15
  IF new_points > 15 THEN
    new_points := 15;
  ELSIF new_points < 0 THEN
    new_points := 0;
  END IF;
  
  -- Update
  UPDATE profiles 
  SET license_points = new_points 
  WHERE id = user_id;
  
  RETURN new_points;
END;
$$;
