'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Search, Loader2, User, Plus, X,
  BarChart3, TrendingUp, Award, Zap, Flame
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function CompareStudentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') { router.push('/login'); return; }

    fetch('/api/admin/analytics/overview')
      .then(r => r.json())
      .then(d => setAllStudents(d?.students || []))
      .catch(() => {});
  }, [profile]);

  async function fetchCompare() {
    if (selectedIds.length < 2) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/analytics/compare?student_ids=${selectedIds.join(',')}`);
      const d = await res.json();
      setCompareData(d);
    } catch (err) { console.error(err); }
    setFetching(false);
  }

  useEffect(() => {
    if (selectedIds.length >= 2) fetchCompare();
    else setCompareData(null);
  }, [selectedIds]);

  const filteredStudents = allStudents.filter((s: any) =>
    !selectedIds.includes(s.id) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  const radarData = compareData?.students?.length
    ? (compareData.students[0]?.avg_score != null ? ['avg_score', 'attendance_rate', 'avg_mastery', 'current_streak', 'level', 'practice_sessions'].map(key => {
        const entry: any = { metric: key.replace(/_/g, ' ') };
        compareData.students.forEach((s: any, i: number) => {
          entry[s.name.split(' ')[0]] = s[key] || 0;
        });
        return entry;
      }) : [])
    : [];

  const dims = compareData?.dimensions || [];

  return (
    <DashboardLayout title="Compare Students" subtitle="Side-by-side student comparison">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <h1 className="text-xl font-bold text-slate-900">Compare Students</h1>
        </div>

        {/* Student Selector */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search students to add..." value={search} onChange={e => setSearch(e.target.value)} className="input py-1.5 pl-8 pr-3 text-xs w-full" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            {selectedIds.map((sid, i) => {
              const s = allStudents.find(st => st.id === sid);
              return (
                <div key={sid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                  <User size={12} /> {s?.name || sid.slice(0, 8)}
                  <button onClick={() => setSelectedIds(prev => prev.filter(id => id !== sid))} className="ml-1">
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            {selectedIds.length === 0 && <span className="text-xs text-slate-400">Select 2-4 students to compare</span>}
          </div>

          {selectedIds.length < 4 && (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filteredStudents.slice(0, 20).map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedIds(prev => [...prev, s.id]); setSearch(''); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-2"
                >
                  <Plus size={12} className="text-slate-400" />
                  <span className="font-medium text-slate-700">{s.name}</span>
                  <span className="text-slate-400">{s.class_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compare Results */}
        {fetching && (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        )}

        {compareData && !fetching && (
          <>
            {/* Radar Chart */}
            <div className="card">
              <h3 className="font-bold text-slate-900 mb-3">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  {compareData.students.map((s: any, i: number) => (
                    <Radar key={s.id} name={s.name.split(' ')[0]} dataKey={s.name.split(' ')[0]}
                      stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Metric</th>
                    {compareData.students.map((s: any, i: number) => (
                      <th key={s.id} className="text-center py-2.5 px-3 font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                        {s.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dims.map((dim: any) => {
                    const vals = compareData.students.map((s: any) => s[dim.key]);
                    const maxVal = Math.max(...vals.filter((v: any) => v != null));
                    return (
                      <tr key={dim.key} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-700 capitalize">{dim.label}</td>
                        {compareData.students.map((s: any, i: number) => {
                          const val = s[dim.key];
                          const isMax = val === maxVal && val != null && dims.indexOf(dim) < dims.length;
                          return (
                            <td key={s.id} className={`text-center py-2 px-3 ${val != null && val === maxVal && maxVal > 0 ? 'font-bold' : ''}`}
                              style={{ color: val != null && val === maxVal && maxVal > 0 ? COLORS[i % COLORS.length] : undefined }}>
                              {val != null ? `${val}${dim.unit}` : '-'}
                              {val != null && val === maxVal && maxVal > 0 && <span className="ml-1 text-[9px]">👑</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
