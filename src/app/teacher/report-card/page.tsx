'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Download, Printer, Award, User, School, GraduationCap,
  Calendar, CheckCircle, Loader2, Save, Edit3, X, AlertCircle, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExamType = 'ca1' | 'ca2' | 'ca3' | 'exam';
const SCORE_LABELS: Record<string, string> = { ca1: 'Mid-Term Test', ca2: '', ca3: '', exam: 'Exam' };
const SCORE_MAX: Record<string, number> = { ca1: 40, exam: 60 };

function buildScoreTypes(config: any): { key: string; label: string; maxScore: number }[] {
  if (!config) return [{ key: 'ca1', label: 'Mid-Term Test', maxScore: 40 }, { key: 'exam', label: 'Exam', maxScore: 60 }];
  const types: { key: string; label: string; maxScore: number }[] = [];
  if (config.ca1_enabled) types.push({ key: 'ca1', label: config.ca1_label || 'Mid-Term Test', maxScore: config.ca1_max || 40 });
  if (config.ca2_enabled) types.push({ key: 'ca2', label: config.ca2_label || '2nd CA', maxScore: config.ca2_max || 10 });
  if (config.ca3_enabled) types.push({ key: 'ca3', label: config.ca3_label || '3rd CA', maxScore: config.ca3_max || 10 });
  if (config.exam_enabled) types.push({ key: 'exam', label: config.exam_label || 'Exam', maxScore: config.exam_max || 60 });
  return types;
}

function totalScore(ca1?: number | null, exam?: number | null): number {
  return Math.min(100, (ca1 ?? 0) + (exam ?? 0));
}

const COGNITIVE_FIELDS = [
  { key: 'cognitive_knowledge', label: 'Knowledge' },
  { key: 'cognitive_comprehension', label: 'Comprehension' },
  { key: 'cognitive_application', label: 'Application' },
  { key: 'cognitive_analysis', label: 'Analysis' },
  { key: 'cognitive_synthesis', label: 'Synthesis' },
  { key: 'cognitive_evaluation', label: 'Evaluation' },
];

const AFFECTIVE_FIELDS = [
  { key: 'affective_punctuality', label: 'Punctuality' },
  { key: 'affective_attitude', label: 'Attitude' },
  { key: 'affective_participation', label: 'Participation' },
  { key: 'affective_teamwork', label: 'Teamwork' },
  { key: 'affective_leadership', label: 'Leadership' },
  { key: 'affective_attentiveness', label: 'Attentiveness' },
];

const PSYCHOMOTOR_FIELDS = [
  { key: 'psychomotor_handwriting', label: 'Handwriting' },
  { key: 'psychomotor_verbal_fluency', label: 'Verbal Fluency' },
  { key: 'psychomotor_sports', label: 'Sports' },
  { key: 'psychomotor_creative_arts', label: 'Creative Arts' },
  { key: 'psychomotor_practical_skills', label: 'Practical Skills' },
];

function calculateGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function computeRemark(avg: number): string {
  if (avg >= 85) return 'Excellent';
  if (avg >= 75) return 'Very Good';
  if (avg >= 65) return 'Good';
  if (avg >= 50) return 'Fair';
  return 'Needs Improvement';
}

function getGradePoint(grade: string): number {
  const gp: Record<string, number> = { 'A+': 5, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 0 };
  return gp[grade] || 0;
}

// ── PDF Enhancement Helpers ──

function drawSubjectBarChart(doc: jsPDF, subjects: any[], x: number, y: number, w: number, maxH: number, pageWidth: number): number {
  const sorted = subjects.map(s => {
    const total = Math.min(100, (s.ca1?.score ?? 0) + (s.exam?.score ?? 0));
    return { name: s.subject_name, total };
  }).sort((a, b) => b.total - a.total);
  const barH = 4.5;
  const gap = 2.5;
  const labelW = 38;
  const pctW = 14;
  const barMaxW = w - labelW - pctW;
  const chartH = sorted.length * (barH + gap) + 8;

  if (sorted.length === 0) return y;
  if (y + chartH > maxH) { doc.addPage(); y = 30; }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  y += 3;
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Performance Overview', x, y);
  y += 5;

  sorted.forEach((s, i) => {
    const by = y + i * (barH + gap);
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(s.name, x, by + barH - 0.5);
    doc.setFillColor(238, 238, 238);
    doc.roundedRect(x + labelW, by, barMaxW, barH, 0.8, 0.8, 'F');
    const barW = Math.max((s.total / 100) * barMaxW, 1.5);
    const barColor: [number, number, number] = s.total >= 70 ? [22, 163, 74] : s.total >= 50 ? [245, 158, 11] : [220, 38, 38];
    doc.setFillColor(...barColor);
    doc.roundedRect(x + labelW, by, barW, barH, 0.8, 0.8, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(6);
    doc.text(`${s.total}%`, x + labelW + barMaxW + 1.5, by + barH - 0.5);
  });
  return y + sorted.length * (barH + gap) + 3;
}

function drawDomainRadarChart(doc: jsPDF, domainGrades: Record<string, number>, cx: number, cy: number, radius: number): void {
  const allFields: { key: string; label: string; domain: string }[] = [
    ...COGNITIVE_FIELDS.map(f => ({ ...f, domain: 'Cognitive' })),
    ...AFFECTIVE_FIELDS.map(f => ({ ...f, domain: 'Affective' })),
    ...PSYCHOMOTOR_FIELDS.map(f => ({ ...f, domain: 'Psychomotor' })),
  ];
  const n = allFields.length;
  const angleStep = (2 * Math.PI) / n;

  for (let level = 1; level <= 5; level++) {
    const r = (level / 5) * radius;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.circle(cx, cy, r);
    doc.setFontSize(4);
    doc.setTextColor(180, 180, 180);
    doc.text(`${level}`, cx + r + 1, cy + 0.5);
  }

  const lines: number[][] = [];
  const labelPositions: { x: number; y: number; label: string; domain: string }[] = [];

  allFields.forEach((field, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const endX = cx + radius * Math.cos(angle);
    const endY = cy + radius * Math.sin(angle);
    doc.setDrawColor(200, 200, 215);
    doc.setLineWidth(0.2);
    doc.line(cx, cy, endX, endY);
    const val = domainGrades[field.key] || 0;
    const valR = (val / 5) * radius;
    const px = cx + valR * Math.cos(angle);
    const py = cy + valR * Math.sin(angle);
    lines.push([px, py]);
    const labelR = radius + 9;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    labelPositions.push({ x: lx, y: ly, label: field.label, domain: field.domain });
  });

  if (lines.length > 2) {
    const poly: number[][] = [];
    lines.forEach((p, i) => {
      if (i === 0) { poly.push([p[0] - cx, p[1] - cy]); }
      else { poly.push([p[0] - lines[i - 1][0], p[1] - lines[i - 1][1]]); }
    });
    doc.setFillColor(30, 58, 95, 0.12);
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.6);
    doc.lines(poly, cx, cy, [1, 1], 'DF');
  }

  const domainColors: Record<string, [number, number, number]> = {
    Cognitive: [30, 58, 95],
    Affective: [22, 163, 74],
    Psychomotor: [124, 58, 237],
  };
  labelPositions.forEach((lp) => {
    doc.setFontSize(4.5);
    const c = domainColors[lp.domain] || [80, 80, 80];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(lp.label, lp.x, lp.y, { align: 'center' });
  });

  doc.setFontSize(4);
  doc.setTextColor(150, 150, 150);
  let legendY = cy + radius + 18;
  Object.entries(domainColors).forEach(([name, color]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(cx - radius, legendY, 3, 3, 'F');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(name, cx - radius + 5, legendY + 2);
    legendY += 4;
  });
}

