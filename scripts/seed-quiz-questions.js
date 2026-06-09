require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// =========================================================================
// Parse source files
// =========================================================================
function extractBalancedTag(html, startIdx) {
  const openMatch = html.substring(startIdx).match(/^<(\w+)(\s[^>]*)?>/);
  if (!openMatch) return null;
  const tagName = openMatch[1];
  const voidTags = ['br','hr','img','input','link','meta','area','base','col','embed','source','track','wbr'];
  if (voidTags.includes(tagName)) {
    return { content: html.substring(startIdx, startIdx + openMatch[0].length), endIdx: startIdx + openMatch[0].length };
  }
  let i = startIdx + openMatch[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.substring(i).match(new RegExp('^<'+tagName+'(\\s[^>]*)?>'));
    const nextClose = html.substring(i).match(new RegExp('^</'+tagName+'>'));
    if (nextClose) { depth--; i += nextClose[0].length; }
    else if (nextOpen) { depth++; i += nextOpen[0].length; }
    else { i++; }
  }
  if (depth === 0) return { content: html.substring(startIdx, i), endIdx: i };
  return null;
}

function parseYear1Physics(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const lessons = [];
  let cursor = 0;
  while (cursor < html.length) {
    const cardStart = html.indexOf('<div class="week-card">', cursor);
    if (cardStart === -1) break;
    const cardResult = extractBalancedTag(html, cardStart);
    if (!cardResult) { cursor = cardStart + 1; continue; }
    const cardHtml = cardResult.content;
    cursor = cardResult.endIdx;
    const weekMatch = cardHtml.match(/<div class="week-badge"[^>]*>Week (\d+)<\/div>/);
    if (!weekMatch) continue;
    const weekNo = parseInt(weekMatch[1]);
    const titleMatch = cardHtml.match(/<div class="week-title">(.*?)<\/div>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    let termName;
    if (weekNo <= 10) termName = 'First Term';
    else if (weekNo <= 20) termName = 'Second Term';
    else termName = 'Third Term';
    lessons.push({ title, subject_code: 'PHY', class_name: 'JSS 1', term_name: termName, week_no: weekNo, topic: title });
  }
  return lessons;
}

function parseYear2Physics(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const lessons = [];
  let cursor = 0;
  while (cursor < html.length) {
    const cardStart = html.indexOf('class="week-card', cursor);
    if (cardStart === -1) break;
    const tagStart = html.lastIndexOf('<', cardStart);
    if (tagStart === -1 || tagStart < cursor) { cursor = cardStart + 1; continue; }
    const cardResult = extractBalancedTag(html, tagStart);
    if (!cardResult) { cursor = tagStart + 1; continue; }
    const cardHtml = cardResult.content;
    cursor = cardResult.endIdx;
    let weekNo = 0;
    const badgeMatch = cardHtml.match(/<span class="badge">Week (\d+)<\/span>/);
    const labelMatch = cardHtml.match(/<div class="week-label">Week (\d+)<\/div>/);
    if (badgeMatch) weekNo = parseInt(badgeMatch[1]);
    else if (labelMatch) weekNo = parseInt(labelMatch[1]);
    if (!weekNo) continue;
    let title = '';
    const titleH2 = cardHtml.match(/<h2>(.*?)<\/h2>/);
    const titleDiv = cardHtml.match(/<div class="week-title">(.*?)<\/div>/);
    if (titleH2) title = titleH2[1];
    else if (titleDiv) title = titleDiv[1];
    if (!title) continue;
    title = title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    let termName;
    if (weekNo <= 40) termName = 'First Term';
    else if (weekNo <= 50) termName = 'Second Term';
    else termName = 'Third Term';
    lessons.push({ title, subject_code: 'PHY', class_name: 'JSS 2', term_name: termName, week_no: weekNo, topic: title });
  }
  return lessons;
}

function parseBiology(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const curriculum = raw.curriculum || [];
  const termNames = { 1: 'First Term', 2: 'Second Term', 3: 'Third Term' };
  return curriculum.map(e => {
    const year = e.year || 1;
    const termName = termNames[e.term || 1];
    const className = year === 1 ? 'JSS 1' : 'JSS 2';
    const title = (e.topic || `Biology Week ${e.week || 1}`).trim();
    return { title, subject_code: 'BIO', class_name: className, term_name: termName, week_no: e.week || 1, topic: title };
  });
}

// =========================================================================
// Question templates using topic + basic substitution
// =========================================================================
const qTemplates = [
  (topic) => ({
    q: `What is the main focus of "${topic}"?`,
    opts: [
      `The study and understanding of ${topic.toLowerCase()}`,
      `A related branch of science`,
      `The history of scientific discovery`,
      `A method of laboratory investigation`,
    ],
    correct: 0,
  }),
  (topic) => ({
    q: `Which of the following best describes "${topic}"?`,
    opts: [
      `A key concept in ${topic.toLowerCase().includes('physics') ? 'physics' : 'biology'}`,
      `A topic only relevant at advanced levels`,
      `A mathematical formula`,
      `A historical experiment`,
    ],
    correct: 0,
  }),
  (topic) => ({
    q: `Why is "${topic}" important to study?`,
    opts: [
      `It helps us understand fundamental principles in science`,
      `It is only needed for examinations`,
      `It is a minor topic with limited relevance`,
      `It has no practical applications`,
    ],
    correct: 0,
  }),
  (topic) => ({
    q: `In the context of "${topic}", which statement is correct?`,
    opts: [
      `It is an essential topic in the curriculum`,
      `It only applies to specialised fields`,
      `It was discovered recently`,
      `It is no longer relevant today`,
    ],
    correct: 0,
  }),
  (topic) => ({
    q: `Which of the following is NOT related to "${topic}"?`,
    opts: [
      `Core concepts of ${topic.toLowerCase()}`,
      `Practical examples in ${topic.toLowerCase()}`,
      `Theoretical foundations`,
      `Unrelated mathematical proofs`,
    ],
    correct: 3,
  }),
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(topic) {
  const patterns = shuffle([...qTemplates]);
  return patterns.slice(0, 5).map((fn, i) => {
    const r = fn(topic);
    const shuffled = shuffle(r.opts);
    const correctAnswer = shuffled.indexOf(r.opts[r.correct]);
    return { question: r.q, options: shuffled, correct_answer: correctAnswer, points: 1, question_type: 'multiple_choice' };
  });
}

// =========================================================================
// MAIN
// =========================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('QUIZ QUESTIONS SEEDING');
  console.log('='.repeat(60));

  console.log('\n--- Parsing source files ---');
  const rootDir = path.resolve(__dirname, '..');
  const physicsY1 = parseYear1Physics(path.join(rootDir, 'Year1_Lesson_Notes_Comprehensive.html'));
  const physicsY2 = parseYear2Physics(path.join(rootDir, 'Year2_Lesson_Notes_Comprehensive.html'));
  const biology = parseBiology(path.join(rootDir, 'scripts/biology-dataset.json'));
  const allLessons = [...physicsY1, ...physicsY2, ...biology];
  console.log(`  Total: ${allLessons.length} lessons`);

  // ======================== NEON ========================
  console.log('\n--- Neon PostgreSQL ---');
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  try {
    await pool.query('SELECT NOW()');
    console.log('  Connected');
    const [subRes, clsRes, trmRes] = await Promise.all([
      pool.query("SELECT id, code FROM subjects WHERE code IN ('PHY','BIO')"),
      pool.query("SELECT id, name FROM classes WHERE name IN ('JSS 1','JSS 2')"),
      pool.query("SELECT id, name FROM terms WHERE name IN ('First Term','Second Term','Third Term')"),
    ]);
    const sMap = {}; for (const r of subRes.rows) sMap[r.code] = r.id;
    const cMap = {}; for (const r of clsRes.rows) cMap[r.name] = r.id;
    const tMap = {}; for (const r of trmRes.rows) tMap[r.name] = r.id;

    // Fetch all lessons from Neon
    const { rows: dbLessons } = await pool.query('SELECT id, subject_id, class_id, title, term_id, week_no, session_id FROM lessons WHERE subject_id = ANY($1)', [[sMap.PHY, sMap.BIO]]);
    console.log(`  DB has ${dbLessons.length} lessons`);

    // Build lookup key: subjectCode + class + term + week
    const revSub = {}; for (const [k,v] of Object.entries(sMap)) revSub[v] = k;
    const revCls = {}; for (const [k,v] of Object.entries(cMap)) revSub['cls_'+v] = k;
    const dbMap = {};
    for (const l of dbLessons) {
      const key = `${revSub[l.subject_id]}|${l.class_id}|${l.term_id}|${l.week_no}`;
      dbMap[key] = l;
    }

    let nCreated = 0, nSkipped = 0, nErrors = 0;
    for (const lesson of allLessons) {
      try {
        const key = `${lesson.subject_code}|${cMap[lesson.class_name]}|${tMap[lesson.term_name]}|${lesson.week_no}`;
        const dbLesson = dbMap[key];
        if (!dbLesson) { nSkipped++; continue; }

        // Ensure session
        let sessionId = dbLesson.session_id;
        if (!sessionId) {
          const r = await pool.query(
            "INSERT INTO sessions (subject_id, class_id, title, term_id) VALUES ($1,$2,$3,$4) RETURNING id",
            [sMap[lesson.subject_code], cMap[lesson.class_name], lesson.topic + ' Session', tMap[lesson.term_name]]
          );
          sessionId = r.rows[0].id;
          await pool.query('UPDATE lessons SET session_id = $1 WHERE id = $2', [sessionId, dbLesson.id]);
        }

        // Find or create quiz
        const qr = await pool.query('SELECT id FROM quizzes WHERE session_id = $1 LIMIT 1', [sessionId]);
        let quizId;
        if (qr.rows.length > 0) {
          quizId = qr.rows[0].id;
        } else {
          const nr = await pool.query(
            "INSERT INTO quizzes (session_id, subject_id, class_id, title, is_published) VALUES ($1,$2,$3,$4,true) RETURNING id",
            [sessionId, sMap[lesson.subject_code], cMap[lesson.class_name], lesson.topic + ' Quiz']
          );
          quizId = nr.rows[0].id;
        }

        // Check existing questions
        const cq = await pool.query('SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = $1', [quizId]);
        if (parseInt(cq.rows[0].count) >= 5) { nSkipped++; continue; }
        if (parseInt(cq.rows[0].count) > 0) {
          await pool.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);
        }

        const questions = generateQuestions(lesson.topic);
        for (const q of questions) {
          await pool.query(
            'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, points, question_type) VALUES ($1,$2,$3,$4,$5,$6)',
            [quizId, q.question, q.options, q.correct_answer, q.points, q.question_type]
          );
        }
        nCreated++;
        if (nCreated % 25 === 0) process.stdout.write('.');
      } catch (err) {
        nErrors++;
        if (nErrors <= 3) console.error('\n  Neon error:', err.message.substring(0, 100));
      }
    }
    console.log(`\n  Neon: ${nCreated} created, ${nSkipped} skipped, ${nErrors} errors`);
  } finally {
    await pool.end();
  }

  // ======================== SUPABASE ========================
  console.log('\n--- Supabase ---');

  const { data: suSubs } = await supabase.from('subjects').select('id, code').in('code', ['PHY','BIO']);
  const suSMap = {}; for (const r of suSubs || []) suSMap[r.code] = r.id;
  const { data: suCls } = await supabase.from('classes').select('id, name').in('name', ['JSS 1','JSS 2']);
  const suCMap = {}; for (const r of suCls || []) suCMap[r.name] = r.id;
  const { data: suTrm } = await supabase.from('terms').select('id, name').in('name', ['First Term','Second Term','Third Term']);
  const suTMap = {}; for (const r of suTrm || []) suTMap[r.name] = r.id;

  // Fetch all Supabase lessons
  const { data: suLessons } = await supabase.from('lessons').select('id,subject_id,class_id,title,term_id,week_no,session_id').in('subject_id', [suSMap.PHY, suSMap.BIO]);
  console.log(`  DB has ${suLessons?.length || 0} lessons`);

  const revSuSub = {}; for (const [k,v] of Object.entries(suSMap)) revSuSub[v] = k;
  const suDbMap = {};
  for (const l of suLessons || []) {
    const key = `${revSuSub[l.subject_id]}|${l.class_id}|${l.term_id}|${l.week_no}`;
    suDbMap[key] = l;
  }

  let sCreated = 0, sSkipped = 0, sErrors = 0;
  for (const lesson of allLessons) {
    try {
      const key = `${lesson.subject_code}|${suCMap[lesson.class_name]}|${suTMap[lesson.term_name]}|${lesson.week_no}`;
      const dbLesson = suDbMap[key];
      if (!dbLesson) { sSkipped++; continue; }

      let sessionId = dbLesson.session_id;
      if (!sessionId) {
        const { data: ns, error: nsErr } = await supabase.from('sessions').insert({
          subject_id: suSMap[lesson.subject_code], class_id: suCMap[lesson.class_name],
          title: lesson.topic + ' Session', term_id: suTMap[lesson.term_name],
        }).select('id').single();
        if (nsErr) throw nsErr;
        sessionId = ns.id;
        await supabase.from('lessons').update({ session_id: sessionId }).eq('id', dbLesson.id);
      }

      const { data: qs } = await supabase.from('quizzes').select('id').eq('session_id', sessionId).limit(1);
      let quizId;
      if (qs && qs.length > 0) {
        quizId = qs[0].id;
      } else {
        const { data: nq, error: nqErr } = await supabase.from('quizzes').insert({
          session_id: sessionId,
          title: lesson.topic + ' Quiz',
        }).select('id').single();
        if (nqErr) throw nqErr;
        quizId = nq.id;
      }

      const { count } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId);
      if (count >= 5) { sSkipped++; continue; }
      if (count > 0) {
        await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      }

      const questions = generateQuestions(lesson.topic);
      for (const q of questions) {
        const { error: qErr } = await supabase.from('quiz_questions').insert({
          quiz_id: quizId, question: q.question, options: q.options,
          correct_answer: q.correct_answer, points: q.points, question_type: q.question_type,
        });
        if (qErr) throw qErr;
      }
      sCreated++;
      if (sCreated % 25 === 0) process.stdout.write('.');
    } catch (err) {
      sErrors++;
      if (sErrors <= 3) console.error('\n  Supabase error:', err.message.substring(0, 100));
    }
  }
  console.log(`\n  Supabase: ${sCreated} created, ${sSkipped} skipped, ${sErrors} errors`);

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main();
