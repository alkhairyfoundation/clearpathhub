-- ============================================================================
-- FIX EXISTING ENTRANCE EXAM DATA
-- ============================================================================
-- Fixes NULL subjects/difficulty/topics in entrance_questions and
-- recomputes student_analytics for all existing completed exams.
-- SAFE TO RE-RUN
-- ============================================================================

-- 1. Fix NULL subjects in entrance_questions
UPDATE entrance_questions SET subject = 'General' WHERE subject IS NULL OR subject = '';

-- 2. Fix NULL difficulty_level
UPDATE entrance_questions SET difficulty_level = 'MEDIUM' WHERE difficulty_level IS NULL OR difficulty_level = '';

-- 3. Fix NULL topics
UPDATE entrance_questions SET topic = 'General' WHERE topic IS NULL OR topic = '';

-- 4. Fix stored answers in entrance_applications — update subject/difficulty/topic
--    from the now-corrected entrance_questions records.
--    The answers JSONB is matched by question_index ⟷ entrance_questions.order_index
DO $$
DECLARE
  app RECORD;
  ans JSONB;
  arr JSONB;
  eq_subj TEXT;
  eq_diff TEXT;
  eq_topic TEXT;
  idx INT;
  changed BOOLEAN;
BEGIN
  FOR app IN
    SELECT id, exam_id, answers
    FROM entrance_applications
    WHERE answers IS NOT NULL AND jsonb_typeof(answers) = 'array'
  LOOP
    arr := app.answers;
    changed := false;

    FOR idx IN 0..jsonb_array_length(arr)-1 LOOP
      ans := arr->idx;

      IF (ans->>'subject' IS NULL OR ans->>'subject' = '' OR ans->>'subject' = 'General')
         OR (ans->>'difficulty_level' IS NULL OR ans->>'difficulty_level' = '')
         OR (ans->>'topic' IS NULL OR ans->>'topic' = '' OR ans->>'topic' = 'General')
      THEN
        SELECT subject, difficulty_level, topic
          INTO eq_subj, eq_diff, eq_topic
          FROM entrance_questions
         WHERE exam_id = app.exam_id AND order_index = idx
         LIMIT 1;

        IF FOUND THEN
          IF eq_subj IS NOT NULL AND eq_subj != '' AND eq_subj != 'General' THEN
            ans := jsonb_set(ans, '{subject}', to_jsonb(eq_subj));
          END IF;
          IF eq_diff IS NOT NULL AND eq_diff != '' THEN
            ans := jsonb_set(ans, '{difficulty_level}', to_jsonb(eq_diff));
          END IF;
          IF eq_topic IS NOT NULL AND eq_topic != '' AND eq_topic != 'General' THEN
            ans := jsonb_set(ans, '{topic}', to_jsonb(eq_topic));
          END IF;
          arr := jsonb_set(arr, ARRAY[idx::text], ans);
          changed := true;
        END IF;
      END IF;
    END LOOP;

    IF changed THEN
      UPDATE entrance_applications SET answers = arr WHERE id = app.id;
    END IF;
  END LOOP;
END $$;

-- 5. Recompute student_analytics for all existing completed exams
DO $$
DECLARE
  app_record RECORD;
  answers_data JSONB;
  q_rec RECORD;
  subj TEXT;
  diff TEXT;
  top TEXT;
  is_correct BOOLEAN;
  pts INT;
  pts_earned INT;
  by_subject JSONB := '{}'::JSONB;
  by_difficulty JSONB := '{}'::JSONB;
  by_topic JSONB := '{}'::JSONB;
  questions_arr JSONB := '[]'::JSONB;
  total_q INT := 0;
  correct_q INT := 0;
  score_val INT;
