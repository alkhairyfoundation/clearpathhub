require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase credentials'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// =========================================================================
// Source parsers (same as seed-lesson-notes.js)
// =========================================================================
function extractBalancedTag(html, startIdx) {
  const m = html.substring(startIdx).match(/^<(\w+)(\s[^>]*)?>/); if (!m) return null;
  const t = m[1]; const v = ['br','hr','img','input','link','meta','area','base','col','embed','source','track','wbr'];
  if (v.includes(t)) return { content: html.substring(startIdx, startIdx + m[0].length), endIdx: startIdx + m[0].length };
  let i = startIdx + m[0].length, d = 1;
  while (i < html.length && d > 0) {
    const s = html.substring(i);
    const no = s.match(new RegExp('^<'+t+'(\\s[^>]*)?>')); const nc = s.match(new RegExp('^</'+t+'>'));
    if (nc) { d--; i += nc[0].length; } else if (no) { d++; i += no[0].length; } else i++;
  }
  return d === 0 ? { content: html.substring(startIdx, i), endIdx: i } : null;
}

function parseYear1Physics(fp) {
  const html = fs.readFileSync(fp,'utf8'); const r = []; let c = 0;
  while (c < html.length) {
    const s = html.indexOf('<div class="week-card">', c); if (s === -1) break;
    const cr = extractBalancedTag(html, s); if (!cr) { c = s+1; continue; }
    const h = cr.content; c = cr.endIdx;
    const wm = h.match(/<div class="week-badge"[^>]*>Week (\d+)<\/div>/); if (!wm) continue;
    const w = parseInt(wm[1]); const tm = h.match(/<div class="week-title">(.*?)<\/div>/); if (!tm) continue;
    const t = tm[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    const tn = w <= 10 ? 'First Term' : w <= 20 ? 'Second Term' : 'Third Term';
    const wi = w > 20 ? w-20 : w > 10 ? w-10 : w;
    r.push({ title: t, subject_code:'PHY', class_name:'JSS 1', term_name: tn, week_no: w, topic: t });
  }
  return r;
}

function parseYear2Physics(fp) {
  const html = fs.readFileSync(fp,'utf8'); const r = []; let c = 0;
  while (c < html.length) {
    const s = html.indexOf('class="week-card', c); if (s === -1) break;
    const ts = html.lastIndexOf('<', s); if (ts === -1 || ts < c) { c = s+1; continue; }
    const cr = extractBalancedTag(html, ts); if (!cr) { c = ts+1; continue; }
    const h = cr.content; c = cr.endIdx; let w = 0;
    const bm = h.match(/<span class="badge">Week (\d+)<\/span>/);
    const lm = h.match(/<div class="week-label">Week (\d+)<\/div>/);
    if (bm) w = parseInt(bm[1]); else if (lm) w = parseInt(lm[1]);
    if (!w) continue; let t = '';
    const h2 = h.match(/<h2>(.*?)<\/h2>/); const td = h.match(/<div class="week-title">(.*?)<\/div>/);
    if (h2) t = h2[1]; else if (td) t = td[1];
    if (!t) continue; t = t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    const tn = w <= 40 ? 'First Term' : w <= 50 ? 'Second Term' : 'Third Term';
    const wi = w > 50 ? w-50 : w > 40 ? w-40 : w-30;
    r.push({ title: t, subject_code:'PHY', class_name:'JSS 2', term_name: tn, week_no: w, topic: t });
  }
  return r;
}

function parseJuniorBiology(fp) {
  const raw = JSON.parse(fs.readFileSync(fp,'utf8')); const cur = raw.curriculum || [];
  const tn = { 1:'First Term', 2:'Second Term', 3:'Third Term' };
  return cur.map(e => {
    const y = e.year || 1; const t = (e.topic || '').trim();
    return { title: t, subject_code:'BIO', class_name: y === 1 ? 'JSS 1' : 'JSS 2',
      term_name: tn[e.term || 1], week_no: e.week || 1, topic: t };
  });
}

function parseChemistry(fp) {
  const raw = JSON.parse(fs.readFileSync(fp,'utf8')); const cur = raw.curriculum || [];
  const tm = { 'Term 1':'First Term', 'Term 2':'Second Term', 'Term 3':'Third Term' };
  return cur.map(e => {
    const y = e.year === 'Year 2' ? 2 : 1;
    const t = (e.topic || '').trim();
    return { title: t, subject_code:'CHEM', class_name: y === 1 ? 'JSS 1' : 'JSS 2',
      term_name: tm[e.term] || 'First Term', week_no: e.week || 1, topic: t };
  });
}

function parseSeniorBiology(fp) {
  const raw = JSON.parse(fs.readFileSync(fp,'utf8')); const cur = raw.curriculum || [];
  return cur.map(e => ({
    title: e.topic || '', subject_code:'BIO', class_name: e.class_name || 'SS 1',
    term_name: e.term || 'First Term', week_no: e.week_in_term || e.week_no || 1, topic: e.topic || '',
  }));
}

// =========================================================================
// Question generation
// =========================================================================
const qTemplates = [
  (topic) => ({ q: `What is the main focus of "${topic}"?`, opts: [`The study and understanding of ${topic.toLowerCase()}`, `A related branch of science`, `The history of scientific discovery`, `A method of laboratory investigation`], correct: 0 }),
  (topic) => ({ q: `Which of the following best describes "${topic}"?`, opts: [`A key concept in ${topic.toLowerCase().includes('physics')||topic.toLowerCase().includes('chem') ? 'science' : 'biology'}`, `A topic only relevant at advanced levels`, `A mathematical formula`, `A historical experiment`], correct: 0 }),
  (topic) => ({ q: `Why is "${topic}" important to study?`, opts: [`It helps us understand fundamental principles in science`, `It is only needed for examinations`, `It is a minor topic with limited relevance`, `It has no practical applications`], correct: 0 }),
  (topic) => ({ q: `In the context of "${topic}", which statement is correct?`, opts: [`It is an essential topic in the curriculum`, `It only applies to specialised fields`, `It was discovered recently`, `It is no longer relevant today`], correct: 0 }),
  (topic) => ({ q: `Which of the following is NOT related to "${topic}"?`, opts: [`Core concepts of ${topic.toLowerCase()}`, `Practical examples in ${topic.toLowerCase()}`, `Theoretical foundations`, `Unrelated mathematical proofs`], correct: 3 }),
];

function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }

