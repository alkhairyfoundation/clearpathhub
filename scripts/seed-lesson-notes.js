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
  if (voidTags.includes(tagName)) {
    const end = startIdx + openMatch[0].length;
    return { content: html.substring(startIdx, end), endIdx: end };
  }
  let i = startIdx + openMatch[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.substring(i).match(new RegExp(`^<${tagName}(\\s[^>]*)?>`));
    const nextClose = html.substring(i).match(new RegExp(`^</${tagName}>`));
    if (nextClose) { depth--; i += nextClose[0].length; }
    else if (nextOpen) { depth++; i += nextOpen[0].length; }
    else { i++; }
  }
  if (depth === 0) return { content: html.substring(startIdx, i), endIdx: i };
  return null;
}

// =========================================================================
// PARSER: Year 1 Physics HTML (Weeks 1-30) → JSS 1
// =========================================================================
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
    const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let termName, weekInTerm;
    if (weekNo <= 10) { termName = 'First Term'; weekInTerm = weekNo; }
    else if (weekNo <= 20) { termName = 'Second Term'; weekInTerm = weekNo - 10; }
    else { termName = 'Third Term'; weekInTerm = weekNo - 20; }
    const notesStart = cardHtml.indexOf('<div class="panel panel-notes">');
    const activityStart = cardHtml.indexOf('<div class="panel panel-activity">');
    const hwStart = cardHtml.indexOf('<div class="panel panel-hw">');
    let notes = '', activity = '', hw = '';
    if (notesStart >= 0 && activityStart >= 0) {
      notes = cardHtml.substring(notesStart, activityStart)
        .replace(/^<div class="panel panel-notes">/, '').replace(/<\/div>\s*$/, '').trim();
    }
    if (activityStart >= 0 && hwStart >= 0) {
      activity = cardHtml.substring(activityStart, hwStart)
        .replace(/^<div class="panel panel-activity">/, '').replace(/<\/div>\s*$/, '').trim();
    }
    if (hwStart >= 0) {
      const hwPanel = extractBalancedTag(cardHtml, hwStart);
      if (hwPanel) hw = hwPanel.content.replace(/^<div class="panel panel-hw">/, '').replace(/<\/div>$/, '').trim();
    }
    const content = buildContentHtml(notes, activity, hw);
    lessons.push({ title, content, subject_code: 'PHY', class_name: 'JSS 1', term_name: termName, week_no: weekInTerm, topic: title });
  }
  return lessons;
}

// =========================================================================
// PARSER: Year 2 Physics HTML (Weeks 31-60) → JSS 2
// =========================================================================
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
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let termName, weekInTerm;
    if (weekNo <= 40) { termName = 'First Term'; weekInTerm = weekNo - 30; }
    else if (weekNo <= 50) { termName = 'Second Term'; weekInTerm = weekNo - 40; }
    else { termName = 'Third Term'; weekInTerm = weekNo - 50; }
    let notesStart = cardHtml.indexOf('<div class="panel panel-notes">');
    let notesPanelClass = 'panel panel-notes';
    if (notesStart === -1) { notesStart = cardHtml.indexOf('<div class="panel full-width">'); notesPanelClass = 'panel full-width'; }
    if (notesStart === -1) continue;
    const notesPanel = extractBalancedTag(cardHtml, notesStart);
    let notesContent = '';
    if (notesPanel) {
      const endOfNotesDiv = cardHtml.indexOf('<div class="panel">', notesPanel.endIdx);
      if (endOfNotesDiv >= 0) {
        notesContent = cardHtml.substring(notesStart, endOfNotesDiv)
          .replace(new RegExp(`^<div class="${notesPanelClass}">`), '').replace(/<\/div>\s*$/, '').trim();
      } else {
        notesContent = notesPanel.content.replace(new RegExp(`^<div class="${notesPanelClass}">`), '').replace(/<\/div>$/, '').trim();
      }
    }
    const panelStarts = [];
    let searchFrom = notesStart + 1;
    while (true) {
      const p = cardHtml.indexOf('<div class="panel">', searchFrom);
      if (p === -1) break;
      panelStarts.push(p);
      searchFrom = p + '<div class="panel">'.length;
      if (panelStarts.length >= 2) break;
    }
    let activityContent = '', hwContent = '';
    if (panelStarts.length >= 2) {
      const actPanel = extractBalancedTag(cardHtml, panelStarts[0]);
      if (actPanel) activityContent = actPanel.content.replace(/^<div class="panel">/, '').replace(/<\/div>$/, '').trim();
      const hwPanel = extractBalancedTag(cardHtml, panelStarts[1]);
      if (hwPanel) hwContent = hwPanel.content.replace(/^<div class="panel">/, '').replace(/<\/div>$/, '').trim();
    } else if (panelStarts.length === 1) {
      const actPanel = extractBalancedTag(cardHtml, panelStarts[0]);
      if (actPanel) activityContent = actPanel.content.replace(/^<div class="panel">/, '').replace(/<\/div>$/, '').trim();
    }
    const content = buildContentHtml(notesContent, activityContent, hwContent);
    lessons.push({ title, content, subject_code: 'PHY', class_name: 'JSS 2', term_name: termName, week_no: weekInTerm, topic: title });
  }
  return lessons;
}