function getPerformanceInsights(subjectScores: any[]): {
  strengths: { name: string; score: number }[];
  weaknesses: { name: string; score: number }[];
  gapAnalysis: { name: string; gap: number }[];
  sortedByScore: { name: string; score: number }[];
} {
  const withScores = subjectScores.map(s => {
    const total = Math.min(100, (s.ca1?.score ?? 0) + (s.exam?.score ?? 0));
    return { name: s.subject_name, score: total };
  }).filter(s => s.score > 0);
  const sorted = [...withScores].sort((a, b) => b.score - a.score);
  return {
    strengths: sorted.filter(s => s.score >= 75),
    weaknesses: sorted.filter(s => s.score < 50),
    gapAnalysis: sorted.filter(s => s.score < 70).map(s => ({ name: s.name, gap: 70 - s.score })),
    sortedByScore: sorted,
  };
}

function drawPerformanceSummary(doc: jsPDF, insights: ReturnType<typeof getPerformanceInsights>, x: number, y: number, w: number, maxH: number): number {
  const lineH = 4.5;
  let estH = 10;
  if (insights.strengths.length > 0) estH += 8 + insights.strengths.length * lineH;
  if (insights.weaknesses.length > 0) estH += 8 + insights.weaknesses.length * lineH;
  if (insights.gapAnalysis.length > 0) estH += 8 + insights.gapAnalysis.length * lineH;
  if (y + estH > maxH) { doc.addPage(); y = 30; }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  y += 3;
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Analysis', x, y);
  y += 5;

  if (insights.sortedByScore.length > 0) {
    const best = insights.sortedByScore[0];
    const worst = insights.sortedByScore[insights.sortedByScore.length - 1];
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Best: ${best.name} (${best.score}%)`, x, y);
    doc.text(`   Lowest: ${worst.name} (${worst.score}%)`, x + 55, y);
    y += 5;
  }

  if (insights.strengths.length > 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('Strengths', x, y);
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    insights.strengths.forEach(s => {
      doc.setFillColor(22, 163, 74, 0.15);
      doc.rect(x, y - 1.5, w, lineH, 'F');
      doc.text(`${s.name}: ${s.score}%`, x + 2, y + 1);
      y += lineH;
    });
    y += 1;
  }

  if (insights.weaknesses.length > 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('Weaknesses — Needs Improvement', x, y);
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    insights.weaknesses.forEach(s => {
      doc.setFillColor(220, 38, 38, 0.1);
      doc.rect(x, y - 1.5, w, lineH, 'F');
      doc.text(`${s.name}: ${s.score}%`, x + 2, y + 1);
      y += lineH;
    });
    y += 1;
  }

  if (insights.gapAnalysis.length > 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.text('Gap Analysis — Points to reach 70% (Satisfactory)', x, y);
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    insights.gapAnalysis.forEach(g => {
      doc.setFillColor(245, 158, 11, 0.1);
      doc.rect(x, y - 1.5, w, lineH, 'F');
      doc.text(`${g.name}: needs ${g.gap} more points`, x + 2, y + 1);
      y += lineH;
    });
    y += 1;
  }
  return y;
}

function generateRecommendations(
  subjectScores: any[],
  domainGrades: Record<string, number>,
  attendanceData: { rate: number },
  totalAvg: number
): { subjectRecs: string[]; domainRecs: string[]; generalRecs: string[] } {
  const subjectRecs: string[] = [];
  const domainRecs: string[] = [];
  const generalRecs: string[] = [];

  subjectScores.forEach(s => {
    const total = Math.min(100, (s.ca1?.score ?? 0) + (s.exam?.score ?? 0));
    const name = s.subject_name;
    if (total < 40) {
      subjectRecs.push(`${name} (${total}%): Critical — requires intensive remedial tutoring. Focus on core concepts and foundational topics. Schedule extra classes and use practice worksheets.`);
    } else if (total < 50) {
      subjectRecs.push(`${name} (${total}%): Needs significant improvement. Review past topics, attempt weekly assignments, and seek peer or teacher assistance regularly.`);
    } else if (total < 60) {
      subjectRecs.push(`${name} (${total}%): Below average. Focus on weak areas, practice past questions, and allocate more study time to this subject.`);
    } else if (total < 70) {
      subjectRecs.push(`${name} (${total}%): Fair performance. Concentrate on challenging topics, join study groups, and attempt advanced exercises to strengthen understanding.`);
    } else if (total < 85) {
      subjectRecs.push(`${name} (${total}%): Good. Review mistakes from assessments, aim for deeper mastery, and help peers to reinforce your own understanding.`);
    } else {
      subjectRecs.push(`${name} (${total}%): Excellent! Maintain this standard by exploring advanced topics and consider mentoring classmates.`);
    }
  });

  const allDomainFields = [
    { key: 'cognitive_knowledge', label: 'Knowledge', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'cognitive_comprehension', label: 'Comprehension', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'cognitive_application', label: 'Application', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'cognitive_analysis', label: 'Analysis', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'cognitive_synthesis', label: 'Synthesis', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'cognitive_evaluation', label: 'Evaluation', domain: 'Cognitive', group: COGNITIVE_FIELDS },
    { key: 'affective_punctuality', label: 'Punctuality', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'affective_attitude', label: 'Attitude', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'affective_participation', label: 'Participation', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'affective_teamwork', label: 'Teamwork', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'affective_leadership', label: 'Leadership', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'affective_attentiveness', label: 'Attentiveness', domain: 'Affective', group: AFFECTIVE_FIELDS },
    { key: 'psychomotor_handwriting', label: 'Handwriting', domain: 'Psychomotor', group: PSYCHOMOTOR_FIELDS },
    { key: 'psychomotor_verbal_fluency', label: 'Verbal Fluency', domain: 'Psychomotor', group: PSYCHOMOTOR_FIELDS },
    { key: 'psychomotor_sports', label: 'Sports', domain: 'Psychomotor', group: PSYCHOMOTOR_FIELDS },
    { key: 'psychomotor_creative_arts', label: 'Creative Arts', domain: 'Psychomotor', group: PSYCHOMOTOR_FIELDS },
    { key: 'psychomotor_practical_skills', label: 'Practical Skills', domain: 'Psychomotor', group: PSYCHOMOTOR_FIELDS },
  ];

  const lowTraits = allDomainFields.filter(f => (domainGrades[f.key] || 0) < 3);
  if (lowTraits.length > 0) {
    lowTraits.slice(0, 5).forEach(f => {
      const tips: Record<string, string> = {
        cognitive_knowledge: 'Read widely beyond the syllabus. Use summaries and flashcards to reinforce facts.',
        cognitive_comprehension: 'Practice explaining concepts in your own words. Teach someone else to deepen understanding.',
        cognitive_application: 'Solve real-world problems using classroom knowledge. Attempt practical exercises.',
        cognitive_analysis: 'Break down complex problems into parts. Practice comparing and contrasting ideas.',
        cognitive_synthesis: 'Combine ideas from different subjects. Create mind maps and project plans.',
        cognitive_evaluation: 'Critique arguments and justify decisions. Practice writing balanced essays.',
        affective_punctuality: 'Set a daily schedule and arrive 5 minutes early to every class. Use alarms and planners.',
        affective_attitude: 'Practice gratitude and positive self-talk. Set small daily goals to build confidence.',
        affective_participation: 'Speak up at least once per class. Prepare questions in advance to contribute.',
        affective_teamwork: 'Volunteer for group projects. Practice active listening and compromise.',
        affective_leadership: 'Take initiative in group tasks. Mentor a junior student to build leadership skills.',
        affective_attentiveness: 'Practice mindfulness. Sit in front of the class to minimize distractions.',
        psychomotor_handwriting: 'Practice handwriting daily. Use cursive writing exercises to improve control.',
        psychomotor_verbal_fluency: 'Read aloud daily. Join debates or public speaking clubs.',
        psychomotor_sports: 'Participate in at least one sport weekly. Focus on coordination and team games.',
        psychomotor_creative_arts: 'Explore drawing, painting, or music. Take a creative workshop.',
        psychomotor_practical_skills: 'Engage in hands-on projects. Learn basic DIY and laboratory skills.',
      };
      domainRecs.push(`${f.label} (${f.domain}): ${tips[f.key] || 'Practice and seek guidance to improve.'}`);
    });
  }

  const avgDomains: Record<string, number> = { Cognitive: 0, Affective: 0, Psychomotor: 0 };
  const domainCounts: Record<string, number> = { Cognitive: 0, Affective: 0, Psychomotor: 0 };
  allDomainFields.forEach(f => {
    const val = domainGrades[f.key];
    if (val != null) { avgDomains[f.domain] += val; domainCounts[f.domain]++; }
  });
  Object.keys(avgDomains).forEach(k => {
    avgDomains[k] = domainCounts[k] > 0 ? avgDomains[k] / domainCounts[k] : 0;
  });

  if (avgDomains.Cognitive < 3) generalRecs.push('Cognitive skills need strengthening. Focus on critical thinking exercises like puzzles, logic problems, and case studies.');
  if (avgDomains.Affective < 3) generalRecs.push('Affective skills need development. Practice self-discipline, teamwork, and positive classroom behaviors.');
  if (avgDomains.Psychomotor < 3) generalRecs.push('Psychomotor skills need improvement. Engage in hands-on activities, sports, and creative arts.');

  if (attendanceData.rate < 80) {
    generalRecs.push(`Attendance is ${attendanceData.rate}%. Regular attendance (above 90%) is strongly linked to better academic performance. Aim to attend all classes.`);
  } else if (attendanceData.rate >= 80) {
    generalRecs.push(`Attendance is ${attendanceData.rate}% — good. Consistent attendance reinforces learning and improves outcomes.`);
  }

  if (totalAvg < 50) generalRecs.push('Overall performance is below expectation. A structured study plan with daily review sessions and regular assessments is recommended. Consider speaking with the academic counselor.');
  else if (totalAvg < 70) generalRecs.push('Overall performance is fair to good. A consistent study routine focusing on weaker subjects will help raise the average. Set weekly targets.');
  else generalRecs.push('Overall performance is commendable. Keep up the excellent work and challenge yourself with advanced learning materials.');

  return { subjectRecs, domainRecs, generalRecs };
}

function drawRecommendationsBox(doc: jsPDF, recs: ReturnType<typeof generateRecommendations>, x: number, y: number, w: number, maxH: number): number {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  y += 3;
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.text('Personalized Recommendations', x, y);
  y += 5;

  if (recs.subjectRecs.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject-Specific Guidance', x, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    recs.subjectRecs.forEach(r => {
      const lines = doc.splitTextToSize(`• ${r}`, w - 10);
      if (y + lines.length * 3.5 > maxH) { doc.addPage(); y = 30; }
      doc.text(lines, x + 3, y);
      y += lines.length * 3.5 + 1.5;
    });
    y += 2;
  }

  if (recs.domainRecs.length > 0) {
    if (y + 8 > maxH) { doc.addPage(); y = 30; }
    doc.setFontSize(8);
    doc.setTextColor(124, 58, 237);
    doc.setFont('helvetica', 'bold');
    doc.text('Character & Skill Development', x, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    recs.domainRecs.forEach(r => {
      const lines = doc.splitTextToSize(`• ${r}`, w - 10);
      if (y + lines.length * 3.5 > maxH) { doc.addPage(); y = 30; }
      doc.text(lines, x + 3, y);
      y += lines.length * 3.5 + 1.5;
    });
    y += 2;
  }

  if (recs.generalRecs.length > 0) {
    if (y + 8 > maxH) { doc.addPage(); y = 30; }
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.text('General Advice', x, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    recs.generalRecs.forEach(r => {
      const lines = doc.splitTextToSize(`• ${r}`, w - 10);
      if (y + lines.length * 3.5 > maxH) { doc.addPage(); y = 30; }
      doc.text(lines, x + 3, y);
      y += lines.length * 3.5 + 1.5;
    });
    y += 2;
  }
  return y;
}

function drawAttendanceInsight(doc: jsPDF, attendanceData: { present: number; total: number; rate: number }, totalAvg: number, x: number, y: number, w: number, maxH: number): number {
  if (y + 25 > maxH) { doc.addPage(); y = 30; }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
  y += 3;
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance & Performance Correlation', x, y);
  y += 4;
  doc.setFillColor(238, 238, 238);
  doc.roundedRect(x, y, w, 12, 2, 2, 'F');
  doc.setFillColor(30, 58, 95, 0.15);
  doc.roundedRect(x, y, (attendanceData.rate / 100) * w, 12, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Attendance: ${attendanceData.present}/${attendanceData.total} days (${attendanceData.rate}%)`, x + 4, y + 5);
  doc.setTextColor(30, 58, 95);
  doc.setFont('helvetica', 'bold');
  doc.text(`Average Score: ${totalAvg}%`, x + 4, y + 10);
  y += 16;
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  if (attendanceData.rate >= 90) {
    doc.text('Excellent attendance. Research shows consistent attendance is a strong predictor of academic success. Keep it up!', x, y);
  } else if (attendanceData.rate >= 80) {
    doc.text('Good attendance. Students with attendance above 90% typically score 10–15% higher on average. Try to improve further.', x, y);
  } else if (attendanceData.rate >= 70) {
    doc.text('Moderate attendance. Each missed class represents lost learning opportunities. Aim for at least 90% attendance next term.', x, y);
  } else {
    doc.text('Low attendance. Chronic absenteeism significantly impacts academic performance. Please prioritize regular school attendance.', x, y);
  }
  y += 5;
  return y;
}

