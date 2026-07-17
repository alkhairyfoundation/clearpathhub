'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Moon, Book, Heart, Star, CheckCircle, XCircle,
  Loader2, Save, Plus, TrendingUp, Award, Calendar
} from 'lucide-react';
import { getAccountabilityColor } from '@/lib/colors';

export default function IslamicGrowthPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDays: 0, avgAdab: 0, memorizedAyahs: 0, perfectDays: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    salah_fajr: false, salah_dhuhr: false, salah_asr: false,
    salah_maghrib: false, salah_isha: false,
    quran_memorized_ayahs: 0, quran_revision_ayahs: 0,
    adab_rating: 3, dhikr_completed: false,
    charity_action: '', notes: '',
  });

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [todayRes, historyRes] = await Promise.all([
        supabase.from('islamic_tracking').select('*').eq('student_id', profile?.id).eq('date', todayStr).maybeSingle(),
        supabase.from('islamic_tracking').select('*').eq('student_id', profile?.id).order('date', { ascending: false }).limit(30),
      ]);

      if (todayRes.data) {
        setToday(todayRes.data);
        setForm({
          salah_fajr: todayRes.data.salah_fajr,
          salah_dhuhr: todayRes.data.salah_dhuhr,
          salah_asr: todayRes.data.salah_asr,
          salah_maghrib: todayRes.data.salah_maghrib,
          salah_isha: todayRes.data.salah_isha,
          quran_memorized_ayahs: todayRes.data.quran_memorized_ayahs || 0,
          quran_revision_ayahs: todayRes.data.quran_revision_ayahs || 0,
          adab_rating: todayRes.data.adab_rating || 3,
          dhikr_completed: todayRes.data.dhikr_completed || false,
          charity_action: todayRes.data.charity_action || '',
          notes: todayRes.data.notes || '',
        });
      }

      if (historyRes.data) {
        setHistory(historyRes.data);
        const total = historyRes.data.length;
        const avgAdab = total > 0
          ? Math.round(historyRes.data.reduce((s, r) => s + (r.adab_rating || 0), 0) / total * 10) / 10
          : 0;
        setStats({
          totalDays: total,
          avgAdab,
          memorizedAyahs: historyRes.data.reduce((s, r) => s + (r.quran_memorized_ayahs || 0), 0),
          perfectDays: historyRes.data.filter(r =>
            r.salah_fajr && r.salah_dhuhr && r.salah_asr && r.salah_maghrib && r.salah_isha
          ).length,
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = { ...form, date: todayStr, student_id: profile?.id, self_reported: true };

      const { error } = await supabase.from('islamic_tracking').upsert(payload, {
        onConflict: 'student_id, date',
      });
      if (error) throw error;

      await loadData();
    } catch (err: any) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  }

  const salahNames = [
    { key: 'salah_fajr', label: 'Fajr', time: 'Before sunrise' },
    { key: 'salah_dhuhr', label: 'Dhuhr', time: 'Midday' },
    { key: 'salah_asr', label: 'Asr', time: 'Afternoon' },
    { key: 'salah_maghrib', label: 'Maghrib', time: 'Sunset' },
    { key: 'salah_isha', label: 'Isha', time: 'Night' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Islamic Growth" subtitle="Track your Islamic development">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Islamic Growth" subtitle="Track your Islamic character development">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Islamic Growth</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Salah, Quran, Adab, and character tracking</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Moon size={16} /> Days Tracked</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{stats.totalDays}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Star size={16} /> Avg Adab</div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{stats.avgAdab}/5</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Book size={16} /> Ayahs Memorized</div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{stats.memorizedAyahs}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><CheckCircle size={16} /> Perfect Days</div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{stats.perfectDays}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tracking */}
          <div className="card">
            <h2 className="font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
              Today's Islamic Tracker
            </h2>

            <div className="space-y-4">
              {/* Salah */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Moon size={14} className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" /> Salah (Prayers)
                </h3>
                <div className="space-y-2">
                  {salahNames.map(s => (
                    <label key={s.key} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{s.label}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{s.time}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(form as any)[s.key]}
                        onChange={(e) => setForm({ ...form, [s.key]: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 focus:ring-emerald-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Quran */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Book size={14} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /> Quran
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Ayahs Memorized</label>
                    <input type="number" min="0" value={form.quran_memorized_ayahs}
                      onChange={(e) => setForm({ ...form, quran_memorized_ayahs: parseInt(e.target.value) || 0 })}
                      className="input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Ayahs Revised</label>
                    <input type="number" min="0" value={form.quran_revision_ayahs}
                      onChange={(e) => setForm({ ...form, quran_revision_ayahs: parseInt(e.target.value) || 0 })}
                      className="input mt-1" />
                  </div>
                </div>
              </div>

              {/* Adab & Character */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Heart size={14} className="text-rose-600 dark:text-rose-400 dark:text-rose-400" /> Adab & Character
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Self-Rating (1-5)</label>
                    <div className="flex gap-2 mt-1">
                      {[1, 2, 3, 4, 5].map(r => (
                        <button key={r} onClick={() => setForm({ ...form, adab_rating: r })}
                          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                            form.adab_rating === r
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200'
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={form.dhikr_completed}
                      onChange={(e) => setForm({ ...form, dhikr_completed: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 dark:border-slate-600 text-primary-600 dark:text-primary-400 dark:text-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">Completed morning/evening adhkar</span>
                  </label>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Charity / Good Deed</label>
                    <input type="text" value={form.charity_action}
                      onChange={(e) => setForm({ ...form, charity_action: e.target.value })}
                      placeholder="e.g., Helped a classmate, gave sadaqah..."
                      className="input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Notes</label>
                    <textarea value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input mt-1" rows={2} placeholder="Any reflections or goals..." />
                  </div>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {today ? 'Update Today\'s Record' : 'Save Today\'s Record'}
              </button>
            </div>
          </div>

          {/* History & Trends */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                Recent Days
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-4">Start tracking your Islamic growth</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 10).map(day => {
                    const completedSalah = [day.salah_fajr, day.salah_dhuhr, day.salah_asr, day.salah_maghrib, day.salah_isha].filter(Boolean).length;
                    const isPerfect = completedSalah === 5;
                    return (
                      <div key={day.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPerfect ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:text-slate-400 dark:text-slate-400'
                          }`}>
                            {isPerfect ? <CheckCircle size={14} /> : completedSalah}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">
                              {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500">
                              <span>{completedSalah}/5 Salah</span>
                              {day.quran_memorized_ayahs > 0 && <span>• +{day.quran_memorized_ayahs} ayahs</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {day.adab_rating != null && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 dark:text-amber-400 font-medium">{day.adab_rating}/5</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly Salah Chart */}
            <div className="card">
              <h2 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 flex items-center gap-2">
                <Award size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                This Week's Salah
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((name, i) => {
                  const count = history.filter(d => {
                    const keys = ['salah_fajr', 'salah_dhuhr', 'salah_asr', 'salah_maghrib', 'salah_isha'];
                    return (d as any)[keys[i]] === true;
                  }).length;
                  const pct = history.length > 0 ? Math.round((count / history.length) * 100) : 0;
                  return (
                    <div key={name} className="text-center">
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">{name}</div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-16 flex flex-col justify-end overflow-hidden">
                        <div className="bg-emerald-500 rounded-full transition-all" style={{ height: `${pct}%`, minHeight: pct > 0 ? '8px' : '0' }} />
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mt-1">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
