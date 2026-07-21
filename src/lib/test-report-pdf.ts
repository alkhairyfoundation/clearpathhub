import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  student: { name: string; admission: string };
  attempt: {
    id: string;
    score: number;
    passed: boolean;
    correct_answers: number;
    total_questions: number;
    time_taken?: number;
    tab_switches?: number;
    fullscreen_exits?: number;
    started_at?: string;
    completed_at?: string;
  };
  test: {
    title: string;
    subject_name: string;
    subject_code?: string;
    class_name: string;
    total_marks: number;
    passing_score: number;
    duration_minutes: number;
  };
  questions: any[];
  subjectPerformance: any[];
  difficultyBreakdown: any[];
  topicPerformance: any[];
  subjectTopicBreakdown?: any[];
  insights: {
    strengths: string[];
    needsImprovement: string[];
    weakTopics: string[];
    overall: string;
  };
  securityEvents?: any[];
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

export function generateTestReportPdf(data: ReportData, schoolName?: string): jsPDF {
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
    if (pageCount > 0) {
      drawFooter();
    }
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
    doc.text('Comprehensive Test Report', pageW / 2, 22, { align: 'center' });
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

  const drawRadarChart = (
    cx: number,
    cy: number,
    radius: number,
    labels: string[],
    values: number[]
  ) => {
    const n = labels.length;
    if (n === 0) return;

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    const getVertex = (index: number, r: number) => {
      const angle = startAngle + index * angleStep;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    };

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    for (let level = 1; level <= 5; level++) {
      const r = (radius * level) / 5;
      const points: number[][] = [];
      for (let i = 0; i < n; i++) {
        const v = getVertex(i, r);
        points.push([v.x, v.y]);
      }
      for (let i = 0; i < n; i++) {
        const x1 = points[i][0];
        const y1 = points[i][1];
        const x2 = points[(i + 1) % n][0];
        const y2 = points[(i + 1) % n][1];
        doc.line(x1, y1, x2, y2);
      }

      if (level === 5) {
        doc.setFontSize(5);
        doc.setTextColor(150, 150, 150);
        for (let i = 0; i < n; i++) {
          const v = getVertex(i, r);
          doc.text(`${level * 20}`, v.x + 1.5, v.y + 1);
        }
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
      const x1 = dataPoints[i][0];
      const y1 = dataPoints[i][1];
      const x2 = dataPoints[(i + 1) % n][0];
      const y2 = dataPoints[(i + 1) % n][1];
      doc.line(x1, y1, x2, y2);
    }

    for (let i = 0; i < n; i++) {
      const px = dataPoints[i][0];
      const py = dataPoints[i][1];
      doc.circle(px, py, 1.2, 'F');
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    for (let i = 0; i < n; i++) {
      const v = getVertex(i, radius + 7);
      const label = labels[i];
      const val = values[i] || 0;
      const text = `${label} (${val.toFixed(0)}%)`;
      doc.text(text, v.x, v.y, { align: 'center' });
    }
  };

  const drawHorizontalBar = (
    x: number,
    yBar: number,
    barWidth: number,
    barHeight: number,
    pct: number
  ) => {
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x, yBar, barWidth, barHeight, 1, 1, 'F');
    const fillW = Math.max(0, (barWidth * Math.min(100, pct)) / 100);
    if (fillW > 0) {
      const color = pct >= 70 ? [0, 140, 60] : pct >= 50 ? [200, 150, 0] : [200, 30, 30];
      doc.setFillColor(...(color as [number, number, number]));
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
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines;
  };

  newPage();
  drawHeader();
  y = 48;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(`Student: ${data.student?.name || 'Unknown'}`, marginL, y);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Admission #: ${data.student?.admission || 'N/A'}`, marginR, y, { align: 'right' });
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(`Test: ${data.test.title}`, marginL, y);
  y += 5;
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Class: ${data.test.class_name}  |  Subject: ${data.test.subject_name}${data.test.subject_code ? ' (' + data.test.subject_code + ')' : ''}`, marginL, y);
  y += 4;
  doc.text(`Duration: ${data.test.duration_minutes} min  |  Total Marks: ${data.test.total_marks}  |  Passing Score: ${data.test.passing_score}`, marginL, y);
  y += 7;

  sectionTitle('Score Summary');

  const scorePct = data.attempt.score;
  const gradeLetter = getLetterGrade(scorePct);
  const gradeColor = getGradeColor(gradeLetter);
  const passText = data.attempt.passed ? 'PASSED' : 'FAILED';
  const passColor: [number, number, number] = data.attempt.passed ? [0, 140, 60] : [200, 30, 30];

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginL, y, contentW, 28, 2, 2, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, 28, 2, 2, 'S');

  const bannerY = y + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const colW = contentW / 4;
  const fields = [
    { label: 'Student', value: data.student?.name || 'Unknown' },
    { label: 'Test', value: data.test.title },
    { label: 'Class', value: data.test.class_name },
    { label: 'Subject', value: data.test.subject_name },
  ];
  fields.forEach((f, i) => {
    const fx = marginL + i * colW;
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(f.label, fx + 2, bannerY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(f.value.substring(0, 22), fx + 2, bannerY + 5);
  });

  const bannerY2 = bannerY + 11;
  doc.setFillColor(...GOLD);
  doc.roundedRect(marginL + 2, bannerY2, 30, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${scorePct.toFixed(1)}%`, marginL + 17, bannerY2 + 7, { align: 'center' });

  doc.setFillColor(...(gradeColor as [number, number, number]));
  doc.roundedRect(marginL + 36, bannerY2, 20, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.text(gradeLetter, marginL + 46, bannerY2 + 7, { align: 'center' });

  doc.setFillColor(...(passColor as [number, number, number]));
  doc.roundedRect(marginL + 60, bannerY2, 25, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.text(passText, marginL + 72.5, bannerY2 + 7, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Correct: ${data.attempt.correct_answers}/${data.attempt.total_questions}  |  Assessment: ${getAssessmentText(scorePct)}`,
    marginL + 90,
    bannerY2 + 7
  );

  if (data.attempt.time_taken) {
    const mins = Math.floor(data.attempt.time_taken / 60);
    const secs = data.attempt.time_taken % 60;
    doc.text(`Time: ${mins}m ${secs}s`, marginL + 90, bannerY2 + 4);
  }

  y += 34;

  if (data.subjectPerformance && data.subjectPerformance.length >= 3) {
    sectionTitle('Subject Performance Overview');

    const radarCx = pageW / 2;
    const radarCy = y + 42;
    const radarR = 38;

    const radarLabels = data.subjectPerformance.map((s: any) => (s.name || '').substring(0, 12));
    const radarValues = data.subjectPerformance.map((s: any) => s.percentage || 0);

    drawRadarChart(radarCx, radarCy, radarR, radarLabels, radarValues);

    y = radarCy + radarR + 20;

    sectionTitle('Subject Performance Details');

    const subjHead = [['Subject', 'Score', 'Assessment', 'Performance']];
    const subjBody = data.subjectPerformance.map((s: any) => {
      const pct = s.percentage || 0;
      return [
        s.name || '',
        `${s.correct || 0}/${s.total || 0} (${pct.toFixed(1)}%)`,
        getAssessmentText(pct),
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: subjHead,
      body: subjBody,
      theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 70 },
      },
      margin: { left: marginL },
    });
    y = (doc as any).lastAutoTable.finalY + 3;

    const tableBody = (doc as any).lastAutoTable as any;
    if (tableBody && tableBody.startY !== undefined) {
      const rows = data.subjectPerformance;
      const startY = tableBody.startY;
      const cellH = 7;
      rows.forEach((s: any, i: number) => {
        const rowY = startY + 9 + i * cellH;
        if (rowY > pageH - 30) return;
        const pct = s.percentage || 0;
        drawHorizontalBar(marginL + 112, rowY, 60, 4, pct);
      });
    }
    y = (doc as any).lastAutoTable.finalY + 8;
  } else if (data.subjectPerformance && data.subjectPerformance.length > 0) {
    sectionTitle('Subject Performance');

    const radarLabels = data.subjectPerformance.map((s: any) => (s.name || '').substring(0, 12));
    const radarValues = data.subjectPerformance.map((s: any) => s.percentage || 0);

    const barY = y + 5;
    data.subjectPerformance.forEach((s: any, i: number) => {
      const pct = s.percentage || 0;
      const rowY = barY + i * 10;
      checkPage(10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text((s.name || '').substring(0, 20), marginL, rowY + 4);

      drawHorizontalBar(marginL + 45, rowY, 90, 5, pct);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`${pct.toFixed(1)}%`, marginL + 140, rowY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(getAssessmentText(pct), marginL + 155, rowY + 4);
    });
    y = barY + data.subjectPerformance.length * 10 + 8;
  }

  if (data.topicPerformance && data.topicPerformance.length > 0) {
    sectionTitle('Topic Performance Analysis');

    if (data.topicPerformance.length >= 3) {
      const tRadarCx = pageW / 2;
      const tRadarCy = y + 38;
      const tRadarR = 34;

      const tLabels = data.topicPerformance.map((t: any) => (t.name || '').substring(0, 10));
      const tValues = data.topicPerformance.map((t: any) => t.percentage || 0);

      drawRadarChart(tRadarCx, tRadarCy, tRadarR, tLabels, tValues);
      y = tRadarCy + tRadarR + 18;
    }

    const topicHead = [['Topic', 'Score', 'Status', 'Performance']];
    const topicBody = data.topicPerformance.map((t: any) => {
      const pct = t.percentage || 0;
      return [
        (t.name || '').substring(0, 30),
        `${t.correct || 0}/${t.total || 0} (${pct.toFixed(1)}%)`,
        getAssessmentText(pct),
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: topicHead,
      body: topicBody,
      theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 65 },
      },
      margin: { left: marginL },
    });

    const lastTable = (doc as any).lastAutoTable as any;
    if (lastTable && lastTable.startY !== undefined) {
      const cellH = 7;
      data.topicPerformance.forEach((t: any, i: number) => {
        const rowY = lastTable.startY + 9 + i * cellH;
        if (rowY > pageH - 30) return;
        const pct = t.percentage || 0;
        drawHorizontalBar(marginL + 117, rowY, 55, 4, pct);
      });
    }
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.difficultyBreakdown && data.difficultyBreakdown.length > 0) {
    sectionTitle('Difficulty Analysis');

    const diffHead = [['Difficulty Level', 'Score', 'Assessment', 'Performance']];
    const diffBody = data.difficultyBreakdown.map((d: any) => {
      const pct = d.percentage || 0;
      return [
        d.level || '',
        `${d.correct || 0}/${d.total || 0} (${pct.toFixed(1)}%)`,
        getAssessmentText(pct),
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: diffHead,
      body: diffBody,
      theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 75 },
      },
      margin: { left: marginL },
    });

    const diffTable = (doc as any).lastAutoTable as any;
    if (diffTable && diffTable.startY !== undefined) {
      const cellH = 7;
      data.difficultyBreakdown.forEach((d: any, i: number) => {
        const rowY = diffTable.startY + 9 + i * cellH;
        if (rowY > pageH - 30) return;
        const pct = d.percentage || 0;
        drawHorizontalBar(marginL + 107, rowY, 68, 4, pct);
      });
    }
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.subjectTopicBreakdown && data.subjectTopicBreakdown.length > 0) {
    sectionTitle('Subject-Topic Breakdown');

    for (const st of data.subjectTopicBreakdown) {
      checkPage(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(st.subject || '', marginL, y);
      y += 5;

      const stHead = [['Topic', 'Correct/Total', 'Score', 'Performance']];
      const stBody = (st.topics || []).map((t: any) => {
        const pct = t.percentage || 0;
        return [
          (t.name || '').substring(0, 30),
          `${t.correct || 0}/${t.total || 0}`,
          `${pct.toFixed(1)}%`,
          '',
        ];
      });

      autoTable(doc, {
        startY: y,
        head: stHead,
        body: stBody,
        theme: 'grid',
        headStyles: { fillColor: [...GOLD], textColor: [...NAVY], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 80 },
        },
        margin: { left: marginL },
      });

      const stTable = (doc as any).lastAutoTable as any;
      if (stTable && stTable.startY !== undefined) {
        const cellH = 7;
        (st.topics || []).forEach((t: any, i: number) => {
          const rowY = stTable.startY + 9 + i * cellH;
          if (rowY > pageH - 30) return;
          const pct = t.percentage || 0;
          drawHorizontalBar(marginL + 107, rowY, 73, 4, pct);
        });
      }
      y = (doc as any).lastAutoTable.finalY + 6;
    }
    y += 2;
  }

  if (data.questions && data.questions.length > 0) {
    sectionTitle('Per-Question Analysis');

    const qHead = [['#', 'Subject', 'Topic', 'Result', 'Points']];
    const qBody = data.questions.map((q: any, idx: number) => [
      `${idx + 1}`,
      (q.subject || '').substring(0, 14),
      (q.topic || '').substring(0, 14),
      q.is_correct ? 'Correct' : 'Wrong',
      `${q.points_earned || 0}/${q.points || 0}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: qHead,
      body: qBody,
      theme: 'grid',
      headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: marginL },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          if (hookData.cell.raw === 'Correct') {
            hookData.cell.styles.textColor = [0, 140, 60];
            hookData.cell.styles.fontStyle = 'bold';
          } else {
            hookData.cell.styles.textColor = [200, 30, 30];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.securityEvents && data.securityEvents.length > 0) {
    sectionTitle('Security Events');

    const totalTabSwitches = data.attempt.tab_switches || 0;
    const totalFullscreenExits = data.attempt.fullscreen_exits || 0;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Tab Switches: ${totalTabSwitches}  |  Fullscreen Exits: ${totalFullscreenExits}`, marginL, y);

    let severity = 'Low';
    if (totalTabSwitches > 5 || totalFullscreenExits > 3) severity = 'High';
    else if (totalTabSwitches > 2 || totalFullscreenExits > 1) severity = 'Medium';

    const sevColor: [number, number, number] =
      severity === 'High' ? [200, 30, 30] : severity === 'Medium' ? [200, 150, 0] : [0, 140, 60];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(sevColor as [number, number, number]));
    doc.text(`Severity: ${severity}`, marginL + 100, y);
    y += 6;

    const seHead = [['#', 'Event Type', 'Details', 'Severity']];
    const seBody = data.securityEvents.map((ev: any, i: number) => [
      `${i + 1}`,
      ev.type || ev.event_type || 'Unknown',
      (ev.details || ev.description || '').substring(0, 40),
      ev.severity || 'Info',
    ]);

    autoTable(doc, {
      startY: y,
      head: seHead,
      body: seBody,
      theme: 'grid',
      headStyles: { fillColor: [180, 50, 50], textColor: [...WHITE], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: marginL },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.insights) {
    sectionTitle('Detailed Insights');

    if (data.insights.strengths && data.insights.strengths.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 140, 60);
      doc.text('Strengths', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.strengths.forEach((s: string) => {
        checkPage(8);
        const lines = wrapText(`\u2713  ${s}`, contentW - 5, 8);
        lines.forEach((line: string) => {
          doc.text(line, marginL + 3, y);
          y += 4;
        });
        y += 1;
      });
      y += 3;
    }

    if (data.insights.needsImprovement && data.insights.needsImprovement.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 100, 0);
      doc.text('Needs Improvement', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.needsImprovement.forEach((s: string) => {
        checkPage(8);
        const lines = wrapText(`\u2717  ${s}`, contentW - 5, 8);
        lines.forEach((line: string) => {
          doc.text(line, marginL + 3, y);
          y += 4;
        });
        y += 1;
      });
      y += 3;
    }

    if (data.insights.weakTopics && data.insights.weakTopics.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 30, 30);
      doc.text('Weak Topics', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.insights.weakTopics.forEach((t: string) => {
        checkPage(8);
        const lines = wrapText(`\u2022  ${t}`, contentW - 5, 8);
        lines.forEach((line: string) => {
          doc.text(line, marginL + 3, y);
          y += 4;
        });
        y += 1;
      });
      y += 3;
    }

    if (data.subjectPerformance && data.subjectPerformance.length > 0) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('Subject Recommendations', marginL, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      data.subjectPerformance.forEach((s: any) => {
        checkPage(8);
        const pct = s.percentage || 0;
        const assessment = getAssessmentText(pct);
        const rec = `${s.name || 'Subject'}: ${assessment} (${pct.toFixed(1)}%)`;
        const lines = wrapText(`\u25B8  ${rec}`, contentW - 5, 8);
        lines.forEach((line: string) => {
          doc.text(line, marginL + 3, y);
          y += 4;
        });
        y += 1;
      });
      y += 3;
    }
  }

  if (data.insights && data.insights.overall) {
    checkPage(25);
    sectionTitle('Overall Assessment');

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'F');
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const overallLines = wrapText(data.insights.overall, contentW - 8, 9);
    overallLines.forEach((line: string, i: number) => {
      if (i < 3) {
        doc.text(line, marginL + 4, y + 7 + i * 5);
      }
    });
    y += 24;
  }

  const totalPages = pageCount;
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
