require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const questions = [
  // ==========================================
  // PRIMARY - MATHEMATICS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'PRIMARY',
    difficulty_level: 'HARD',
    topic: 'Fractions & Ratios',
    subtopic: 'Ratios',
    question: 'If a school bag costs ₦3,500 and a water bottle costs ₦1,200, what is the ratio of the cost of the water bottle to the total cost of both items in its simplest form?',
    options: ['12:35', '12:47', '35:47', '6:23'],
    correct_answer: 1,
    explanation: 'Total cost = ₦3,500 + ₦1,200 = ₦4,700. Ratio of water bottle to total = 1200:4700 = 12:47.',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'MATHEMATICS',
    level: 'PRIMARY',
    difficulty_level: 'HARD',
    topic: 'Basic Algebra',
    subtopic: 'Variables',
    question: 'Solve for x: 4x + 7 = 31.',
    options: ['4', '5', '6', '7'],
    correct_answer: 2,
    explanation: '4x = 31 - 7 => 4x = 24 => x = 6.',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'MATHEMATICS',
    level: 'PRIMARY',
    difficulty_level: 'VERY_HARD',
    topic: 'Word Problems',
    subtopic: 'Algebraic Word Problems',
    question: 'A farmer shares 180 oranges among three boys: Adamu, Ngozi, and Emeka. Ngozi gets twice as many as Adamu, and Emeka gets 20 oranges more than Ngozi. How many oranges does Ngozi receive?',
    options: ['32', '64', '80', '96'],
    correct_answer: 1,
    explanation: 'Let Adamus share be x. Ngozi = 2x. Emeka = 2x + 20. Total = x + 2x + 2x + 20 = 180 => 5x = 160 => x = 32. Ngozi receives 2x = 64.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'MATHEMATICS',
    level: 'PRIMARY',
    difficulty_level: 'VERY_HARD',
    topic: 'Geometry',
    subtopic: 'Perimeter and Area',
    question: 'A square-shaped garden has a perimeter of 48 meters. If the garden is enlarged such that each side is increased by 2 meters, what is the new area of the garden?',
    options: ['144 m²', '169 m²', '196 m²', '225 m²'],
    correct_answer: 2,
    explanation: 'Original perimeter = 48m => Original side = 48/4 = 12m. New side = 12 + 2 = 14m. New area = 14 * 14 = 196 m².',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // PRIMARY - ENGLISH
  // ==========================================
  {
    subject: 'ENGLISH',
    level: 'PRIMARY',
    difficulty_level: 'HARD',
    topic: 'Grammar',
    subtopic: 'Subject-Verb Agreement',
    question: 'Choose the correct option: "Every one of the boys _____ assigned a different mentor during the science exhibition yesterday."',
    options: ['was', 'were', 'are', 'have been'],
    correct_answer: 0,
    explanation: '"Every one" is singular and takes a singular verb. Since it happened "yesterday", the past tense "was" is correct.',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'ENGLISH',
    level: 'PRIMARY',
    difficulty_level: 'HARD',
    topic: 'Punctuation',
    subtopic: 'Apostrophe usage',
    question: 'Which of the following sentences uses the apostrophe correctly?',
    options: [
      'The dog wagged it\'s tail happily.',
      'The dogs tail was covered in mud.',
      'The children\'s books were stored neatly on the shelf.',
      'The childrens\' toys were scattered all over the living room.'
    ],
    correct_answer: 2,
    explanation: '"Children" is a plural noun not ending in -s, so its possessive is formed by adding \'-s: "children\'s". "It\'s" means "it is", which is incorrect for possessive "its".',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'ENGLISH',
    level: 'PRIMARY',
    difficulty_level: 'VERY_HARD',
    topic: 'Vocabulary',
    subtopic: 'Synonyms',
    question: 'Identify the synonym of the underlined word: "The teacher\'s explanation was extremely lucid, helping even the struggling students comprehend the complex theory."',
    options: ['confusing', 'lengthy', 'crystal-clear', 'interesting'],
    correct_answer: 2,
    explanation: '"Lucid" means clear, easily understood, or crystal-clear.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'PRIMARY',
    difficulty_level: 'VERY_HARD',
    topic: 'Comprehension',
    subtopic: 'Logical Inference',
    question: 'Read the sentence: "Although Tunde was extremely tired after the long match, he spent two hours writing his science project report." What can you infer about Tunde?',
    options: [
      'Tunde prefers science to playing matches.',
      'Tunde is highly responsible and committed to his schoolwork.',
      'Tunde has too much energy.',
      'Tunde completed the science project report in a rush.'
    ],
    correct_answer: 1,
    explanation: 'Working for two hours on schoolwork despite extreme fatigue indicates Tunde is highly responsible and committed.',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // JSS1 - ADDITIONAL QUESTIONS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'JSS1',
    difficulty_level: 'VERY_HARD',
    topic: 'Number Theory',
    subtopic: 'Base Systems',
    question: 'Convert the decimal number 83 to a binary (base 2) representation.',
    options: ['1010011₂', '1010111₂', '1100011₂', '1000011₂'],
    correct_answer: 0,
    explanation: '83 = 64 + 16 + 2 + 1 = 2^6 + 2^4 + 2^1 + 2^0 = 1010011₂.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'JSS1',
    difficulty_level: 'VERY_HARD',
    topic: 'Grammar',
    subtopic: 'Conjunctions',
    question: 'Choose the correct conjunction: "No sooner had the governor arrived _____ the national anthem started playing."',
    options: ['when', 'than', 'then', 'before'],
    correct_answer: 1,
    explanation: 'The correlative conjunction pair is "no sooner... than".',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // JSS2 - ADDITIONAL QUESTIONS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'JSS2',
    difficulty_level: 'VERY_HARD',
    topic: 'Algebra',
    subtopic: 'Simultaneous Equations',
    question: 'Solve the simultaneous equations for x and y: 3x - 2y = 7 and 2x + 3y = 9.',
    options: ['x = 1, y = -2', 'x = 3, y = 1', 'x = 2, y = 1', 'x = 3, y = 2'],
    correct_answer: 1,
    explanation: 'Multiply first eq by 3: 9x - 6y = 21. Multiply second eq by 2: 4x + 6y = 18. Add them: 13x = 39 => x = 3. Substitute x=3: 2(3) + 3y = 9 => 6 + 3y = 9 => 3y = 3 => y = 1. So x = 3, y = 1.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'JSS2',
    difficulty_level: 'VERY_HARD',
    topic: 'Grammar',
    subtopic: 'Direct-Indirect Speech',
    question: 'Convert the following statement into indirect speech: "I will visit the museum tomorrow," said Chinedu.',
    options: [
      'Chinedu said he would visit the museum tomorrow.',
      'Chinedu said that he will visit the museum the next day.',
      'Chinedu said that he would visit the museum the next day.',
      'Chinedu said that I would visit the museum tomorrow.'
    ],
    correct_answer: 2,
    explanation: 'In indirect speech, "will" shifts to "would", and "tomorrow" shifts to "the next day".',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // JSS3 - ADDITIONAL QUESTIONS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'JSS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Geometry',
    subtopic: 'Circle Geometry',
    question: 'An arc of a circle of radius 14cm subtends an angle of 60° at the center. Calculate the length of the arc (Take π = 22/7).',
    options: ['7.33 cm', '14.67 cm', '22.00 cm', '44.00 cm'],
    correct_answer: 1,
    explanation: 'Arc length = (θ/360) * 2πr = (60/360) * 2 * (22/7) * 14 = (1/6) * 88 = 14.67 cm.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'JSS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Vocabulary',
    subtopic: 'Complex Antonyms',
    question: 'Identify the antonym of the word "Meticulous" in the following sentence: "Her meticulous planning ensured the project\'s complete success."',
    options: ['careful', 'careless', 'thorough', 'diligent'],
    correct_answer: 1,
    explanation: '"Meticulous" means showing great attention to detail (highly careful/thorough). The opposite is "careless".',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // SS1 - ADDITIONAL QUESTIONS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'SS1',
    difficulty_level: 'VERY_HARD',
    topic: 'Algebra',
    subtopic: 'Quadratic Equations',
    question: 'If α and β are the roots of the quadratic equation 2x² - 5x + 3 = 0, calculate the value of 1/α + 1/β.',
    options: ['5/3', '3/5', '-5/3', '2/3'],
    correct_answer: 0,
    explanation: 'Sum of roots α + β = -b/a = 5/2. Product of roots αβ = c/a = 3/2. 1/α + 1/β = (α + β) / αβ = (5/2) / (3/2) = 5/3.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'SS1',
    difficulty_level: 'VERY_HARD',
    topic: 'Grammar',
    subtopic: 'Relative Clauses',
    question: 'Which of the following relative pronouns correctly completes the sentence: "The scientist, _____ research was praised by the panel, received the award yesterday."',
    options: ['who', 'whom', 'whose', 'which'],
    correct_answer: 2,
    explanation: '"Whose" indicates possessive reference (the scientist\'s research was praised).',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // SS2 - ADDITIONAL QUESTIONS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'SS2',
    difficulty_level: 'VERY_HARD',
    topic: 'Trigonometry',
    subtopic: 'Sine & Cosine Rules',
    question: 'In a triangle ABC, side a = 6cm, side b = 8cm, and angle C = 60°. Calculate the length of side c using the cosine rule.',
    options: ['2√13 cm', '4√3 cm', '2√37 cm', '7.21 cm'],
    correct_answer: 0,
    explanation: 'c² = a² + b² - 2ab cos C = 6² + 8² - 2(6)(8) cos 60° = 36 + 64 - 96(0.5) = 100 - 48 = 52. c = √52 = 2√13 ≈ 7.21 cm.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'SS2',
    difficulty_level: 'VERY_HARD',
    topic: 'Vocabulary',
    subtopic: 'Nuance and Connotation',
    question: 'Which of the following words denotes a state of extreme, excessive enthusiasm or devotion, carrying a negative connotation of irrationality?',
    options: ['zeal', 'passion', 'fanaticism', 'dedication'],
    correct_answer: 2,
    explanation: '"Fanaticism" represents an extreme, irrational zeal or devotion with a distinct negative connotation.',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // SS3 - MATHEMATICS
  // ==========================================
  {
    subject: 'MATHEMATICS',
    level: 'SS3',
    difficulty_level: 'HARD',
    topic: 'Logarithms',
    subtopic: 'Calculations',
    question: 'If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, calculate the value of log₁₀ 1.2.',
    options: ['0.0791', '0.9208', '0.2219', '0.0824'],
    correct_answer: 0,
    explanation: 'log₁₀ 1.2 = log₁₀ (12/10) = log₁₀ 12 - log₁₀ 10 = log₁₀ (2² * 3) - 1 = 2 log₁₀ 2 + log₁₀ 3 - 1 = 2(0.3010) + 0.4771 - 1 = 0.6020 + 0.4771 - 1 = 1.0791 - 1 = 0.0791.',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'MATHEMATICS',
    level: 'SS3',
    difficulty_level: 'HARD',
    topic: 'Coordinate Geometry',
    subtopic: 'Straight Lines',
    question: 'Find the equation of the line passing through the point (2, -3) and perpendicular to the line 3x - 4y = 5.',
    options: ['4x + 3y = -1', '4x - 3y = 17', '3x + 4y = -6', '4x + 3y = 1'],
    correct_answer: 0,
    explanation: 'Slope of 3x - 4y = 5 is m = 3/4. Slope of perpendicular line is m\' = -4/3. Equation: y - (-3) = -4/3 (x - 2) => 3(y + 3) = -4(x - 2) => 3y + 9 = -4x + 8 => 4x + 3y = -1.',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'MATHEMATICS',
    level: 'SS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Trigonometry',
    subtopic: 'General Solutions',
    question: 'Determine the general solution for θ (in degrees) for the trigonometric equation: 2 cos² θ - sin θ - 1 = 0.',
    options: [
      'θ = 30° or 150°',
      'θ = 30° + 360°n, 150° + 360°n, or 270° + 360°n (where n is an integer)',
      'θ = 60° + 360°n or 300° + 360°n',
      'θ = 45° + 180°n or 135° + 180°n'
    ],
    correct_answer: 1,
    explanation: '2(1 - sin² θ) - sin θ - 1 = 0 => 2 - 2 sin² θ - sin θ - 1 = 0 => 2 sin² θ + sin θ - 1 = 0. Let y = sin θ: 2y² + y - 1 = 0 => (2y - 1)(y + 1) = 0 => y = 1/2 or y = -1. So sin θ = 1/2 (θ = 30°, 150°) or sin θ = -1 (θ = 270°). Including general periodic cycles + 360°n.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'MATHEMATICS',
    level: 'SS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Calculus',
    subtopic: 'Differentiation',
    question: 'Find the derivative of the function y = (2x³ - 5)⁴ with respect to x.',
    options: [
      'dy/dx = 4(2x³ - 5)³',
      'dy/dx = 24x²(2x³ - 5)³',
      'dy/dx = 8x²(2x³ - 5)³',
      'dy/dx = 24x³(2x³ - 5)³'
    ],
    correct_answer: 1,
    explanation: 'Using the chain rule: dy/dx = 4(2x³ - 5)³ * d/dx(2x³ - 5) = 4(2x³ - 5)³ * 6x² = 24x²(2x³ - 5)³.',
    question_type: 'MCQ',
    points: 3
  },

  // ==========================================
  // SS3 - ENGLISH
  // ==========================================
  {
    subject: 'ENGLISH',
    level: 'ENGLISH', // Wait, subject should be 'ENGLISH', level is 'SS3'
    // Let's make sure it matches level correctly below
    level: 'SS3',
    subject: 'ENGLISH',
    difficulty_level: 'HARD',
    topic: 'Grammar',
    subtopic: 'Relative Clauses',
    question: 'Identify the sentence that uses the correct relative pronoun structure:',
    options: [
      'The company, who\'s director resigned yesterday, will go bankrupt.',
      'The company, whose director resigned yesterday, will go bankrupt.',
      'The company, that director resigned yesterday, will go bankrupt.',
      'The company, which director resigned yesterday, will go bankrupt.'
    ],
    correct_answer: 1,
    explanation: '"Whose" is correct here as a possessive pronoun relating to an inanimate entity (the company). "Who\'s" means "who is" or "who has".',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'ENGLISH',
    level: 'SS3',
    difficulty_level: 'HARD',
    topic: 'Grammar',
    subtopic: 'Parallel Structure',
    question: 'Which of the following sentences exhibits perfect parallel structure?',
    options: [
      'She likes hiking, swimming, and to ride horses.',
      'She likes to hike, swimming, and horse-back riding.',
      'She likes hiking, swimming, and horse-back riding.',
      'She likes to hike, swimming, and riding horses.'
    ],
    correct_answer: 2,
    explanation: 'Parallel structure requires all items in a list to be of the same grammatical form (all gerunds: hiking, swimming, horse-back riding).',
    question_type: 'MCQ',
    points: 2
  },
  {
    subject: 'ENGLISH',
    level: 'SS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Idiomatic Expressions',
    subtopic: 'Idioms',
    question: 'Choose the correct meaning of the idiom: "to throw down the gauntlet."',
    options: [
      'to surrender in defeat',
      'to issue a challenge',
      'to start a peaceful conversation',
      'to discard useless armor'
    ],
    correct_answer: 1,
    explanation: '"To throw down the gauntlet" historical meaning is to issue a formal challenge, derived from knighthood customs.',
    question_type: 'MCQ',
    points: 3
  },
  {
    subject: 'ENGLISH',
    level: 'SS3',
    difficulty_level: 'VERY_HARD',
    topic: 'Grammar',
    subtopic: 'Subjunctive Mood',
    question: 'Choose the grammatically correct sentence that correctly uses the subjunctive mood:',
    options: [
      'It is crucial that he completes the assignment by midnight.',
      'It is crucial that he complete the assignment by midnight.',
      'It is crucial that he will complete the assignment by midnight.',
      'It is crucial that he completed the assignment by midnight.'
    ],
    correct_answer: 1,
    explanation: 'The subjunctive mood demands the base form of the verb ("complete") regardless of the subject pronoun ("he"). "It is crucial that he complete..." is correct.',
    question_type: 'MCQ',
    points: 3
  }
];

async function run() {
  console.log('='.repeat(60));
  console.log('STARTING DUAL DATABASE QUESTIONS SEEDING');
  console.log('='.repeat(60));

  // 1. Neon PostgreSQL Seeding
  console.log('\n--- 1. SEEDING NEON POSTGRESQL ---');
  const pool = new Pool({ 
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 15000,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to Neon PostgreSQL successfully!');

    // First update the check constraint to allow PRIMARY and SS3
    console.log('Altering LEVEL check constraint...');
    await pool.query(`
      ALTER TABLE question_bank 
      DROP CONSTRAINT IF EXISTS question_bank_level_check;
    `);
    await pool.query(`
      ALTER TABLE question_bank 
      ADD CONSTRAINT question_bank_level_check 
      CHECK (level IN ('PRIMARY', 'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'));
    `);
    console.log('Check constraint successfully altered in Neon!');

    // Insert questions
    let insertedNeon = 0;
    for (const q of questions) {
      try {
        const queryText = `
          INSERT INTO question_bank (subject, level, difficulty_level, topic, subtopic, question, options, correct_answer, explanation, question_type, points, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
          ON CONFLICT (subject, level, difficulty_level, topic, question) DO NOTHING
          RETURNING id;
        `;
        const res = await pool.query(queryText, [
          q.subject,
          q.level,
          q.difficulty_level,
          q.topic,
          q.subtopic || null,
          q.question,
          q.options,
          q.correct_answer,
          q.explanation || null,
          q.question_type,
          q.points
        ]);
        if (res.rows.length > 0) {
          insertedNeon++;
        }
      } catch (err) {
        console.error(`Error inserting question [${q.subject} - ${q.level}] to Neon:`, err.message);
      }
    }
    console.log(`Neon PostgreSQL Seeding Completed. Added ${insertedNeon} new questions!`);
  } catch (err) {
    console.error('Neon PostgreSQL Seeding Error:', err.message);
  } finally {
    await pool.end();
  }

  // 2. Supabase Seeding
  console.log('\n--- 2. SEEDING SUPABASE DATABASE ---');
  let insertedSupabase = 0;
  for (const q of questions) {
    try {
      // Direct insertion on Supabase
      const { data, error } = await supabase
        .from('question_bank')
        .insert({
          subject: q.subject,
          level: q.level,
          difficulty_level: q.difficulty_level,
          topic: q.topic,
          subtopic: q.subtopic || null,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation || null,
          question_type: q.question_type,
          points: q.points,
          is_active: true
        })
        .select('id');

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique_question') || error.code === '23505') {
          // Skip silently on duplicate
          continue;
        }
        throw error;
      }
      if (data && data.length > 0) {
        insertedSupabase++;
      }
    } catch (err) {
      console.error(`Error inserting question [${q.subject} - ${q.level}] to Supabase:`, err.message);
    }
  }
  console.log(`Supabase Seeding Completed. Added ${insertedSupabase} new questions!`);
  
  console.log('\n' + '='.repeat(60));
  console.log('DUAL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
}

run().catch(console.error);