function drawProgressBarInCell(doc: jsPDF, data: any, score: number): void {
  const barH = 1.2;
  const barY = data.cell.y + data.cell.height - barH - 0.5;
  const barMaxW = data.cell.width - 2;
  const barW = Math.max((score / 100) * barMaxW, 0.5);
  const barColor: [number, number, number] = score >= 70 ? [22, 163, 74] : score >= 50 ? [245, 158, 11] : [220, 38, 38];
  doc.setFillColor(...barColor);
  doc.roundedRect(data.cell.x + 1, barY, barW, barH, 0.5, 0.5, 'F');
}

async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function drawPageHeader(doc: jsPDF, schoolName: string, address: string | undefined, motto: string | undefined, pageWidth: number, logoBase64?: string): void {
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 28, 'F');

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 5, 3, 12, 12);
    } catch (e) { /* skip logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (address) doc.text(address, pageWidth / 2, 16, { align: 'center' });
  if (motto) doc.text(`"${motto}"`, pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL REPORT CARD', pageWidth / 2, 26, { align: 'center' });
}

function drawSimplePageHeader(doc: jsPDF, schoolName: string, pageWidth: number): void {
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${schoolName} — Report Card (continued)`, pageWidth / 2, 12, { align: 'center' });
}

function ReportCardContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentParam = searchParams.get('student');
  const termParam = searchParams.get('term');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [assessmentConfig, setAssessmentConfig] = useState<any>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [allTerms, setAllTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subjectScores, setSubjectScores] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({ present: 0, total: 0, rate: 0 });
  const [reportRemarks, setReportRemarks] = useState<any>({ teacher_remarks: '', principal_remarks: '', next_term_begins: '' });
  const [domainGrades, setDomainGrades] = useState<Record<string, number>>({});

  // Results from Term 1 + Term 2 for cumulative view (3rd term)
  const [term1Results, setTerm1Results] = useState<any[]>([]);
  const [term2Results, setTerm2Results] = useState<any[]>([]);
  const [showDomainEditor, setShowDomainEditor] = useState(false);
  const [showRemarksEditor, setShowRemarksEditor] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) fetchReportData();
  }, [selectedStudent, selectedTerm]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [settingsRes, termsRes, studentRes] = await Promise.all([
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date', { ascending: false }),
        supabase.from('students')
          .select('id, profile_id, admission_number, profile:profiles!profile_id(first_name, last_name, avatar_url), class:classes!class_id(name)')
          .in('class_id', (await supabase.from('subjects').select('class_id').eq('teacher_id', profile?.id)).data?.map(s => s.class_id).filter(Boolean) || ['none']),
      ]);
      setSchoolSettings(settingsRes.data);
      setAssessmentConfig(settingsRes.data?.assessment_config || null);
      if (settingsRes.data?.school_logo) {
        urlToBase64(settingsRes.data.school_logo).then(b64 => { if (b64) setLogoBase64(b64); });
      }
      setTerms(termsRes.data || []);
      setAllTerms(termsRes.data || []);
      setSelectedTerm(termParam ? (termsRes.data || []).find((t: any) => t.id === termParam) : (termsRes.data || []).find((t: any) => t.is_current) || (termsRes.data || [])[0]);

      const studentsData = (studentRes.data || []).map((s: any) => ({ ...s, name: `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim() }));
      setStudents(studentsData);
      setSelectedStudent(studentParam ? studentsData.find((s: any) => s.profile_id === studentParam) : studentsData[0]);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function fetchReportData() {
    if (!selectedStudent || !selectedTerm) return;
    setLoading(true);
    try {
      const pid = selectedStudent.profile_id;
      const termName = selectedTerm.name;
      const sessionName = selectedTerm.session?.name || '';
      const termStart = selectedTerm.start_date;
      const termEnd = selectedTerm.end_date;

      const [resultsRes, remarksRes, domainRes, attRes] = await Promise.all([
        supabase.from('results')
          .select('*, subject:subjects!subject_id(name)')
          .eq('student_id', pid)
          .eq('term', termName)
          .eq('academic_year', sessionName)
          .order('created_at'),
        supabase.from('report_remarks').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
        supabase.from('domain_grades').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
        supabase.from('attendance').select('*').eq('student_id', pid).gte('date', termStart).lte('date', termEnd),
      ]);

      // Group results by subject (Mid-Term Test via ca1, Exam via exam)
      const subjectMap: Record<string, any> = {};
      (resultsRes.data || []).forEach((r: any) => {
        const sid = r.subject_id;
        if (!subjectMap[sid]) subjectMap[sid] = { subject_id: sid, subject_name: r.subject?.name || 'Unknown', ca1: null, ca2: null, ca3: null, exam: null };
        if (r.exam_type === 'ca1' || r.exam_type === 'exam') {
          subjectMap[sid][r.exam_type] = { score: r.score, grade: r.grade || calculateGrade(r.score), result_id: r.id };
        }
      });
      setSubjectScores(Object.values(subjectMap));

      // Remarks
      if (remarksRes.data) setReportRemarks(remarksRes.data);
      else setReportRemarks({ teacher_remarks: '', principal_remarks: '', next_term_begins: '' });

      // Domain
      if (domainRes.data) {
        const domData: Record<string, number> = {};
        [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].forEach(f => {
          if (domainRes.data[f.key] != null) domData[f.key] = domainRes.data[f.key];
        });
        setDomainGrades(domData);
      } else {
        setDomainGrades({});
      }

      // Attendance
      const total = attRes.data?.length || 0;
      const present = attRes.data?.filter((a: any) => a.status === 'present').length || 0;
      setAttendanceData({ total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 });

      // Load student photo
      if (selectedStudent.profile?.avatar_url) {
        urlToBase64(selectedStudent.profile.avatar_url).then(b64 => { if (b64) setPhotoBase64(b64); });
      }

      // For 3rd term, fetch Term 1 + Term 2 results
      if (selectedTerm.name?.toLowerCase().includes('third')) {
        const sorted = [...allTerms].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const t1 = sorted[0];
        const t2 = sorted[1];
        const [t1Res, t2Res] = await Promise.all([
          supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', t1?.name).eq('academic_year', sessionName),
          supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', t2?.name).eq('academic_year', sessionName),
        ]);
        setTerm1Results(t1Res.data || []);
        setTerm2Results(t2Res.data || []);
      } else {
        setTerm1Results([]);
        setTerm2Results([]);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function saveRemarks() {
    if (!selectedStudent || !selectedTerm) return;
    setSaving(true); setError('');
    try {
      const payload = { student_id: selectedStudent.profile_id, term_id: selectedTerm.id, ...reportRemarks };
      const { error: err } = await supabase.from('report_remarks').upsert(payload, { onConflict: 'student_id,term_id' });
      if (err) throw new Error(err.message);
      setSuccess('Remarks saved');
      setShowRemarksEditor(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function saveDomainGrades() {
    if (!selectedStudent || !selectedTerm) return;
    setSaving(true); setError('');
    try {
      const payload: any = { student_id: selectedStudent.profile_id, term_id: selectedTerm.id };
      [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].forEach(f => {
        if (domainGrades[f.key] != null) payload[f.key] = domainGrades[f.key];
      });
      const { error: err } = await supabase.from('domain_grades').upsert(payload, { onConflict: 'student_id,term_id' });
      if (err) throw new Error(err.message);
      setSuccess('Domain grades saved');
      setShowDomainEditor(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  function getSubjectCA(subjectScores: any[], subjectId: string, examType: string) {
    const sub = subjectScores.find((s: any) => s.subject_id === subjectId);
    return sub?.[examType] || null;
  }

  // Build cumulative score table for 3rd term (weighted: midterm 40% + exam 60%)
  function getCumulativeSubjects() {
    const allSubjectIds = new Set<string>();
    const allSubjects: any[] = [];

    // Merge term 1 and term 2 results
    [...term1Results, ...term2Results].forEach((r: any) => {
      if (!allSubjectIds.has(r.subject_id)) {
        allSubjectIds.add(r.subject_id);
        allSubjects.push({
          subject_id: r.subject_id,
          subject_name: r.subject?.name || 'Unknown',
          ca1: null, ca2: null, ca3: null, exam: null,
        });
      }
    });
    subjectScores.forEach((s: any) => {
      if (!allSubjectIds.has(s.subject_id)) {
        allSubjectIds.add(s.subject_id);
        allSubjects.push({ ...s });
      }
    });

    return allSubjects.map((sub: any) => {
      // Term 1 weighted total
      const t1Results = term1Results.filter((r: any) => r.subject_id === sub.subject_id);
      const t1Midterm = t1Results.find(r => r.exam_type === 'ca1');
      const t1Exam = t1Results.find(r => r.exam_type === 'exam');
      const t1Avg = totalScore(t1Midterm?.score, t1Exam?.score);

      // Term 2 weighted total
      const t2Results = term2Results.filter((r: any) => r.subject_id === sub.subject_id);
      const t2Midterm = t2Results.find(r => r.exam_type === 'ca1');
      const t2Exam = t2Results.find(r => r.exam_type === 'exam');
      const t2Avg = totalScore(t2Midterm?.score, t2Exam?.score);

      // Term 3 weighted total (current)
      const current = subjectScores.find((s: any) => s.subject_id === sub.subject_id);
      const t3Avg = totalScore(current?.ca1?.score, current?.exam?.score);

      // Cumulative = average of all three term totals
      const allAvgs = [t1Avg, t2Avg, t3Avg].filter(a => a != null) as number[];
      const cumulativeAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : null;

      return {
        subject_name: sub.subject_name,
        term1_avg: t1Avg,
        term2_avg: t2Avg,
        term3_avg: t3Avg,
        cumulative_avg: cumulativeAvg,
        term3_ca1: current?.ca1,
        term3_ca2: current?.ca2,
        term3_ca3: current?.ca3,
        term3_exam: current?.exam,
      };
    });
  }

  // Calculate totals using weighted formula
  function calcTotals() {
    const avgs = subjectScores.map(s => {
      return totalScore(s.ca1?.score, s.exam?.score);
    }).filter(a => a != null) as number[];

    const totalAvg = avgs.length > 0 ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
    const totalGrade = calculateGrade(totalAvg);
    return { totalAvg, totalGrade, remark: computeRemark(totalAvg), subjectCount: subjectScores.length };
  }

  async function downloadPDF() {
    if (!selectedStudent || !selectedTerm) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ml = 14;
    const contentW = pageWidth - ml * 2;
    const maxY = pageHeight - 15;
    const schoolName = schoolSettings?.school_name || 'Mastery Engine';
    const totals = calcTotals();
    const isThirdTerm = selectedTerm.name?.toLowerCase().includes('third');
    const cumulative = isThirdTerm ? getCumulativeSubjects() : [];
    let y = 0;

    // ═══════════════ PAGE 1 ═══════════════
    drawPageHeader(doc, schoolName, schoolSettings?.school_address, schoolSettings?.school_motto, pageWidth, logoBase64);
    y = 36;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    y += 2;

    // Student photo + info
    let infoX = ml;
    if (photoBase64) {
      try {
        doc.addImage(photoBase64, 'PNG', ml, y, 12, 14);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(ml, y, 12, 14);
        infoX = ml + 16;
      } catch (e) { /* skip photo */ }
    }

    const infoLines = [
      `Student: ${selectedStudent.name}`,
      `Class: ${selectedStudent.class?.name || 'N/A'}  |  Adm No: ${selectedStudent.admission_number || 'N/A'}`,
      `Term: ${selectedTerm.name} (${selectedTerm.session?.name || ''})  |  Attendance: ${attendanceData.present}/${attendanceData.total} days (${attendanceData.rate}%)`,
    ];
    infoLines.forEach(line => { doc.text(line, infoX, y); y += 5.5; });
    y += 1;

    const totalColIdx = isThirdTerm ? 4 : 3;

    if (!isThirdTerm) {
      const config = assessmentConfig;
      const headers = buildScoreTypes(config);
      const headRow: string[] = ['Subject'];
      headers.forEach(h => { headRow.push(`${h.label}\n(/${h.maxScore})`); });
      headRow.push('Total', 'Grade', 'Remark');

      autoTable(doc, {
        startY: y,
        head: [headRow],
        body: subjectScores.map((s: any) => {
          const row: any[] = [s.subject_name];
          let total = 0;
          headers.forEach(h => {
            const val = s[h.key]?.score;
            row.push(val != null ? val : '-');
            total += val ?? 0;
          });
          total = Math.min(100, total);
          row.push(`${total}%`, calculateGrade(total), computeRemark(total));
          return row;
        }),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        foot: [[{ content: `Overall Average: ${totals.totalAvg}% (${totals.totalGrade}) — ${totals.remark}`, colSpan: headRow.length, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]],
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === headRow.length - 3) {
            const val = parseFloat(data.cell.raw.toString());
            if (!isNaN(val)) drawProgressBarInCell(doc, data, val);
          }
        },
      });
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Subject', 'Term 1', 'Term 2', 'Term 3', 'Cumulative', 'Grade', 'Remark']],
        body: cumulative.map(c => {
          const isLow = c.cumulative_avg != null && c.cumulative_avg < 50;
          const cs = isLow ? { textColor: [220, 38, 38] as [number, number, number] } : undefined;
          const w = (v: string) => cs ? { content: v, styles: cs } : v;
          return [
            w(c.subject_name),
            w(c.term1_avg != null ? `${c.term1_avg}%` : '-'),
            w(c.term2_avg != null ? `${c.term2_avg}%` : '-'),
            w(c.term3_avg != null ? `${c.term3_avg}%` : '-'),
            w(c.cumulative_avg != null ? `${c.cumulative_avg}%` : '-'),
            w(c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-'),
            w(c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-'),
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        foot: [[{ content: `Cumulative Average: ${totals.totalAvg}% (${totals.totalGrade}) — ${totals.remark}`, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]],
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === totalColIdx) {
            const raw = data.cell.raw.toString();
            const val = parseFloat(raw);
            if (!isNaN(val)) drawProgressBarInCell(doc, data, val);
          }
        },
      });
    }

    y = (doc as any).lastAutoTable.finalY + 8;

    // Bar chart
    y = drawSubjectBarChart(doc, subjectScores, ml, y, contentW, maxY, pageWidth);

    // Domain Assessment + Radar
    const domainKeys = Object.keys(domainGrades);
    if (domainKeys.length > 0) {
      if (y + 25 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.text('Domain Assessment', ml, y);
      y += 2;
      const domainData: any[] = [
        ...COGNITIVE_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Cognitive', f.label, `${domainGrades[f.key]}/5`]),
        ...AFFECTIVE_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Affective', f.label, `${domainGrades[f.key]}/5`]),
        ...PSYCHOMOTOR_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Psychomotor', f.label, `${domainGrades[f.key]}/5`]),
      ];
      if (domainData.length > 0) {
        autoTable(doc, { startY: y + 3, head: [['Domain', 'Trait', 'Rating']], body: domainData, theme: 'striped', headStyles: { fillColor: [100, 100, 100] } });
        y = (doc as any).lastAutoTable.finalY + 6;
        if (y + 60 > maxY) { doc.addPage(); y = 30; }
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 95);
        doc.setFont('helvetica', 'bold');
        doc.text('Domain Skills Radar', ml, y);
        y += 3;
        const radarCx = pageWidth / 2;
        const radarCy = y + 40;
        drawDomainRadarChart(doc, domainGrades, radarCx, radarCy, 35);
        y = radarCy + 58;
      }
    }

    // Performance Insights
    const insights = getPerformanceInsights(subjectScores);
    y = drawPerformanceSummary(doc, insights, ml, y, contentW, maxY);

    // Attendance Insight
    y = drawAttendanceInsight(doc, attendanceData, totals.totalAvg, ml, y, contentW, maxY);

    // Remarks
    if (y + 20 > maxY) { doc.addPage(); y = 30; }
    if (reportRemarks.teacher_remarks) {
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.text("Teacher's Remark", ml, y);
      y += 3;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const split = doc.splitTextToSize(reportRemarks.teacher_remarks, contentW);
      if (y + split.length * 3.5 > maxY) { doc.addPage(); y = 30; }
      doc.text(split, ml, y);
      y += split.length * 3.5 + 4;
    }
    if (reportRemarks.principal_remarks) {
      if (y + 15 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.text("Principal's Remark", ml, y);
      y += 3;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const split2 = doc.splitTextToSize(reportRemarks.principal_remarks, contentW);
      if (y + split2.length * 3.5 > maxY) { doc.addPage(); y = 30; }
      doc.text(split2, ml, y);
      y += split2.length * 3.5 + 4;
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Page 1 | ClearPath Edu Hub`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // ═══════════════ PAGE 2: Recommendations ═══════════════
    doc.addPage();
    drawSimplePageHeader(doc, schoolName, pageWidth);
    y = 25;

    const recs = generateRecommendations(subjectScores, domainGrades, attendanceData, totals.totalAvg);
    y = drawRecommendationsBox(doc, recs, ml + 3, y, contentW - 6, maxY);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Page 2 | ClearPath Edu Hub`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`report-card-${selectedStudent.name.replace(/\s+/g, '-')}-${selectedTerm.name}.pdf`);
  }

  function handlePrint() {
    if (!selectedStudent || !selectedTerm) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const totals = calcTotals();
    const isThirdTerm = selectedTerm.name?.toLowerCase().includes('third');
    const cumulative = isThirdTerm ? getCumulativeSubjects() : [];
    const insights = getPerformanceInsights(subjectScores);
    const recs = generateRecommendations(subjectScores, domainGrades, attendanceData, totals.totalAvg);

    let scoreRows = '';
    if (isThirdTerm) {
      cumulative.forEach((c: any) => {
        scoreRows += `<tr${c.cumulative_avg != null && c.cumulative_avg < 50 ? ' style="color:#dc2626"' : ''}><td>${c.subject_name}</td><td>${c.term1_avg != null ? c.term1_avg + '%' : '-'}</td><td>${c.term2_avg != null ? c.term2_avg + '%' : '-'}</td><td>${c.term3_avg != null ? c.term3_avg + '%' : '-'}</td><td style="font-weight:bold">${c.cumulative_avg != null ? c.cumulative_avg + '%' : '-'}</td><td>${c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-'}</td><td>${c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-'}</td></tr>`;
      });
    } else {
      subjectScores.forEach((s: any) => {
        const config = assessmentConfig;
        const headers = buildScoreTypes(config);
        let total = 0;
        const cells = headers.map(h => {
          const val = s[h.key]?.score;
          total += val ?? 0;
          return val != null ? val : '-';
        });
        total = Math.min(100, total);
        const grade = calculateGrade(total);
        const remark = computeRemark(total);
        scoreRows += `<tr><td>${s.subject_name}</td>${cells.map(c => `<td>${c}</td>`).join('')}<td style="font-weight:bold">${total}%</td><td>${grade}</td><td>${remark}</td></tr>`;
      });
    }

    // Bar chart bars
    let barChartHtml = '';
    const sortedForBar = [...insights.sortedByScore];
    if (sortedForBar.length > 0) {
      barChartHtml = '<h3 style="color:#1e3a5f;margin-top:20px;font-size:14px">Subject Performance Overview</h3><div style="margin-top:8px">';
      sortedForBar.forEach(s => {
        const color = s.score >= 70 ? '#16a34a' : s.score >= 50 ? '#f59e0b' : '#dc2626';
        barChartHtml += `<div style="display:flex;align-items:center;margin-bottom:4px;font-size:11px">
          <span style="width:120px;font-weight:600;color:#333">${s.name}</span>
          <div style="flex:1;background:#eee;border-radius:4px;height:16px;overflow:hidden">
            <div style="width:${s.score}%;background:${color};height:16px;border-radius:4px"></div>
          </div>
          <span style="width:40px;text-align:right;font-weight:bold;color:#555">${s.score}%</span>
        </div>`;
      });
      barChartHtml += '</div>';
    }

    const domainRows = Object.keys(domainGrades).length > 0 ? `
      <h3 style="color:#1e3a5f;margin-top:20px;font-size:14px">Domain Assessment</h3>
      <table><thead><tr><th>Domain</th><th>Trait</th><th>Rating</th></tr></thead><tbody>
        ${[...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].filter(f => domainGrades[f.key] != null).map(f => {
          const domain = COGNITIVE_FIELDS.includes(f) ? 'Cognitive' : AFFECTIVE_FIELDS.includes(f) ? 'Affective' : 'Psychomotor';
          return `<tr><td>${domain}</td><td>${f.label}</td><td>${domainGrades[f.key]}/5</td></tr>`;
        }).join('')}
      </tbody></table>` : '';

    // Performance insights HTML
    let insightsHtml = '';
    if (insights.sortedByScore.length > 0) {
      insightsHtml = '<h3 style="color:#1e3a5f;margin-top:20px;font-size:14px">Performance Analysis</h3>';
      const best = insights.sortedByScore[0];
      const worst = insights.sortedByScore[insights.sortedByScore.length - 1];
      insightsHtml += `<p style="font-size:12px;color:#555"><strong>Best:</strong> ${best.name} (${best.score}%) &nbsp;|&nbsp; <strong>Lowest:</strong> ${worst.name} (${worst.score}%)</p>`;
      if (insights.strengths.length > 0) {
        insightsHtml += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin-top:8px">';
        insightsHtml += '<p style="font-weight:bold;color:#16a34a;margin:0 0 5px">Strengths</p>';
        insights.strengths.forEach(s => { insightsHtml += `<p style="font-size:11px;color:#333;margin:2px 0">✅ ${s.name}: ${s.score}%</p>`; });
        insightsHtml += '</div>';
      }
      if (insights.weaknesses.length > 0) {
        insightsHtml += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px;margin-top:8px">';
        insightsHtml += '<p style="font-weight:bold;color:#dc2626;margin:0 0 5px">Weaknesses — Needs Improvement</p>';
        insights.weaknesses.forEach(s => { insightsHtml += `<p style="font-size:11px;color:#333;margin:2px 0">⚠️ ${s.name}: ${s.score}%</p>`; });
        insightsHtml += '</div>';
      }
      if (insights.gapAnalysis.length > 0) {
        insightsHtml += '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px;margin-top:8px">';
        insightsHtml += '<p style="font-weight:bold;color:#f59e0b;margin:0 0 5px">Gap Analysis — Points to reach 70%</p>';
        insights.gapAnalysis.forEach(g => { insightsHtml += `<p style="font-size:11px;color:#333;margin:2px 0">📊 ${g.name}: needs ${g.gap} more points</p>`; });
        insightsHtml += '</div>';
      }
    }

    // Attendance insight HTML
    const attColor = attendanceData.rate >= 90 ? '#16a34a' : attendanceData.rate >= 80 ? '#f59e0b' : '#dc2626';
    const attMsg = attendanceData.rate >= 90
      ? 'Excellent attendance — a strong predictor of academic success.'
      : attendanceData.rate >= 80
        ? 'Good attendance. Students above 90% typically score 10–15% higher.'
        : attendanceData.rate >= 70
          ? 'Moderate attendance. Aim for at least 90% next term.'
          : 'Low attendance significantly impacts performance. Please prioritize regular attendance.';

    // Recommendations HTML
    let recsHtml = '<h3 style="color:#1e3a5f;margin-top:25px;font-size:14px">Personalized Recommendations</h3>';
    if (recs.subjectRecs.length > 0) {
      recsHtml += '<div style="margin-top:8px">';
      recsHtml += '<p style="font-weight:bold;color:#16a34a;margin:0 0 5px;font-size:12px">Subject-Specific Guidance</p>';
      recs.subjectRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }
    if (recs.domainRecs.length > 0) {
      recsHtml += '<div style="margin-top:10px">';
      recsHtml += '<p style="font-weight:bold;color:#7c3aed;margin:0 0 5px;font-size:12px">Character & Skill Development</p>';
      recs.domainRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }
    if (recs.generalRecs.length > 0) {
      recsHtml += '<div style="margin-top:10px">';
      recsHtml += '<p style="font-weight:bold;color:#f59e0b;margin:0 0 5px;font-size:12px">General Advice</p>';
      recs.generalRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }

    w.document.write(`<!DOCTYPE html><html><head><title>Report Card - ${selectedStudent.name}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:40px;background:#f8fafc;color:#333}
      .card{max-width:850px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
      .header{text-align:center;background:#1e3a5f;color:white;margin:-40px -40px 20px;padding:30px;border-radius:16px 16px 0 0}
      .header h1{margin:0;font-size:22px}.header p{margin:3px 0;font-size:11px;opacity:0.9}
      table{width:100%;border-collapse:collapse;margin-top:15px;font-size:12px}
      th{background:#1e3a5f;color:white;padding:8px;text-align:left;font-size:11px}
      td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:center}
      td:first-child{text-align:left;font-weight:600}
      .summary{display:flex;gap:15px;margin-top:20px}
      .summary-box{flex:1;background:#f1f5f9;border-radius:8px;padding:12px;text-align:center}
      .summary-box .val{font-size:22px;font-weight:bold;color:#1e3a5f}
      .summary-box .lbl{font-size:10px;color:#64748b;margin-top:2px}
      .remarks{margin-top:20px;padding:15px;background:#f1f5f9;border-radius:8px;font-size:12px}
      .remarks strong{color:#1e3a5f}
      .footer{margin-top:25px;font-size:9px;color:#94a3b8;text-align:center}
      .page-break{page-break-before:always;margin-top:30px;padding-top:20px;border-top:2px dashed #ccc}
      @media print{body{background:white;padding:10px}.card{box-shadow:none}}
    </style></head><body><div class="card">
      <div class="header">${logoBase64 ? `<img src="${logoBase64}" style="height:50px;margin-bottom:8px" />` : ''}<h1>${schoolSettings?.school_name || 'Mastery Engine'}</h1>
        ${schoolSettings?.school_address ? `<p>${schoolSettings.school_address}</p>` : ''}
        ${schoolSettings?.school_motto ? `<p>"${schoolSettings.school_motto}"</p>` : ''}
        <p style="font-size:14px;font-weight:bold;margin-top:5px">OFFICIAL REPORT CARD</p>
      </div>
      <div style="font-size:12px;margin-bottom:15px;position:relative;min-height:70px">
        ${photoBase64 ? `<div style="float:right"><img src="${photoBase64}" style="width:60px;height:70px;object-fit:cover;border-radius:4px;border:2px solid #ccc" /></div>` : ''}
        <strong>Student:</strong> ${selectedStudent.name} &nbsp;|&nbsp; <strong>Class:</strong> ${selectedStudent.class?.name || 'N/A'} &nbsp;|&nbsp;
        <strong>Admission:</strong> ${selectedStudent.admission_number || 'N/A'} &nbsp;|&nbsp;
        <strong>Term:</strong> ${selectedTerm.name} (${selectedTerm.session?.name || ''}) &nbsp;|&nbsp;
        <strong>Attendance:</strong> ${attendanceData.present}/${attendanceData.total} days (${attendanceData.rate}%)
      </div>
      <table><thead><tr>${(() => { if (isThirdTerm) return '<th>Subject</th><th>Term 1</th><th>Term 2</th><th>Term 3</th><th>Cumulative</th><th>Grade</th><th>Remark</th>'; const hdrs = buildScoreTypes(assessmentConfig); return '<th>Subject</th>' + hdrs.map(h => `<th>${h.label}<br><span style="font-weight:normal;font-size:10px">(/${h.maxScore})</span></th>`).join('') + '<th>Total</th><th>Grade</th><th>Remark</th>'; })()}</tr></thead><tbody>${scoreRows}</tbody></table>
      <div class="summary">
        <div class="summary-box"><div class="val">${totals.totalAvg}%</div><div class="lbl">Overall Average</div></div>
        <div class="summary-box"><div class="val">${totals.totalGrade}</div><div class="lbl">Grade</div></div>
        <div class="summary-box"><div class="val">${totals.remark}</div><div class="lbl">Rating</div></div>
      </div>
      ${barChartHtml}
      ${domainRows}
      ${insightsHtml}
      <div style="margin-top:15px;background:#f1f5f9;border-radius:8px;padding:10px">
        <strong style="color:#1e3a5f;font-size:12px">Attendance & Performance:</strong>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <div style="flex:1;background:#e2e8f0;border-radius:6px;height:14px;overflow:hidden">
            <div style="width:${attendanceData.rate}%;background:${attColor};height:14px;border-radius:6px"></div>
          </div>
          <span style="font-weight:bold;font-size:12px;color:#333">${attendanceData.rate}%</span>
          <span style="font-size:12px;color:#555">| Avg Score: ${totals.totalAvg}%</span>
        </div>
        <p style="font-size:11px;color:#666;margin:6px 0 0">${attMsg}</p>
      </div>
      ${reportRemarks.teacher_remarks ? `<div class="remarks"><strong>Teacher's Remark:</strong><br>${reportRemarks.teacher_remarks}</div>` : ''}
      ${reportRemarks.principal_remarks ? `<div class="remarks"><strong>Principal's Remark:</strong><br>${reportRemarks.principal_remarks}</div>` : ''}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | Page 1 | ClearPath Edu Hub</p>
    </div>
    <div class="card" style="margin-top:30px">
      <h2 style="color:#1e3a5f;font-size:18px;margin-bottom:10px">Detailed Recommendations</h2>
      ${recsHtml}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | Page 2 | ClearPath Edu Hub</p>
    </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const totals = calcTotals();
  const isThirdTerm = selectedTerm?.name?.toLowerCase().includes('third');
  const cumulative = isThirdTerm ? getCumulativeSubjects() : [];

  if (loading && !selectedStudent) {
    return (<DashboardLayout title="Report Card" subtitle="Generate official student report cards"><div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout title="Report Card" subtitle={selectedStudent?.name || ''}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Official Report Card</h1><p className="text-slate-500 text-sm">Generate and download comprehensive student report cards</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="btn-primary flex items-center gap-2 text-sm"><Download size={16} /> PDF</button>
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2 text-sm"><Printer size={16} /> Print</button>
          </div>
        </div>

        {/* Error + Success */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Student</label>
            <select value={selectedStudent?.profile_id || ''} onChange={e => setSelectedStudent(students.find(s => s.profile_id === e.target.value) || null)} className="input py-1.5 text-sm w-auto min-w-[200px]">
              {students.map(s => <option key={s.profile_id} value={s.profile_id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Term</label>
            <select value={selectedTerm?.id || ''} onChange={e => setSelectedTerm(terms.find(t => t.id === e.target.value) || null)} className="input py-1.5 text-sm w-auto min-w-[180px]">
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.session?.name || ''}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
        ) : !selectedStudent ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500"><User size={48} className="mx-auto mb-4 opacity-30" /><p>No student selected</p></div>
        ) : (
          <>
            {/* School & Student Info Card */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"><School size={28} /></div>
                <div><h2 className="text-xl font-bold">{schoolSettings?.school_name || 'Mastery Engine'}</h2>
                  {schoolSettings?.school_address && <p className="text-sm text-primary-200">{schoolSettings.school_address}</p>}
                  {schoolSettings?.school_motto && <p className="text-xs text-primary-300 italic mt-0.5">"{schoolSettings.school_motto}"</p>}</div>
              </div>
              <div className="border-t border-white/20 pt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2"><User size={14} /><span><strong>{selectedStudent.name}</strong></span></div>
                <div className="flex items-center gap-2"><GraduationCap size={14} /><span>{selectedStudent.class?.name || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Award size={14} /><span>Adm: {selectedStudent.admission_number || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} /><span>{selectedTerm?.name} ({selectedTerm?.session?.name || ''})</span></div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card"><p className="text-xs text-slate-500">Overall Average</p><p className={`text-2xl font-bold ${totals.totalAvg >= 70 ? 'text-green-600' : totals.totalAvg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{totals.totalAvg}%</p></div>
              <div className="card"><p className="text-xs text-slate-500">Grade</p><p className="text-2xl font-bold text-slate-800">{totals.totalGrade}</p></div>
              <div className="card"><p className="text-xs text-slate-500">Remark</p><p className="text-lg font-bold text-primary-600">{totals.remark}</p></div>
              <div className="card"><p className="text-xs text-slate-500">Attendance</p><p className="text-2xl font-bold text-green-600">{attendanceData.rate}%</p><p className="text-xs text-slate-400">{attendanceData.present}/{attendanceData.total} days</p></div>
            </div>

            {/* Scores Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Award size={16} />Score Sheet</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRemarksEditor(!showRemarksEditor)} className="text-xs btn-ghost flex items-center gap-1 px-2 py-1"><Edit3 size={12} /> Remarks</button>
                  <button onClick={() => setShowDomainEditor(!showDomainEditor)} className="text-xs btn-ghost flex items-center gap-1 px-2 py-1"><Edit3 size={12} /> Domain</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {isThirdTerm ? (
                  /* Cumulative 3-Term Table */
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Subject</th><th className="p-3 text-center font-semibold text-slate-600">Term 1</th><th className="p-3 text-center font-semibold text-slate-600">Term 2</th><th className="p-3 text-center font-semibold text-slate-600">Term 3</th><th className="p-3 text-center font-semibold text-slate-600">Cumulative</th><th className="p-3 text-center font-semibold text-slate-600">Grade</th><th className="p-3 text-center font-semibold text-slate-600">Remark</th></tr></thead>
                    <tbody>{cumulative.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">No scores</td></tr> : cumulative.map((c: any, i: number) => (
                      <tr key={i} className={`border-t border-slate-100 ${c.cumulative_avg != null && c.cumulative_avg < 50 ? 'bg-red-50' : ''}`}>
                        <td className="p-3 font-medium text-slate-800">{c.subject_name}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term1_avg != null ? `${c.term1_avg}%` : '-'}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term2_avg != null ? `${c.term2_avg}%` : '-'}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term3_avg != null ? `${c.term3_avg}%` : '-'}</td>
                        <td className={`p-3 text-center font-bold ${c.cumulative_avg != null ? (c.cumulative_avg >= 70 ? 'text-green-600' : c.cumulative_avg >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{c.cumulative_avg != null ? `${c.cumulative_avg}%` : '-'}</td>
                        <td className={`p-3 text-center font-bold ${c.cumulative_avg != null ? (c.cumulative_avg >= 70 ? 'text-green-600' : c.cumulative_avg >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-'}</td>
                        <td className="p-3 text-center text-slate-600">{c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : (
                  /* Standard Single-Term Table */
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100">
                      <th className="p-3 text-left font-semibold text-slate-600">Subject</th>
                      {buildScoreTypes(assessmentConfig).map(h => (
                        <th key={h.key} className="p-3 text-center font-semibold text-slate-600">{h.label}<br /><span className="font-normal text-xs">(/{h.maxScore})</span></th>
                      ))}
                      <th className="p-3 text-center font-semibold text-slate-600">Total</th>
                      <th className="p-3 text-center font-semibold text-slate-600">Grade</th>
                      <th className="p-3 text-center font-semibold text-slate-600">Remark</th>
                    </tr></thead>
                    <tbody>{subjectScores.length === 0 ? <tr><td colSpan={buildScoreTypes(assessmentConfig).length + 3} className="p-6 text-center text-slate-400">No scores entered yet</td></tr> : subjectScores.map((s: any, i: number) => {
                      const headers = buildScoreTypes(assessmentConfig);
                      let total = 0;
                      const cells = headers.map(h => {
                        const val = s[h.key]?.score;
                        total += val ?? 0;
                        return val != null ? val : '-';
                      });
                      total = Math.min(100, total);
                      const grade = calculateGrade(total);
                      const remark = computeRemark(total);
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${total > 0 && total < 50 ? 'bg-red-50' : ''}`}>
                          <td className="p-3 font-medium text-slate-800">{s.subject_name}</td>
                          {cells.map((c, ci) => <td key={ci} className="p-3 text-center font-bold">{c}</td>)}
                          <td className={`p-3 text-center font-bold ${total > 0 ? (total >= 70 ? 'text-green-600' : total >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{total > 0 ? `${total}%` : '-'}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{grade}</td>
                          <td className="p-3 text-center text-slate-600">{remark}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
              <div className="p-3 border-t bg-slate-50 text-xs text-slate-400 flex justify-between">
                <span>{totals.subjectCount} subject(s)</span>
                <span>Overall: {totals.totalAvg}% ({totals.totalGrade})</span>
              </div>
            </div>

            {/* Remarks Editor */}
            {showRemarksEditor && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 text-sm">Remarks</h3><button onClick={() => setShowRemarksEditor(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                <div><label className="label">Teacher's Remark</label><textarea value={reportRemarks.teacher_remarks || ''} onChange={e => setReportRemarks({ ...reportRemarks, teacher_remarks: e.target.value })} className="input" rows={3} placeholder="Enter teacher's comment..." /></div>
                <div><label className="label">Principal's Remark</label><textarea value={reportRemarks.principal_remarks || ''} onChange={e => setReportRemarks({ ...reportRemarks, principal_remarks: e.target.value })} className="input" rows={3} placeholder="Enter principal's comment..." /></div>
                <div><label className="label">Next Term Begins</label><input type="date" value={reportRemarks.next_term_begins || ''} onChange={e => setReportRemarks({ ...reportRemarks, next_term_begins: e.target.value })} className="input" /></div>
                <button onClick={saveRemarks} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Remarks
                </button>
              </div>
            )}

            {/* Domain Grades Editor */}
            {showDomainEditor && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
                <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 text-sm">Domain Assessment (1-5)</h3><button onClick={() => setShowDomainEditor(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                {[
                  { title: 'Cognitive Domain', fields: COGNITIVE_FIELDS, color: 'bg-blue-50 border-blue-200' },
                  { title: 'Affective Domain', fields: AFFECTIVE_FIELDS, color: 'bg-green-50 border-green-200' },
                  { title: 'Psychomotor Domain', fields: PSYCHOMOTOR_FIELDS, color: 'bg-purple-50 border-purple-200' },
                ].map(group => (
                  <div key={group.title} className={`p-4 rounded-lg border ${group.color}`}>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">{group.title}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {group.fields.map(f => (
                        <div key={f.key}>
                          <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button key={star} type="button" onClick={() => setDomainGrades({ ...domainGrades, [f.key]: star })}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${(domainGrades[f.key] || 0) >= star ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{star}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={saveDomainGrades} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Domain Grades
                </button>
              </div>
            )}

            {/* Saved Remarks Display */}
            {!showRemarksEditor && (reportRemarks.teacher_remarks || reportRemarks.principal_remarks) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportRemarks.teacher_remarks && (
                  <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Teacher's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.teacher_remarks}"</p></div>
                )}
                {reportRemarks.principal_remarks && (
                  <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Principal's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.principal_remarks}"</p></div>
                )}
              </div>
            )}

            {/* Domain Grades Display */}
            {!showDomainEditor && Object.keys(domainGrades).length > 0 && (
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Domain Assessment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: 'Cognitive', fields: COGNITIVE_FIELDS, color: 'text-blue-600' },
                    { title: 'Affective', fields: AFFECTIVE_FIELDS, color: 'text-green-600' },
                    { title: 'Psychomotor', fields: PSYCHOMOTOR_FIELDS, color: 'text-purple-600' },
                  ].map(group => {
                    const entries = group.fields.filter(f => domainGrades[f.key] != null);
                    if (entries.length === 0) return null;
                    return (
                      <div key={group.title}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color}`}>{group.title}</h4>
                        <div className="space-y-1">{entries.map(f => (
                          <div key={f.key} className="flex justify-between text-sm"><span className="text-slate-600">{f.label}</span><span className="font-bold text-slate-800">{domainGrades[f.key]}/5</span></div>
                        ))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function TeacherReportCardPage() {
  return (<Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>}><ReportCardContent /></Suspense>);
}
