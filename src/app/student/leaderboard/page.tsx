'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Trophy, Medal, TrendingUp, BookOpen, Star, Loader2, Users, Crown } from 'lucide-react';

const TABS = [
  { id: 'class_weekly', label: 'Class Weekly', icon: <Trophy size={14} /> },
  { id: 'school_monthly', label: 'School Monthly', icon: <Users size={14} /> },
  { id: 'islamic', label: 'Islamic', icon: <Star size={14} /> },
  { id: 'skills', label: 'Skills', icon: <TrendingUp size={14} /> },
  { id: 'mastery', label: 'Mastery', icon: <BookOpen size={14} /> },
];

interface RankedStudent {
  student_id: string;
  name: string;
  score: number;
  rank: number;
  change?: number;
}

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('class_weekly');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchLeaderboard();
  }, [profile, activeTab]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${activeTab}&student_id=${profile?.id}`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      setData(null);
    }
    setLoading(false);
  }

  if (!data && loading) {
    return (
      <DashboardLayout title="Leaderboard" subtitle="Compete and grow">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  const rankings: RankedStudent[] = data?.rankings || [];
  const myRank = data?.myRank;
  const periodLabel = activeTab === 'class_weekly' ? 'This Week' : activeTab === 'school_monthly' ? 'This Month' : 'All Time';

  return (
    <DashboardLayout title="Leaderboard" subtitle="Compete and grow with your peers">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Trophy size={20} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">Leaderboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{periodLabel} • {rankings.length} students</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 p-1 rounded-xl overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-white text-primary-600 dark:text-primary-400 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Podium */}
        {rankings.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-6">
            {/* 2nd */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 dark:border-slate-600 flex items-center justify-center mb-2">
                <Medal size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{rankings[1]?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">{rankings[1]?.score} pts</p>
              <div className="w-20 h-16 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-t-xl mt-1 flex items-center justify-center text-lg font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500">2</div>
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center">
              <Crown size={24} className="text-amber-500 dark:text-amber-400 dark:text-amber-400 mb-1" />
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 border-2 border-amber-400 flex items-center justify-center mb-2">
                <Trophy size={24} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{rankings[0]?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">{rankings[0]?.score} pts</p>
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 rounded-t-xl mt-1 flex items-center justify-center text-lg font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">1</div>
            </div>
            {/* 3rd */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 dark:bg-orange-900/20 border-2 border-orange-300 flex items-center justify-center mb-2">
                <Medal size={20} className="text-orange-500" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{rankings[2]?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">{rankings[2]?.score} pts</p>
              <div className="w-20 h-14 bg-orange-50 dark:bg-orange-900/20 dark:bg-orange-900/20 rounded-t-xl mt-1 flex items-center justify-center text-lg font-bold text-orange-500">3</div>
            </div>
          </div>
        )}

        {/* Rankings */}
        <div className="card p-0 overflow-hidden">
          {rankings.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">No rankings available yet for this period.</div>
          )}
          {rankings.map((student, i) => {
            const isMe = student.student_id === profile?.id;
            return (
              <div
                key={student.student_id}
                className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 last:border-0 ${
                  isMe ? 'bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20' : i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300' :
                    i === 1 ? 'bg-slate-200 text-slate-600 dark:text-slate-400 dark:text-slate-400' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'text-slate-400 dark:text-slate-500 dark:text-slate-500'
                  }`}>{i + 1}</span>
                  <div>
                    <p className={`text-sm font-medium ${isMe ? 'text-primary-700 dark:text-primary-300 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200 dark:text-slate-200'}`}>
                      {student.name} {isMe && <span className="text-[10px] text-primary-500">(You)</span>}
                    </p>
                    {student.change !== undefined && (
                      <p className={`text-[10px] ${student.change > 0 ? 'text-emerald-500' : student.change < 0 ? 'text-red-400' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500'}`}>
                        {student.change > 0 ? `+${student.change}` : student.change === 0 ? '—' : `${student.change}`}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{student.score}</span>
              </div>
            );
          })}
        </div>

        {/* My Rank */}
        {myRank && (
          <div className="card bg-gradient-to-r from-amber-50 to-primary-50 border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Your Rank</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">#{myRank.rank} of {myRank.total}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Your Score</p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{myRank.score}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
