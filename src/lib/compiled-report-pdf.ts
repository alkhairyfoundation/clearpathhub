import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompiledData {
  student: { name: string; admission: string; className: string } | null;
  summary: {
    totalTests: number;
    avgScore: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    totalCorrect: number;
    totalQuestions: number;
    trendDirection: 'improving' | 'declining' | 'stable';
  };
  scoreTrend: { date: string; score: number; testTitle: string; subjectName: string }[];
  subjectPerformance: { name: string; correct: number; total: number; percentage: number }[];
  topicPerformance: { name: string; correct: number; total: number; percentage: number }[];
  subjectTopicBreakdown: { subject: string; topics: { name: string; correct: number; total: number; percentage: number }[] }[];
  difficultyBreakdown: { level: string; correct: number; total: number; percentage: number }[];
  questionPatterns: { question: string; subject: string; topic: string; difficulty: string; timesSeen: number; timesCorrect: number; missRate: number }[];
  securitySummary: { totalTabSwitches: number; totalFullscreenExits: number; totalSecurityEvents: number; testsWithEvents: number };
  insights: {
    strengths: string[];
    needsImprovement: string[];
    weakTopics: string[];
    overall: string;
    subjectRecommendations: { subject: string; score: number; assessment: string; recommendation: string }[];
    recommendations: string[];
  };
  attempts: { id: string; title: string; subjectName: string; score: number; passed: boolean; correctAnswers: number; totalQuestions: number; completedAt: string }[];
}

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

function getAssessmentText(pct: number): string {
  if (pct >= 90) return 'Outstanding';
  if (pct >= 80) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 60) return 'Satisfactory';
  if (pct >= 40) return 'Needs Improvement';
  return 'Critical';
}

