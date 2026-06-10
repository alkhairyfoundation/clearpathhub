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
// Balanced HTML tag extraction (for parsing Physics HTML)
// =========================================================================
function extractBalancedTag(html, startIdx) {
  const openMatch = html.substring(startIdx).match(/^<(\w+)(\s[^>]*)?>/);
  if (!openMatch) return null;
  const tagName = openMatch[1];
  const voidTags = ['br','hr','img','input','link','meta','area','base','col','embed','source','track','wbr'];
  if (voidTags.includes(tagName)) return { content: html.substring(startIdx, startIdx + openMatch[0].length), endIdx: startIdx + openMatch[0].length };
  let i = startIdx + openMatch[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const n = html.substring(i);
    const no = n.match(new RegExp('^<'+tagName+'(\\s[^>]*)?>'));
    const nc = n.match(new RegExp('^</'+tagName+'>'));
    if (nc) { depth--; i += nc[0].length; } else if (no) { depth++; i += no[0].length; } else { i++; }
  }
  if (depth === 0) return { content: html.substring(startIdx, i), endIdx: i };
  return null;
}

// =========================================================================
// PHYSICS PARSERS (unchanged)
// =========================================================================
function parseYear1Physics(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const lessons = []; let cursor = 0;
  while (cursor < html.length) {
    const cardStart = html.indexOf('<div class="week-card">', cursor);
    if (cardStart === -1) break;
    const cardResult = extractBalancedTag(html, cardStart);
    if (!cardResult) { cursor = cardStart + 1; continue; }
    const cardHtml = cardResult.content; cursor = cardResult.endIdx;
    const weekMatch = cardHtml.match(/<div class="week-badge"[^>]*>Week (\d+)<\/div>/);
    if (!weekMatch) continue;
    const weekNo = parseInt(weekMatch[1]);
    const titleMatch = cardHtml.match(/<div class="week-title">(.*?)<\/div>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    let termName; if (weekNo <= 10) termName = 'First Term'; else if (weekNo <= 20) termName = 'Second Term'; else termName = 'Third Term';
    let weekInTerm = weekNo; if (weekNo > 20) weekInTerm = weekNo - 20; else if (weekNo > 10) weekInTerm = weekNo - 10;
    const n = cardHtml.indexOf('<div class="panel panel-notes">');
    const a = cardHtml.indexOf('<div class="panel panel-activity">');
    const h = cardHtml.indexOf('<div class="panel panel-hw">');
    let notes='',activity='',hw='';
    if (n>=0&&a>=0) notes=cardHtml.substring(n,a).replace(/^<div class="panel panel-notes">/,'').replace(/<\/div>\s*$/,'').trim();
    if (a>=0&&h>=0) activity=cardHtml.substring(a,h).replace(/^<div class="panel panel-activity">/,'').replace(/<\/div>\s*$/,'').trim();
    if (h>=0) { const hp=extractBalancedTag(cardHtml,h); if(hp) hw=hp.content.replace(/^<div class="panel panel-hw">/,'').replace(/<\/div>$/,'').trim(); }
    lessons.push({ title, content: buildContentHtml(notes, activity, hw), subject_code:'PHY', class_name:'JSS 1', term_name:termName, week_no:weekInTerm, topic:title });
  }
  return lessons;
}

function parseYear2Physics(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const lessons = []; let cursor = 0;
  while (cursor < html.length) {
    const cardStart = html.indexOf('class="week-card', cursor);
    if (cardStart === -1) break;
    const tagStart = html.lastIndexOf('<', cardStart);
    if (tagStart === -1 || tagStart < cursor) { cursor = cardStart + 1; continue; }
    const cr = extractBalancedTag(html, tagStart);
    if (!cr) { cursor = tagStart + 1; continue; }
    const cardHtml = cr.content; cursor = cr.endIdx;
    let weekNo = 0;
    const b = cardHtml.match(/<span class="badge">Week (\d+)<\/span>/);
    const l = cardHtml.match(/<div class="week-label">Week (\d+)<\/div>/);
    if (b) weekNo = parseInt(b[1]); else if (l) weekNo = parseInt(l[1]);
    if (!weekNo) continue;
    let title = '';
    const h2 = cardHtml.match(/<h2>(.*?)<\/h2>/);
    const td = cardHtml.match(/<div class="week-title">(.*?)<\/div>/);
    if (h2) title = h2[1]; else if (td) title = td[1];
    if (!title) continue;
    title = title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    let termName; if (weekNo <= 40) termName = 'First Term'; else if (weekNo <= 50) termName = 'Second Term'; else termName = 'Third Term';
    let weekInTerm = weekNo; if (weekNo > 50) weekInTerm = weekNo - 50; else if (weekNo > 40) weekInTerm = weekNo - 40; else weekInTerm = weekNo - 30;
    let notesStart = cardHtml.indexOf('<div class="panel panel-notes">');
    let npc = 'panel panel-notes';
    if (notesStart === -1) { notesStart = cardHtml.indexOf('<div class="panel full-width">'); npc = 'panel full-width'; }
    if (notesStart === -1) continue;
    const np = extractBalancedTag(cardHtml, notesStart);
    let notesC = '';
    if (np) {
      const eod = cardHtml.indexOf('<div class="panel">', np.endIdx);
      if (eod >= 0) notesC = cardHtml.substring(notesStart, eod).replace(new RegExp('^<div class="'+npc+'">'),'').replace(/<\/div>\s*$/,'').trim();
      else notesC = np.content.replace(new RegExp('^<div class="'+npc+'">'),'').replace(/<\/div>$/,'').trim();
    }
    const ps = []; let sf = notesStart + 1;
    while (true) { const p = cardHtml.indexOf('<div class="panel">', sf); if (p === -1) break; ps.push(p); sf = p + '<div class="panel">'.length; if (ps.length >= 2) break; }
    let actC='', hwC='';
    if (ps.length >= 2) {
      const ap = extractBalancedTag(cardHtml, ps[0]); if (ap) actC = ap.content.replace(/^<div class="panel">/,'').replace(/<\/div>$/,'').trim();
      const hp = extractBalancedTag(cardHtml, ps[1]); if (hp) hwC = hp.content.replace(/^<div class="panel">/,'').replace(/<\/div>$/,'').trim();
    } else if (ps.length === 1) { const ap = extractBalancedTag(cardHtml, ps[0]); if (ap) actC = ap.content.replace(/^<div class="panel">/,'').replace(/<\/div>$/,'').trim(); }
    lessons.push({ title, content: buildContentHtml(notesC, actC, hwC), subject_code:'PHY', class_name:'JSS 2', term_name:termName, week_no:weekInTerm, topic:title });
  }
  return lessons;
}

// =========================================================================
// JUNIOR BIOLOGY PARSER
// =========================================================================
function parseJuniorBiology(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const curriculum = raw.curriculum || [];
  const termNames = { 1: 'First Term', 2: 'Second Term', 3: 'Third Term' };
  return curriculum.map(e => {
    const year = e.year || 1;
    const termNum = e.term || 1;
    const title = (e.topic || `Biology Week ${e.week || 1}`).trim();
    const nHtml = textToHtml(e.lesson_notes_preview || '', 'lesson-notes');
    const aHtml = textToHtml(e.activity || '', 'lesson-activity');
    const hHtml = textToHtml(e.homework || '', 'lesson-homework');
    return {
      title, content: [nHtml, aHtml, hHtml].filter(Boolean).join('\n'),
      subject_code: 'BIO', class_name: year === 1 ? 'JSS 1' : 'JSS 2',
      term_name: termNames[termNum], week_no: e.week || 1, topic: title,
      year, term_num: termNum, subtopics_raw: e.subtopics || '',
    };
  });
}

// =========================================================================
// CHEMISTRY PARSER (from JSON with Term 1/2/3 → First/Second/Third Term)
// =========================================================================
function parseChemistry(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const curriculum = raw.curriculum || [];
  const termMap = { 'Term 1': 'First Term', 'Term 2': 'Second Term', 'Term 3': 'Third Term' };
  return curriculum.map(e => {
    const year = e.year === 'Year 2' ? 2 : 1;
    const termName = termMap[e.term] || 'First Term';
    const className = year === 1 ? 'JSS 1' : 'JSS 2';
    const title = (e.topic || '').trim();
    const notesHtml = textToHtml(e.lesson_notes || '', 'lesson-notes');
    const activityHtml = textToHtml(e.activity || '', 'lesson-activity');
    const homeworkHtml = textToHtml(e.homework || '', 'lesson-homework');
    return {
      title, content: [notesHtml, activityHtml, homeworkHtml].filter(Boolean).join('\n'),
      subject_code: 'CHEM', class_name: className,
      term_name: termName, week_no: e.week || 1, topic: title,
      year, subtopics_raw: e.subtopics || '',
    };
  });
}

// =========================================================================
// SENIOR BIOLOGY PARSER (IGCSE, from pre-parsed JSON dataset)
// =========================================================================
function parseSeniorBiology(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const curriculum = raw.curriculum || [];
  return curriculum.map(e => {
    const title = e.topic || '';
    const notesHtml = textToHtml(e.lesson_notes_preview || '', 'lesson-notes');
    const activityHtml = textToHtml(e.activity || '', 'lesson-activity');
    const homeworkHtml = textToHtml(e.homework || '', 'lesson-homework');
    return {
      title, content: [notesHtml, activityHtml, homeworkHtml].filter(Boolean).join('\n'),
      subject_code: 'BIO', class_name: e.class_name || 'SS 1',
      term_name: e.term || 'First Term', week_no: e.week_in_term || (e.week_no || 1),
      topic: title, year: e.year || 1,
      subtopics_raw: e.subtopics_raw || '',
    };
  });
}

// =========================================================================
// HELPERS
// =========================================================================
function textToHtml(text, wrapperClass) {
  if (!text || !text.trim()) return '';
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const paragraphs = escaped.split(/\n\n+/).map(p => {
    const lines = p.split('\n').filter(l => l.trim());
    if (lines.length <= 1) return '<p>' + (lines[0] || '') + '</p>';
    return '<p>' + lines.join('<br>') + '</p>';
  }).join('\n');
  return '<div class="' + wrapperClass + '">' + paragraphs + '</div>';
}

function buildContentHtml(notes, activity, homework) {
  const parts = [];
  if (notes) parts.push('<div class="lesson-notes">' + notes + '</div>');
  if (activity) parts.push('<div class="lesson-activity">' + activity + '</div>');
  if (homework) parts.push('<div class="lesson-homework">' + homework + '</div>');
  return parts.join('\n');
}

function parseSubtopics(raw) {
  if (!raw) return [];
  return raw.split(/[;|]/).map(s => s.trim()).filter(Boolean);
}

// =========================================================================
// MAIN
// =========================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('LESSON NOTES & SCHEME OF WORK SEEDING');
  console.log('='.repeat(60));

  console.log('\n--- Parsing source files ---');
  const rootDir = path.resolve(__dirname, '..');

  const physicsY1 = parseYear1Physics(path.join(rootDir, 'Year1_Lesson_Notes_Comprehensive.html'));
  console.log(`  Physics Year 1 (JSS1): ${physicsY1.length}`);
  const physicsY2 = parseYear2Physics(path.join(rootDir, 'Year2_Lesson_Notes_Comprehensive.html'));
  console.log(`  Physics Year 2 (JSS2): ${physicsY2.length}`);

  const jBio = parseJuniorBiology(path.join(rootDir, 'scripts/biology-dataset.json'));
  console.log(`  Junior Biology (JSS1-2): ${jBio.length}`);

  const chem = parseChemistry(path.join(rootDir, 'chemistry_curriculum.json'));
  console.log(`  Chemistry (JSS1-2): ${chem.length}`);

  const sBio = parseSeniorBiology(path.join(rootDir, 'scripts/senior-biology-dataset.json'));
  console.log(`  Senior Biology (SS1-2): ${sBio.length}`);

  const allLessons = [...physicsY1, ...physicsY2, ...jBio, ...chem, ...sBio];
  console.log(`\n  Total lessons: ${allLessons.length}`);

  // For scheme of work: Junior Biology, Chemistry, Senior Biology
  const sowSources = [jBio, chem, sBio];
  const allSow = [];
  for (const src of sowSources) {
    for (const l of src) {
      const subjCode = l.subject_code === 'CHEM' ? 'CHEM' : 'BIO';
      allSow.push({ ...l, subject_code: subjCode });
    }
  }
  console.log(`  Scheme of work entries: ${allSow.length}`);

  if (allLessons.length === 0) process.exit(0);

  // ======================== NEON ========================
  console.log('\n--- Neon PostgreSQL ---');
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  try {
    await pool.query('SELECT NOW()');
    console.log('  Connected');

    const [subRes, clsRes, trmRes, sessRes] = await Promise.all([
      pool.query("SELECT id, code FROM subjects WHERE code IN ('PHY','BIO','CHEM')"),
      pool.query("SELECT id, name FROM classes WHERE name IN ('JSS 1','JSS 2','SS 1','SS 2')"),
      pool.query("SELECT id, name FROM terms WHERE name IN ('First Term','Second Term','Third Term')"),
      pool.query("SELECT name FROM academic_sessions WHERE is_current = true LIMIT 1"),
    ]);
    const subMap = {}; for (const r of subRes.rows) subMap[r.code] = r.id;
    const clsMap = {}; for (const r of clsRes.rows) clsMap[r.name] = r.id;
    const trmMap = {}; for (const r of trmRes.rows) trmMap[r.name] = r.id;
    const academicYear = sessRes.rows.length > 0 ? sessRes.rows[0].name : '2025-2026';
    console.log(`  Subjects: PHY=${!!subMap.PHY} BIO=${!!subMap.BIO} CHEM=${!!subMap.CHEM}`);
    console.log(`  Classes: JSS1=${!!clsMap['JSS 1']} JSS2=${!!clsMap['JSS 2']} SS1=${!!clsMap['SS 1']} SS2=${!!clsMap['SS 2']}`);
    console.log(`  Academic year: ${academicYear}`);

    // ---- SEED LESSONS ----
    console.log('\n--- Seeding lessons to Neon ---');
    let nIns = 0, nSkp = 0, nErr = 0;
    for (const lesson of allLessons) {
      try {
        const ex = await pool.query('SELECT id FROM lessons WHERE title = $1 AND subject_id = $2', [lesson.title, subMap[lesson.subject_code]]);
        if (ex.rows.length > 0) { nSkp++; continue; }
        const r = await pool.query(
          'INSERT INTO lessons (subject_id,class_id,title,content,is_published,term_id,week_no,topic) VALUES ($1,$2,$3,$4,true,$5,$6,$7) ON CONFLICT DO NOTHING',
          [subMap[lesson.subject_code], clsMap[lesson.class_name], lesson.title, lesson.content, trmMap[lesson.term_name], lesson.week_no, lesson.topic]
        );
        if (r.rowCount > 0) nIns++; else nSkp++;
      } catch (err) { nErr++; if (nErr <= 3) console.error('  Neon lesson:', err.message.substring(0,100)); }
    }
    console.log(`  Neon lessons: ${nIns} inserted, ${nSkp} skipped, ${nErr} errors`);

    // ---- SEED SCHEME OF WORK ----
    console.log('\n--- Seeding scheme of work to Neon ---');
    let sIns = 0, sSkp = 0, sErr = 0;
    for (const sw of allSow) {
      try {
        const ex = await pool.query(
          'SELECT id FROM scheme_of_work WHERE subject_id=$1 AND class_id=$2 AND term_id=$3 AND week_number=$4',
          [subMap[sw.subject_code], clsMap[sw.class_name], trmMap[sw.term_name], sw.week_no]
        );
        if (ex.rows.length > 0) { sSkp++; continue; }
        const subs = parseSubtopics(sw.subtopics_raw || sw.topic);
        await pool.query(
          'INSERT INTO scheme_of_work (subject_id,class_id,term_id,academic_year,term,week_number,topic,subtopics) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [subMap[sw.subject_code], clsMap[sw.class_name], trmMap[sw.term_name], academicYear, sw.term_name, sw.week_no, sw.topic, subs]
        );
        sIns++;
      } catch (err) { sErr++; if (sErr <= 3) console.error('  Neon SoW:', err.message.substring(0,100)); }
    }
    console.log(`  Neon scheme_of_work: ${sIns} inserted, ${sSkp} skipped, ${sErr} errors`);
  } finally { await pool.end(); }

  // ======================== SUPABASE ========================
  console.log('\n--- Supabase ---');
  const { data: suSubs } = await supabase.from('subjects').select('id, code').in('code', ['PHY','BIO','CHEM']);
  const suSub = {}; for (const r of suSubs || []) suSub[r.code] = r.id;
  const { data: suCls } = await supabase.from('classes').select('id, name').in('name', ['JSS 1','JSS 2','SS 1','SS 2']);
  const suClsMap = {}; for (const r of suCls || []) suClsMap[r.name] = r.id;
  const { data: suTrm } = await supabase.from('terms').select('id, name').in('name', ['First Term','Second Term','Third Term']);
  const suTrmMap = {}; for (const r of suTrm || []) suTrmMap[r.name] = r.id;

  // ---- SEED LESSONS TO SUPABASE ----
  console.log('\n--- Seeding lessons to Supabase ---');
  let suIns = 0, suSkp = 0, suErr = 0;
  for (const lesson of allLessons) {
    try {
      const { data: ex } = await supabase.from('lessons').select('id').eq('title', lesson.title).eq('subject_id', suSub[lesson.subject_code]).limit(1);
      if (ex && ex.length > 0) { suSkp++; continue; }
      const { error } = await supabase.from('lessons').insert({
        subject_id: suSub[lesson.subject_code], class_id: suClsMap[lesson.class_name],
        title: lesson.title, content: lesson.content, is_published: true,
        term_id: suTrmMap[lesson.term_name], week_no: lesson.week_no, topic: lesson.topic,
      });
      if (error) throw error;
      suIns++;
    } catch (err) { suErr++; if (suErr <= 5) console.error('  Supabase lesson:', err.message.substring(0,100)); }
  }
  console.log(`  Supabase lessons: ${suIns} inserted, ${suSkp} skipped, ${suErr} errors`);

  // ---- SEED SCHEME OF WORK TO SUPABASE ----
  console.log('\n--- Seeding scheme of work to Supabase ---');
  let ssIns = 0, ssSkp = 0, ssErr = 0;
  for (const sw of allSow) {
    try {
      const { data: ex } = await supabase
        .from('scheme_of_work').select('id')
        .eq('subject_id', suSub[sw.subject_code]).eq('class_id', suClsMap[sw.class_name])
        .eq('term_id', suTrmMap[sw.term_name]).eq('week_number', sw.week_no).limit(1);
      if (ex && ex.length > 0) { ssSkp++; continue; }
      const subs = parseSubtopics(sw.subtopics_raw || sw.topic);
      const { error } = await supabase.from('scheme_of_work').insert({
        subject_id: suSub[sw.subject_code], class_id: suClsMap[sw.class_name],
        term_id: suTrmMap[sw.term_name], week_number: sw.week_no,
        topic: sw.topic, subtopics: subs,
      });
      if (error) throw error;
      ssIns++;
    } catch (err) { ssErr++; if (ssErr <= 5) console.error('  Supabase SoW:', err.message.substring(0,100)); }
  }
  console.log(`  Supabase scheme_of_work: ${ssIns} inserted, ${ssSkp} skipped, ${ssErr} errors`);

  console.log('\n' + '='.repeat(60));
  console.log('SEEDING COMPLETED!');
  console.log('='.repeat(60));
}

main();
