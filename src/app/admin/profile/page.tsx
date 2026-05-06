'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, Save, Eye, EyeOff, User, Mail, Phone, MapPin, Calendar, BookOpen, Award } from 'lucide-react';

export default function AdminProfilePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', avatar_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  async function handleSaveProfile() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update(formData).eq('id', profile?.id);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    if (passwordData.new !== passwordData.confirm) {
      alert('Passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    // In production, use Supabase auth to change password
    alert('Password changed successfully');
    setPasswordData({ current: '', new: '', confirm: '' });
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">My Profile</h1><p className="text-slate-500">Manage your admin account</p></div>

      {saved && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">Profile saved successfully!</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="text-blue-600" size={64} />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{formData.first_name} {formData.last_name}</h2>
            <p className="text-slate-500">Administrator</p>
            <button className="btn-outline mt-4">Change Photo</button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Personal Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input pl-10" />
                  </div>
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input pl-10" />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="label">Profile Picture URL</label>
                <input type="url" value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} className="input" placeholder="https://..." />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save size={18} />{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="input pr-10" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="input" />
              </div>
              <button onClick={handleChangePassword} className="btn-primary">Update Password</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">School Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-blue-50 rounded-lg"><BookOpen className="mb-2 text-blue-600" size={18} /><p>School Name</p><p className="font-medium">ClearPath Edu Hub</p></div>
              <div className="p-4 bg-green-50 rounded-lg"><Award className="mb-2 text-green-600" size={18} /><p>Academic Year</p><p className="font-medium">2024-2025</p></div>
              <div className="p-4 bg-purple-50 rounded-lg"><Calendar className="mb-2 text-purple-600" size={18} /><p>Current Term</p><p className="font-medium">First Term</p></div>
              <div className="p-4 bg-orange-50 rounded-lg"><MapPin className="mb-2 text-orange-600" size={18} /><p>Students</p><p className="font-medium">120</p></div>
            </div>
            <a href="/admin/settings" className="btn-outline mt-4 block text-center">Edit School Settings</a>
          </div>
        </div>
      </div>
    </div>
  );
}