'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  BookOpen,
  Users,
  Settings,
  GraduationCap,
  QrCode,
  BarChart3,
  Megaphone,
  Palette,
  Save,
  Image,
  FileText,
  Shield
} from 'lucide-react';
import type { SchoolSettings } from '@/types';

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Partial<SchoolSettings>>({
    school_name: 'ClearPath Edu Hub',
    school_motto: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    primary_color: '#2563eb',
    secondary_color: '#1e293b',
    accent_color: '#10b981',
    academic_year: new Date().getFullYear().toString(),
    term: 'First Term',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchSettings();
  }, [profile]);

  async function fetchSettings() {
    const { data } = await supabase
      .from('school_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (data) {
      setSettings(data);
    }
  }

  async function handleSave() {
    setLoading(true);
    const { error } = await supabase
      .from('school_settings')
      .upsert({
        id: settings.id || crypto.randomUUID(),
        ...settings,
      });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">School Settings</h1>
          <p className="text-slate-500">Configure your school details and appearance</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">School Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="label">School Name</label>
              <input
                type="text"
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">School Motto</label>
              <input
                type="text"
                value={settings.school_motto}
                onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })}
                className="input"
                placeholder="e.g., Excellence in Education"
              />
            </div>

            <div>
              <label className="label">Address</label>
              <textarea
                value={settings.school_address}
                onChange={(e) => setSettings({ ...settings, school_address: e.target.value })}
                className="input"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={settings.school_phone}
                  onChange={(e) => setSettings({ ...settings, school_phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={settings.school_email}
                  onChange={(e) => setSettings({ ...settings, school_email: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="input flex-1"
                />
              </div>
            </div>

            <div>
              <label className="label">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="input flex-1"
                />
              </div>
            </div>

            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="input flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="text-emerald-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Academic Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="label">Academic Year</label>
              <input
                type="text"
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                className="input"
                placeholder="e.g., 2024-2025"
              />
            </div>

            <div>
              <label className="label">Current Term</label>
              <select
                value={settings.term}
                onChange={(e) => setSettings({ ...settings, term: e.target.value })}
                className="input"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Session Start</label>
                <input
                  type="date"
                  value={settings.session_start}
                  onChange={(e) => setSettings({ ...settings, session_start: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Session End</label>
                <input
                  type="date"
                  value={settings.session_end}
                  onChange={(e) => setSettings({ ...settings, session_end: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Image className="text-pink-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">School Logo</h2>
          </div>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {settings.school_logo ? (
                <div className="relative">
                  <img 
                    src={settings.school_logo} 
                    alt="School Logo" 
                    className="w-32 h-32 mx-auto object-contain"
                  />
                  <button
                    onClick={() => setSettings({ ...settings, school_logo: '' })}
                    className="mt-4 text-red-600 hover:text-red-700"
                  >
                    Remove Logo
                  </button>
                </div>
              ) : (
                <>
                  <Image className="mx-auto text-gray-400 mb-2" size={48} />
                  <p className="text-slate-500 mb-2">Upload your school logo</p>
                  <button className="btn-outline text-sm">
                    Choose File
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Recommended size: 200x200px. PNG or JPG format.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}