BEGIN
  FOR app_record IN
    SELECT id, email, exam_score, mastery_level, answers, completed_at
    FROM entrance_applications
    WHERE answers IS NOT NULL AND completed_at IS NOT NULL
  LOOP
    answers_data := app_record.answers;
    IF jsonb_typeof(answers_data) = 'array' AND jsonb_array_length(answers_data) > 0 THEN
      by_subject := '{}'::JSONB;
      by_difficulty := '{}'::JSONB;
      by_topic := '{}'::JSONB;
      questions_arr := '[]'::JSONB;
      total_q := 0;
      correct_q := 0;

      FOR i IN 0..jsonb_array_length(answers_data)-1 LOOP
        subj := COALESCE(answers_data->i->>'subject', 'General');
        diff := COALESCE(answers_data->i->>'difficulty_level', 'MEDIUM');
        top := COALESCE(answers_data->i->>'topic', 'General');
        is_correct := (answers_data->i->>'is_correct')::boolean;
        pts := COALESCE((answers_data->i->>'points')::int, 1);
        pts_earned := CASE WHEN is_correct THEN pts ELSE 0 END;

        total_q := total_q + 1;
        IF is_correct THEN correct_q := correct_q + 1; END IF;

        -- by_subject
        IF jsonb_typeof(by_subject->subj) = 'null' OR (by_subject->subj) IS NULL THEN
          by_subject := jsonb_set(by_subject, ARRAY[subj], '{"correct":0,"total":0}'::JSONB, true);
        END IF;
        by_subject := jsonb_set(by_subject, ARRAY[subj, 'total'], to_jsonb(COALESCE((by_subject->subj->>'total')::int, 0) + 1));
        IF is_correct THEN
          by_subject := jsonb_set(by_subject, ARRAY[subj, 'correct'], to_jsonb(COALESCE((by_subject->subj->>'correct')::int, 0) + 1));
        END IF;

        -- by_difficulty
        IF jsonb_typeof(by_difficulty->diff) = 'null' OR (by_difficulty->diff) IS NULL THEN
          by_difficulty := jsonb_set(by_difficulty, ARRAY[diff], '{"correct":0,"total":0}'::JSONB, true);
        END IF;
        by_difficulty := jsonb_set(by_difficulty, ARRAY[diff, 'total'], to_jsonb(COALESCE((by_difficulty->diff->>'total')::int, 0) + 1));
        IF is_correct THEN
          by_difficulty := jsonb_set(by_difficulty, ARRAY[diff, 'correct'], to_jsonb(COALESCE((by_difficulty->diff->>'correct')::int, 0) + 1));
        END IF;

        -- by_topic
        IF jsonb_typeof(by_topic->top) = 'null' OR (by_topic->top) IS NULL THEN
          by_topic := jsonb_set(by_topic, ARRAY[top], '{"correct":0,"total":0}'::JSONB, true);
        END IF;
        by_topic := jsonb_set(by_topic, ARRAY[top, 'total'], to_jsonb(COALESCE((by_topic->top->>'total')::int, 0) + 1));
        IF is_correct THEN
          by_topic := jsonb_set(by_topic, ARRAY[top, 'correct'], to_jsonb(COALESCE((by_topic->top->>'correct')::int, 0) + 1));
        END IF;

        -- questions array
        questions_arr := questions_arr || jsonb_build_object(
          'question_index', i,
          'question', answers_data->i->>'question',
          'question_type', answers_data->i->>'question_type',
          'subject', subj,
          'difficulty_level', diff,
          'topic', top,
          'correct_answer', answers_data->i->>'correct_answer',
          'given_answer', answers_data->i->>'given_answer',
          'is_correct', is_correct,
          'points', pts,
          'points_earned', pts_earned
        );
      END LOOP;

      score_val := app_record.exam_score;

      -- Delete existing analytics for this application to avoid duplicates
      DELETE FROM student_analytics WHERE application_id = app_record.id;

      -- Insert fresh analytics
      INSERT INTO student_analytics (
        application_id, student_email, subject, score, mastery_level,
        topic_performance, time_taken_seconds
      ) VALUES (
        app_record.id, app_record.email, 'COMBINED', score_val, app_record.mastery_level,
        jsonb_build_object(
          'by_subject', by_subject,
          'by_difficulty', by_difficulty,
          'by_topic', by_topic,
          'questions', questions_arr,
          'total_questions', total_q,
          'correct_count', correct_q,
          'time_taken_minutes', 0
        ),
        0
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT 'entrance_questions fixed (null)' AS check_name, COUNT(*) AS count FROM entrance_questions WHERE subject IS NULL OR subject = ''
UNION ALL
SELECT 'entrance_questions fixed (null diff)', COUNT(*) FROM entrance_questions WHERE difficulty_level IS NULL OR difficulty_level = ''
UNION ALL
SELECT 'entrance_questions fixed (null topic)', COUNT(*) FROM entrance_questions WHERE topic IS NULL OR topic = ''
UNION ALL
SELECT 'student_analytics recomputed', COUNT(*) FROM student_analytics WHERE application_id IN (SELECT id FROM entrance_applications WHERE answers IS NOT NULL AND completed_at IS NOT NULL)
UNION ALL
SELECT 'answers with null subject still', COUNT(*) FROM entrance_applications WHERE answers IS NOT NULL AND answers::text LIKE '%"subject":null%'
UNION ALL
SELECT 'answers with null difficulty still', COUNT(*) FROM entrance_applications WHERE answers IS NOT NULL AND answers::text LIKE '%"difficulty_level":null%';
