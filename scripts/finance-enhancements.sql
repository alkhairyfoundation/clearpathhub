-- ============================================================================
-- CLEARPATH EDU HUB - FINANCE ENHANCEMENTS MIGRATION
-- Fee Structures, Payment Uploads, Receipt Enhancements
-- ============================================================================

-- 1. FEE STRUCTURES (published term fees per class)
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. FEE STRUCTURE ITEMS (line items: tuition, hostel, books, etc.)
CREATE TABLE IF NOT EXISTS fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PAYMENT UPLOADS (parent-submitted receipt proof)
CREATE TABLE IF NOT EXISTS payment_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
  student_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  receipt_url TEXT NOT NULL,
  storage_path TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Enhance receipts table with verification & partial payment tracking
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS verified_status TEXT DEFAULT 'verified' CHECK (verified_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'installment'));
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(10,2) DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 5. RLS Policies for new tables
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- Fee structures: admins and accountants can do everything
DROP POLICY IF EXISTS "Admins full access fee_structures" ON fee_structures;
CREATE POLICY "Admins full access fee_structures" ON fee_structures
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant'))
  );

-- Parents can read published fee structures for their children's class
DROP POLICY IF EXISTS "Parents read published fee_structures" ON fee_structures;
CREATE POLICY "Parents read published fee_structures" ON fee_structures
  FOR SELECT USING (
    status = 'published' AND (
      auth.uid() IN (SELECT id FROM profiles WHERE role = 'parent')
    )
  );

-- Fee structure items: same as parent
DROP POLICY IF EXISTS "Admins full access fee_structure_items" ON fee_structure_items;
CREATE POLICY "Admins full access fee_structure_items" ON fee_structure_items
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant'))
  );

DROP POLICY IF EXISTS "Parents read fee_structure_items" ON fee_structure_items;
CREATE POLICY "Parents read fee_structure_items" ON fee_structure_items
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'parent')
  );

-- Payment uploads: admins/accountants full access
DROP POLICY IF EXISTS "Admins full access payment_uploads" ON payment_uploads;
CREATE POLICY "Admins full access payment_uploads" ON payment_uploads
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'accountant'))
  );

-- Parents can insert and view their own payment uploads
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures(class_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_term_id ON fee_structures(term_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_status ON fee_structures(status);
CREATE INDEX IF NOT EXISTS idx_fee_structure_items_fee_structure_id ON fee_structure_items(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_student_id ON payment_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_parent_id ON payment_uploads(parent_id);
CREATE INDEX IF NOT EXISTS idx_payment_uploads_status ON payment_uploads(status);
CREATE INDEX IF NOT EXISTS idx_receipts_verified_status ON receipts(verified_status);