// =========================================================================
// PARSER: Biology JSON → JSS 1 (Year 1) / JSS 2 (Year 2)
// =========================================================================
function parseBiology(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const curriculum = raw.curriculum || [];
  const lessons = [];
  const termNames = { 1: 'First Term', 2: 'Second Term', 3: 'Third Term' };
  for (const entry of curriculum) {
    const year = entry.year || 1;
    const termNum = entry.term || 1;
    const termName = termNames[termNum] || 'First Term';
    const className = year === 1 ? 'JSS 1' : 'JSS 2';
    const title = entry.topic || `Biology Week ${entry.week || 1}`;
    const notesHtml = textToHtml(entry.lesson_notes_preview || '', 'lesson-notes');
    const activityHtml = textToHtml(entry.activity || '', 'lesson-activity');
    const homeworkHtml = textToHtml(entry.homework || '', 'lesson-homework');
    const content = [notesHtml, activityHtml, homeworkHtml].filter(Boolean).join('\n');
    lessons.push({
      title, content, subject_code: 'BIO', class_name: className,
      term_name: termName, week_no: entry.week || 1, topic: title,
      year, term_num: termNum, // keep for scheme-of-work
      subtopics_raw: entry.subtopics || '',
      resource_text: raw.textbook || '',
    });
  }
  return lessons;
}

// =========================================================================
// HELPERS
// =========================================================================
function textToHtml(text, wrapperClass) {
  if (!text || !text.trim()) return '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n\n+/).map(p => {
    const lines = p.split('\n').filter(l => l.trim());
    if (lines.length <= 1) return `<p>${lines[0] || ''}</p>`;
    return `<p>${lines.join('<br>')}</p>`;
  }).join('\n');
  return `<div class="${wrapperClass}">${paragraphs}</div>`;
}

function buildContentHtml(notes, activity, homework) {
  const parts = [];
  if (notes) parts.push(`<div class="lesson-notes">${notes}</div>`);
  if (activity) parts.push(`<div class="lesson-activity">${activity}</div>`);
  if (homework) parts.push(`<div class="lesson-homework">${homework}</div>`);
  return parts.join('\n');
}

function parseSubtopics(raw) {
  if (!raw) return [];
  return raw.split(/[;]/).map(s => s.trim()).filter(Boolean);
}

