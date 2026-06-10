-- ============================================================================
-- STUDENT GROWTH PORTFOLIO - SEED DATA
-- Archetypes, Skills, and default rubric configuration
-- ============================================================================

-- ARCHETYPES (Identity Cards)
INSERT INTO archetypes (name, description, icon_key, is_active) VALUES
('The Scholar', 'You love learning and discovering new things. You dive deep into subjects and enjoy mastering complex topics.', 'book-open', true),
('The Leader', 'You inspire and guide others. You take initiative and help your team achieve great results.', 'users', true),
('The Innovator', 'You think outside the box and create new solutions. You are curious, creative, and love to experiment.', 'lightbulb', true),
('The Communicator', 'You express ideas clearly and connect with people. You are a great listener and storyteller.', 'message-square', true),
('The Analyst', 'You solve problems with logic and data. You break down complex problems into clear steps.', 'bar-chart-3', true),
('The Creator', 'You bring ideas to life through art, design, and building. You see beauty in the world around you.', 'palette', true),
('The Advocate', 'You stand up for what is right and help others. You are compassionate, fair, and make a difference.', 'heart', true),
('The Explorer', 'You are curious about the world and embrace new challenges. You adapt quickly and love discovery.', 'compass', true);

-- SKILLS BANK
INSERT INTO skills (name, category, description, is_active) VALUES
('Critical Thinking', 'Cognitive', 'Analysing information and arguments to make reasoned judgments.', true),
('Problem Solving', 'Cognitive', 'Finding effective solutions to challenging problems using logic and creativity.', true),
('Creative Thinking', 'Cognitive', 'Generating original ideas and approaching tasks from new perspectives.', true),
('Research & Analysis', 'Cognitive', 'Gathering, evaluating, and synthesising information from multiple sources.', true),
('Collaboration', 'Social', 'Working effectively with others to achieve shared goals.', true),
('Communication', 'Social', 'Expressing ideas clearly in speaking, writing, and presentations.', true),
('Public Speaking', 'Social', 'Presenting ideas confidently to groups of any size.', true),
('Leadership', 'Social', 'Guiding and motivating a team toward a common objective.', true),
('Empathy & Inclusion', 'Social', 'Understanding others'' perspectives and creating a welcoming environment.', true),
('Conflict Resolution', 'Social', 'Addressing disagreements constructively and finding fair solutions.', true),
('Time Management', 'Personal', 'Organising tasks efficiently to meet deadlines and balance priorities.', true),
('Resilience & Grit', 'Personal', 'Persevering through setbacks and maintaining effort toward long-term goals.', true),
('Self-Motivation', 'Personal', 'Taking initiative and driving your own learning and growth.', true),
('Goal Setting', 'Personal', 'Defining clear, achievable objectives and creating plans to reach them.', true),
('Digital Literacy', 'Technical', 'Using technology effectively, responsibly, and safely.', true),
('Data Literacy', 'Technical', 'Understanding, interpreting, and communicating data-driven insights.', true),
('Scientific Reasoning', 'Cognitive', 'Applying scientific methods to investigate questions and test hypotheses.', true),
('Ethical Judgement', 'Personal', 'Making decisions based on moral principles and considering broader impact.', true),
('Adaptability', 'Personal', 'Adjusting effectively to new situations and embracing change.', true),
('Active Citizenship', 'Social', 'Understanding civic responsibilities and contributing positively to community.', true);

-- ARCHETYPE -> SKILL RECOMMENDATIONS
-- The Scholar
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Scholar'), (SELECT id FROM skills WHERE name = 'Critical Thinking'), 1),
((SELECT id FROM archetypes WHERE name = 'The Scholar'), (SELECT id FROM skills WHERE name = 'Research & Analysis'), 2),
((SELECT id FROM archetypes WHERE name = 'The Scholar'), (SELECT id FROM skills WHERE name = 'Scientific Reasoning'), 3),
((SELECT id FROM archetypes WHERE name = 'The Scholar'), (SELECT id FROM skills WHERE name = 'Self-Motivation'), 4),
((SELECT id FROM archetypes WHERE name = 'The Scholar'), (SELECT id FROM skills WHERE name = 'Goal Setting'), 5);

-- The Leader
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Leader'), (SELECT id FROM skills WHERE name = 'Leadership'), 1),
((SELECT id FROM archetypes WHERE name = 'The Leader'), (SELECT id FROM skills WHERE name = 'Communication'), 2),
((SELECT id FROM archetypes WHERE name = 'The Leader'), (SELECT id FROM skills WHERE name = 'Collaboration'), 3),
((SELECT id FROM archetypes WHERE name = 'The Leader'), (SELECT id FROM skills WHERE name = 'Conflict Resolution'), 4),
((SELECT id FROM archetypes WHERE name = 'The Leader'), (SELECT id FROM skills WHERE name = 'Ethical Judgement'), 5);

