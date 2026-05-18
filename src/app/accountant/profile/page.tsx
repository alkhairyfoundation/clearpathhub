'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Save, Eye, EyeOff, User, Phone, Check, AlertCircle, Loader2, Shield, Calendar, DollarSign, TrendingUp, TrendingDown, Receipt, FileText, Upload } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import type { Staff, Transaction, Invoice } from '@/types';

export default function AccountantProfilePage() {
  const { profile, setProfile } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', avatar_url: '' });
  const [staffInfo, setStaffInfo] = useState<Staff | null>(null);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, pendingInvoices: 0, totalInvoices: 0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 512, useWebWorker: true });
      const { url, error } = await uploadFile('avatars', compressed, profile?.id || 'unknown');
      if (error) throw error;
      if (url) setFormData(prev => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Avatar upload failed' });
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    setFormData({ first_name: profile.first_name || '', last_name: profile.last_name || '', email: profile.email || '', phone: profile.phone || '', avatar_url: profile.avatar_url || '' });
    fetchStaffInfo();
    fetchStats();
  }, [profile]);

  async function fetchStaffInfo() {
    if (!profile) return;
    const { data } = await supabase.from('staff').select('*, department:departments(name)').eq('profile_id', profile.id).single();
    if (data) setStaffInfo(data);
  }

  async function fetchStats() {
    if (!profile) return;
    const [incomeRes, expenseRes, pendingRes, totalRes] = await Promise.all([
      supabase.from('transactions').select('amount').eq('type', 'income'),
      supabase.from('transactions').select('amount').eq('type', 'expense'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
    ]);
    const income = incomeRes.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
    const expense = expenseRes.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
    setStats({ totalIncome: income, totalExpense: expense, pendingInvoices: pendingRes.count || 0, totalInvoices: totalRes.count || 0 });
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase.from('profiles').update({ first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone || null, avatar_url: formData.avatar_url || null }).eq('id', profile.id);
    if (error) { setMsg({ type: 'error', text: error.message }); } 
    else { setMsg({ type: 'success', text: 'Profile updated!' }); setProfile({ ...profile, ...formData }); }
    setSaving(false);
  }

  async function handlePasswordChange() {
    if (pwData.new !== pwData.confirm) { setPwMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    if (pwData.new.length < 6) { setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    setPwLoading(true); setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pwData.new });
    if (error) { setPwMsg({ type: 'error', text: error.message }); } 
    else { setPwMsg({ type: 'success', text: 'Password updated!' }); setPwData({ current: '', new: '', confirm: '' }); }
    setPwLoading(false);
  }

  if (!profile) return null;

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account and view financial overview">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 mt-1">Manage your account settings and view financial overview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={18} className="text-slate-400" />Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">First Name</label><input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="input" /></div>
                <div><label className="label">Last Name</label><input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="input" /></div>
                <div><label className="label">Email</label><input value={formData.email} disabled className="input bg-slate-50 text-slate-500 cursor-not-allowed" type="email" /><p className="text-xs text-slate-400 mt-1">Email cannot be changed</p></div>
                <div><label className="label">Phone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input" /></div>
                <div>
                  <label className="label">Avatar Photo</label>
                  <div className="flex items-center gap-3">
                    <input type="text" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} className="input flex-1" placeholder="https://... or upload" />
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="btn-outline flex items-center gap-2 whitespace-nowrap">
                      {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingAvatar ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
              {msg && <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{msg.text}</div>}
              <button onClick={handleSave} disabled={saving} className="btn-primary mt-4">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield size={18} className="text-slate-400" />Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div><label className="label">New Password</label><div className="relative"><input type={showNew ? 'text' : 'password'} value={pwData.new} onChange={e => setPwData({...pwData, new: e.target.value})} className="input pr-10" placeholder="Enter new password" /><button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                <div><label className="label">Confirm Password</label><input type={showNew ? 'text' : 'password'} value={pwData.confirm} onChange={e => setPwData({...pwData, confirm: e.target.value})} className="input" placeholder="Confirm new password" /></div>
                {pwMsg && <div className={`p-3 rounded-lg flex items-center gap-2 ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{pwMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{pwMsg.text}</div>}
                <button onClick={handlePasswordChange} disabled={pwLoading} className="btn-primary">{pwLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}{pwLoading ? 'Updating...' : 'Update Password'}</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{profile.first_name[0]?.toUpperCase()}{profile.last_name[0]?.toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sm text-cyan-600 font-medium mt-1">Accountant</p>
              {staffInfo && <p className="text-xs text-slate-400 mt-1">Staff ID: {staffInfo.staff_id}</p>}
              <p className="text-sm text-slate-400 mt-1">{profile.email}</p>
              {profile.phone && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Phone size={14} /><span>{profile.phone}</span>
                </div>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Calendar size={14} />Joined {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Financial Overview</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><TrendingUp size={16} className="text-green-600" /><span className="text-sm text-slate-600">Total Income</span></div><span className="font-bold text-green-600">NGN{stats.totalIncome.toLocaleString()}</span></div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><TrendingDown size={16} className="text-red-600" /><span className="text-sm text-slate-600">Total Expenses</span></div><span className="font-bold text-red-600">NGN{stats.totalExpense.toLocaleString()}</span></div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><Receipt size={16} className="text-amber-600" /><span className="text-sm text-slate-600">Pending Invoices</span></div><span className="font-bold text-amber-600">{stats.pendingInvoices}</span></div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><FileText size={16} className="text-blue-600" /><span className="text-sm text-slate-600">Total Invoices</span></div><span className="font-bold text-blue-600">{stats.totalInvoices}</span></div>
              </div>
            </div>

            {staffInfo && (
              <div className="card">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Staff Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Staff ID</span><span className="font-medium">{staffInfo.staff_id}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-medium">{staffInfo.department?.name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Designation</span><span className="font-medium">{staffInfo.designation || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Employment Date</span><span className="font-medium">{staffInfo.date_of_employment ? new Date(staffInfo.date_of_employment).toLocaleDateString() : 'N/A'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