// =========================================================================
// MAIN
// =========================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('LESSON NOTES & SCHEME OF WORK SEEDING');
  console.log('='.repeat(60));

  // 1. Parse source files
  console.log('\n--- Parsing source files ---');
  const rootDir = path.resolve(__dirname, '..');

  const physicsY1 = parseYear1Physics(path.join(rootDir, 'Year1_Lesson_Notes_Comprehensive.html'));
  console.log(`  Physics Year 1 (HTML): ${physicsY1.length} lessons`);

  const physicsY2 = parseYear2Physics(path.join(rootDir, 'Year2_Lesson_Notes_Comprehensive.html'));
  console.log(`  Physics Year 2 (HTML): ${physicsY2.length} lessons`);

  const biology = parseBiology(path.join(rootDir, 'scripts/biology-dataset.json'));
  console.log(`  Biology (JSON): ${biology.length} lessons`);

  const allLessons = [...physicsY1, ...physicsY2, ...biology];
  console.log(`\n  Total: ${allLessons.length} lessons, ${biology.length} with scheme-of-work`);

  if (allLessons.length === 0) process.exit(0);

  // 2. Connect to Neon
  console.log('\n--- Neon PostgreSQL ---');
  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  let subjectMap, classMap, termMap, academicYear;

  try {
    await pool.query('SELECT NOW()');
    console.log('  Connected');

    const subjectsRes = await pool.query(`SELECT id, code FROM subjects WHERE code IN ('PHY', 'BIO')`);
    subjectMap = {};
    for (const row of subjectsRes.rows) subjectMap[row.code] = row.id;
    if (!subjectMap['PHY'] || !subjectMap['BIO']) throw new Error('Missing PHY/BIO subjects');

    const classesRes = await pool.query(`SELECT id, name FROM classes WHERE name IN ('JSS 1', 'JSS 2')`);
    classMap = {};
    for (const row of classesRes.rows) classMap[row.name] = row.id;
    if (!classMap['JSS 1'] || !classMap['JSS 2']) throw new Error('Missing JSS 1/2 classes');

    const termsRes = await pool.query(`SELECT id, name FROM terms WHERE name IN ('First Term', 'Second Term', 'Third Term')`);
    termMap = {};
    for (const row of termsRes.rows) termMap[row.name] = row.id;

    const sessionRes = await pool.query(`SELECT name FROM academic_sessions WHERE is_current = true LIMIT 1`);
    academicYear = sessionRes.rows.length > 0 ? sessionRes.rows[0].name : '2025-2026';

    console.log(`  Academic year: ${academicYear}`);

    // ---- SEED LESSONS TO NEON ----
    console.log('\n--- Seeding lessons to Neon ---');
    let nInserted = 0, nSkipped = 0, nErrors = 0;
    for (const lesson of allLessons) {
      try {
        const existing = await pool.query('SELECT id FROM lessons WHERE title = $1 AND subject_id = $2', [lesson.title, subjectMap[lesson.subject_code]]);
        if (existing.rows.length > 0) { nSkipped++; continue; }
        const res = await pool.query(
          `INSERT INTO lessons (subject_id, class_id, title, content, is_published, term_id, week_no, topic, created_at)
           VALUES ($1,$2,$3,$4,true,$5,$6,$7,NOW()) ON CONFLICT DO NOTHING`,
          [subjectMap[lesson.subject_code], classMap[lesson.class_name], lesson.title, lesson.content, termMap[lesson.term_name], lesson.week_no, lesson.topic]
        );
        if (res.rowCount > 0) nInserted++; else nSkipped++;
      } catch (err) { nErrors++; if (nErrors <= 3) console.error(`  Neon lesson error: ${err.message}`); }
    }
    console.log(`  Neon lessons: ${nInserted} inserted, ${nSkipped} skipped, ${nErrors} errors`);

    // ---- SEED SCHEME OF WORK (Biology) TO NEON ----
    console.log('\n--- Seeding Biology scheme of work to Neon ---');
    let sowInserted = 0, sowSkipped = 0, sowErrors = 0;
    for (const lesson of biology) {
      try {
        const existing = await pool.query(
          'SELECT id FROM scheme_of_work WHERE subject_id = $1 AND class_id = $2 AND term_id = $3 AND week_number = $4',
          [subjectMap['BIO'], classMap[lesson.class_name], termMap[lesson.term_name], lesson.week_no]
        );
        if (existing.rows.length > 0) { sowSkipped++; continue; }

        const subtopicsArr = parseSubtopics(lesson.subtopics_raw || lesson.topic);
        await pool.query(
          `INSERT INTO scheme_of_work (subject_id, class_id, term_id, academic_year, term, week_number, topic, subtopics, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [subjectMap['BIO'], classMap[lesson.class_name], termMap[lesson.term_name],
           academicYear, lesson.term_name, lesson.week_no, lesson.topic, subtopicsArr]
        );
        sowInserted++;
      } catch (err) { sowErrors++; if (sowErrors <= 3) console.error(`  Neon SoW error: ${err.message}`); }
    }
    console.log(`  Neon scheme_of_work: ${sowInserted} inserted, ${sowSkipped} skipped, ${sowErrors} errors`);
  } catch (err) {
    console.error('Neon error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  // =====================================================================
  // SUPABASE SEEDING
  // =====================================================================
  console.log('\n--- Supabase ---');
  console.log('  Connected');

  // Look up IDs from Supabase
  const { data: supaSubjects } = await supabase.from('subjects').select('id, code').in('code', ['PHY', 'BIO']);
  const supaSubjectMap = {};
  for (const row of supaSubjects || []) supaSubjectMap[row.code] = row.id;
  console.log(`  Subjects: PHY=${supaSubjectMap['PHY'] ? 'found' : 'MISSING!'}, BIO=${supaSubjectMap['BIO'] ? 'found' : 'MISSING!'}`);

  const { data: supaClasses } = await supabase.from('classes').select('id, name').in('name', ['JSS 1', 'JSS 2']);
  const supaClassMap = {};
  for (const row of supaClasses || []) supaClassMap[row.name] = row.id;

  const { data: supaTerms } = await supabase.from('terms').select('id, name').in('name', ['First Term', 'Second Term', 'Third Term']);
  const supaTermMap = {};
  for (const row of supaTerms || []) supaTermMap[row.name] = row.id;

  const { data: supaSession } = await supabase.from('academic_sessions').select('name').eq('is_current', true).limit(1);
  const supaAcademicYear = (supaSession && supaSession.length > 0) ? supaSession[0].name : '2025-2026';

  // ---- SEED LESSONS TO SUPABASE ----
  console.log('\n--- Seeding lessons to Supabase ---');
  let sInserted = 0, sSkipped = 0, sErrors = 0;
  for (const lesson of allLessons) {
    try {
      const { data: existing } = await supabase
        .from('lessons')
        .select('id')
        .eq('title', lesson.title)
        .eq('subject_id', supaSubjectMap[lesson.subject_code])
        .limit(1);
      if (existing && existing.length > 0) { sSkipped++; continue; }

      const { error } = await supabase.from('lessons').insert({
        subject_id: supaSubjectMap[lesson.subject_code],
        class_id: supaClassMap[lesson.class_name],
        title: lesson.title,
        content: lesson.content,
        is_published: true,
        term_id: supaTermMap[lesson.term_name],
        week_no: lesson.week_no,
        topic: lesson.topic,
      });
      if (error) throw error;
      sInserted++;
    } catch (err) {
      sErrors++;
      if (sErrors <= 5) console.error(`  Supabase lesson error: ${err.message}`);
    }
  }
  console.log(`  Supabase lessons: ${sInserted} inserted, ${sSkipped} skipped, ${sErrors} errors`);

  // ---- SEED SCHEME OF WORK (Biology) TO SUPABASE ----
  console.log('\n--- Seeding Biology scheme of work to Supabase ---');
  let ssInserted = 0, ssSkipped = 0, ssErrors = 0;
  for (const lesson of biology) {
    try {
      const { data: existing } = await supabase
        .from('scheme_of_work')
        .select('id')
        .eq('subject_id', supaSubjectMap['BIO'])
        .eq('class_id', supaClassMap[lesson.class_name])
        .eq('term_id', supaTermMap[lesson.term_name])
        .eq('week_number', lesson.week_no)
        .limit(1);
      if (existing && existing.length > 0) { ssSkipped++; continue; }

      const subtopicsArr = parseSubtopics(lesson.subtopics_raw || lesson.topic);
      const { error } = await supabase.from('scheme_of_work').insert({
        subject_id: supaSubjectMap['BIO'],
        class_id: supaClassMap[lesson.class_name],
        term_id: supaTermMap[lesson.term_name],
        week_number: lesson.week_no,
        topic: lesson.topic,
        subtopics: subtopicsArr,
      });
      if (error) throw error;
      ssInserted++;
    } catch (err) {
      ssErrors++;
      if (ssErrors <= 5) console.error(`  Supabase SoW error: ${err.message}`);
    }
  }
  console.log(`  Supabase scheme_of_work: ${ssInserted} inserted, ${ssSkipped} skipped, ${ssErrors} errors`);

  // =====================================================================
  console.log('\n' + '='.repeat(60));
  console.log('SEEDING COMPLETED!');
  console.log('='.repeat(60));
}

main();
