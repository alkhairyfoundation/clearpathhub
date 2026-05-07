'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, TrendingUp, TrendingDown, DollarSign, X, Edit, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Transaction, Profile } from '@/types';

export default function AccountantTransactionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<(Transaction & { student?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [formData, setFormData] = useState({ type: 'income' as const, category: '', amount: 0, description: '', student_id: '', payment_method: '' });
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*, student:profiles(*)').order('created_at', { ascending: false }).limit(100);
    if (data) {
      setTransactions(data);
      const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setStats({ income, expense, balance: income - expense });
    }
    setLoading(false);
  }

  async function handleSave() {
    await supabase.from('transactions').insert({ ...formData, recorded_by: profile?.id, amount: parseFloat(formData.amount.toString()) });
    setShowModal(false); setFormData({ type: 'income', category: '', amount: 0, description: '', student_id: '', payment_method: '' }); fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this transaction?')) { await supabase.from('transactions').delete().eq('id', id); fetchData(); }
  }

  const filtered = transactions.filter(t => 
    (filterType === 'all' || t.type === filterType) &&
    (`${t.category} ${t.description}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout title="Transactions" subtitle="Manage all income and expenses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-slate-800">Transactions</h1><p className="text-slate-500">Manage all income and expenses</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Transaction</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Income</span><TrendingUp className="text-green-600" size={18} /></div><p className="text-2xl font-bold text-green-600">${stats.income.toLocaleString()}</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Expenses</span><TrendingDown className="text-red-600" size={18} /></div><p className="text-2xl font-bold text-red-600">${stats.expense.toLocaleString()}</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Balance</span><DollarSign className="text-blue-600" size={18} /></div><p className="text-2xl font-bold text-blue-600">${stats.balance.toLocaleString()}</p></div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            <div className="flex gap-2">{(['all', 'income', 'expense'] as const).map(type => (<button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>))}</div>
          </div>

          {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Category</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Description</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Type</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Amount</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th><th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th></tr></thead>
              <tbody>{filtered.map(t => (<tr key={t.id} className="border-b"><td className="py-3 px-4 font-medium text-slate-800">{t.category}</td><td className="py-3 px-4 text-slate-600">{t.description || '-'}</td><td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span></td><td className="py-3 px-4">${t.amount}</td><td className="py-3 px-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button></div></td></tr>))}</tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Add Transaction</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="label">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="input"><option value="income">Income</option><option value="expense">Expense</option></select></div>
                <div><label className="label">Category</label><input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input" placeholder="e.g., Tuition, Salary, Supplies" /></div>
                <div><label className="label">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="input" /></div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} /></div>
                <div><label className="label">Payment Method</label><input type="text" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="input" placeholder="e.g., Cash, Bank Transfer" /></div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary">Save Transaction</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}