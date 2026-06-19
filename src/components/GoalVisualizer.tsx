'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, ArrowRight, Target, Calendar, BarChart3, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { GoalHierarchy, GoalPeriodType, GoalDimension } from '@/types';
import { getGoalStatusColor, getGoalStatusBg } from '@/lib/colors';

interface GoalVisualizerProps {
  goals: GoalHierarchy[];
  studentId: string;
  compact?: boolean;
}

const PERIOD_ORDER: GoalPeriodType[] = ['daily', 'weekly', 'monthly', 'term', 'yearly'];
const PERIOD_LABELS: Record<GoalPeriodType, string> = {
  daily: 'Daily Goals',
  weekly: 'Weekly Goals',
  monthly: 'Monthly Goals',
  term: 'Term Goals',
  yearly: 'Year Goals',
};
const PERIOD_ICONS: Record<GoalPeriodType, React.ReactNode> = {
  daily: <Target size={16} />,
  weekly: <Calendar size={16} />,
  monthly: <BarChart3 size={16} />,
  term: <TrendingUp size={16} />,
  yearly: <TrendingUp size={18} />,
};
const DIMENSION_COLORS: Record<GoalDimension, string> = {
  academic: 'border-l-blue-500 bg-blue-50',
  islamic: 'border-l-emerald-500 bg-emerald-50',
  skills: 'border-l-purple-500 bg-purple-50',
};
const DIMENSION_LABELS: Record<GoalDimension, string> = {
  academic: 'Academic',
  islamic: 'Islamic Character',
  skills: 'Life Skills',
};

export default function GoalVisualizer({ goals, studentId, compact }: GoalVisualizerProps) {
  const [expandedPeriod, setExpandedPeriod] = useState<GoalPeriodType>('daily');
  const [expandedDimension, setExpandedDimension] = useState<GoalDimension>('academic');

  const groupedByPeriod = PERIOD_ORDER.map(period => ({
    period,
    label: PERIOD_LABELS[period],
    icon: PERIOD_ICONS[period],
    goals: goals.filter(g => g.period_type === period),
  }));

  if (goals.length === 0) {
    return (
      <div className="card text-center py-8">
        <Target className="mx-auto text-slate-300 mb-3" size={40} />
        <p className="text-slate-500 font-medium">No goals set yet</p>
        <p className="text-sm text-slate-400 mt-1">Complete daily practice to generate goals</p>
      </div>
    );
  }

  const calculateChainProgress = () => {
    const completed = goals.filter(g => g.status === 'completed').length;
    return goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Your Goal Journey</p>
              <p className="text-2xl font-bold mt-1">{calculateChainProgress()}% Complete</p>
            </div>
            <div className="text-right">
              <p className="text-primary-100 text-sm">{goals.filter(g => g.status === 'completed').length} completed</p>
              <p className="text-primary-200 text-xs">{goals.filter(g => g.status === 'active').length} active</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-3">
            <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${calculateChainProgress()}%` }} />
          </div>
        </div>
      )}

      {/* Goal Chain Visualization */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            Your Growth Chain
          </h3>
          <div className="flex gap-2">
            {(['academic', 'islamic', 'skills'] as GoalDimension[]).map(dim => (
              <button
                key={dim}
                onClick={() => setExpandedDimension(dim)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  expandedDimension === dim
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {DIMENSION_LABELS[dim]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {groupedByPeriod.map((group, idx) => {
              const dimGoals = group.goals.filter(g => g.dimension === expandedDimension);
              const completedCount = dimGoals.filter(g => g.status === 'completed').length;
              const progress = dimGoals.length > 0 ? Math.round((completedCount / dimGoals.length) * 100) : 0;

              return (
                <div key={group.period} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExpandedPeriod(group.period)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[100px] ${
                      expandedPeriod === group.period
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                      progress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {progress >= 100 ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{group.label.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-400">{completedCount}/{dimGoals.length}</span>
                  </button>
                  {idx < groupedByPeriod.length - 1 && (
                    <ArrowRight size={16} className="text-slate-300 mx-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Expanded Period Detail */}
          {groupedByPeriod.map(group => {
            if (group.period !== expandedPeriod) return null;
            const dimGoals = group.goals.filter(g => g.dimension === expandedDimension);
            if (dimGoals.length === 0) {
              return (
                <div key={group.period} className="mt-4 text-center py-6 text-slate-400 text-sm border-t border-slate-100">
                  No {expandedDimension} {group.label.toLowerCase()} for this period
                </div>
              );
            }
            return (
              <div key={group.period} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">{group.label} - {DIMENSION_LABELS[expandedDimension]}</span>
                  <Link href={`/student/goals/${group.period}`} className="text-xs text-primary-600 font-medium hover:underline">
                    View all
                  </Link>
                </div>
                {dimGoals.map(goal => (
                  <div
                    key={goal.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                      DIMENSION_COLORS[goal.dimension as GoalDimension] || 'border-l-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{goal.goal_text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getGoalStatusBg(goal.status)} ${getGoalStatusColor(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                        {goal.target_value != null && (
                          <span className="text-[10px] text-slate-400">
                            Target: {goal.target_value} | Achieved: {goal.achieved_value ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      {goal.target_value != null && goal.target_value > 0 && (
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((goal.achieved_value ?? 0) / goal.target_value * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
