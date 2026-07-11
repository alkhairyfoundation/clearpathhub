import type { CcrResponse, SgiScore } from '@/types';

interface DomainScores {
  student: number[];
  father: number[];
  mother: number[];
  teacher: number[];
}

const DOMAIN_WEIGHTS: Record<string, { student: number; father: number; mother: number; teacher: number }> = {
  identity:   { student: 0.60, father: 0.10, mother: 0.10, teacher: 0.20 },
  academic:   { student: 0.20, father: 0.15, mother: 0.15, teacher: 0.50 },
  character:  { student: 0.30, father: 0.175, mother: 0.175, teacher: 0.35 },
  emotional:  { student: 0.70, father: 0.10, mother: 0.10, teacher: 0.10 },
  social:     { student: 0.20, father: 0.10, mother: 0.10, teacher: 0.60 },
  family:     { student: 0.40, father: 0.30, mother: 0.30, teacher: 0.00 },
  digital:    { student: 0.50, father: 0.25, mother: 0.25, teacher: 0.00 },
  faith:      { student: 0.30, father: 0.25, mother: 0.25, teacher: 0.20 },
  leadership: { student: 0.30, father: 0.10, mother: 0.10, teacher: 0.50 },
  dreams:     { student: 0.60, father: 0.20, mother: 0.20, teacher: 0.00 },
};

const REVERSE_SCORE_QUESTIONS = new Set(['S_Q36', 'S_Q37', 'S_Q38', 'S_Q45', 'S_Q68', 'S_Q69', 'S_Q70', 'S_Q74', 'T_Q12', 'T_Q22']);

