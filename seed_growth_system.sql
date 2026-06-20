-- ============================================================================
-- COMPREHENSIVE GROWTH SYSTEM SEED
-- Populates skills, frameworks, expectations, and archetype mappings
-- ============================================================================

-- ============================================================================
-- PART 1: SKILLS (INSERT missing ones, skip existing via ON CONFLICT)
-- ============================================================================

-- COGNITIVE skills
INSERT INTO skills (name, category, description) VALUES
('Analytical Writing', 'Cognitive', 'Ability to structure arguments, support claims with evidence, and write clear analytical essays and reports'),
('Computational Thinking', 'Cognitive', 'Breaking down complex problems, recognizing patterns, abstracting concepts, and designing algorithms'),
('Decision Making', 'Cognitive', 'Evaluating options, weighing evidence, considering consequences, and making informed choices'),
('Information Literacy', 'Cognitive', 'Locating, evaluating, and using information effectively from diverse sources'),
('Innovation & Ideation', 'Cognitive', 'Generating novel ideas, connecting disparate concepts, and developing creative solutions'),
('Logical Reasoning', 'Cognitive', 'Applying deductive and inductive reasoning to draw valid conclusions from premises'),
('Metacognition', 'Cognitive', 'Awareness and understanding of one''s own thought processes and learning strategies'),
('Pattern Recognition', 'Cognitive', 'Identifying regularities, trends, and structures in data, events, or abstract systems'),
('Strategic Planning', 'Cognitive', 'Setting long-term objectives, formulating action plans, and allocating resources effectively'),
('Systems Thinking', 'Cognitive', 'Understanding how parts interrelate within a whole, recognizing feedback loops and emergent behavior'),
('Cause-Effect Analysis', 'Cognitive', 'Tracing causal relationships, identifying root causes, and predicting outcomes of changes'),
('Hypothesis Testing', 'Cognitive', 'Formulating testable predictions, designing experiments, and drawing conclusions from evidence')
ON CONFLICT (name) DO NOTHING;

-- SOCIAL skills
INSERT INTO skills (name, category, description) VALUES
('Active Listening', 'Social', 'Fully concentrating, understanding, responding to, and remembering what others communicate'),
('Community Building', 'Social', 'Fostering inclusive environments, strengthening relationships, and creating a sense of belonging'),
('Cross-Cultural Competence', 'Social', 'Interacting effectively with people from diverse cultural backgrounds with respect and empathy'),
('Mentoring & Coaching', 'Social', 'Guiding others'' development through encouragement, feedback, and structured support'),
('Negotiation', 'Social', 'Reaching mutually beneficial agreements through dialogue, compromise, and persuasive communication'),
('Networking', 'Social', 'Building and maintaining professional relationships for mutual growth and opportunity'),
('Persuasion', 'Social', 'Convincing others to understand or adopt a viewpoint through reasoned argument and emotional appeal'),
('Social Responsibility', 'Social', 'Acting with awareness of social impact, contributing to community welfare, and promoting justice'),
('Team Leadership', 'Social', 'Inspiring, guiding, and coordinating group efforts toward shared goals while fostering collaboration')
ON CONFLICT (name) DO NOTHING;

