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

export function generateTestReportPdf(data: ReportData, schoolName?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  let y = 15;
  let page = 1;

  const name = schoolName || 'ClearPath Edu Hub';

  const pdfHeader = () => {
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setFillColor(179, 146, 47);
    doc.rect(0, 36, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(name, pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Test Report', pageW / 2, 23, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, 31, { align: 'center' });
    y = 52;
  };

  const checkPage = () => {
    if (y > 265) {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(30, 58, 95);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(name + ' — Official Document', pageW / 2, pageH - 6, { align: 'center' });
      doc.addPage();
      page++;
      y = 15;
      pdfHeader();
    }
  };

  pdfHeader();
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const studentDisplay = data.student?.name || 'Unknown Student';
  doc.text(`Student: ${studentDisplay}`, 15, y); y += 6;
  doc.text(`Test: ${data.test.title}`, 15, y); y += 6;
  doc.text(`Class: ${data.test.class_name} | Subject: ${data.test.subject_name}`, 15, y); y += 6;
  doc.text(`Score: ${data.attempt.score}% - ${data.attempt.passed ? 'Passed' : 'Failed'}`, 15, y); y += 6;
  if (data.attempt.time_taken) {
    const mins = Math.floor(data.attempt.time_taken / 60);
    const secs = data.attempt.time_taken % 60;
    doc.text(`Time Taken: ${mins}m ${secs}s`, 15, y); y += 6;
  }
  y += 4;

  if (data.subjectPerformance && data.subjectPerformance.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(179, 146, 47);
    doc.text('Subject Performance', 15, y); y += 8;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const subjRows = data.subjectPerformance.map((s: any) => [s.name, `${s.correct}/${s.total}`, `${s.percentage}%`]);
    autoTable(doc, {
      startY: y, head: [['Subject', 'Correct/Total', 'Score']],
      body: subjRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.subjectTopicBreakdown && data.subjectTopicBreakdown.length > 0) {
    checkPage();
    doc.setFontSize(13);
    doc.setTextColor(179, 146, 47);
    doc.text('Topic Breakdown by Subject', 15, y); y += 8;
    for (const st of data.subjectTopicBreakdown) {
      checkPage();
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Subject: ${st.subject}`, 15, y); y += 6;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const topicRows = st.topics.map((t: any) => [t.name, `${t.correct}/${t.total}`, `${t.percentage}%`]);
      autoTable(doc, {
        startY: y, head: [['Topic', 'Correct/Total', 'Score']],
        body: topicRows, theme: 'grid', headStyles: { fillColor: [100, 100, 100] },
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
    y += 4;
  }

  if (data.questions && data.questions.length > 0) {
    checkPage();
    doc.setFontSize(13);
    doc.setTextColor(179, 146, 47);
    doc.text('Per-Question Analysis', 15, y); y += 8;
    const qRows = data.questions.map((q: any) => [
      `Q${q.index}`, (q.subject || '').substring(0, 12), (q.topic || '').substring(0, 12), q.is_correct ? '\u2713' : '\u2717',
      `${q.points_earned}/${q.points}`
    ]);
    autoTable(doc, {
      startY: y, head: [['#', 'Subject', 'Topic', 'Result', 'Points']],
      body: qRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
      styles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 12 }, 4: { cellWidth: 15 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.difficultyBreakdown && data.difficultyBreakdown.length > 0) {
    checkPage();
    doc.setFontSize(13);
    doc.setTextColor(179, 146, 47);
    doc.text('Difficulty Breakdown', 15, y); y += 8;
    const diffRows = data.difficultyBreakdown.map((d: any) => [d.level, `${d.correct}/${d.total}`, `${d.percentage}%`]);
    autoTable(doc, {
      startY: y, head: [['Level', 'Correct/Total', 'Score']],
      body: diffRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.topicPerformance && data.topicPerformance.length > 0) {
    checkPage();
    doc.setFontSize(13);
    doc.setTextColor(179, 146, 47);
    doc.text('All Topics Performance', 15, y); y += 8;
    const topRows = data.topicPerformance.map((t: any) => [t.name, `${t.correct}/${t.total}`, `${t.percentage}%`]);
    autoTable(doc, {
      startY: y, head: [['Topic', 'Correct/Total', 'Score']],
      body: topRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  checkPage();
  doc.setFontSize(13);
  doc.setTextColor(179, 146, 47);
  doc.text('Performance Insights', 15, y); y += 8;

  doc.setFontSize(10);
  if (data.insights.strengths.length > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text('Strengths:', 15, y); y += 5;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    data.insights.strengths.forEach((s: string) => { checkPage(); doc.text(`  \u2713 ${s}`, 15, y); y += 5; });
    y += 3;
  }
  if (data.insights.needsImprovement.length > 0) {
    checkPage();
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text('Needs Improvement:', 15, y); y += 5;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    data.insights.needsImprovement.forEach((s: string) => { checkPage(); doc.text(`  \u2717 ${s}`, 15, y); y += 5; });
    y += 3;
  }
  if (data.insights.weakTopics.length > 0) {
    checkPage();
    doc.setFontSize(10);
    doc.setTextColor(180, 120, 0);
    doc.text('Topics to Focus On:', 15, y); y += 5;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    data.insights.weakTopics.forEach((t: string) => { checkPage(); doc.text(`  \u2022 ${t}`, 15, y); y += 5; });
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(30, 58, 95);
  doc.rect(0, pageH - 12, pageW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(name + ' — Official Document', pageW / 2, pageH - 6, { align: 'center' });
  doc.text('This report is system-generated and does not require a signature.', pageW / 2, pageH - 2.5, { align: 'center' });

  return doc;
}
