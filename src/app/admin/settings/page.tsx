'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Save, Shield, Palette, FileText, Image, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SchoolSettings } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Partial<SchoolSettings>>({
    school_name: '', school_motto: '', school_address: '', school_phone: '', school_email: '',
    primary_color: '#b3922f', secondary_color: '#063b29', accent_color: '#10b981',
    academic_year: new Date().getFullYear().toString(), term: 'First Term',
    assessment_config: {
      ca1_enabled: true, ca1_max: 40, ca1_label: 'Mid-Term Test',
      ca2_enabled: false, ca2_max: 10, ca2_label: '2nd CA',
      ca3_enabled: false, ca3_max: 10, ca3_label: '3rd CA',
      exam_enabled: true, exam_max: 60, exam_label: 'Exam',
    },
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchSettings();
  }, [profile]);

  async function fetchSettings() {
    setFetching(true);
    const { data } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettings(data);
    }
    setFetching(false);
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSaved(false);

    const { error: upsertError } = await supabase.from('school_settings').upsert({
      ...settings,
    });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  if (fetching) {
    return (
      <DashboardLayout title="School Settings" subtitle="Configure school details and appearance">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="School Settings" subtitle="Configure school details and appearance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">School Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Configure school details and appearance</p>
          </div>
        <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm flex items-center gap-2">
          <Check size={16} /> Settings saved successfully
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Information */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="text-blue-600 dark:text-blue-400 dark:text-blue-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">School Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">School Name</label>
              <input type="text" value={settings.school_name || ''} onChange={(e) => setSettings({ ...settings, school_name: e.target.value })} className="input" placeholder="Enter school name" />
            </div>
            <div>
              <label className="label">School Motto</label>
              <input type="text" value={settings.school_motto || ''} onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })} className="input" placeholder="e.g., Excellence in Education" />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea value={settings.school_address || ''} onChange={(e) => setSettings({ ...settings, school_address: e.target.value })} className="input" rows={2} placeholder="Full school address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input type="tel" value={settings.school_phone || ''} onChange={(e) => setSettings({ ...settings, school_phone: e.target.value })} className="input" placeholder="+234..." />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={settings.school_email || ''} onChange={(e) => setSettings({ ...settings, school_email: e.target.value })} className="input" placeholder="school@email.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="text-purple-600 dark:text-purple-400 dark:text-purple-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.primary_color || '#b3922f'} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="w-12 h-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 cursor-pointer" />
                <input type="text" value={settings.primary_color || ''} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="input flex-1" placeholder="#b3922f" />
              </div>
            </div>
            <div>
              <label className="label">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.secondary_color || '#0f172a'} onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })} className="w-12 h-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 cursor-pointer" />
                <input type="text" value={settings.secondary_color || ''} onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })} className="input flex-1" placeholder="#0f172a" />
              </div>
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.accent_color || '#059669'} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} className="w-12 h-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 cursor-pointer" />
                <input type="text" value={settings.accent_color || ''} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} className="input flex-1" placeholder="#059669" />
              </div>
            </div>
          </div>
        </div>

        {/* Academic Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">Academic Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Academic Year</label>
              <input type="text" value={settings.academic_year || ''} onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })} className="input" placeholder="e.g., 2024-2025" />
            </div>
            <div>
              <label className="label">Current Term</label>
              <select value={settings.term || 'First Term'} onChange={(e) => setSettings({ ...settings, term: e.target.value })} className="input">
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Session Start</label>
                <input type="date" value={settings.session_start || ''} onChange={(e) => setSettings({ ...settings, session_start: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Session End</label>
                <input type="date" value={settings.session_end || ''} onChange={(e) => setSettings({ ...settings, session_end: e.target.value })} className="input" />
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Configuration */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="text-amber-600 dark:text-amber-400 dark:text-amber-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">Assessment Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-4">Configure how many Continuous Assessment (CA) columns appear on score entry and report cards, and their max scores.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40 dark:border-blue-900/40">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={settings.assessment_config?.ca1_enabled ?? true}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca1_enabled: e.target.checked } })}
                  className="w-4 h-4" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">CA1</label>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Max Score</label>
                <input type="number" min={0} max={100} value={settings.assessment_config?.ca1_max ?? 40}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca1_max: parseInt(e.target.value) || 0 } })}
                  className="input py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Label</label>
                <input type="text" value={settings.assessment_config?.ca1_label ?? 'Mid-Term Test'}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca1_label: e.target.value } })}
                  className="input py-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/40 dark:border-green-900/40">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={settings.assessment_config?.ca2_enabled ?? false}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca2_enabled: e.target.checked } })}
                  className="w-4 h-4" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">CA2</label>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Max Score</label>
                <input type="number" min={0} max={100} value={settings.assessment_config?.ca2_max ?? 10}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca2_max: parseInt(e.target.value) || 0 } })}
                  className="input py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Label</label>
                <input type="text" value={settings.assessment_config?.ca2_label ?? '2nd CA'}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca2_label: e.target.value } })}
                  className="input py-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-900/40 dark:border-purple-900/40">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={settings.assessment_config?.ca3_enabled ?? false}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca3_enabled: e.target.checked } })}
                  className="w-4 h-4" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">CA3</label>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Max Score</label>
                <input type="number" min={0} max={100} value={settings.assessment_config?.ca3_max ?? 10}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca3_max: parseInt(e.target.value) || 0 } })}
                  className="input py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Label</label>
                <input type="text" value={settings.assessment_config?.ca3_label ?? '3rd CA'}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, ca3_label: e.target.value } })}
                  className="input py-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={settings.assessment_config?.exam_enabled ?? true}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, exam_enabled: e.target.checked } })}
                  className="w-4 h-4" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Exam</label>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Max Score</label>
                <input type="number" min={0} max={100} value={settings.assessment_config?.exam_max ?? 60}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, exam_max: parseInt(e.target.value) || 0 } })}
                  className="input py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Label</label>
                <input type="text" value={settings.assessment_config?.exam_label ?? 'Exam'}
                  onChange={e => setSettings({ ...settings, assessment_config: { ...settings.assessment_config!, exam_label: e.target.value } })}
                  className="input py-1 text-sm" />
              </div>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 p-3 rounded-lg">
              Total: {(settings.assessment_config?.ca1_enabled ? settings.assessment_config?.ca1_max ?? 0 : 0) +
                (settings.assessment_config?.ca2_enabled ? settings.assessment_config?.ca2_max ?? 0 : 0) +
                (settings.assessment_config?.ca3_enabled ? settings.assessment_config?.ca3_max ?? 0 : 0) +
                (settings.assessment_config?.exam_enabled ? settings.assessment_config?.exam_max ?? 0 : 0)} / 100
              {((settings.assessment_config?.ca1_enabled ? settings.assessment_config?.ca1_max ?? 0 : 0) +
                (settings.assessment_config?.ca2_enabled ? settings.assessment_config?.ca2_max ?? 0 : 0) +
                (settings.assessment_config?.ca3_enabled ? settings.assessment_config?.ca3_max ?? 0 : 0) +
                (settings.assessment_config?.exam_enabled ? settings.assessment_config?.exam_max ?? 0 : 0)) !== 100 && (
                <span className="text-red-500 dark:text-red-400 dark:text-red-400 ml-2">(Should total 100)</span>
              )}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Image className="text-pink-600 dark:text-pink-400 dark:text-pink-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">School Logo</h2>
          </div>
          <div className="space-y-4">
            <FileUpload
              bucket={STORAGE_BUCKETS.AVATARS}
              onUpload={(url) => setSettings({ ...settings, school_logo: url })}
              defaultValue={settings.school_logo}
              label="Logo Upload"
              helperText="Recommended: 200x200px PNG or JPG"
            />
            {settings.school_logo && (
              <div className="pt-2">
                <label className="label">Current Logo URL</label>
                <input 
                  type="url" 
                  value={settings.school_logo} 
                  readOnly 
                  className="input bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400" 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
  );
}