export function generateCompiledReportPdf(data: CompiledData, schoolName?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const marginL = 15;
  const marginR = 195;
  const contentW = marginR - marginL;
  let y = 0;
  let pageCount = 0;

  const name = schoolName || 'ClearPath Edu Hub';

  const drawGoldLine = (yy: number) => {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(marginL, yy, marginR, yy);
  };

  const drawFooter = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, pageH - 14, pageW, 0.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${name} — Official Document`, marginL, pageH - 7);
    doc.text('This report is system-generated and does not require a signature.', marginL, pageH - 4);
    doc.text(`Page ${pageCount}`, marginR, pageH - 7, { align: 'right' });
  };

  const newPage = () => {
    if (pageCount > 0) drawFooter();
    doc.addPage();
    pageCount++;
    y = 15;
  };

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 35, pageW, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(name, pageW / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Compiled Test Performance Report', pageW / 2, 22, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, 30, { align: 'center' });
  };

  const checkPage = (needed: number = 30) => {
    if (y + needed > pageH - 25) {
      newPage();
      drawHeader();
      y = 48;
    }
  };

  const drawRadarChart = (cx: number, cy: number, radius: number, labels: string[], values: number[]) => {
    const n = labels.length;
    if (n === 0) return;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;
    const getVertex = (index: number, r: number) => {
      const angle = startAngle + index * angleStep;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    for (let level = 1; level <= 5; level++) {
      const r = (radius * level) / 5;
      for (let i = 0; i < n; i++) {
        const v1 = getVertex(i, r);
        const v2 = getVertex((i + 1) % n, r);
        doc.line(v1.x, v1.y, v2.x, v2.y);
      }
    }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    for (let i = 0; i < n; i++) {
      const v = getVertex(i, radius);
      doc.line(cx, cy, v.x, v.y);
    }
    doc.setFillColor(...GOLD);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    const dataPoints: number[][] = [];
    for (let i = 0; i < n; i++) {
      const pct = Math.max(0, Math.min(100, values[i] || 0));
      const r = (radius * pct) / 100;
      const v = getVertex(i, r);
      dataPoints.push([v.x, v.y]);
    }
    for (let i = 0; i < n; i++) {
      const x1 = dataPoints[i][0], y1 = dataPoints[i][1];
      const x2 = dataPoints[(i + 1) % n][0], y2 = dataPoints[(i + 1) % n][1];
      doc.line(x1, y1, x2, y2);
    }
    for (let i = 0; i < n; i++) {
      doc.circle(dataPoints[i][0], dataPoints[i][1], 1.2, 'F');
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    for (let i = 0; i < n; i++) {
      const v = getVertex(i, radius + 7);
      doc.text(`${labels[i]} (${(values[i] || 0).toFixed(0)}%)`, v.x, v.y, { align: 'center' });
    }
  };

  const drawHorizontalBar = (x: number, yBar: number, barWidth: number, barHeight: number, pct: number) => {
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x, yBar, barWidth, barHeight, 1, 1, 'F');
    const fillW = Math.max(0, (barWidth * Math.min(100, pct)) / 100);
    if (fillW > 0) {
      const color: [number, number, number] = pct >= 70 ? [0, 140, 60] : pct >= 50 ? [200, 150, 0] : [200, 30, 30];
      doc.setFillColor(...color);
      doc.roundedRect(x, yBar, fillW, barHeight, 1, 1, 'F');
    }
  };

  const sectionTitle = (title: string) => {
    checkPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(title, marginL, y);
    y += 3;
    drawGoldLine(y);
    y += 7;
  };

  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  pageCount = 1;
  drawHeader();
  y = 48;

  // Student Info
  if (data.student) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`Student: ${data.student.name || 'Unknown'}`, marginL, y);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Admission #: ${data.student.admission || 'N/A'}  |  Class: ${data.student.className || 'N/A'}`, marginR, y, { align: 'right' });
    y += 7;
  }

  // Summary Section
  sectionTitle('Performance Summary');
  const s = data.summary;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginL, y, contentW, 30, 2, 2, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, 30, 2, 2, 'S');

  const sumY = y + 5;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const colW = contentW / 5;
  const sumFields = [
    { label: 'Total Tests', value: `${s.totalTests}` },
    { label: 'Avg Score', value: `${s.avgScore}%` },
    { label: 'Pass Rate', value: `${s.passRate}%` },
    { label: 'Highest', value: `${s.highestScore}%` },
    { label: 'Lowest', value: `${s.lowestScore}%` },
  ];
  sumFields.forEach((f, i) => {
    const fx = marginL + i * colW;
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(f.label, fx + 2, sumY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(f.value, fx + 2, sumY + 6);
  });

  const gradeLetter = getLetterGrade(s.avgScore);
  const gradeColor = getGradeColor(gradeLetter);

  doc.setFillColor(...GOLD);
  doc.roundedRect(marginL + 2, sumY + 12, 30, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${s.avgScore}%`, marginL + 17, sumY + 19, { align: 'center' });

  doc.setFillColor(...gradeColor);
  doc.roundedRect(marginL + 36, sumY + 12, 20, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.text(gradeLetter, marginL + 46, sumY + 19, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Correct: ${s.totalCorrect}/${s.totalQuestions}  |  Assessment: ${getAssessmentText(s.avgScore)}  |  Trend: ${s.trendDirection.toUpperCase()}`,
    marginL + 62, sumY + 19
  );

  y += 36;

  // Subject Performance with Radar
  if (data.subjectPerformance.length > 0) {
    if (data.subjectPerformance.length >= 3) {
      sectionTitle('Subject Performance Overview');

      const radarCx = pageW / 2;
      const radarCy = y + 42;
      const radarR = 38;
      const radarLabels = data.subjectPerformance.map(s => s.name.substring(0, 12));
      const radarValues = data.subjectPerformance.map(s => s.percentage);
      drawRadarChart(radarCx, radarCy, radarR, radarLabels, radarValues);
      y = radarCy + radarR + 20;
    }

    sectionTitle('Subject Performance Details');
    const subjHead = [['Subject', 'Score', 'Assessment', 'Performance']];
    const subjBody = data.subjectPerformance.map(s => [
      s.name,
      `${s.correct}/${s.total} (${s.percentage}%)`,
      getAssessmentText(s.percentage),
      '',
    ]);
    autoTable(doc, {
      startY: y, head: subjHead, body: subjBody, theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 70 } },
      margin: { left: marginL },
    });
    const subjTable = (doc as any).lastAutoTable;
    if (subjTable && typeof subjTable.finalY === 'number') {
      const cellH = 7;
      const stY = typeof subjTable.startY === 'number' ? subjTable.startY : y;
      data.subjectPerformance.forEach((s, i) => {
        const rowY = stY + 9 + i * cellH;
        if (rowY > pageH - 30) return;
        drawHorizontalBar(marginL + 112, rowY, 60, 4, s.percentage);
      });
      y = subjTable.finalY + 8;
    }
  }

  // Topic Performance
  if (data.topicPerformance.length > 0) {
    sectionTitle('Topic Performance Analysis');
    const topicHead = [['Topic', 'Score', 'Status', 'Performance']];
    const topicBody = data.topicPerformance.map(t => [
      t.name.substring(0, 30),
      `${t.correct}/${t.total} (${t.percentage}%)`,
      getAssessmentText(t.percentage),
      '',
    ]);
    autoTable(doc, {
      startY: y, head: topicHead, body: topicBody, theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 65 } },
      margin: { left: marginL },
    });
    const topicTable = (doc as any).lastAutoTable;
    if (topicTable && typeof topicTable.finalY === 'number') {
      const cellH = 7;
      const ttY = typeof topicTable.startY === 'number' ? topicTable.startY : y;
      data.topicPerformance.forEach((t, i) => {
        const rowY = ttY + 9 + i * cellH;
        if (rowY > pageH - 30) return;
        drawHorizontalBar(marginL + 117, rowY, 55, 4, t.percentage);
      });
      y = topicTable.finalY + 8;
    }
  }

  // Difficulty Breakdown
  if (data.difficultyBreakdown.length > 0) {
    sectionTitle('Difficulty Analysis');
    const diffHead = [['Level', 'Score', 'Assessment', 'Performance']];
    const diffBody = data.difficultyBreakdown.map(d => [
      d.level,
      `${d.correct}/${d.total} (${d.percentage}%)`,
      getAssessmentText(d.percentage),
      '',
    ]);
    autoTable(doc, {
      startY: y, head: diffHead, body: diffBody, theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 75 } },
      margin: { left: marginL },
    });
    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : y + 8;
  }

  // Per-Question Breakdown
  if (data.questionPatterns.length > 0) {
    sectionTitle('Per-Question Breakdown');
    const qHead = [['#', 'Question', 'Subject', 'Difficulty', 'Seen', 'Correct', 'Miss Rate']];
    const qBody = data.questionPatterns.map((q, i) => [
      `${i + 1}`,
      q.question.substring(0, 45),
      q.subject.substring(0, 18),
      q.difficulty,
      `${q.timesSeen}`,
      `${q.timesCorrect}`,
      `${(q.missRate * 100).toFixed(0)}%`,
    ]);
    autoTable(doc, {
      startY: y, head: qHead, body: qBody, theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 22 },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: marginL },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 6) {
          const val = parseFloat(hookData.cell.raw);
          hookData.cell.styles.textColor = val > 50 ? [200, 30, 30] : val > 30 ? [200, 150, 0] : [0, 140, 60];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : y + 8;
  }

  // Test History
  if (data.attempts.length > 0) {
    sectionTitle('Test History');
    const histHead = [['#', 'Test', 'Subject', 'Score', 'Result', 'Date']];
    const histBody = data.attempts.map((a, i) => [
      `${i + 1}`,
      a.title.substring(0, 25),
      a.subjectName.substring(0, 15),
      `${a.score}%`,
      a.passed ? 'Pass' : 'Fail',
      new Date(a.completedAt).toLocaleDateString(),
    ]);
    autoTable(doc, {
      startY: y, head: histHead, body: histBody, theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 16, halign: 'center' }, 5: { cellWidth: 28 } },
      margin: { left: marginL },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 4) {
          hookData.cell.styles.textColor = hookData.cell.raw === 'Pass' ? [0, 140, 60] : [200, 30, 30];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : y + 8;
  }

  // Insights
  if (data.insights) {
    sectionTitle('Performance Insights & Recommendations');

    const masteryLevel = s.avgScore >= 90 ? 'MASTERY' : s.avgScore >= 75 ? 'PROFICIENT' : s.avgScore >= 60 ? 'DEVELOPING' : s.avgScore >= 40 ? 'BEGINNING' : 'NOT YET BEGINNING';
    const masteryColor: [number, number, number] =
      masteryLevel === 'MASTERY' ? [0, 140, 60] :
      masteryLevel === 'PROFICIENT' ? [30, 120, 200] :
      masteryLevel === 'DEVELOPING' ? [200, 150, 0] :
      masteryLevel === 'BEGINNING' ? [220, 100, 0] : [200, 30, 30];

    checkPage(20);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(marginL, y, contentW, 18, 2, 2, 'F');
    doc.setDrawColor(...masteryColor);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginL, y, contentW, 18, 2, 2, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...masteryColor);
    doc.text(`Overall Mastery Level: ${masteryLevel}`, marginL + 4, y + 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const masteryDesc = masteryLevel === 'MASTERY'
      ? 'Student demonstrates comprehensive understanding across all tested areas.'
      : masteryLevel === 'PROFICIENT'
      ? 'Solid understanding with minor gaps that need targeted practice.'
      : masteryLevel === 'DEVELOPING'
      ? 'Building understanding but needs consistent practice in key areas.'
      : masteryLevel === 'BEGINNING'
      ? 'Early stages of understanding, requires significant additional support.'
      : 'Needs intensive intervention and foundational skill building.';
    doc.text(masteryDesc, marginL + 4, y + 13);
    y += 22;

    // Strengths
    if (data.insights.strengths.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 140, 60);
      doc.text('Strengths', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.strengths.forEach(s => {
        checkPage(8);
        const lines = wrapText(`+  ${s} - performing well above average across all tests.`, contentW - 5, 8);
        lines.forEach(line => { doc.text(line, marginL + 3, y); y += 4; });
        y += 1;
      });
      y += 3;
    }

    // Needs Improvement
    if (data.insights.needsImprovement.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 100, 0);
      doc.text('Areas Needing Improvement', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.needsImprovement.forEach(s => {
        checkPage(8);
        const lines = wrapText(`!  ${s} - requires focused attention across multiple tests.`, contentW - 5, 8);
        lines.forEach(line => { doc.text(line, marginL + 3, y); y += 4; });
        y += 1;
      });
      y += 3;
    }

    // Weak Topics
    if (data.insights.weakTopics.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 30, 30);
      doc.text('Weak Topics Requiring Revision', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.weakTopics.forEach(t => {
        checkPage(8);
        const lines = wrapText(`*  ${t} - below 50% mastery across all tests. Priority topic for revision.`, contentW - 5, 8);
        lines.forEach(line => { doc.text(line, marginL + 3, y); y += 4; });
        y += 1;
      });
      y += 3;
    }

    // Recommendations
    if (data.insights.recommendations.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('Recommendations', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      data.insights.recommendations.forEach((r, i) => {
        checkPage(8);
        const lines = wrapText(`${i + 1}. ${r}`, contentW - 5, 8);
        lines.forEach(line => { doc.text(line, marginL + 3, y); y += 4; });
        y += 1;
      });
      y += 3;
    }
  }

  // Security Summary
  if (data.securitySummary.totalSecurityEvents > 0) {
    checkPage(15);
    sectionTitle('Security Summary');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Tab Switches: ${data.securitySummary.totalTabSwitches}`, marginL, y); y += 4;
    doc.text(`Total Fullscreen Exits: ${data.securitySummary.totalFullscreenExits}`, marginL, y); y += 4;
    doc.text(`Tests with Security Events: ${data.securitySummary.testsWithEvents}/${data.summary.totalTests}`, marginL, y); y += 4;
    y += 3;
  }

  // Remove empty trailing page if last page only has header
  let totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    doc.setPage(totalPages);
    if (y <= 48) {
      doc.deletePage(totalPages);
      totalPages--;
    }
  }

  // Draw footers on all pages
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pgH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...NAVY);
    doc.rect(0, pgH - 14, pageW, 14, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, pgH - 14, pageW, 0.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${name} — Official Document`, marginL, pgH - 7);
    doc.text('This report is system-generated and does not require a signature.', marginL, pgH - 4);
    doc.text(`Page ${p} of ${totalPages}`, marginR, pgH - 7, { align: 'right' });
  }
  doc.setPage(1);

  return doc;
}
