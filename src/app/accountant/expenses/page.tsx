'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, TrendingDown, DollarSign, X, Trash2, Filter, Calendar } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Utilities',
  'Office Supplies',
  'Maintenance',
  'Transportation',
  'Food & Catering',
  'Sports & Events',
  'Medical',
  'Security',
  'Infrastructure',
  'Books & Library',
  'Laboratory',
  'IT & Software',
  'Marketing',
  'Legal & Compliance',
  'Miscellaneous',
];

export default function AccountantExpensesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formData, setFormData] = useState({ category: '', amount: 0, description: '', payment_method: 'cash', reference_number: '' });
  const [stats, setStats] = useState({ totalExpenses: 0, thisMonth: 0, categoryBreakdown: {} as Record<string, number> });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*').eq('type', 'expense').order('created_at', { ascending: false });
    if (data) {
      setExpenses(data);
      const total = data.reduce((s: number, t: any) => s + t.amount, 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthExpenses = data.filter((t: any) => t.created_at >= monthStart).reduce((s: number, t: any) => s + t.amount, 0);
      const breakdown: Record<string, number> = {};
      data.forEach((t: any) => { breakdown[t.category] = (breakdown[t.category] || 0) + t.amount; });
      setStats({ totalExpenses: total, thisMonth: monthExpenses, categoryBreakdown: breakdown });
    }
    setLoading(false);
  }

  async function handleSave() {
    await supabase.from('transactions').insert({
      type: 'expense',
      category: formData.category,
      amount: parseFloat(formData.amount.toString()),
      description: formData.description,
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || null,
      recorded_by: profile?.id,
    });
    setShowModal(false);
    setFormData({ category: '', amount: 0, description: '', payment_method: 'cash', reference_number: '' });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this expense?')) {
      await supabase.from('transactions').delete().eq('id', id);
      fetchData();
    }
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const filtered = expenses.filter((t: any) => {
    const matchesSearch = !searchQuery || 
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <DashboardLayout title="Expenses" subtitle="Track school expenses">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Expenses" subtitle="Track and manage school expenses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-slate-800">Expenses</h1><p className="text-slate-500">Track and manage school expenses</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Expense</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Expenses</span><TrendingDown className="text-red-600" size={18} /></div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">This Month</span><Calendar className="text-amber-600" size={18} /></div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.thisMonth)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Categories</span><Filter className="text-blue-600" size={18} /></div>
            <p className="text-2xl font-bold text-blue-600">{Object.keys(stats.categoryBreakdown).length}</p>
          </div>
        </div>

        {Object.keys(stats.categoryBreakdown).length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Expense by Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(stats.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 9)
                .map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{cat}</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(amount)}</span>
                  </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-auto">
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12"><DollarSign className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No expenses recorded</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Method</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{t.category}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{t.description || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-red-600">{formatCurrency(t.amount)}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 capitalize">{t.payment_method || 'cash'}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Add Expense</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input">
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div><label className="label">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="input" placeholder="0.00" /></div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="What was this expense for?" /></div>
                <div>
                  <label className="label">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="input">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS</option>
                  </select>
                </div>
                <div><label className="label">Reference (optional)</label><input type="text" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} className="input" placeholder="Receipt or invoice ref" /></div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button onClick={handleSave} className="btn-primary" disabled={!formData.category || !formData.amount}>Save Expense</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
