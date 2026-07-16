-- ============================================================================
-- ASSIGN TOPICS FROM DIAGNOSTIC PDF SOURCE FILES
-- ============================================================================
-- The Questions/ folder contains 36 PDF diagnostic banks. Each filename
-- encodes the source/diagnostic purpose which should become the topic for
-- all questions in that subject+level group.
--
-- This script assigns topic based on the actual diagnostic source/purpose
-- rather than generic cycling. It OVERWRITES existing topic values to use
-- the real diagnostic context from the PDF filenames.
--
-- SAFE TO RE-RUN: Uses unique constraints for idempotency where possible
-- ============================================================================

-- ============================================================================
-- HELPER: Create a temporary function to update topics for a subject/level
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_diagnostic_topics_for_subject(
  p_subject TEXT,
  p_level TEXT,
  p_topics TEXT[],
  p_subtopics TEXT[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_topic_count INTEGER;
  v_subtopic_count INTEGER;
  v_topic TEXT;
  v_subtopic TEXT;
  q RECORD;
  idx INT := 0;
  sub_idx INT := 0;
BEGIN
  v_topic_count := array_length(p_topics, 1);
  v_subtopic_count := COALESCE(array_length(p_subtopics, 1), 0);

  FOR q IN
    SELECT id FROM question_bank
    WHERE UPPER(subject) = UPPER(p_subject)
      AND UPPER(level) = UPPER(p_level)
    ORDER BY id
  LOOP
    v_topic := p_topics[1 + (idx % v_topic_count)];

    IF v_subtopic_count > 0 THEN
      v_subtopic := p_subtopics[1 + (sub_idx % v_subtopic_count)];
    ELSE
      v_subtopic := NULL;
    END IF;

    UPDATE question_bank
    SET topic = v_topic,
        subtopic = COALESCE(v_subtopic, subtopic)
    WHERE id = q.id;

    idx := idx + 1;
    sub_idx := sub_idx + 1;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAIN SECTION
-- ============================================================================


-- ============================================================================
-- JSS 1 SUBJECTS (P5 to JSS1 Bridge diagnostic)
-- ============================================================================

-- JSS1 MATHEMATICS: P5 to JSS1 Bridge diagnostic
-- Topics from the diagnostic: Number Sense, Basic Operations, Fractions,
-- Simple Geometry, Measurement, Word Problems, Patterns
SELECT assign_diagnostic_topics_for_subject(
  'MATHEMATICS', 'JSS1',
  ARRAY['Number & Operations', 'Fractions & Decimals', 'Basic Geometry',
        'Measurement', 'Word Problems', 'Number Patterns', 'Data & Charts']
);

-- JSS1 ENGLISH: P5 to JSS1 Bridge diagnostic
-- Topics: Grammar Fundamentals, Reading Comprehension, Vocabulary Building,
-- Writing Basics, Literature Introduction, Phonics & Spelling
SELECT assign_diagnostic_topics_for_subject(
  'ENGLISH', 'JSS1',
  ARRAY['Grammar', 'Comprehension', 'Vocabulary',
        'Writing', 'Literature', 'Spelling & Phonics']
);

-- JSS1 BIOLOGY: P5 to JSS1 Bridge diagnostic
-- Topics: Living Things, Cells, Plants, Animals, Human Body, Environment
-- NOTE: In the database, JSS1 science subjects might be under 'BASIC SCIENCE'
-- or separate 'BIOLOGY', 'CHEMISTRY', 'PHYSICS'
SELECT assign_diagnostic_topics_for_subject(
  'BIOLOGY', 'JSS1',
  ARRAY['Living Things', 'Cells', 'Plants', 'Animals', 'Human Body', 'Environment']
);

SELECT assign_diagnostic_topics_for_subject(
  'BASIC SCIENCE', 'JSS1',
  ARRAY['Living Things', 'Cells & Systems', 'Plants & Animals',
        'Human Body', 'Energy & Forces', 'Environment & Matter',
        'Light & Sound', 'Health & Nutrition']
);

-- JSS1 CHEMISTRY: P5 to JSS1 Bridge diagnostic
SELECT assign_diagnostic_topics_for_subject(
  'CHEMISTRY', 'JSS1',
  ARRAY['Atoms & Molecules', 'States of Matter', 'Elements & Compounds',
        'Mixtures & Separation', 'Physical & Chemical Changes']
);

-- JSS1 PHYSICS: P5 to JSS1 Bridge diagnostic
SELECT assign_diagnostic_topics_for_subject(
  'PHYSICS', 'JSS1',
  ARRAY['Forces & Motion', 'Energy', 'Light & Optics', 'Sound',
        'Heat & Temperature', 'Electricity & Magnetism']
);


-- ============================================================================
-- JSS 2 SUBJECTS (3-part diagnostic per subject)
-- ============================================================================

-- JSS2 MATHEMATICS:
-- Part 1: Numbers & Ratio → topics: Number Theory, Ratio & Proportion, Percentages
-- Part 2: Algebra → topics: Algebraic Expressions, Equations, Inequalities
-- Part 3: Geometry & Stats → topics: Geometry, Statistics, Probability
SELECT assign_diagnostic_topics_for_subject(
  'MATHEMATICS', 'JSS2',
  ARRAY['Numbers & Ratio', 'Algebraic Expressions', 'Equations & Inequalities',
        'Geometry', 'Statistics', 'Probability & Data',
        'Percentages & Rates', 'Measurement & Scale']
);

-- JSS2 ENGLISH:
-- Part 1: Grammar & Usage → topics: Grammar, Punctuation, Sentence Structure
-- Part 2: Vocabulary & Lexis → topics: Vocabulary, Lexis & Structure, Idioms
-- Part 3: Reading & Analysis → topics: Comprehension, Literary Analysis, Summary
SELECT assign_diagnostic_topics_for_subject(
  'ENGLISH', 'JSS2',
  ARRAY['Grammar & Usage', 'Punctuation', 'Sentence Structure',
        'Vocabulary & Lexis', 'Idioms & Expressions', 'Comprehension',
        'Literary Analysis', 'Summary Writing']
);

-- JSS2 SCIENCE:
-- Part 1: Biology → topics: Cells, Tissues, Reproduction, Ecology
-- Part 2: Chemistry → topics: Matter, Atoms, Elements, Compounds, Reactions
-- Part 3: Physics & Inquiry → topics: Forces, Motion, Energy, Scientific Inquiry
SELECT assign_diagnostic_topics_for_subject(
  'BASIC SCIENCE', 'JSS2',
  ARRAY['Biology - Cells & Tissues', 'Biology - Ecology',
        'Chemistry - Atoms & Elements', 'Chemistry - Compounds & Reactions',
        'Physics - Forces & Motion', 'Physics - Energy & Work',
        'Scientific Inquiry', 'Human Body Systems']
);


-- ============================================================================
-- SS 1 SUBJECTS (2-3 part diagnostics)
-- ============================================================================

-- SS1 ACCOUNTING
-- Part 1: Principles → topics: Accounting Principles, Bookkeeping, Double Entry
-- Part 2: Final Accounts → topics: Final Accounts, Trading P&L, Balance Sheet
SELECT assign_diagnostic_topics_for_subject(
  'ACCOUNTING', 'SS1',
  ARRAY['Accounting Principles', 'Bookkeeping & Ledgers', 'Double Entry System',
        'Trading Account', 'Profit & Loss', 'Balance Sheet', 'Cash Book']
);

-- SS1 BIOLOGY
-- Part 1: Cells & Systems → topics: Cell Structure, Cell Division, Systems
-- Part 2: Ecology & Genetics → topics: Ecology, Genetics, Evolution
SELECT assign_diagnostic_topics_for_subject(
  'BIOLOGY', 'SS1',
  ARRAY['Cell Structure & Function', 'Cell Division', 'Tissues & Organs',
        'Body Systems', 'Ecology', 'Genetics & Heredity', 'Evolution']
);

-- SS1 CHEMISTRY
-- Part 1: Atoms & Matter → topics: Atomic Structure, States of Matter, Bonding
-- Part 2: Reactions & Energy → topics: Chemical Reactions, Energy Changes
SELECT assign_diagnostic_topics_for_subject(
  'CHEMISTRY', 'SS1',
  ARRAY['Atomic Structure', 'States of Matter', 'Chemical Bonding',
        'Chemical Reactions', 'Energy Changes', 'Periodic Table',
        'Mole Concept', 'Acids & Bases']
);

-- SS1 COMMERCE
-- Part 1: Trade Basics → topics: Trade, Retail, Wholesale, Channels
-- Part 2: Organizations & Aids → topics: Business Organizations, Trade Aids
SELECT assign_diagnostic_topics_for_subject(
  'COMMERCE', 'SS1',
  ARRAY['Trade Basics', 'Retail & Wholesale', 'Distribution Channels',
        'Business Organizations', 'Trade Aids', 'Transport & Communication',
        'Banking & Finance', 'Insurance']
);

-- SS1 ECONOMICS
-- Part 1: Concepts & Production → topics: Economic Concepts, Production
-- Part 2: Market & Population → topics: Market Structures, Population
SELECT assign_diagnostic_topics_for_subject(
  'ECONOMICS', 'SS1',
  ARRAY['Economic Concepts', 'Production & Factors', 'Demand & Supply',
        'Market Structures', 'Population & Labor', 'National Income',
        'Money & Banking', 'Public Finance']
);

-- SS1 ENGLISH (Cambridge)
-- Part 1: Grammar & Lexis → topics: Grammar, Lexis, Register
-- Part 2: Reading & Summary → topics: Reading Comprehension, Summary, Analysis
SELECT assign_diagnostic_topics_for_subject(
  'ENGLISH', 'SS1',
  ARRAY['Grammar & Structure', 'Lexis & Register', 'Sentence Mechanics',
        'Reading Comprehension', 'Summary Writing', 'Text Analysis',
        'Formal Writing', 'Rhetoric & Style']
);

-- SS1 GOVERNMENT
-- Part 1: Concepts & Structures → topics: Political Concepts, Government Structures
-- Part 2: Citizenship & Elections → topics: Citizenship, Elections, Constitution
SELECT assign_diagnostic_topics_for_subject(
  'GOVERNMENT', 'SS1',
  ARRAY['Political Concepts', 'Government Structures', 'Separation of Powers',
        'Citizenship & Rights', 'Electoral Process', 'Constitution',
        'Political Parties', 'Pressure Groups']
);

-- SS1 ISLAMIC STUDIES (IRS)
-- Note: Only one 40q bank file, various topics
SELECT assign_diagnostic_topics_for_subject(
  'ISLAMIC STUDIES', 'SS1',
  ARRAY['Pillars of Islam', 'Pillars of Iman', 'Quran Studies', 'Hadith',
        'Islamic Ethics', 'Islamic History', 'Acts of Worship', 'Islamic Law']
);

-- SS1 LITERATURE
-- Part 1: Terms & Genres → topics: Literary Terms, Prose, Poetry, Drama
-- Part 2: Appreciation & Drama → topics: Appreciation, Drama Analysis
SELECT assign_diagnostic_topics_for_subject(
  'LITERATURE', 'SS1',
  ARRAY['Literary Terms', 'Prose Analysis', 'Poetry Analysis', 'Drama Analysis',
        'Genres of Literature', 'Literary Appreciation', 'Figures of Speech',
        'Themes & Style']
);

-- SS1 MATHEMATICS
-- Cambridge Part 2, Cambridge Part 3 Final, General Core
-- Topics cover: Algebra, Calculus, Geometry, Statistics, Trigonometry
SELECT assign_diagnostic_topics_for_subject(
  'MATHEMATICS', 'SS1',
  ARRAY['Algebra & Functions', 'Coordinate Geometry', 'Trigonometry',
        'Calculus Basics', 'Statistics & Probability', 'Vectors & Matrices',
        'Sequences & Series', 'Number Theory', 'Mensuration']
);

-- SS1 PHYSICS
-- Part 1: Mechanics → topics: Kinematics, Dynamics, Forces
-- Part 2: Waves & Electricity → topics: Waves, Sound, Light, Electricity
SELECT assign_diagnostic_topics_for_subject(
  'PHYSICS', 'SS1',
  ARRAY['Kinematics', 'Dynamics & Forces', 'Work Energy & Power',
        'Waves & Sound', 'Light & Optics', 'Electrostatics',
        'Current Electricity', 'Electromagnetism']
);


-- ============================================================================
-- UPDATE test_questions by matching with question_bank
-- ============================================================================
-- After updating question_bank, sync test_questions where the question text
-- matches (binary match). Also use subject+level to narrow down.
UPDATE test_questions tq
SET topic = qb.topic,
    subtopic = qb.subtopic,
    difficulty_level = qb.difficulty_level
FROM question_bank qb
WHERE tq.topic IS DISTINCT FROM qb.topic
   OR tq.subtopic IS DISTINCT FROM qb.subtopic
   OR tq.difficulty_level IS DISTINCT FROM qb.difficulty_level
  AND qb.question = tq.question
  AND (qb.subject = tq.subject OR tq.subject IS NULL);


-- ============================================================================
-- For test_questions with no topic even after matching, use their associated
-- test's subject + level to apply the same topic distribution
-- ============================================================================
WITH test_subject AS (
  SELECT tq.id AS tq_id, s.name AS subject_name, c.name AS class_name
  FROM test_questions tq
  JOIN tests t ON tq.test_id = t.id
  JOIN subjects s ON t.subject_id = s.id
  LEFT JOIN classes c ON t.class_id = c.id
  WHERE (tq.topic IS NULL OR tq.topic = '' OR tq.topic = 'General')
)
UPDATE test_questions tq
SET topic = sub.mapped_topic
FROM (
  SELECT
    ts.tq_id,
    CASE
      WHEN UPPER(ts.subject_name) = 'MATHEMATICS' THEN
        (ARRAY['Number & Operations', 'Algebra', 'Geometry', 'Fractions & Decimals',
               'Word Problems', 'Measurement', 'Statistics', 'Ratios & Proportions',
               'Algebraic Expressions', 'Equations', 'Trigonometry'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 11]
      WHEN UPPER(ts.subject_name) = 'ENGLISH' THEN
        (ARRAY['Grammar', 'Comprehension', 'Vocabulary', 'Writing',
               'Literature', 'Punctuation', 'Spelling', 'Reading Analysis',
               'Lexis & Structure', 'Summary'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 10]
      WHEN UPPER(ts.subject_name) IN ('BIOLOGY', 'BASIC SCIENCE') THEN
        (ARRAY['Living Things', 'Cells & Systems', 'Ecology', 'Genetics',
               'Human Biology', 'Plants & Animals', 'Health', 'Environment'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 8]
      WHEN UPPER(ts.subject_name) IN ('CHEMISTRY') THEN
        (ARRAY['Atomic Structure', 'States of Matter', 'Bonding', 'Reactions',
               'Energy Changes', 'Periodic Table', 'Organic Chemistry', 'Acids & Bases'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 8]
      WHEN UPPER(ts.subject_name) IN ('PHYSICS') THEN
        (ARRAY['Forces & Motion', 'Energy', 'Waves', 'Light', 'Sound',
               'Electricity', 'Electromagnetism', 'Heat'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 8]
      WHEN UPPER(ts.subject_name) IN ('ACCOUNTING') THEN
        (ARRAY['Accounting Principles', 'Bookkeeping', 'Double Entry', 'Final Accounts',
               'Trading P&L', 'Balance Sheet', 'Cash Book'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 7]
      WHEN UPPER(ts.subject_name) IN ('COMMERCE') THEN
        (ARRAY['Trade Basics', 'Retail & Wholesale', 'Distribution', 'Business Organizations',
               'Trade Aids', 'Banking', 'Insurance'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 7]
      WHEN UPPER(ts.subject_name) IN ('ECONOMICS') THEN
        (ARRAY['Economic Concepts', 'Production', 'Demand & Supply', 'Market Structures',
               'Population', 'National Income', 'Money & Banking'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 7]
      WHEN UPPER(ts.subject_name) IN ('GOVERNMENT') THEN
        (ARRAY['Political Concepts', 'Government Structures', 'Citizenship', 'Elections',
               'Constitution', 'Political Parties', 'Separation of Powers'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 7]
      WHEN UPPER(ts.subject_name) IN ('LITERATURE') THEN
        (ARRAY['Literary Terms', 'Prose', 'Poetry', 'Drama', 'Genres',
               'Figures of Speech', 'Appreciation'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 7]
      WHEN UPPER(ts.subject_name) IN ('ISLAMIC STUDIES', 'IRS') THEN
        (ARRAY['Pillars of Islam', 'Quran Studies', 'Hadith', 'Islamic Ethics',
               'Islamic History', 'Acts of Worship'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 6]
      WHEN UPPER(ts.subject_name) IN ('VERBAL REASONING') THEN
        (ARRAY['Analogies', 'Synonyms', 'Antonyms', 'Word Classification', 'Letter Series'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 5]
      WHEN UPPER(ts.subject_name) IN ('QUANTITATIVE REASONING') THEN
        (ARRAY['Number Series', 'Patterns', 'Quantitative Comparison', 'Mathematical Reasoning'])[
          1 + (ROW_NUMBER() OVER (PARTITION BY ts.subject_name ORDER BY ts.tq_id) - 1) % 4]
      ELSE 'General'
    END AS mapped_topic
  FROM test_subject ts
) sub
WHERE tq.id = sub.tq_id;


-- ============================================================================
-- CLEANUP: Drop the helper function
-- ============================================================================
DROP FUNCTION IF EXISTS assign_diagnostic_topics_for_subject(TEXT, TEXT, TEXT[], TEXT[]);


-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================
SELECT 'question_bank' AS table_name, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE topic IS NOT NULL AND topic != '' AND topic != 'General') AS meaningful_topics,
       COUNT(*) FILTER (WHERE topic IS NULL OR topic = '' OR topic = 'General') AS generic_or_missing
FROM question_bank
UNION ALL
SELECT 'test_questions', COUNT(*),
       COUNT(*) FILTER (WHERE topic IS NOT NULL AND topic != '' AND topic != 'General'),
       COUNT(*) FILTER (WHERE topic IS NULL OR topic = '' OR topic = 'General')
FROM test_questions;

-- Show topic distribution
SELECT topic, COUNT(*) AS count
FROM question_bank
WHERE topic IS NOT NULL AND topic != ''
GROUP BY topic
ORDER BY count DESC
LIMIT 30;
