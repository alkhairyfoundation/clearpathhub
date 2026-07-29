import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY: [number, number, number] = [30, 58, 95];
const GOLD: [number, number, number] = [179, 146, 47];
const WHITE: [number, number, number] = [255, 255, 255];

function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function getGradeColor(letter: string): [number, number, number] {
  switch (letter) {
    case 'A+': case 'A': return [0, 140, 60];
    case 'B': return [30, 120, 200];
    case 'C': return [200, 150, 0];
    case 'D': return [220, 100, 0];
    case 'F': return [200, 30, 30];
    default: return [100, 100, 100];
  }
}

function parseTopicMastery(tm: any): { questions: any[]; by_subject: Record<string, any>; by_difficulty: Record<string, any>; by_topic: Record<string, any> } {
  if (!tm) return { questions: [], by_subject: {}, by_difficulty: {}, by_topic: {} };
  const parsed = typeof tm === 'string' ? JSON.parse(tm) : tm;
  return {
    questions: parsed.questions || [],
    by_subject: parsed.by_subject || {},
    by_difficulty: parsed.by_difficulty || {},
    by_topic: parsed.by_topic || {},
  };
}

export function generateMockReportPdf(attempt: any, schoolName?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const marginL = 15;
  const marginR = 195;
  const contentW = marginR - marginL;
  let y = 0;

  const name = schoolName || 'ClearPath Edu Hub';
  const exam = attempt.exam || {};
  const student = attempt.student || {};
  const tm = parseTopicMastery(attempt.topic_mastery);
  const bySubject = tm.by_subject;
  const byDifficulty = tm.by_difficulty;
  const byTopic = tm.by_topic;
  const questions = tm.questions;
  const score = attempt.score || 0;
  const passingScore = exam.passing_score || 50;
  const passed = score >= passingScore;
  const totalQ = questions.length;
  const correctQ = questions.filter((q: any) => q.is_correct).length;
  const wrongQ = totalQ - correctQ;

  const drawHeader = (d: typeof doc) => {
    d.setFillColor(...NAVY);
    d.rect(0, 0, pageW, 40, 'F');
    d.setFillColor(...GOLD);
    d.rect(0, 38, pageW, 2, 'F');
    d.setTextColor(...WHITE);
    d.setFontSize(20);
    d.setFont('helvetica', 'bold');
    d.text(name, pageW / 2, 16, { align: 'center' });
    d.setFontSize(9);
    d.setFont('helvetica', 'normal');
    d.text('MOCK EXAM ANALYSIS REPORT', pageW / 2, 24, { align: 'center' });
    d.setFontSize(7);
    d.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 31, { align: 'center' });
  };

  const drawFooter = (d: typeof doc) => {
    const ph = d.internal.pageSize.getHeight();
    d.setFillColor(...NAVY);
    d.rect(0, ph - 12, pageW, 12, 'F');
    d.setTextColor(...WHITE);
    d.setFontSize(6);
    d.setFont('helvetica', 'normal');
    d.text(name + ' — Official Document', pageW / 2, ph - 6, { align: 'center' });
    d.text('This report is system-generated and does not require a signature.', pageW / 2, ph - 2.5, { align: 'center' });
  };

  drawHeader(doc);

  y = 50;
  doc.setFillColor(...NAVY);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT INFORMATION', 18, y + 0.5);

  y += 11;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const studentInfo = [
    ['Student Name', `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A'],
    ['Email', student.email || 'N/A'],
    ['Exam Title', exam.title || 'N/A'],
    ['Exam Type', exam.exam_type || 'N/A'],
    ['Attempt #', `${attempt.attempt_number || 1}`],
    ['Completed', attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'],
  ];
  studentInfo.forEach(([label, value], i) => {
    const rowY = y + i * 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 18, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 55, rowY);
  });

  y += studentInfo.length * 5.5 + 7;
  doc.setFillColor(...NAVY);
  doc.rect(14, y - 4, pageW - 28, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EXAM RESULTS', 18, y + 0.5);

  y += 11;
  const scoreX = pageW - 40;
  doc.setDrawColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
  doc.setFillColor(passed ? 240 : 254, passed ? 253 : 242, passed ? 244 : 242);
  doc.ellipse(scoreX, y + 12, 12, 12, 'FD');
  doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${score}%`, scoreX, y + 15, { align: 'center' });

  const resultsInfo = [
    ['Total Questions', `${totalQ}`],
    ['Correct Answers', `${correctQ}`],
    ['Wrong Answers', `${wrongQ}`],
    ['Accuracy', `${totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0}%`],
    ['Passing Score', `${passingScore}%`],
    ['Score Obtained', `${score}%`],
    ['Mastery Level', attempt.mastery_level || 'N/A'],
    ['Status', passed ? 'PASSED' : 'FAILED'],
  ];
  resultsInfo.forEach(([label, value], i) => {
    const rowY = y + i * 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(7.5);
    doc.text(label + ':', 18, rowY);
    doc.setFont('helvetica', 'normal');
    if (label === 'Status') {
      doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 38 : 38);
    } else if (label === 'Mastery Level') {
      doc.setTextColor(...NAVY);
    } else {
      doc.setTextColor(60, 60, 60);
    }
    doc.text(value, 55, rowY);
  });

  const subjectEntries = Object.entries(bySubject);
  if (subjectEntries.length > 0) {
    y += resultsInfo.length * 5 + 7;
    if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
    doc.setFillColor(...NAVY);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SUBJECT PERFORMANCE', 18, y + 0.5);
    y += 9;
    autoTable(doc, {
      startY: y, head: [['Subject', 'Correct', 'Total', 'Score', 'Grade', 'Assessment']],
      body: subjectEntries.map(([subj, d]: [string, any]) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return [subj, `${d.correct}`, `${d.total}`, `${pct}%`, getLetterGrade(pct), pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'];
      }),
      theme: 'striped', headStyles: { fillColor: [...NAVY] as [number, number, number] },
      columnStyles: { 0: { cellWidth: 45 }, 4: { cellWidth: 15 }, 5: { cellWidth: 25 } },
      margin: { left: 14, right: 14 }, tableLineWidth: 0,
    });
    y = (doc as any).lastAutoTable.finalY + 5;
    if (subjectEntries.length >= 3) {
      const radarCx = pageW / 2;
      const radarCy = y + 45;
      if (radarCy + 55 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = 45; drawHeader(doc); }
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Performance Radar', 18, y);
      y += 3;
      drawRadarChart(doc, bySubject, radarCx, y + 35, 32);
      y = y + 78;
    }
    y = drawBarChart(doc, bySubject, 18, y, pageW - 36, doc.internal.pageSize.getHeight() - 15);
  }

  const difficultyEntries = Object.entries(byDifficulty);
  if (difficultyEntries.length > 0) {
    if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
    doc.setFillColor(...NAVY);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DIFFICULTY BREAKDOWN', 18, y + 0.5);
    y += 9;
    autoTable(doc, {
      startY: y, head: [['Difficulty Level', 'Correct', 'Total', 'Score', 'Verdict']],
      body: difficultyEntries.map(([diff, d]: [string, any]) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return [diff, `${d.correct}`, `${d.total}`, `${pct}%`, pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'];
      }),
      theme: 'striped', headStyles: { fillColor: [...NAVY] as [number, number, number] },
      margin: { left: 14, right: 14 }, tableLineWidth: 0,
    });
    y = (doc as any).lastAutoTable.finalY + 5;
    y = drawInsights(doc, bySubject, byDifficulty, byTopic, 18, y, pageW - 36, doc.internal.pageSize.getHeight() - 15);
  }

  if (questions.length > 0) {
    doc.addPage();
    y = 45;
    drawHeader(doc);
    doc.setFillColor(...NAVY);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PER-QUESTION ANALYSIS', 18, y + 0.5);
    y += 9;

    const rowCorrectness = questions.map((q: any) => q.is_correct);
    const questionRows = questions.map((q: any, i: number) => {
      const qShort = q.question ? (q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question) : '';
      return [i + 1, q.subject || '—', qShort, q.difficulty_level || '—', formatCorrectAnswer(q), formatAnswer(q), '', `${q.points_earned || 0}/${q.points || 1}`];
    });

    autoTable(doc, {
      startY: y, head: [['#', 'Subject', 'Question', 'Diff', 'Correct Answer', 'Given Answer', 'Correct', 'Pts']],
      body: questionRows, theme: 'striped',
      headStyles: { fillColor: [...NAVY] as [number, number, number], fontSize: 7 },
      bodyStyles: { fontSize: 6.5 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 2: { cellWidth: 55 }, 3: { cellWidth: 12 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 }, 6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 12, halign: 'center' } },
      margin: { left: 10, right: 10 }, tableLineWidth: 0,
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 6) {
          const isC = rowCorrectness[data.row.index] === true;
          doc.setTextColor(isC ? 22 : 220, isC ? 163 : 38, isC ? 38 : 38);
          doc.setFont('helvetica', 'bold');
          doc.text(isC ? 'Yes' : 'No', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.5, { align: 'center' });
        }
        if (data.section === 'body' && data.column.index === 7) {
          const raw = data.cell.raw.toString();
          const parts = raw.split('/');
          const earned = parseInt(parts[0]) || 0;
          const max = parseInt(parts[1]) || 1;
          drawProgressDots(doc, data, earned, max);
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  const topicEntries = Object.entries(byTopic);
  if (topicEntries.length > 0) {
    if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
    doc.setFillColor(...NAVY);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOPIC PERFORMANCE', 18, y + 0.5);
    y += 9;
    autoTable(doc, {
      startY: y, head: [['Topic', 'Correct', 'Total', 'Score', 'Status']],
      body: topicEntries.map(([topic, d]: [string, any]) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return [topic, `${d.correct}`, `${d.total}`, `${pct}%`, pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work'];
      }),
      theme: 'striped', headStyles: { fillColor: [...NAVY] as [number, number, number] },
      margin: { left: 14, right: 14 }, tableLineWidth: 0,
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  if (y < 250) {
    y += 3;
    doc.setFillColor(240, 242, 245);
    doc.rect(18, y, pageW - 36, 6, 'F');
    doc.setFillColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
    doc.rect(18, y, Math.max((pageW - 36) * score / 100, 6), 6, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Overall Score: ${score}% | ${correctQ} of ${totalQ} correct`, pageW / 2, y + 10, { align: 'center' });
  }

  drawFooter(doc);
  return doc;
}

function drawRadarChart(doc: any, bySubj: Record<string, { correct: number; total: number }>, cx: number, cy: number, radius: number): void {
  const items = Object.entries(bySubj).filter(([_, d]) => d.total > 0);
  const n = items.length;
  if (n < 2) return;
  const angleStep = (2 * Math.PI) / n;
  for (let level = 1; level <= 5; level++) {
    const r = (level / 5) * radius;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.ellipse(cx, cy, r, r);
  }
  const pts: number[][] = [];
  items.forEach(([subject, d], i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
    const endX = cx + radius * Math.cos(angle);
    const endY = cy + radius * Math.sin(angle);
    doc.setDrawColor(200, 200, 215);
    doc.setLineWidth(0.2);
    doc.line(cx, cy, endX, endY);
    const valR = (pct / 100) * radius;
    const px = valR * Math.cos(angle);
    const py = valR * Math.sin(angle);
    pts.push([px, py]);
    const labelR = radius + 10;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    doc.setFontSize(4.5);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(subject.substring(0, 10), lx, ly, { align: 'center' });
  });
  if (pts.length >= 2) {
    doc.setFillColor(30, 58, 95, 0.12);
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.6);
    doc.lines(pts, cx, cy, [1, 1], 'DF');
  }
}

function drawBarChart(doc: any, bySubj: Record<string, { correct: number; total: number }>, x: number, y: number, w: number, maxY: number): number {
  const items = Object.entries(bySubj)
    .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
  if (items.length === 0) return y;
  const barH = 4.5, gap = 2.5, labelW = 36, pctW = 12, barMaxW = w - labelW - pctW;
  const chartH = items.length * (barH + gap) + 11;
  if (y + chartH > maxY) { doc.addPage(); y = 25; }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y); y += 3;
  doc.setFontSize(8); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold');
  doc.text('Subject Performance Overview', x, y); y += 5.5;
  items.forEach((item, i) => {
    const by = y + i * (barH + gap);
    doc.setFontSize(6.5); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
    doc.text(item.name.substring(0, 14), x, by + barH - 0.5);
    doc.setFillColor(238, 238, 238);
    doc.rect(x + labelW, by, barMaxW, barH, 'F');
    const barW = Math.max((item.pct / 100) * barMaxW, 1);
    const bc: [number, number, number] = item.pct >= 70 ? [22, 163, 74] : item.pct >= 40 ? [245, 158, 11] : [220, 38, 38];
    doc.setFillColor(...bc);
    doc.rect(x + labelW, by, barW, barH, 'F');
    doc.setTextColor(80, 80, 80); doc.setFontSize(6);
    doc.text(`${item.pct}%`, x + labelW + barMaxW + 1.5, by + barH - 0.5);
  });
  return y + items.length * (barH + gap) + 3;
}

function drawInsights(doc: any, bySubj: Record<string, { correct: number; total: number }>, byDiff: Record<string, { correct: number; total: number }>, byTop: Record<string, { correct: number; total: number }>, x: number, y: number, w: number, maxY: number): number {
  const subjItems = Object.entries(bySubj)
    .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
    .filter(s => s.pct > 0);
  if (subjItems.length === 0 && Object.keys(byDiff).length === 0) return y;
  let estH = 12;
  if (subjItems.length > 0) estH += 6 + Math.min(subjItems.length, 2) * 4.5;
  estH += 6 + Math.min(Object.keys(byDiff).length, 3) * 4.5;
  if (y + estH > maxY) { doc.addPage(); y = 25; }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y); y += 3;
  doc.setFontSize(8); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold');
  doc.text('Performance Insights', x, y); y += 5;
  if (subjItems.length > 0) {
    const sorted = [...subjItems].sort((a, b) => b.pct - a.pct);
    doc.setFontSize(6.5); doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('Strongest', x, y); y += 3.5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    sorted.slice(0, 2).forEach(s => { doc.text(`${s.name}: ${s.pct}%`, x + 3, y + 0.5); y += 4; });
    y += 1;
    const weak = sorted.filter(s => s.pct < 40);
    if (weak.length > 0) {
      doc.setFontSize(6.5); doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('Needs Improvement', x, y); y += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      weak.forEach(s => { doc.text(`${s.name}: ${s.pct}%`, x + 3, y + 0.5); y += 4; });
      y += 1;
    }
  }
  const diffWeak = Object.entries(byDiff).filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4);
  if (diffWeak.length > 0) {
    doc.setFontSize(6.5); doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.text('Difficulty Challenges', x, y); y += 3.5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    diffWeak.slice(0, 3).forEach(([diff, d]) => {
      const pct = Math.round((d.correct / d.total) * 100);
      doc.text(`${diff}: ${pct}% correct`, x + 3, y + 0.5); y += 4;
    });
    y += 1;
  }
  const topWeak = Object.entries(byTop).filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4);
  if (topWeak.length > 0) {
    if (y + 8 > maxY) { doc.addPage(); y = 25; }
    doc.setFontSize(6.5); doc.setTextColor(124, 58, 237);
    doc.setFont('helvetica', 'bold');
    doc.text('Topics to Focus On', x, y); y += 3.5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    topWeak.slice(0, 4).forEach(([t, d]) => {
      const pct = Math.round((d.correct / d.total) * 100);
      doc.text(`${t}: ${pct}%`, x + 3, y + 0.5); y += 4;
    });
  }
  return y + 2;
}

function drawProgressDots(doc: any, data: any, earned: number, max: number): void {
  if (max <= 0) return;
  const dotR = 0.6;
  const spacing = 2.2;
  const startX = data.cell.x + (data.cell.width - (max * spacing)) / 2;
  const dotY = data.cell.y + data.cell.height / 2;
  for (let i = 0; i < max; i++) {
    doc.setFillColor(i < earned ? 22 : 200, i < earned ? 163 : 200, i < earned ? 74 : 200);
    doc.ellipse(startX + i * spacing, dotY, dotR, dotR, 'F');
  }
}

function formatAnswer(q: any): string {
  if (q.options && Array.isArray(q.options) && typeof q.given_answer === 'number' && q.options[q.given_answer]) {
    return `${q.given_answer + 1}. ${q.options[q.given_answer]}`;
  }
  if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.given_answer === 'number') {
    return q.given_answer === 0 ? 'True' : 'False';
  }
  return String(q.given_answer ?? '—');
}

function formatCorrectAnswer(q: any): string {
  if (q.options && Array.isArray(q.options) && typeof q.correct_answer === 'number' && q.options[q.correct_answer]) {
    return `${q.correct_answer + 1}. ${q.options[q.correct_answer]}`;
  }
  if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.correct_answer === 'number') {
    return q.correct_answer === 0 ? 'True' : 'False';
  }
  return String(q.correct_answer ?? '—');
}