function generateQuestions(topic) {
  const patterns = shuffle([...qTemplates]);
  return patterns.slice(0, 5).map((fn, i) => {
    const r = fn(topic); const opts = shuffle(r.opts);
    return { question: r.q, options: opts, correct_answer: opts.indexOf(r.opts[r.correct]), points: 1, question_type: 'multiple_choice' };
  });
}

// =========================================================================
// MAIN
// =========================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('QUIZ QUESTIONS SEEDING (All Subjects)');
  console.log('='.repeat(60));

  console.log('\n--- Parsing source files ---');
  const root = path.resolve(__dirname, '..');
  const sources = [
    ...parseYear1Physics(path.join(root, 'Year1_Lesson_Notes_Comprehensive.html')),
    ...parseYear2Physics(path.join(root, 'Year2_Lesson_Notes_Comprehensive.html')),
    ...parseJuniorBiology(path.join(root, 'scripts/biology-dataset.json')),
    ...parseChemistry(path.join(root, 'chemistry_curriculum.json')),
    ...parseSeniorBiology(path.join(root, 'scripts/senior-biology-dataset.json')),
  ];
  console.log(`  Total lessons: ${sources.length}`);

  // ======================== NEON ========================
  console.log('\n--- Neon PostgreSQL ---');
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  try {
    await pool.query('SELECT NOW()');
    const [subRes, clsRes, trmRes] = await Promise.all([
      pool.query("SELECT id, code FROM subjects WHERE code IN ('PHY','BIO','CHEM')"),
      pool.query("SELECT id, name FROM classes WHERE name IN ('JSS 1','JSS 2','SS 1','SS 2')"),
      pool.query("SELECT id, name FROM terms WHERE name IN ('First Term','Second Term','Third Term')"),
    ]);
    const sMap = {}; for (const r of subRes.rows) sMap[r.code] = r.id;
    const cMap = {}; for (const r of clsRes.rows) cMap[r.name] = r.id;
    const tMap = {}; for (const r of trmRes.rows) tMap[r.name] = r.id;

    const { rows: dbLessons } = await pool.query("SELECT id, subject_id, class_id, term_id, week_no, session_id FROM lessons WHERE subject_id = ANY($1)", [[sMap.PHY, sMap.BIO, sMap.CHEM]]);
    console.log(`  DB has ${dbLessons.length} lessons`);

    const revSub = {}; for (const [k,v] of Object.entries(sMap)) revSub[v] = k;
    const dbMap = {}; for (const l of dbLessons) dbMap[`${revSub[l.subject_id]}|${l.class_id}|${l.term_id}|${l.week_no}`] = l;

    let nCreated=0, nSkipped=0, nErrors=0;
    for (const lesson of sources) {
      try {
        const key = `${lesson.subject_code}|${cMap[lesson.class_name]}|${tMap[lesson.term_name]}|${lesson.week_no}`;
        const dbLesson = dbMap[key];
        if (!dbLesson) { nSkipped++; continue; }

        let sessionId = dbLesson.session_id;
        if (!sessionId) {
          const r = await pool.query("INSERT INTO sessions (subject_id,class_id,title,term_id) VALUES ($1,$2,$3,$4) RETURNING id",
            [sMap[lesson.subject_code], cMap[lesson.class_name], lesson.topic + ' Session', tMap[lesson.term_name]]);
          sessionId = r.rows[0].id;
          await pool.query('UPDATE lessons SET session_id = $1 WHERE id = $2', [sessionId, dbLesson.id]);
        }

        const qr = await pool.query('SELECT id FROM quizzes WHERE session_id = $1 LIMIT 1', [sessionId]);
        let quizId;
        if (qr.rows.length > 0) { quizId = qr.rows[0].id; } else {
          const nr = await pool.query("INSERT INTO quizzes (session_id,subject_id,class_id,title,is_published) VALUES ($1,$2,$3,$4,true) RETURNING id",
            [sessionId, sMap[lesson.subject_code], cMap[lesson.class_name], lesson.topic + ' Quiz']);
          quizId = nr.rows[0].id;
        }

        const cq = await pool.query('SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = $1', [quizId]);
        if (parseInt(cq.rows[0].count) >= 5) { nSkipped++; continue; }
        if (parseInt(cq.rows[0].count) > 0) await pool.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

        for (const q of generateQuestions(lesson.topic)) {
          await pool.query('INSERT INTO quiz_questions (quiz_id,question,options,correct_answer,points,question_type) VALUES ($1,$2,$3,$4,$5,$6)',
            [quizId, q.question, q.options, q.correct_answer, q.points, q.question_type]);
        }
        nCreated++;
        if (nCreated % 25 === 0) process.stdout.write('.');
      } catch (err) { nErrors++; if (nErrors <= 3) console.error('\n  Neon:', err.message.substring(0,100)); }
    }
    console.log(`\n  Neon: ${nCreated} created, ${nSkipped} skipped, ${nErrors} errors`);
  } finally { await pool.end(); }

  // ======================== SUPABASE ========================
  console.log('\n--- Supabase ---');
  const { data: suSubs } = await supabase.from('subjects').select('id, code').in('code', ['PHY','BIO','CHEM']);
  const suS = {}; for (const r of suSubs || []) suS[r.code] = r.id;
  const { data: suCls } = await supabase.from('classes').select('id, name').in('name', ['JSS 1','JSS 2','SS 1','SS 2']);
  const suC = {}; for (const r of suCls || []) suC[r.name] = r.id;
  const { data: suTrm } = await supabase.from('terms').select('id, name').in('name', ['First Term','Second Term','Third Term']);
  const suT = {}; for (const r of suTrm || []) suT[r.name] = r.id;

  const { data: suLessons } = await supabase.from('lessons').select('id,subject_id,class_id,term_id,week_no,session_id').in('subject_id', [suS.PHY, suS.BIO, suS.CHEM]);
  console.log(`  DB has ${suLessons?.length || 0} lessons`);

  const revSu = {}; for (const [k,v] of Object.entries(suS)) revSu[v] = k;
  const suMap = {};
  for (const l of suLessons || []) suMap[`${revSu[l.subject_id]}|${l.class_id}|${l.term_id}|${l.week_no}`] = l;

  let sc=0, ss=0, se=0;
  for (const lesson of sources) {
    try {
      const key = `${lesson.subject_code}|${suC[lesson.class_name]}|${suT[lesson.term_name]}|${lesson.week_no}`;
      const dbL = suMap[key];
      if (!dbL) { ss++; continue; }

      let sessionId = dbL.session_id;
      if (!sessionId) {
        const { data: ns, error: ne } = await supabase.from('sessions').insert({
          subject_id: suS[lesson.subject_code], class_id: suC[lesson.class_name],
          title: lesson.topic + ' Session', term_id: suT[lesson.term_name],
        }).select('id').single();
        if (ne) throw ne;
        sessionId = ns.id;
        await supabase.from('lessons').update({ session_id: sessionId }).eq('id', dbL.id);
      }

      const { data: qs } = await supabase.from('quizzes').select('id').eq('session_id', sessionId).limit(1);
      let quizId;
      if (qs && qs.length > 0) { quizId = qs[0].id; } else {
        const { data: nq, error: nqe } = await supabase.from('quizzes').insert({
          session_id: sessionId, title: lesson.topic + ' Quiz',
        }).select('id').single();
        if (nqe) throw nqe;
        quizId = nq.id;
      }

      const { count } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId);
      if (count >= 5) { ss++; continue; }
      if (count > 0) await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);

      for (const q of generateQuestions(lesson.topic)) {
        const { error: qe } = await supabase.from('quiz_questions').insert({
          quiz_id: quizId, question: q.question, options: q.options,
          correct_answer: q.correct_answer, points: q.points, question_type: q.question_type,
        });
        if (qe) throw qe;
      }
      sc++;
      if (sc % 25 === 0) process.stdout.write('.');
    } catch (err) { se++; if (se <= 3) console.error('\n  Supabase:', err.message.substring(0,100)); }
  }
  console.log(`\n  Supabase: ${sc} created, ${ss} skipped, ${se} errors`);

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main();