-- PERSONAL skills
INSERT INTO skills (name, category, description) VALUES
('Accountability', 'Personal', 'Taking ownership of actions, decisions, and outcomes; following through on commitments'),
('Confidence & Self-Esteem', 'Personal', 'Believing in one''s abilities, expressing opinions assertively, and maintaining positive self-worth'),
('Curiosity & Wonder', 'Personal', 'Maintaining an eager desire to learn, ask questions, and explore the unknown'),
('Emotional Regulation', 'Personal', 'Recognizing, understanding, and managing one''s emotions in healthy and constructive ways'),
('Growth Mindset', 'Personal', 'Believing abilities can be developed through dedication, effort, and learning from feedback'),
('Independence', 'Personal', 'Working autonomously, making self-directed decisions, and taking initiative without constant guidance'),
('Integrity & Honesty', 'Personal', 'Consistently acting with truthfulness, transparency, and strong moral principles'),
('Mindfulness', 'Personal', 'Maintaining present-moment awareness, focusing attention, and responding rather than reacting'),
('Perseverance', 'Personal', 'Continuing steadfastly toward goals despite obstacles, discouragement, or slow progress'),
('Self-Awareness', 'Personal', 'Understanding one''s own emotions, strengths, weaknesses, values, and impact on others'),
('Self-Discipline', 'Personal', 'Controlling impulses, maintaining focus on priorities, and consistently following through on plans'),
('Stress Management', 'Personal', 'Identifying stress triggers, applying coping strategies, and maintaining balance under pressure')
ON CONFLICT (name) DO NOTHING;

-- TECHNICAL skills
INSERT INTO skills (name, category, description) VALUES
('Agricultural Skills', 'Technical', 'Understanding farming practices, crop cultivation, animal husbandry, and sustainable food production'),
('Basic Coding & Programming', 'Technical', 'Writing and understanding code, computational logic, and creating simple digital solutions'),
('Data Collection & Analysis', 'Technical', 'Gathering data systematically, organizing datasets, and extracting meaningful insights'),
('Design Thinking', 'Technical', 'Applying human-centered design methodology to solve problems and create innovative solutions'),
('Entrepreneurial Skills', 'Technical', 'Identifying opportunities, developing business ideas, managing resources, and creating value'),
('Environmental Stewardship', 'Technical', 'Understanding ecological systems, promoting sustainability, and taking action to protect the environment'),
('Financial Literacy', 'Technical', 'Managing personal finances, understanding budgeting, saving, investing, and economic principles'),
('Health & Wellness Literacy', 'Technical', 'Understanding nutrition, physical health, mental wellness, and making informed health decisions'),
('Mapping & Navigation', 'Technical', 'Reading maps, understanding spatial relationships, using coordinates, and navigating environments'),
('Media Literacy', 'Technical', 'Critically analyzing media messages, understanding bias, and creating responsible media content'),
('Presentation & Reporting', 'Technical', 'Organizing information visually and verbally, designing slides, and delivering engaging presentations'),
('Project Management', 'Technical', 'Planning, executing, monitoring, and closing projects; managing timelines, resources, and stakeholders'),
('Scientific Inquiry', 'Technical', 'Applying the scientific method: questioning, investigating, experimenting, and drawing evidence-based conclusions'),
('Technical Writing', 'Technical', 'Creating clear, concise documentation, manuals, and technical reports for diverse audiences')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 2: CLASS TERM FRAMEWORKS + SKILL EXPECTATIONS
-- Create frameworks for each class level, then populate expectations
-- ============================================================================

