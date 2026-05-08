'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Save, Eye, EyeOff, User, Mail, Phone, Check, AlertCircle, Loader2, Shield, Calendar, Users, GraduationCap, TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Student, Attendance, Result, BehavioralReport } from '@/types';

export default function ParentProfilePage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [children, setChildren] = useState<Student[]>([]);
  const [childStats, setChildStats] = useState<{ id: string; attendance: number; avgScore: number; pendingBehavior: number }[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    setFormData({ first_name: profile.first_name || '', last_name: profile.last_name || '', email: profile.email || '', phone: profile.phone || '', avatar_url: profile.avatar_url || '' });
    fetchChildrenData();
  }, [profile]);

  async function fetchChildrenData() {
    if (!profile) return;

    const { data: students } = await supabase.from('students').select('*, profile(first_name, last_name), class(name)').eq('parent_id', profile.id);
    if (students) {
      setChildren(students);
      const statsPromises = students.map(async (child) => {
        const { data: attendance } = await supabase.from('attendance').select('status').eq('student_id', child.id);
        const attendanceRate = attendance && attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100) : 0;
        const { data: results } = await supabase.from('results').select('score').eq('student_id', child.id);
        const avgScore = results && results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
        const { count: pendingBehavior } = await supabase.from('behavioral_reports').select('*', { count: 'exact', head: true }).eq('student_id', child.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        return { id: child.id, attendance: attendanceRate, avgScore, pendingBehavior: pendingBehavior || 0 };
      });
      const stats = await Promise.all(statsPromises);
      setChildStats(stats);
    }
  }

  async function handleSaveProfile() {
    setSaving(true); setError(''); setSaved(false);
    const { error: updateError } = await supabase.from('profiles').update({ first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone || null, avatar_url: formData.avatar_url || null }).eq('id', profile?.id);
    if (updateError) { setError(updateError.message); } else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  async function handleChangePassword() {
    setPasswordError(''); setPasswordSuccess(false);
    if (passwordData.new !== passwordData.confirm) { setPasswordError('Passwords do not match'); return; }
    if (passwordData.new.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.new });
    if (error) { setPasswordError(error.message); } else { setPasswordSuccess(true); setPasswordData({ new: '', confirm: '' }); setTimeout(() => setPasswordSuccess(false), 3000); }
    setChangingPassword(false);
  }

  if (!profile) return null;

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account and monitor your children">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">Manage your account and monitor your children</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{profile.first_name[0]?.toUpperCase()}{profile.last_name[0]?.toUpperCase()}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h2>
          <p className="text-sm text-amber-600 font-medium mt-1">Parent</p>
          <p className="text-sm text-slate-400 mt-1">{profile.email}</p>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Users size={20} className="text-amber-600" />
              <span className="text-lg font-bold text-amber-700">{children.length} {children.length === 1 ? 'Child' : 'Children'}</span>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex items-center gap-3 text-sm text-slate-600 p-2 rounded-lg bg-slate-50">
              <Mail size={16} className="text-slate-400 flex-shrink-0" /><span className="truncate">{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm text-slate-600 p-2 rounded-lg bg-slate-50">
                <Phone size={16} className="text-slate-400 flex-shrink-0" /><span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-600 p-2 rounded-lg bg-slate-50">
              <Calendar size={16} className="text-slate-400 flex-shrink-0" /><span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {children.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-amber-600" />My Children</h2>
              <div className="space-y-4">
                {children.map((child, index) => {
                  const stats = childStats[index];
                  return (
                    <div key={child.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-violet-600">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{child.profile?.first_name} {child.profile?.last_name}</p>
                          <p className="text-xs text-slate-400">{child.admission_number} • {child.class?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{stats?.attendance}%</p>
                          <p className="text-xs text-slate-500">Attendance</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">{stats?.avgScore}%</p>
                          <p className="text-xs text-slate-500">Avg Score</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {stats?.pendingBehavior && stats.pendingBehavior > 0 ? <AlertTriangle size={16} className="text-amber-500" /> : <Check size={16} className="text-emerald-500" />}
                            <p className="text-lg font-bold text-slate-900">{stats?.pendingBehavior || 0}</p>
                          </div>
                          <p className="text-xs text-slate-500">Reports</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2"><User size={20} className="text-amber-600" />Personal Information</h2>
            {saved && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> Profile updated successfully</div>}
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">First Name</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input" /></div>
                <div><label className="label">Last Name</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Email</label><input type="email" value={formData.email} disabled className="input bg-slate-50 text-slate-500 cursor-not-allowed" /><p className="text-xs text-slate-400 mt-1">Email cannot be changed</p></div>
              <div><label className="label">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="+234..." /></div>
              <div><label className="label">Avatar URL (optional)</label><input type="url" value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} className="input" placeholder="https://..." /></div>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2"><Shield size={20} className="text-amber-600" />Change Password</h2>
            {passwordSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> Password updated successfully</div>}
            {passwordError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {passwordError}</div>}
            <div className="space-y-4">
              <div><label className="label">New Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="input pr-10" placeholder="Minimum 6 characters" minLength={6} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              <div><label className="label">Confirm Password</label><input type={showPassword ? 'text' : 'password'} value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="input" placeholder="Re-enter new password" /></div>
              <button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary disabled:opacity-50">{changingPassword ? <><Loader2 size={16} className="animate-spin mr-2" />Updating...</> : 'Update Password'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
  );
}
