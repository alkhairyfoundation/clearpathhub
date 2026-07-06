'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Save, Bell, DollarSign, Eye, EyeOff, Shield, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function AccountantSettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settings, setSettings] = useState({
    default_payment_terms: '30',
    currency: 'NGN',
    notify_on_payment_upload: true,
    notify_on_invoice_overdue: true,
    notify_weekly_report: false,
  });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      localStorage.setItem('accountant_settings', JSON.stringify(settings));
      setMsg({ type: 'success', text: 'Settings saved!' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save settings' });
    }
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

  return (
    <DashboardLayout title="Settings" subtitle="Configure your accountant preferences">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Accountant Settings</h1><p className="text-slate-500 mt-1">Configure your preferences and defaults</p></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><DollarSign size={18} className="text-slate-400" />Financial Defaults</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Default Payment Terms (days)</label>
                <input type="number" value={settings.default_payment_terms} onChange={(e) => setSettings({ ...settings, default_payment_terms: e.target.value })} className="input" />
                <p className="text-xs text-slate-400 mt-1">Invoice due date will default to this many days from creation</p>
              </div>
              <div>
                <label className="label">Currency</label>
                <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="input">
                  <option value="NGN">₦ NGN (Nigerian Naira)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell size={18} className="text-slate-400" />Notifications</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.notify_on_payment_upload} onChange={(e) => setSettings({ ...settings, notify_on_payment_upload: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <div><p className="text-sm font-medium text-slate-700">Payment Upload Alerts</p><p className="text-xs text-slate-400">Notify when parents upload payment receipts</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.notify_on_invoice_overdue} onChange={(e) => setSettings({ ...settings, notify_on_invoice_overdue: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <div><p className="text-sm font-medium text-slate-700">Overdue Invoice Alerts</p><p className="text-xs text-slate-400">Alert when invoices become overdue</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.notify_weekly_report} onChange={(e) => setSettings({ ...settings, notify_weekly_report: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                <div><p className="text-sm font-medium text-slate-700">Weekly Summary Report</p><p className="text-xs text-slate-400">Receive weekly financial summary via email</p></div>
              </label>
            </div>
          </div>
        </div>

        {msg && <div className={`p-3 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{msg.text}</div>}
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Saving...' : 'Save Settings'}</button>

        <div className="card max-w-lg">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield size={18} className="text-slate-400" />Change Password</h2>
          <div className="space-y-4">
            <div><label className="label">New Password</label><div className="relative"><input type={showNew ? 'text' : 'password'} value={pwData.new} onChange={e => setPwData({...pwData, new: e.target.value})} className="input pr-10" placeholder="Enter new password" /><button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><label className="label">Confirm Password</label><input type={showNew ? 'text' : 'password'} value={pwData.confirm} onChange={e => setPwData({...pwData, confirm: e.target.value})} className="input" placeholder="Confirm new password" /></div>
            {pwMsg && <div className={`p-3 rounded-lg flex items-center gap-2 ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{pwMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{pwMsg.text}</div>}
            <button onClick={handlePasswordChange} disabled={pwLoading} className="btn-primary">{pwLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}{pwLoading ? 'Updating...' : 'Update Password'}</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
