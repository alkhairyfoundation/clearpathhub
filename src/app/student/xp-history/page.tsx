'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Zap, Star, TrendingUp, Clock, Award,
  Flame, Trophy, Loader2, Filter, ChevronDown
} from 'lucide-react';

interface XPTransaction {
  id: string;
  xp_amount: number;
  xp_type: string;
  source: string;
  multiplier: number;
  description: string;
  created_at: string;
}

export default function XPHistoryPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [levelData, setLevelData] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/xp/history?student_id=${profile?.id}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setLevelData(data.level || null);
      setStreakData(data.streak || null);
    } catch (err) {
      console.error('Error fetching XP data:', err);
    }
    setLoading(false);
  }

  const filteredTxs = filter === 'all' ? transactions : transactions.filter(t => t.xp_type === filter);
  const xpTypes = [...new Set(transactions.map(t => t.xp_type))];

  if (loading) {
    return (
      <DashboardLayout title="XP & Levels" subtitle="Your gamification progress">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  const xpToday = transactions
    .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.xp_amount, 0);

  const xpThisWeek = transactions
    .filter(t => {
      const d = new Date(t.created_at);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return d >= startOfWeek;
    })
    .reduce((s, t) => s + t.xp_amount, 0);

  return (
    <DashboardLayout title="XP & Levels" subtitle="Track your gamification progress">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Zap size={20} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">XP & Levels</h1>
              <p className="text-xs text-slate-500">Every action earns you experience points</p>
            </div>
          </div>
        </div>

        {/* Level Card */}
        {levelData && (
          <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={20} className="text-amber-600" />
                  <span className="text-3xl font-bold text-slate-900">Level {levelData.level}</span>
                </div>
                <div className="space-y-1">
                  <div className="w-48 sm:w-64 bg-amber-200 rounded-full h-2.5">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${(levelData.current_xp / levelData.xp_to_next_level) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    {levelData.current_xp} / {levelData.xp_to_next_level} XP to next level
                  </p>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Total XP: <span className="font-bold text-slate-800">{levelData.total_xp}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-700">{levelData.level}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="card py-2 px-3 text-center">
            <Zap size={16} className="text-amber-500 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Today</p>
            <p className="text-lg font-bold text-slate-800">+{xpToday}</p>
          </div>
          <div className="card py-2 px-3 text-center">
            <TrendingUp size={16} className="text-primary-500 mx-auto mb-1" />
            <p className="text-xs text-slate-500">This Week</p>
            <p className="text-lg font-bold text-slate-800">+{xpThisWeek}</p>
          </div>
          <div className="card py-2 px-3 text-center">
            <Flame size={16} className="text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Streak</p>
            <p className="text-lg font-bold text-slate-800">{streakData?.current_streak || 0} days</p>
          </div>
          <div className="card py-2 px-3 text-center">
            <Award size={16} className="text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Best Streak</p>
            <p className="text-lg font-bold text-slate-800">{streakData?.longest_streak || 0} days</p>
          </div>
        </div>

        {/* XP Breakdown */}
        {xpTypes.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-3">XP Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {xpTypes.map(type => {
                const total = transactions.filter(t => t.xp_type === type).reduce((s, t) => s + t.xp_amount, 0);
                return (
                  <div key={type} className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">{type.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-bold text-slate-700">+{total}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${filter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >All</button>
            {xpTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${filter === type ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              >{type.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="card p-0 overflow-hidden">
          {filteredTxs.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              No XP transactions yet. Complete practice sessions and activities to earn XP!
            </div>
          )}
          {filteredTxs.map(tx => {
            const isPositive = tx.xp_amount > 0;
            const isMultiplied = tx.multiplier > 1;
            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isPositive ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    <Zap size={14} className={isPositive ? 'text-emerald-600' : 'text-red-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {tx.description || tx.source.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{tx.xp_type.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      {isMultiplied && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500 font-medium">x{tx.multiplier}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}{tx.xp_amount}
                </span>
              </div>
            );
          })}
        </div>

        {/* XP Sources Info */}
        <div className="card bg-gradient-to-r from-primary-50 to-amber-50 border-primary-200">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Star size={16} className="text-primary-600" />
            How to Earn XP
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { action: 'Complete practice', xp: '+10' },
              { action: 'Perfect score', xp: '+25' },
              { action: 'Daily login', xp: '+5' },
              { action: 'Maintain streak', xp: '+15/day' },
              { action: 'Master a topic', xp: '+50' },
              { action: 'Complete goals', xp: '+20' },
              { action: 'Track salah', xp: '+10' },
              { action: 'Log skill activity', xp: '+15' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-600">{item.action}</span>
                <span className="font-bold text-primary-600">{item.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
