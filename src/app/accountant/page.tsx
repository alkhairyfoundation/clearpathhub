'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { DollarSign, FileText, TrendingUp, TrendingDown, Download, ArrowRight, ChevronRight, Calendar, Users, Printer, BarChart3 } from 'lucide-react';

export default function AccountantDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0, pending: 0, totalInvoices: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [transactionsRes, invoicesRes] = await Promise.all([
      supabase.from('transactions').select('*, student:profiles(first_name, last_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('invoices').select('*, student:profiles(first_name, last_name), class:classes(name)').eq('status', 'pending').order('due_date', { ascending: true }).limit(5),
    ]);

    if (transactionsRes.data) {
      setRecentTransactions(transactionsRes.data);
      const [allIncome, allExpense] = await Promise.all([
        supabase.from('transactions').select('amount').eq('type', 'income'),
        supabase.from('transactions').select('amount').eq('type', 'expense'),
      ]);
      const income = allIncome.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      const expense = allExpense.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      setStats(prev => ({ ...prev, income, expense, balance: income - expense }));
    }

    if (invoicesRes.data) {
      setPendingInvoices(invoicesRes.data);
      setStats(prev => ({ ...prev, pending: invoicesRes.data.length }));
    }

    const { count: totalInvoicesCount } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
    setStats(prev => ({ ...prev, totalInvoices: totalInvoicesCount || 0 }));

    setLoading(false);
  }

  async function handleExport() {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (!data?.length) { alert('No transactions to export'); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v || '')).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const formatCurrency = (amount: number) => `NGN${amount.toLocaleString()}`;

  if (loading) {
    return (
      <DashboardLayout title="Accountant Dashboard" subtitle={`Welcome, ${profile?.first_name} ${profile?.last_name}`}>
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Accountant Dashboard" subtitle={`Welcome, ${profile?.first_name} ${profile?.last_name}`}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Accountant Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200">
              <Calendar size={16} />
              <span>{currentDate}</span>
            </div>
            <button onClick={handleExport} className="btn-primary flex items-center gap-2"><Download size={18} />Export</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Income', value: formatCurrency(stats.income), icon: <TrendingUp size={24} />, href: '/accountant/transactions', bg: 'bg-green-100', color: 'text-green-600' },
            { title: 'Total Expenses', value: formatCurrency(stats.expense), icon: <TrendingDown size={24} />, href: '/accountant/transactions', bg: 'bg-red-100', color: 'text-red-600' },
            { title: 'Balance', value: formatCurrency(stats.balance), icon: <DollarSign size={24} />, href: '/accountant/reports', bg: 'bg-blue-100', color: 'text-blue-600' },
            { title: 'Pending Invoices', value: stats.pending.toString(), icon: <FileText size={24} />, href: '/accountant/invoices', bg: 'bg-amber-100', color: 'text-amber-600' },
          ].map((card, i) => (
            <Link key={i} href={card.href} className="card hover:shadow-md cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
              <p className="text-xl font-bold text-slate-900 mt-1">{card.value}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><DollarSign size={18} className="text-slate-400" />Recent Transactions</h2>
              <Link href="/accountant/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-16"><DollarSign className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No transactions yet</p><Link href="/accountant/transactions" className="btn-primary mt-4 inline-block">Add First Transaction</Link></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Description</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Student</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Amount</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900 text-sm">{t.description || t.category || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{t.student ? `${t.student.first_name} ${t.student.last_name}` : '—'}</td>
                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span></td>
                        <td className={`py-3 px-4 font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                        <td className="py-3 px-4 text-sm text-slate-500 hidden md:table-cell">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText size={18} className="text-slate-400" />Pending Invoices</h2>
              <Link href="/accountant/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            {pendingInvoices.length === 0 ? (
              <div className="text-center py-8 text-slate-400"><FileText size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">All invoices paid!</p></div>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.map(inv => (
                  <div key={inv.id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-slate-900">{inv.student ? `${inv.student.first_name} ${inv.student.last_name}` : 'Student'}</p>
                      <span className="font-bold text-amber-600 text-sm">{formatCurrency(inv.amount)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{inv.class?.name || ''} • Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'No date'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