-- The Innovator
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Innovator'), (SELECT id FROM skills WHERE name = 'Creative Thinking'), 1),
((SELECT id FROM archetypes WHERE name = 'The Innovator'), (SELECT id FROM skills WHERE name = 'Problem Solving'), 2),
((SELECT id FROM archetypes WHERE name = 'The Innovator'), (SELECT id FROM skills WHERE name = 'Digital Literacy'), 3),
((SELECT id FROM archetypes WHERE name = 'The Innovator'), (SELECT id FROM skills WHERE name = 'Adaptability'), 4),
((SELECT id FROM archetypes WHERE name = 'The Innovator'), (SELECT id FROM skills WHERE name = 'Critical Thinking'), 5);

-- The Communicator
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Communicator'), (SELECT id FROM skills WHERE name = 'Communication'), 1),
((SELECT id FROM archetypes WHERE name = 'The Communicator'), (SELECT id FROM skills WHERE name = 'Public Speaking'), 2),
((SELECT id FROM archetypes WHERE name = 'The Communicator'), (SELECT id FROM skills WHERE name = 'Empathy & Inclusion'), 3),
((SELECT id FROM archetypes WHERE name = 'The Communicator'), (SELECT id FROM skills WHERE name = 'Collaboration'), 4),
((SELECT id FROM archetypes WHERE name = 'The Communicator'), (SELECT id FROM skills WHERE name = 'Digital Literacy'), 5);

-- The Analyst
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Analyst'), (SELECT id FROM skills WHERE name = 'Critical Thinking'), 1),
((SELECT id FROM archetypes WHERE name = 'The Analyst'), (SELECT id FROM skills WHERE name = 'Data Literacy'), 2),
((SELECT id FROM archetypes WHERE name = 'The Analyst'), (SELECT id FROM skills WHERE name = 'Problem Solving'), 3),
((SELECT id FROM archetypes WHERE name = 'The Analyst'), (SELECT id FROM skills WHERE name = 'Research & Analysis'), 4),
((SELECT id FROM archetypes WHERE name = 'The Analyst'), (SELECT id FROM skills WHERE name = 'Scientific Reasoning'), 5);

-- The Creator
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Creator'), (SELECT id FROM skills WHERE name = 'Creative Thinking'), 1),
((SELECT id FROM archetypes WHERE name = 'The Creator'), (SELECT id FROM skills WHERE name = 'Communication'), 2),
((SELECT id FROM archetypes WHERE name = 'The Creator'), (SELECT id FROM skills WHERE name = 'Digital Literacy'), 3),
((SELECT id FROM archetypes WHERE name = 'The Creator'), (SELECT id FROM skills WHERE name = 'Self-Motivation'), 4),
((SELECT id FROM archetypes WHERE name = 'The Creator'), (SELECT id FROM skills WHERE name = 'Adaptability'), 5);

-- The Advocate
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Advocate'), (SELECT id FROM skills WHERE name = 'Empathy & Inclusion'), 1),
((SELECT id FROM archetypes WHERE name = 'The Advocate'), (SELECT id FROM skills WHERE name = 'Ethical Judgement'), 2),
((SELECT id FROM archetypes WHERE name = 'The Advocate'), (SELECT id FROM skills WHERE name = 'Communication'), 3),
((SELECT id FROM archetypes WHERE name = 'The Advocate'), (SELECT id FROM skills WHERE name = 'Active Citizenship'), 4),
((SELECT id FROM archetypes WHERE name = 'The Advocate'), (SELECT id FROM skills WHERE name = 'Conflict Resolution'), 5);

-- The Explorer
INSERT INTO archetype_skill_map (archetype_id, skill_id, recommendation_rank) VALUES
((SELECT id FROM archetypes WHERE name = 'The Explorer'), (SELECT id FROM skills WHERE name = 'Adaptability'), 1),
((SELECT id FROM archetypes WHERE name = 'The Explorer'), (SELECT id FROM skills WHERE name = 'Resilience & Grit'), 2),
((SELECT id FROM archetypes WHERE name = 'The Explorer'), (SELECT id FROM skills WHERE name = 'Problem Solving'), 3),
((SELECT id FROM archetypes WHERE name = 'The Explorer'), (SELECT id FROM skills WHERE name = 'Self-Motivation'), 4),
((SELECT id FROM archetypes WHERE name = 'The Explorer'), (SELECT id FROM skills WHERE name = 'Collaboration'), 5);
