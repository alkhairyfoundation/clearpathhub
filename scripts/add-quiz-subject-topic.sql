-- ============================================================================
-- ADD SUBJECT & TOPIC TO QUIZ QUESTIONS for subject/topic breakdown
-- ============================================================================

-- 1. Add subject and topic columns to quiz_questions (if not exist)
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS topic TEXT;

-- 2. Backfill: derive subject from quiz → session → subject relationship
UPDATE quiz_questions qq
SET subject = subj.name
FROM quizzes q
JOIN sessions s ON q.session_id = s.id
JOIN subjects subj ON s.subject_id = subj.id
WHERE qq.quiz_id = q.id
  AND (qq.subject IS NULL OR qq.subject = '');

-- 3. Backfill topics for quiz_questions using same logic as question_bank
UPDATE quiz_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 7
      WHEN 0 THEN 'Core Concepts'
      WHEN 1 THEN 'Application'
      WHEN 2 THEN 'Analysis'
      WHEN 3 THEN 'Recall'
      WHEN 4 THEN 'Problem Solving'
      WHEN 5 THEN 'Theory'
      WHEN 6 THEN 'Practical'
    END
  ) AS topic
  FROM quiz_questions
  WHERE (topic IS NULL OR topic = '')
    AND subject NOT IN ('MATHEMATICS', 'ENGLISH')
) sub
WHERE quiz_questions.id = sub.id;

-- 4. For specific subjects, use more relevant topics
UPDATE quiz_questions
SET topic = sub.topic
FROM (
  SELECT id, (
    CASE (ROW_NUMBER() OVER (ORDER BY id) - 1) % 8
      WHEN 0 THEN 'Number Theory'
      WHEN 1 THEN 'Algebra'
      WHEN 2 THEN 'Geometry'
      WHEN 3 THEN 'Fractions'
      WHEN 4 THEN 'Word Problems'
      WHEN 5 THEN 'Measurement'
      WHEN 6 THEN 'Statistics'
      WHEN 7 THEN 'Operations'
    END
  ) AS topic
  FROM quiz_questions
  WHERE (topic IS NULL OR topic = '') AND UPPER(subject) = 'MATHEMATICS'
) sub
WHERE quiz_questions.id = sub.id;

UPDATE quiz_questions
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
  FROM quiz_questions
  WHERE (topic IS NULL OR topic = '') AND UPPER(subject) = 'ENGLISH'
) sub
WHERE quiz_questions.id = sub.id;

-- 5. Any remaining untagged → 'General'
UPDATE quiz_questions SET topic = 'General' WHERE topic IS NULL OR topic = '';

-- ============================================================================
-- ADD TOPIC_PERFORMANCE TO QUIZ ATTEMPTS for breakdown data
-- ============================================================================
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS topic_performance JSONB;

-- Backfill existing quiz_attempts with topic_performance computed from stored answers + quiz_questions
DO $$
DECLARE
  attempt RECORD;
  q_rec RECORD;
  ans_data JSONB;
  subj TEXT; diff TEXT; top TEXT;
  is_correct BOOLEAN;
  by_subject JSONB := '{}'::JSONB;
  by_difficulty JSONB := '{}'::JSONB;
  by_topic JSONB := '{}'::JSONB;
  total_q INT; correct_q INT;
  ans_val JSONB;
