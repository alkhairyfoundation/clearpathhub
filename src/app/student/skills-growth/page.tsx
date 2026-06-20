'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Brain, TrendingUp, CheckCircle, Loader2,
  Plus, Save, Target, BarChart3, Clock
} from 'lucide-react';
import { getMasteryColor } from '@/lib/colors';
import type { Skill, SkillsTracking } from '@/types';

export default function SkillsGrowthPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [activityType, setActivityType] = useState('practice');
  const [duration, setDuration] = useState(30);
  const [selfRating, setSelfRating] = useState(3);
  const [description, setDescription] = useState('');

  const activityTypes = [
    'practice', 'project', 'presentation', 'competition',
    'leadership', 'community_service', 'creative_work', 'research', 'other'
  ];

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const [skillsData, trackingRes] = await Promise.all([
        fetch('/api/skills').then(r => r.json()),
        supabase.from('skills_tracking').select('*, skill:skills(*)').eq('student_id', profile?.id).order('date', { ascending: false }).limit(50),
      ]);
      if (Array.isArray(skillsData)) setSkills(skillsData);
      if (trackingRes.data) setTracking(trackingRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleAddActivity() {
    if (!selectedSkill || !description.trim()) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('skills_tracking').insert({
        student_id: profile?.id,
        skill_id: selectedSkill,
        date: todayStr,
        activity_type: activityType,
        activity_description: description,
        duration_minutes: duration,
        self_rating: selfRating,
      });
      if (error) throw error;

      setDescription('');
      setDuration(30);
      setSelfRating(3);
      await loadData();
    } catch (err: any) {
      console.error('Failed to log activity:', err);
    }
  }

  const skillStats = skills.map(skill => {
    const entries = tracking.filter(t => t.skill_id === skill.id);
    const totalMin = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const avgRating = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + (e.self_rating || 0), 0) / entries.length * 10) / 10 : 0;
    return { ...skill, entries: entries.length, totalMin, avgRating };
  }).sort((a, b) => b.entries - a.entries);

  if (loading) {
    return (
      <DashboardLayout title="Skills Growth" subtitle="Track your life skills development">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Skills Growth" subtitle="Track your life skills development">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Skills Growth</h1>
            <p className="text-slate-500 mt-1">Track and develop your life skills</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Log Form */}
          <div className="card lg:col-span-1">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-primary-600" />
              Log Activity
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Skill</label>
                <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)} className="input mt-1">
                  <option value="">Select a skill...</option>
                  {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Activity Type</label>
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="input mt-1">
                  {activityTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Duration (minutes)</label>
                <input type="number" min="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="input mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Self Rating (1-5)</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setSelfRating(r)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold ${selfRating === r ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="input mt-1" rows={2} placeholder="What did you do?" />
              </div>
              <button onClick={handleAddActivity} disabled={!selectedSkill || !description.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Save size={14} /> Log Activity
              </button>
            </div>
          </div>

          {/* Skills Overview */}
          <div className="lg:col-span-2 space-y-4">
            {skillStats.filter(s => s.entries > 0).length === 0 ? (
              <div className="card text-center py-12">
                <Brain className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="font-medium text-slate-500">No skills tracked yet</p>
                <p className="text-sm text-slate-400 mt-1">Log your first skill activity</p>
              </div>
            ) : (
              skillStats.filter(s => s.entries > 0).map(skill => {
                const color = getMasteryColor(skill.avgRating * 20);
                return (
                  <div key={skill.id} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">{skill.name}</h3>
                        <p className="text-xs text-slate-500">{skill.category}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${color.textColor}`}>{skill.avgRating}/5</p>
                        <p className="text-xs text-slate-400">{skill.entries} activities</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} /> {skill.totalMin} min total</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {tracking.filter(t => t.skill_id === skill.id).slice(0, 3).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                          <span className="text-slate-600 truncate">{entry.activity_description}</span>
                          <span className="text-slate-400 shrink-0 ml-2">
                            {entry.duration_minutes}min • {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
