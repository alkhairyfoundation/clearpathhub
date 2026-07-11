import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { SgiScore } from '@/types';

interface PdfReportData {
  studentName: string;
  studentId: string;
  className: string;
  admissionNumber: string;
  sgi: SgiScore;
  timestamp: string;
}

export async function generateCcrPdf(data: PdfReportData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('ClearPath Child Review (CCR)', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('Student Growth Index Report', pageWidth / 2, 40, { align: 'center' });

  doc.setDrawColor(180, 146, 47);
  doc.setLineWidth(1);
  doc.line(30, 48, pageWidth - 30, 48);

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(`Student: ${data.studentName}`, 30, 60);
  doc.text(`Class: ${data.className}`, 30, 68);
  doc.text(`Admission: ${data.admissionNumber}`, 30, 76);
  doc.text(`Report Date: ${data.timestamp}`, 30, 84);

  doc.setFontSize(28);
  doc.setTextColor(180, 146, 47);
  doc.text(`SGI: ${data.sgi.overall}/100`, pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const sgiDesc = data.sgi.overall >= 80 ? 'Excellent - Strong all-round development' :
    data.sgi.overall >= 60 ? 'Good - Developing well with room for growth' :
    data.sgi.overall >= 40 ? 'Fair - Additional support recommended' : 'Needs attention - Intervention recommended';
  doc.text(sgiDesc, pageWidth / 2, 115, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text('Component Scores', 30, 135);

  const componentData = [
    ['Foundation', `${data.sgi.foundation}/100`],
    ['Performance', `${data.sgi.performance}/100`],
    ['Environment', `${data.sgi.environment}/100`],
    ['Aspiration', `${data.sgi.aspiration}/100`],
  ];

  (doc as any).autoTable({
    startY: 140,
    head: [['Component', 'Score']],
    body: componentData,
    theme: 'grid',
    headStyles: { fillColor: [180, 146, 47], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
  });

  doc.addPage();

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text('Domain Scores', 30, 25);

  const domainRows = Object.entries(data.sgi.domainScores).map(([key, ds]) => [
    key.charAt(0).toUpperCase() + key.slice(1),
    `${ds.student}/100`,
    `${ds.adult}/100`,
    `${ds.combined}/100`,
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['Domain', 'Self', 'Adult View', 'Combined']],
    body: domainRows,
    theme: 'grid',
    headStyles: { fillColor: [180, 146, 47], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  });

  let yPos = (doc as any).lastAutoTable.finalY + 15;

  if (data.sgi.redFlags.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(220, 50, 50);
    doc.text('Alerts', 30, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(200, 50, 50);
    for (const flag of data.sgi.redFlags) {
      doc.text(`- ${flag}`, 30, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  if (data.sgi.observationGaps.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(200, 150, 30);
    doc.text('Observation Gaps', 30, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(180, 130, 20);
    for (const gap of data.sgi.observationGaps) {
      doc.text(`- ${gap}`, 30, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  if (data.sgi.prescriptions.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(50, 100, 180);
    doc.text('Recommendations', 30, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(50, 80, 150);
    for (const rx of data.sgi.prescriptions) {
      doc.text(`- ${rx}`, 30, yPos);
      yPos += 6;
    }
  }

  return doc;
}