-- First, clean up existing expectations (we'll re-seed)
-- But keep frameworks intact if they exist (we'll add missing ones)

-- Get all skill IDs for each category
-- We'll reference skills by name using subqueries

-- Class levels to seed for
-- PRIMARY, JSS1, JSS2, JSS3, SS1, SS2, SS3

-- Use the current academic session and first term
-- Session: 3017a8cf-335d-4b50-b7b4-46d0ede6b4c7 (2025-2026)
-- Term: 95757804-127d-4c10-81c6-142aa1ef5f2e (First Term)
DO $$
DECLARE
  level_arr text[] := ARRAY['PRIMARY', 'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  lvl text;
  v_framework_id uuid;
  skill_rec record;
  v_session_id uuid := '3017a8cf-335d-4b50-b7b4-46d0ede6b4c7';
  v_term_id uuid := '95757804-127d-4c10-81c6-142aa1ef5f2e';
BEGIN
  -- Clear existing frameworks and expectations for this session/term (idempotent)
  DELETE FROM skill_expectations WHERE framework_id IN (
    SELECT id FROM class_term_frameworks WHERE session_id = v_session_id AND term_id = v_term_id
  );
  DELETE FROM class_term_frameworks WHERE session_id = v_session_id AND term_id = v_term_id;

  FOREACH lvl IN ARRAY level_arr LOOP
    -- Create framework for this level
    INSERT INTO class_term_frameworks (session_id, term_id, class_level)
    VALUES (v_session_id, v_term_id, lvl)
    RETURNING id INTO v_framework_id;

      -- Insert expectations for each skill appropriate to this level
      FOR skill_rec IN SELECT id, name, category, ROW_NUMBER() OVER (ORDER BY category, name)::integer as rn FROM skills WHERE is_active = true LOOP
        INSERT INTO skill_expectations (framework_id, skill_id, expectation_text, order_index)
        VALUES (
          v_framework_id,
          skill_rec.id,
          CASE skill_rec.category
            WHEN 'Cognitive' THEN
              CASE lvl
                WHEN 'PRIMARY' THEN 'Demonstrates basic ' || lower(skill_rec.name) || ' by identifying simple patterns and expressing ideas clearly'
                WHEN 'JSS1' THEN 'Applies ' || lower(skill_rec.name) || ' to solve structured problems with guidance and growing independence'
                WHEN 'JSS2' THEN 'Uses ' || lower(skill_rec.name) || ' strategies to analyze moderately complex situations and propose solutions'
                WHEN 'JSS3' THEN 'Independently applies ' || lower(skill_rec.name) || ' across subjects, evaluating multiple perspectives and justifying conclusions'
                WHEN 'SS1' THEN 'Employs advanced ' || lower(skill_rec.name) || ' techniques to investigate abstract concepts and synthesize information'
                WHEN 'SS2' THEN 'Demonstrates masterful ' || lower(skill_rec.name) || ' by critically evaluating evidence and constructing original arguments'
                WHEN 'SS3' THEN 'Models expert-level ' || lower(skill_rec.name) || ', mentoring peers and applying sophisticated analysis to real-world challenges'
              END
            WHEN 'Social' THEN
              CASE lvl
                WHEN 'PRIMARY' THEN 'Shows emerging ' || lower(skill_rec.name) || ' by interacting respectfully with peers and adults in familiar settings'
                WHEN 'JSS1' THEN 'Develops ' || lower(skill_rec.name) || ' by participating actively in group activities and expressing ideas respectfully'
                WHEN 'JSS2' THEN 'Demonstrates ' || lower(skill_rec.name) || ' by collaborating effectively in diverse teams and resolving disagreements constructively'
                WHEN 'JSS3' THEN 'Exhibits strong ' || lower(skill_rec.name) || ' by leading group initiatives and fostering inclusive environments'
                WHEN 'SS1' THEN 'Applies advanced ' || lower(skill_rec.name) || ' in complex social situations, mediating conflicts and building consensus'
                WHEN 'SS2' THEN 'Shows sophisticated ' || lower(skill_rec.name) || ' by influencing positive change and mentoring others in collaborative settings'
                WHEN 'SS3' THEN 'Exemplifies exceptional ' || lower(skill_rec.name) || ', inspiring community action and demonstrating diplomatic leadership'
              END
            WHEN 'Personal' THEN
              CASE lvl
                WHEN 'PRIMARY' THEN 'Begins developing ' || lower(skill_rec.name) || ' by recognizing personal feelings and trying new approaches with support'
                WHEN 'JSS1' THEN 'Practices ' || lower(skill_rec.name) || ' in daily routines, showing growing awareness of personal strengths and areas for growth'
                WHEN 'JSS2' THEN 'Strengthens ' || lower(skill_rec.name) || ' by setting personal goals, managing time effectively, and bouncing back from setbacks'
                WHEN 'JSS3' THEN 'Demonstrates consistent ' || lower(skill_rec.name) || ', taking initiative and showing resilience in challenging situations'
                WHEN 'SS1' THEN 'Integrates ' || lower(skill_rec.name) || ' into personal philosophy, making values-aligned decisions under pressure'
                WHEN 'SS2' THEN 'Shows exemplary ' || lower(skill_rec.name) || ', balancing multiple responsibilities and maintaining well-being'
                WHEN 'SS3' THEN 'Models outstanding ' || lower(skill_rec.name) || ', inspiring others through self-directed growth and emotional maturity'
              END
            WHEN 'Technical' THEN
              CASE lvl
                WHEN 'PRIMARY' THEN 'Explores basic ' || lower(skill_rec.name) || ' concepts through guided activities and hands-on experimentation'
                WHEN 'JSS1' THEN 'Develops foundational ' || lower(skill_rec.name) || ' skills by following procedures and using appropriate tools'
                WHEN 'JSS2' THEN 'Applies ' || lower(skill_rec.name) || ' techniques to complete projects with increasing accuracy and independence'
                WHEN 'JSS3' THEN 'Demonstrates competent ' || lower(skill_rec.name) || ' by selecting appropriate methods and troubleshooting effectively'
                WHEN 'SS1' THEN 'Uses advanced ' || lower(skill_rec.name) || ' methods to conduct investigations and produce quality outputs'
                WHEN 'SS2' THEN 'Shows proficient ' || lower(skill_rec.name) || ', adapting techniques to novel situations and optimizing processes'
                WHEN 'SS3' THEN 'Demonstrates expert-level ' || lower(skill_rec.name) || ', innovating and training others in best practices'
              END
          END,
          skill_rec.rn
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- PART 3: ARCHETYPE SKILL MAP (enhance existing mapping with new skills)
-- ============================================================================

-- Map new skills to archetypes based on skill-category alignment
-- Each archetype gets 2-3 new recommended skills

-- The Advocate (empathy, justice, social impact)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Advocate'
AND s.name IN ('Social Responsibility', 'Active Listening', 'Community Building')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Analyst (logic, data, systems)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Analyst'
AND s.name IN ('Logical Reasoning', 'Systems Thinking', 'Decision Making')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Communicator (expression, connection, storytelling)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Communicator'
AND s.name IN ('Active Listening', 'Persuasion', 'Presentation & Reporting')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Creator (innovation, design, expression)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Creator'
AND s.name IN ('Innovation & Ideation', 'Design Thinking', 'Pattern Recognition')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Explorer (discovery, curiosity, adaptability)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Explorer'
AND s.name IN ('Curiosity & Wonder', 'Mapping & Navigation', 'Information Literacy')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Innovator (invention, entrepreneurship, change)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Innovator'
AND s.name IN ('Entrepreneurial Skills', 'Strategic Planning', 'Basic Coding & Programming')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Leader (influence, vision, execution)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Leader'
AND s.name IN ('Team Leadership', 'Project Management', 'Accountability')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- The Scholar (knowledge, analysis, mastery)
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank)
SELECT a.id, s.id, COALESCE((SELECT MAX(asm.recommendation_rank) FROM archetype_skill_map asm WHERE asm.archetype_id = a.id), 0) + 1
FROM archetypes a, skills s
WHERE a.name = 'The Scholar'
AND s.name IN ('Metacognition', 'Analytical Writing', 'Scientific Inquiry')
AND NOT EXISTS (SELECT 1 FROM archetype_skill_map asm2 WHERE asm2.archetype_id = a.id AND asm2.skill_id = s.id);

-- ============================================================================
-- PART 4: VERIFICATION QUERIES (run these to confirm seeding)
-- ============================================================================

-- Run these after seed to verify:
-- SELECT 'skills' as entity, COUNT(*) FROM skills
-- UNION ALL SELECT 'skill_expectations', COUNT(*) FROM skill_expectations
-- UNION ALL SELECT 'archetype_skill_map', COUNT(*) FROM archetype_skill_map
-- UNION ALL SELECT 'class_term_frameworks', COUNT(*) FROM class_term_frameworks
-- ORDER BY entity;
