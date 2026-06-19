import type { MasteryColorKey, MasteryColorConfig } from '@/types';

export const MASTERY_COLORS: Record<MasteryColorKey, MasteryColorConfig> = {
  red: {
    range: [0, 39],
    label: 'Critical Weakness',
    hex: '#EF4444',
    textColor: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  orange: {
    range: [40, 59],
    label: 'Needs Improvement',
    hex: '#F97316',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  yellow: {
    range: [60, 79],
    label: 'Developing Understanding',
    hex: '#EAB308',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
  },
  light_green: {
    range: [80, 89],
    label: 'Good Understanding',
    hex: '#84CC16',
    textColor: 'text-lime-600',
    bgColor: 'bg-lime-100',
    borderColor: 'border-lime-300',
  },
  green: {
    range: [90, 95],
    label: 'Strong Mastery',
    hex: '#22C55E',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
  },
  dark_green: {
    range: [96, 100],
    label: 'Exceptional Mastery',
    hex: '#059669',
    textColor: 'text-emerald-800',
    bgColor: 'bg-emerald-200',
    borderColor: 'border-emerald-400',
  },
  blue: {
    range: null,
    label: 'Sustained Long-Term Mastery',
    hex: '#3B82F6',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  purple: {
    range: null,
    label: 'Gifted / Advanced Level',
    hex: '#8B5CF6',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
};

export const MASTERY_LEVEL_COLORS: Record<string, string> = {
  mastered: 'bg-emerald-500',
  good_progress: 'bg-blue-500',
  developing: 'bg-amber-500',
  needs_support: 'bg-red-500',
  critical_weakness: 'bg-red-600',
  strong_mastery: 'bg-emerald-500',
  exceptional: 'bg-emerald-700',
  sustained: 'bg-blue-500',
  gifted: 'bg-purple-500',
};

export const MASTERY_LEVEL_BG: Record<string, string> = {
  mastered: 'bg-emerald-100 text-emerald-700',
  good_progress: 'bg-blue-100 text-blue-700',
  developing: 'bg-amber-100 text-amber-700',
  needs_support: 'bg-red-100 text-red-700',
  critical_weakness: 'bg-red-200 text-red-800',
  strong_mastery: 'bg-emerald-100 text-emerald-700',
  exceptional: 'bg-emerald-200 text-emerald-800',
  sustained: 'bg-blue-100 text-blue-700',
  gifted: 'bg-purple-100 text-purple-700',
};

export const MASTERY_LEVEL_LABELS: Record<string, string> = {
  mastered: 'Mastered',
  good_progress: 'Good Progress',
  developing: 'Developing',
  needs_support: 'Needs Support',
  critical_weakness: 'Critical Weakness',
  strong_mastery: 'Strong Mastery',
  exceptional: 'Exceptional',
  sustained: 'Sustained',
  gifted: 'Gifted',
};

export function getMasteryColor(score: number | null | undefined, isLongTerm?: boolean, isGifted?: boolean): MasteryColorConfig {
  if (score == null) return MASTERY_COLORS.red;
  if (isGifted) return MASTERY_COLORS.purple;
  if (isLongTerm && score >= 90) return MASTERY_COLORS.blue;
  if (score >= 96) return MASTERY_COLORS.dark_green;
  if (score >= 90) return MASTERY_COLORS.green;
  if (score >= 80) return MASTERY_COLORS.light_green;
  if (score >= 60) return MASTERY_COLORS.yellow;
  if (score >= 40) return MASTERY_COLORS.orange;
  return MASTERY_COLORS.red;
}

export function getScoreColorClasses(score: number | null | undefined): { text: string; bg: string; border: string; bar: string } {
  const color = getMasteryColor(score);
  return {
    text: color.textColor,
    bg: color.bgColor,
    border: color.borderColor,
    bar: color.hex,
  };
}

export function getAccountabilityColor(score: number): MasteryColorConfig {
  if (score >= 90) return MASTERY_COLORS.green;
  if (score >= 75) return MASTERY_COLORS.light_green;
  if (score >= 60) return MASTERY_COLORS.yellow;
  if (score >= 40) return MASTERY_COLORS.orange;
  return MASTERY_COLORS.red;
}

export function getPromotionColor(status: string): { text: string; bg: string; label: string } {
  switch (status) {
    case 'ready':
      return { text: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Ready for Promotion' };
    case 'needs_intervention':
      return { text: 'text-amber-600', bg: 'bg-amber-100', label: 'Needs Intervention' };
    case 'conditional':
      return { text: 'text-orange-600', bg: 'bg-orange-100', label: 'Conditional Promotion' };
    case 'not_ready':
      return { text: 'text-red-600', bg: 'bg-red-100', label: 'Not Yet Ready' };
    default:
      return { text: 'text-slate-600', bg: 'bg-slate-100', label: status };
  }
}

export function getGoalStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-600';
    case 'missed': return 'text-red-500';
    case 'active': return 'text-blue-600';
    case 'in_progress': return 'text-amber-600';
    default: return 'text-slate-400';
  }
}

export function getGoalStatusBg(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-100';
    case 'missed': return 'bg-red-100';
    case 'active': return 'bg-blue-100';
    case 'in_progress': return 'bg-amber-100';
    default: return 'bg-slate-100';
  }
}

export function getRetentionColor(daysSinceMastery: number, retestScore: number | null): MasteryColorConfig {
  if (retestScore == null) {
    if (daysSinceMastery <= 3) return MASTERY_COLORS.green;
    if (daysSinceMastery <= 7) return MASTERY_COLORS.light_green;
    if (daysSinceMastery <= 14) return MASTERY_COLORS.yellow;
    return MASTERY_COLORS.orange;
  }
  return getMasteryColor(retestScore);
}

export const XP_COLORS = {
  earned: 'text-amber-500',
  bonus: 'text-purple-500',
  spent: 'text-red-500',
  level_up: 'text-emerald-500',
} as const;

export const BADGE_CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  academic: { text: 'text-blue-600', bg: 'bg-blue-100' },
  islamic: { text: 'text-emerald-600', bg: 'bg-emerald-100' },
  skills: { text: 'text-purple-600', bg: 'bg-purple-100' },
  streak: { text: 'text-amber-600', bg: 'bg-amber-100' },
  mastery: { text: 'text-rose-600', bg: 'bg-rose-100' },
  challenge: { text: 'text-orange-600', bg: 'bg-orange-100' },
  leadership: { text: 'text-cyan-600', bg: 'bg-cyan-100' },
  community: { text: 'text-teal-600', bg: 'bg-teal-100' },
};
