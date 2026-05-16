-- Allow anonymous users to insert applications (public exam code route)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert applications" ON entrance_applications;
  CREATE POLICY "Anyone can insert applications" 
    ON entrance_applications FOR INSERT 
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow anonymous users to update applications by ID (for submitting exam results)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can update applications" ON entrance_applications;
  CREATE POLICY "Anyone can update applications" 
    ON entrance_applications FOR UPDATE 
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow anyone to view applications (needed for the public result check)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view applications" ON entrance_applications;
  CREATE POLICY "Anyone can view applications" 
    ON entrance_applications FOR SELECT 
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
