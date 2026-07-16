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
  schoolName?: string;
}

export async function generateCcrPdf(data: PdfReportData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const schoolName = data.schoolName || 'ClearPath Edu Hub';
  const primaryColor: [number, number, number] = [30, 58, 95];
  const goldColor: [number, number, number] = [180, 146, 47];

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setFillColor(...goldColor);
  doc.rect(0, 36, pageWidth, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Child Review (CCR) — Student Growth Index Report', pageWidth / 2, 23, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Generated: ${data.timestamp}`, pageWidth / 2, 31, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(`Student: ${data.studentName}`, 30, 50);
  doc.text(`Class: ${data.className}`, 30, 58);
  doc.text(`Admission: ${data.admissionNumber}`, 30, 66);
  doc.text(`Report Date: ${data.timestamp}`, 30, 74);

  doc.setFontSize(28);
  doc.setTextColor(180, 146, 47);
  doc.text(`SGI: ${data.sgi.overall}/100`, pageWidth / 2, 95, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const sgiDesc = data.sgi.overall >= 80 ? 'Excellent - Strong all-round development' :
    data.sgi.overall >= 60 ? 'Good - Developing well with room for growth' :
    data.sgi.overall >= 40 ? 'Fair - Additional support recommended' : 'Needs attention - Intervention recommended';
  doc.text(sgiDesc, pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text('Component Scores', 30, 125);

  const componentData = [
    ['Foundation', `${data.sgi.foundation}/100`],
    ['Performance', `${data.sgi.performance}/100`],
    ['Environment', `${data.sgi.environment}/100`],
    ['Aspiration', `${data.sgi.aspiration}/100`],
  ];

  (doc as any).autoTable({
    startY: 130,
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

  // Footer on each page
  const totalPages = (doc as any).getNumberOfPages?.() || (doc as any).internal?.pages?.length - 1 || 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...primaryColor);
    doc.rect(0, ph - 12, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(schoolName + ' — Official Document', pageWidth / 2, ph - 6, { align: 'center' });
    doc.text('This report is system-generated and does not require a signature.', pageWidth / 2, ph - 2.5, { align: 'center' });
  }

  return doc;
}
