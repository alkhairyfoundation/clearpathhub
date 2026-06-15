-- ============================================================================
-- RETROFIT MISSING TOPICS FOR EXISTING QUESTIONS
-- ============================================================================
-- Assigns meaningful topics to questions where topic IS NULL.
-- Affects both question_bank and entrance_questions tables.
-- Topics are assigned deterministically based on subject, cycling through
-- a curated list of relevant topics for each subject.
-- SAFE TO RE-RUN: Uses WHERE topic IS NULL, so already-tagged questions
-- are not affected.
-- ============================================================================

-- ============================================================================
-- 1. QUESTION BANK
-- ============================================================================

-- MATHEMATICS
UPDATE question_bank
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 7
      WHEN 0 THEN 'Number Theory'
      WHEN 1 THEN 'Algebra'
      WHEN 2 THEN 'Geometry'
      WHEN 3 THEN 'Fractions'
      WHEN 4 THEN 'Word Problems'
      WHEN 5 THEN 'Measurement'
      WHEN 6 THEN 'Statistics'
    END
  ) AS topic
  FROM question_bank
  WHERE subject = 'MATHEMATICS' AND (topic IS NULL OR topic = '')
) sub
WHERE question_bank.id = sub.id;

-- ENGLISH
UPDATE question_bank
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 6
      WHEN 0 THEN 'Grammar'
      WHEN 1 THEN 'Comprehension'
      WHEN 2 THEN 'Vocabulary'
      WHEN 3 THEN 'Punctuation'
      WHEN 4 THEN 'Spelling'
      WHEN 5 THEN 'Writing'
    END
  ) AS topic
  FROM question_bank
  WHERE subject = 'ENGLISH' AND (topic IS NULL OR topic = '')
) sub
WHERE question_bank.id = sub.id;

-- BASIC SCIENCE
UPDATE question_bank
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 8
      WHEN 0 THEN 'Living Things'
      WHEN 1 THEN 'Plants'
      WHEN 2 THEN 'Animals'
      WHEN 3 THEN 'Human Body'
      WHEN 4 THEN 'Energy'
      WHEN 5 THEN 'Forces'
      WHEN 6 THEN 'Light & Sound'
      WHEN 7 THEN 'Environment'
    END
  ) AS topic
  FROM question_bank
  WHERE subject = 'BASIC SCIENCE' AND (topic IS NULL OR topic = '')
) sub
WHERE question_bank.id = sub.id;

-- VERBAL REASONING
UPDATE question_bank
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 5
      WHEN 0 THEN 'Analogies'
      WHEN 1 THEN 'Synonyms'
      WHEN 2 THEN 'Antonyms'
      WHEN 3 THEN 'Word Classification'
      WHEN 4 THEN 'Letter Series'
    END
  ) AS topic
  FROM question_bank
  WHERE subject = 'VERBAL REASONING' AND (topic IS NULL OR topic = '')
) sub
WHERE question_bank.id = sub.id;

-- QUANTITATIVE REASONING
UPDATE question_bank
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 4
      WHEN 0 THEN 'Number Series'
      WHEN 1 THEN 'Patterns'
      WHEN 2 THEN 'Quantitative Comparison'
      WHEN 3 THEN 'Mathematical Reasoning'
    END
  ) AS topic
  FROM question_bank
  WHERE subject = 'QUANTITATIVE REASONING' AND (topic IS NULL OR topic = '')
) sub
WHERE question_bank.id = sub.id;

-- Any remaining untagged questions (other subjects or missing subject)
UPDATE question_bank
SET topic = 'General'
WHERE (topic IS NULL OR topic = '')
  AND subject NOT IN ('MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'VERBAL REASONING', 'QUANTITATIVE REASONING', 'ISLAMIC STUDIES', 'GENERAL KNOWLEDGE');

-- ============================================================================
-- 2. ENTRANCE QUESTIONS (per-exam questions)
-- ============================================================================

-- MATHEMATICS
UPDATE entrance_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 7
      WHEN 0 THEN 'Number Theory'
      WHEN 1 THEN 'Algebra'
      WHEN 2 THEN 'Geometry'
      WHEN 3 THEN 'Fractions'
      WHEN 4 THEN 'Word Problems'
      WHEN 5 THEN 'Measurement'
      WHEN 6 THEN 'Statistics'
    END
  ) AS topic
  FROM entrance_questions
  WHERE subject = 'MATHEMATICS' AND (topic IS NULL OR topic = '')
) sub
WHERE entrance_questions.id = sub.id;

-- ENGLISH
UPDATE entrance_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 6
      WHEN 0 THEN 'Grammar'
      WHEN 1 THEN 'Comprehension'
      WHEN 2 THEN 'Vocabulary'
      WHEN 3 THEN 'Punctuation'
      WHEN 4 THEN 'Spelling'
      WHEN 5 THEN 'Writing'
    END
  ) AS topic
  FROM entrance_questions
  WHERE subject = 'ENGLISH' AND (topic IS NULL OR topic = '')
) sub
WHERE entrance_questions.id = sub.id;

-- BASIC SCIENCE
UPDATE entrance_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 8
      WHEN 0 THEN 'Living Things'
      WHEN 1 THEN 'Plants'
      WHEN 2 THEN 'Animals'
      WHEN 3 THEN 'Human Body'
      WHEN 4 THEN 'Energy'
      WHEN 5 THEN 'Forces'
      WHEN 6 THEN 'Light & Sound'
      WHEN 7 THEN 'Environment'
    END
  ) AS topic
  FROM entrance_questions
  WHERE subject = 'BASIC SCIENCE' AND (topic IS NULL OR topic = '')
) sub
WHERE entrance_questions.id = sub.id;

-- VERBAL REASONING
UPDATE entrance_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 5
      WHEN 0 THEN 'Analogies'
      WHEN 1 THEN 'Synonyms'
      WHEN 2 THEN 'Antonyms'
      WHEN 3 THEN 'Word Classification'
      WHEN 4 THEN 'Letter Series'
    END
  ) AS topic
  FROM entrance_questions
  WHERE subject = 'VERBAL REASONING' AND (topic IS NULL OR topic = '')
) sub
WHERE entrance_questions.id = sub.id;

-- QUANTITATIVE REASONING
UPDATE entrance_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 4
      WHEN 0 THEN 'Number Series'
      WHEN 1 THEN 'Patterns'
      WHEN 2 THEN 'Quantitative Comparison'
      WHEN 3 THEN 'Mathematical Reasoning'
    END
  ) AS topic
  FROM entrance_questions
  WHERE subject = 'QUANTITATIVE REASONING' AND (topic IS NULL OR topic = '')
) sub
WHERE entrance_questions.id = sub.id;

-- Any remaining untagged questions
UPDATE entrance_questions
SET topic = 'General'
WHERE (topic IS NULL OR topic = '')
  AND subject NOT IN ('MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'VERBAL REASONING', 'QUANTITATIVE REASONING', 'ISLAMIC STUDIES', 'GENERAL KNOWLEDGE');

-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================
SELECT 'question_bank' AS table_name, COUNT(*) AS still_untagged FROM question_bank WHERE topic IS NULL OR topic = ''
UNION ALL
SELECT 'entrance_questions' AS table_name, COUNT(*) AS still_untagged FROM entrance_questions WHERE topic IS NULL OR topic = '';