const DOMAIN_QUESTION_IDS: Record<string, string[]> = {
  identity: ['S_Q1', 'S_Q2', 'S_Q3', 'S_Q4', 'S_Q5', 'S_Q6', 'S_Q7', 'S_Q8', 'S_Q11', 'S_Q12',
    'F_Q1', 'F_Q35', 'F_Q41', 'F_Q53', 'F_Q59', 'T_Q4', 'T_Q18', 'T_Q46', 'T_Q52', 'T_Q58', 'T_Q60'],
  academic: ['S_Q13', 'S_Q14', 'S_Q15', 'S_Q17', 'S_Q18', 'S_Q19', 'S_Q20', 'S_Q21', 'S_Q22', 'S_Q23', 'S_Q25', 'S_Q26',
    'F_Q2', 'F_Q16', 'F_Q17', 'F_Q34', 'F_Q36', 'F_Q50', 'F_Q54', 'T_Q1', 'T_Q2', 'T_Q3', 'T_Q9', 'T_Q11', 'T_Q13', 'T_Q14', 'T_Q17', 'T_Q20', 'T_Q26', 'T_Q28', 'T_Q35', 'T_Q36', 'T_Q41', 'T_Q50', 'T_Q53', 'T_Q59',
    'ST_Q1', 'ST_Q2', 'ST_Q3', 'ST_Q4', 'ST_Q5', 'ST_Q7', 'ST_Q8', 'ST_Q10', 'ST_Q13', 'ST_Q15', 'ST_Q16', 'ST_Q17', 'ST_Q18', 'ST_Q19', 'ST_Q20'],
  character: ['S_Q27', 'S_Q28', 'S_Q29', 'S_Q30', 'S_Q31', 'S_Q32', 'S_Q33', 'S_Q34', 'S_Q35',
    'F_Q4', 'F_Q8', 'F_Q13', 'F_Q22', 'F_Q28', 'F_Q31', 'F_Q33', 'F_Q39', 'F_Q51', 'F_Q56', 'F_Q60',
    'T_Q6', 'T_Q16', 'T_Q23', 'T_Q31', 'T_Q38', 'T_Q42', 'T_Q47', 'T_Q55', 'ST_Q11'],
  emotional: ['S_Q36', 'S_Q37', 'S_Q38', 'S_Q39', 'S_Q40', 'S_Q41', 'S_Q42', 'S_Q43', 'S_Q44', 'S_Q45', 'S_Q46', 'S_Q47', 'S_Q48',
    'F_Q9', 'F_Q10', 'F_Q11', 'F_Q23', 'F_Q26', 'F_Q32', 'F_Q40', 'F_Q58',
    'T_Q12', 'T_Q25', 'T_Q34', 'T_Q39', 'T_Q57', 'ST_Q14'],
  social: ['S_Q49', 'S_Q50', 'S_Q51', 'S_Q52', 'S_Q53', 'S_Q54', 'S_Q55', 'S_Q56', 'S_Q57', 'S_Q58',
    'F_Q5', 'F_Q7', 'F_Q14', 'F_Q24', 'F_Q30', 'F_Q37', 'F_Q38', 'F_Q47', 'F_Q52', 'F_Q57',
    'T_Q5', 'T_Q7', 'T_Q10', 'T_Q15', 'T_Q21', 'T_Q24', 'T_Q27', 'T_Q30', 'T_Q32', 'T_Q40', 'T_Q44', 'T_Q45', 'T_Q56', 'ST_Q6'],
  family: ['S_Q59', 'S_Q60', 'S_Q61', 'S_Q62', 'S_Q63', 'S_Q64', 'S_Q65', 'S_Q66',
    'F_Q6', 'F_Q15', 'F_Q19', 'F_Q20', 'F_Q21', 'F_Q27', 'F_Q46', 'F_Q55'],
  digital: ['S_Q67', 'S_Q68', 'S_Q69', 'S_Q70', 'S_Q71', 'S_Q72', 'S_Q73', 'S_Q74',
    'F_Q3', 'F_Q25', 'T_Q22', 'T_Q43', 'ST_Q9'],
  faith: ['S_Q75', 'S_Q76', 'S_Q77', 'S_Q78', 'S_Q79', 'S_Q80',
    'F_Q42', 'F_Q43', 'F_Q44', 'F_Q45', 'F_Q48', 'F_Q49',
    'T_Q37', 'T_Q48'],
  leadership: ['S_Q81', 'S_Q82', 'S_Q83', 'S_Q84', 'S_Q85', 'S_Q86', 'S_Q87', 'S_Q88', 'S_Q89', 'S_Q90',
    'F_Q12', 'F_Q18', 'T_Q8', 'T_Q19', 'T_Q29', 'T_Q33', 'T_Q49', 'T_Q51', 'T_Q54', 'ST_Q12'],
  dreams: ['S_Q91', 'S_Q92', 'S_Q93', 'S_Q94', 'S_Q95', 'S_Q96', 'S_Q97', 'S_Q98', 'S_Q99', 'S_Q100',
    'F_Q29'],
};

function getRespondentType(questionId: string): 'student' | 'father' | 'mother' | 'teacher' {
  if (questionId.startsWith('S_')) return 'student';
  if (questionId.startsWith('F_')) return 'father';
  if (questionId.startsWith('M_')) return 'mother';
  return 'teacher';
}

function normalizeValue(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
  }
  return null;
}

function computeDomainScore(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length) * 20;
}

