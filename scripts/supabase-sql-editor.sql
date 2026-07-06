-- ============================================================================
-- Run this ENTIRE script in Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. FEE STRUCTURES
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID,
  term_id UUID,
  class_id UUID,
  title TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. FEE STRUCTURE ITEMS
CREATE TABLE IF NOT EXISTS fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PAYMENT UPLOADS
CREATE TABLE IF NOT EXISTS payment_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID,
  fee_structure_id UUID,
  student_id UUID,
  parent_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  receipt_url TEXT NOT NULL,
  storage_path TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID,
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ADD COLUMNS TO RECEIPTS
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS verified_status TEXT DEFAULT 'verified' CHECK (verified_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'installment'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(10,2) DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 5. ADD CLASS_LEVEL TO MOCK_EXAMS (fix for "class_level column not found" error)
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS class_level TEXT;

-- 6. RLS POLICIES
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access fee_structures" ON fee_structures;
CREATE POLICY "Admins full access fee_structures" ON fee_structures
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant')));

DROP POLICY IF EXISTS "Admins full access fee_structure_items" ON fee_structure_items;
CREATE POLICY "Admins full access fee_structure_items" ON fee_structure_items
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant')));

DROP POLICY IF EXISTS "Admins full access payment_uploads" ON payment_uploads;
CREATE POLICY "Admins full access payment_uploads" ON payment_uploads
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant')));

DROP POLICY IF EXISTS "Parents read published fee_structures" ON fee_structures;
CREATE POLICY "Parents read published fee_structures" ON fee_structures
  FOR SELECT USING (
    status = 'published' AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'parent')
  );

DROP POLICY IF EXISTS "Parents read fee_structure_items" ON fee_structure_items;
CREATE POLICY "Parents read fee_structure_items" ON fee_structure_items
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'parent')
  );

DROP POLICY IF EXISTS "Parents insert payment_uploads" ON payment_uploads;
CREATE POLICY "Parents insert payment_uploads" ON payment_uploads
  FOR INSERT WITH CHECK (
    auth.uid() = parent_id AND
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'parent')
  );

DROP POLICY IF EXISTS "Parents view own payment_uploads" ON payment_uploads;
CREATE POLICY "Parents view own payment_uploads" ON payment_uploads
  FOR SELECT USING (
    auth.uid() = parent_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant'))
  );

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_term_id ON fee_structures(term_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_status ON fee_structures(status);
CREATE INDEX IF NOT EXISTS idx_fee_structure_items_fee_structure_id ON fee_structure_items(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_student_id ON payment_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_parent_id ON payment_uploads(parent_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_status ON payment_uploads(status);
CREATE INDEX IF NOT EXISTS idx_receipts_verified_status ON receipts(verified_status);
