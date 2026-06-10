// Parses IGCSE Biology DOCX files into structured JSON dataset
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractText(filePath) {
  const r = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) });
  return r.value;
}

function parseWeeks(text, year, className) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const weeks = [];
  let currentWeek = null;
  let mode = null;

  for (const line of lines) {
    // Y1 format: "WEEK 1  Topic Name" (double space after number)
    // Y2 format: "WEEK 31 — Topic Name" (em-dash or hyphen)
    const weekMatch = line.match(/^WEEK\s+(\d+)\s{2,}(.+)/i) || line.match(/^WEEK\s+(\d+)\s*[—–-]\s*(.+)/i);
    if (weekMatch) {
      if (currentWeek) weeks.push(currentWeek);
      const weekNo = parseInt(weekMatch[1]);
      const topic = weekMatch[2].trim();
      let termName;
      if (weekNo <= 10 || (weekNo >= 31 && weekNo <= 40)) termName = 'First Term';
      else if (weekNo <= 20 || (weekNo >= 41 && weekNo <= 50)) termName = 'Second Term';
      else termName = 'Third Term';
      let weekInTerm = weekNo;
      if (weekNo >= 31 && weekNo <= 40) weekInTerm = weekNo - 30;
      else if (weekNo >= 41 && weekNo <= 50) weekInTerm = weekNo - 40;
      else if (weekNo >= 51) weekInTerm = weekNo - 50;
      else if (weekNo > 20) weekInTerm = weekNo - 20;
      else if (weekNo > 10) weekInTerm = weekNo - 10;
      currentWeek = {
        subject: 'Senior Biology', level: 'Cambridge IGCSE',
        grade: year === 1 ? 'Grade 10' : 'Grade 11',
        year: year, class_name: className,
        term: termName, week_no: weekNo, week_in_term: weekInTerm,
        topic: topic, subtopics_raw: '',
        lesson_notes_preview: '', activity: '', homework: '',
      };
      mode = null;
      continue;
    }

    if (!currentWeek) continue;

    // Term line (Y2): "Term: Term 4" - skip
    if (/^Term:\s*Term\s+\d/i.test(line)) continue;

    // Subtopics (both Y1 and Y2)
    const subMatch = line.match(/^SUBTOPICS(?:\s+COVERED)?:\s*(.+)/i) || line.match(/^Subtopics:\s*(.+)/i);
    if (subMatch) { currentWeek.subtopics_raw = subMatch[1].trim(); continue; }

    // Section markers
    // Y1: 📚 LESSON NOTES, 🔬 CLASSROOM ACTIVITY, 📝 HOMEWORK
    // Y2: 🔬 CLASS ACTIVITY, CLASSWORK & HOMEWORK QUESTIONS
    // Also: ✏️ DIAGRAM INSTRUCTIONS
    if (/📚/.test(line) || /^\*\*Lesson Notes/i.test(line) || /^LESSON NOTES/i.test(line) && !/TERM \d/.test(line)) {
      mode = 'notes'; continue;
    }
    if (/🔬/.test(line) || /^\*\*Classroom Activity/i.test(line) || /^CLASSROOM ACTIVITY/i.test(line) || /^CLASS ACTIVITY/i.test(line)) {
      mode = 'activity'; continue;
    }
    if (/📝/.test(line) || /^\*\*Homework/i.test(line) || /^HOMEWORK/i.test(line) || /^CLASSWORK\s*&?\s*HOMEWORK/i.test(line)) {
      mode = 'homework'; continue;
    }
    if (/✏️/.test(line) || /^DIAGRAM INSTRUCTIONS/i.test(line)) {
      mode = 'notes'; continue;
    }

    // Append content
    if (!mode) mode = 'notes';
    if (mode === 'notes') {
      currentWeek.lesson_notes_preview += (currentWeek.lesson_notes_preview ? '\n' : '') + line;
    } else if (mode === 'activity') {
      currentWeek.activity += (currentWeek.activity ? '\n' : '') + line;
    } else if (mode === 'homework') {
      currentWeek.homework += (currentWeek.homework ? '\n' : '') + line;
    }
  }
  if (currentWeek) weeks.push(currentWeek);
  return weeks;
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const extractDir = path.join(rootDir, 'Senior_Biology_Extracted');

  console.log('Parsing IGCSE Biology Year 1 DOCX...');
  const y1Text = await extractText(path.join(extractDir, 'IGCSE_Biology_Year1_Complete.docx'));
  let y1Weeks = parseWeeks(y1Text, 1, 'SS 1');
  console.log(`  Year 1: ${y1Weeks.length} weeks parsed`);

  console.log('Parsing IGCSE Biology Year 2 DOCX...');
  const y2Text = await extractText(path.join(extractDir, 'IGCSE_Biology_Year2_Complete.docx'));
  let y2Weeks = parseWeeks(y2Text, 2, 'SS 2');
  console.log(`  Year 2: ${y2Weeks.length} weeks parsed`);

  const allWeeks = [...y1Weeks, ...y2Weeks];
  console.log(`\nTotal: ${allWeeks.length} weeks`);

  const byYear = {};
  for (const w of allWeeks) {
    const key = `Y${w.year} ${w.term}`;
    byYear[key] = (byYear[key] || 0) + 1;
  }
  console.log('Coverage:', JSON.stringify(byYear));

  const emptyNotes = allWeeks.filter(w => !w.lesson_notes_preview.trim());
  const emptyActivity = allWeeks.filter(w => !w.activity.trim());
  const emptyHomework = allWeeks.filter(w => !w.homework.trim());
  if (emptyNotes.length) console.log(`Weeks with empty notes: ${emptyNotes.map(w => 'W'+w.week_no).join(', ')}`);
  if (emptyActivity.length) console.log(`Weeks with empty activity: ${emptyActivity.map(w => 'W'+w.week_no).join(', ')}`);
  if (emptyHomework.length) console.log(`Weeks with empty homework: ${emptyHomework.map(w => 'W'+w.week_no).join(', ')}`);

  const output = {
    programme: 'Cambridge IGCSE Biology — Complete Teaching Programme',
    institution: 'Clearpath Edu Hub Ltd (Clearpath College)',
    syllabus: 'Cambridge IGCSE Biology 0610/0970',
    total_weeks: allWeeks.length,
    curriculum: allWeeks,
  };
  const outPath = path.join(rootDir, 'scripts/senior-biology-dataset.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${outPath}`);

  // Show sample
  if (allWeeks.length > 0) {
    const s = allWeeks[0];
    console.log('\nSample week 1:');
    console.log('  Topic:', s.topic);
    console.log('  Class:', s.class_name, '| Term:', s.term);
    console.log('  Subtopics:', s.subtopics_raw.substring(0, 80));
    console.log('  Notes preview:', s.lesson_notes_preview.substring(0, 80));
    console.log('  Activity preview:', s.activity.substring(0, 80));
    console.log('  Homework preview:', s.homework.substring(0, 80));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
