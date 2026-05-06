'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { DollarSign, FileText, TrendingUp, TrendingDown, Download } from 'lucide-react';

export default function AccountantDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0, pending: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*, student:profiles(*)').order('created_at', { ascending: false }).limit(10);
    if (data) {
      setRecentTransactions(data);
      const income = data.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
      const expense = data.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
      setStats({ income, expense, balance: income - expense, pending: 0 });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accountant Dashboard</h1>
          <p className="text-slate-500">Financial overview</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download size={18} />Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<DollarSign className="text-green-600" size={24} />} label="Total Income" value={`$${stats.income.toLocaleString()}`} trend={<TrendingUp className="text-green-600" size={20} />} color="green" />
        <StatCard icon={<DollarSign className="text-red-600" size={24} />} label="Total Expenses" value={`$${stats.expense.toLocaleString()}`} trend={<TrendingDown className="text-red-600" size={20} />} color="red" />
        <StatCard icon={<DollarSign className="text-blue-600" size={24} />} label="Balance" value={`$${stats.balance.toLocaleString()}`} color="blue" />
        <StatCard icon={<FileText className="text-orange-600" size={24} />} label="Pending Invoices" value={stats.pending} color="orange" />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Transactions</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t: any) => (
                <tr key={t.id} className="border-b">
                  <td className="py-3 px-4">{t.description || t.category}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">${t.amount}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string | number; trend?: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend}
      </div>
      <h3 className="text-slate-600 text-sm">{label}</h3>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
    </div>
  );
}