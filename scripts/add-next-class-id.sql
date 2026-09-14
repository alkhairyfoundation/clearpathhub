-- ============================================================================
-- ADD next_class_id TO classes TABLE
-- ============================================================================
-- This column enables automatic student promotion by linking each class
-- to the next level's class.
--
-- Run this in Supabase SQL Editor or Neon SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS).
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'next_class_id'
  ) THEN
    ALTER TABLE classes ADD COLUMN next_class_id UUID REFERENCES classes(id);
    
    -- Populate next_class_id: each class at level N links to first class at level N+1
    UPDATE classes c1
    SET next_class_id = (
      SELECT c2.id
      FROM classes c2
      WHERE c2.level > c1.level
      ORDER BY c2.level, c2.name
      LIMIT 1
    )
    WHERE EXISTS (
      SELECT 1 FROM classes c2 WHERE c2.level > c1.level
    );
    
    RAISE NOTICE 'Added next_class_id column and populated relationships';
  ELSE
    RAISE NOTICE 'next_class_id already exists, skipping migration';
  END IF;
END $$;