export function computeSgiScore(responses: CcrResponse[]): SgiScore {
  const byRespondent: Record<string, Record<string, any>> = { student: {}, father: {}, mother: {}, teacher: {} };

  for (const resp of responses) {
    const type = resp.respondent_type;
    if (byRespondent[type]) {
      Object.assign(byRespondent[type], resp.data);
    }
  }

  const domainScores: Record<string, { student: number; adult: number; combined: number }> = {};
  const domainMapped: Record<string, DomainScores> = {};

  for (const domain of Object.keys(DOMAIN_QUESTION_IDS)) {
    domainMapped[domain] = { student: [], father: [], mother: [], teacher: [] };
  }

  for (const [domain, qIds] of Object.entries(DOMAIN_QUESTION_IDS)) {
    for (const qId of qIds) {
      const respondent = getRespondentType(qId);
      let value: any = null;

      if (respondent === 'student') {
        value = byRespondent.student[qId];
      } else if (respondent === 'father') {
        value = byRespondent.father[qId] ?? byRespondent.father[qId];
      } else if (respondent === 'mother') {
        value = byRespondent.mother[qId] ?? byRespondent.mother[qId];
      } else {
        value = byRespondent.teacher[qId];
      }

      const numVal = normalizeValue(value);
      if (numVal !== null) {
        let finalVal = numVal;
        if (REVERSE_SCORE_QUESTIONS.has(qId)) {
          finalVal = 6 - numVal;
        }
        if (respondent === 'student') domainMapped[domain].student.push(finalVal);
        else if (respondent === 'father') domainMapped[domain].father.push(finalVal);
        else if (respondent === 'mother') domainMapped[domain].mother.push(finalVal);
        else if (respondent === 'teacher') domainMapped[domain].teacher.push(finalVal);
      }
    }
  }

  const sgiDomainScores: Record<string, number> = {};

  for (const [domain, scores] of Object.entries(domainMapped)) {
    const sScore = computeDomainScore(scores.student);
    const fScore = computeDomainScore(scores.father);
    const mScore = computeDomainScore(scores.mother);
    const tScore = computeDomainScore(scores.teacher);
    const weights = DOMAIN_WEIGHTS[domain] || { student: 0.25, father: 0.25, mother: 0.25, teacher: 0.25 };

    const adultCombined = (fScore * weights.father + mScore * weights.mother + tScore * weights.teacher) /
      (weights.father + weights.mother + weights.teacher || 1);

    const combined = sScore * weights.student + fScore * weights.father +
      mScore * weights.mother + tScore * weights.teacher;

    sgiDomainScores[domain] = combined;

    domainScores[domain] = {
      student: Math.round(sScore),
      adult: Math.round(adultCombined),
      combined: Math.round(combined),
    };
  }

  const foundation = (sgiDomainScores.identity + sgiDomainScores.character + sgiDomainScores.leadership) / 3;
  const performance = (sgiDomainScores.academic + sgiDomainScores.social + sgiDomainScores.digital) / 3;
  const environment = (sgiDomainScores.family + sgiDomainScores.faith + sgiDomainScores.emotional) / 3;
  const aspiration = sgiDomainScores.dreams;

  const overall = foundation * 0.35 + performance * 0.35 + environment * 0.15 + aspiration * 0.15;

  const redFlags: string[] = [];
  if (byRespondent.student['S_Q7'] !== undefined && byRespondent.student['S_Q38'] !== undefined) {
    const happiness = normalizeValue(byRespondent.student['S_Q7']);
    const loneliness = normalizeValue(byRespondent.student['S_Q38']);
    if (happiness !== null && loneliness !== null && happiness < 2 && loneliness > 4) {
      redFlags.push('Immediate Counselor Alert: Low happiness combined with high loneliness.');
    }
  }
  if (byRespondent.student['S_Q63'] !== undefined) {
    const safety = normalizeValue(byRespondent.student['S_Q63']);
    if (safety !== null && safety < 2) {
      redFlags.push('Safety Safeguarding Alert: Student reports feeling unsafe at home.');
    }
  }

  const observationGaps: string[] = [];
  for (const [, ds] of Object.entries(domainScores)) {
    if (ds.student > 0 && ds.adult > 0 && Math.abs(ds.student - ds.adult) > 40) {
      observationGaps.push(`Observation Gap detected in domain: Student (${ds.student}) vs Adult (${ds.adult}) differ by more than 40%.`);
    }
  }

  const prescriptions: string[] = [];
  if (sgiDomainScores.social < 50) {
    prescriptions.push('Encourage participation in team-based extracurriculars to improve social skills.');
  }
  if (sgiDomainScores.academic < 50) {
    prescriptions.push('Consider additional academic support and tutoring to strengthen learning foundations.');
  }
  if (sgiDomainScores.emotional < 50) {
    prescriptions.push('Recommend wellness check-in and emotional support resources.');
  }
  if (sgiDomainScores.character < 50) {
    prescriptions.push('Focus on character development through mentoring and positive reinforcement.');
  }

  return {
    foundation: Math.round(foundation),
    performance: Math.round(performance),
    environment: Math.round(environment),
    aspiration: Math.round(aspiration),
    overall: Math.round(overall),
    domainScores,
    redFlags,
    observationGaps,
    prescriptions,
  };
}