BEGIN
  FOR attempt IN
    SELECT id, quiz_id, answers, score
    FROM quiz_attempts
    WHERE answers IS NOT NULL AND topic_performance IS NULL
  LOOP
    by_subject := '{}'::JSONB;
    by_difficulty := '{}'::JSONB;
    by_topic := '{}'::JSONB;
    total_q := 0; correct_q := 0;

    FOR q_rec IN
      SELECT qq.id, qq.subject, qq.difficulty_level, qq.topic, qq.correct_answer, qq.question_type, qq.options
      FROM quiz_questions qq
      WHERE qq.quiz_id = attempt.quiz_id
      ORDER BY qq.order_index
    LOOP
      subj := COALESCE(q_rec.subject, 'General');
      diff := COALESCE(q_rec.difficulty_level, 'Not Specified');
      top := COALESCE(q_rec.topic, 'General');
      ans_val := attempt.answers->>(total_q::text);
      -- Try numeric key too
      IF ans_val IS NULL THEN ans_val := attempt.answers->(total_q::text); END IF;
      IF ans_val IS NULL THEN
        -- try finding by question id key
        ans_val := attempt.answers->>(q_rec.id::text);
      END IF;

      -- Determine correctness
      IF q_rec.question_type IN ('multiple_choice', 'true_false') THEN
        is_correct := (ans_val::text) = (q_rec.correct_answer::text);
      ELSIF q_rec.question_type = 'fill_blank' THEN
        is_correct := LOWER(COALESCE(ans_val::text, '')) = LOWER(COALESCE(q_rec.options->>(q_rec.correct_answer::int), ''));
      ELSE
        is_correct := (ans_val::text) = (q_rec.correct_answer::text);
      END IF;

      total_q := total_q + 1;
      IF is_correct THEN correct_q := correct_q + 1; END IF;

      IF jsonb_typeof(by_subject->subj) = 'null' OR (by_subject->subj) IS NULL THEN
        by_subject := jsonb_set(by_subject, ARRAY[subj], '{"correct":0,"total":0}'::JSONB, true);
      END IF;
      by_subject := jsonb_set(by_subject, ARRAY[subj, 'total'], to_jsonb(COALESCE((by_subject->subj->>'total')::int, 0) + 1));
      IF is_correct THEN by_subject := jsonb_set(by_subject, ARRAY[subj, 'correct'], to_jsonb(COALESCE((by_subject->subj->>'correct')::int, 0) + 1)); END IF;

      IF jsonb_typeof(by_difficulty->diff) = 'null' OR (by_difficulty->diff) IS NULL THEN
        by_difficulty := jsonb_set(by_difficulty, ARRAY[diff], '{"correct":0,"total":0}'::JSONB, true);
      END IF;
      by_difficulty := jsonb_set(by_difficulty, ARRAY[diff, 'total'], to_jsonb(COALESCE((by_difficulty->diff->>'total')::int, 0) + 1));
      IF is_correct THEN by_difficulty := jsonb_set(by_difficulty, ARRAY[diff, 'correct'], to_jsonb(COALESCE((by_difficulty->diff->>'correct')::int, 0) + 1)); END IF;

      IF jsonb_typeof(by_topic->top) = 'null' OR (by_topic->top) IS NULL THEN
        by_topic := jsonb_set(by_topic, ARRAY[top], '{"correct":0,"total":0}'::JSONB, true);
      END IF;
      by_topic := jsonb_set(by_topic, ARRAY[top, 'total'], to_jsonb(COALESCE((by_topic->top->>'total')::int, 0) + 1));
      IF is_correct THEN by_topic := jsonb_set(by_topic, ARRAY[top, 'correct'], to_jsonb(COALESCE((by_topic->top->>'correct')::int, 0) + 1)); END IF;
    END LOOP;

    UPDATE quiz_attempts
    SET topic_performance = jsonb_build_object(
      'by_subject', by_subject,
      'by_difficulty', by_difficulty,
      'by_topic', by_topic,
      'total_questions', total_q,
      'correct_count', correct_q
    )
    WHERE id = attempt.id;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT 'quiz_questions' AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE subject IS NOT NULL AND subject != '') AS with_subject, COUNT(*) FILTER (WHERE topic IS NOT NULL AND topic != '') AS with_topic FROM quiz_questions
UNION ALL
SELECT 'quiz_attempts', COUNT(*), COUNT(*) FILTER (WHERE topic_performance IS NOT NULL), 0 FROM quiz_attempts;
