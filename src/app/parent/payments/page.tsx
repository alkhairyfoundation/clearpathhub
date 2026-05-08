'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function ParentPaymentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, totalOverdue: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const childrenRes = await supabase.from('students').select('*, profile:profiles(first_name, last_name), class:classes(name)').eq('parent_id', profile?.id);
    if (childrenRes.data?.length) {
      setChildren(childrenRes.data);
      const childIds = childrenRes.data.map(c => c.profile_id);
      const [invoicesRes, transactionsRes] = await Promise.all([
        supabase.from('invoices').select('*, student:profiles(first_name, last_name)').in('student_id', childIds).order('due_date', { ascending: true }),
        supabase.from('transactions').select('*, student:profiles(first_name, last_name)').in('student_id', childIds).order('created_at', { ascending: false }).limit(20),
      ]);
      if (invoicesRes.data) {
        setInvoices(invoicesRes.data);
        const paid = invoicesRes.data.filter(i => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const pending = invoicesRes.data.filter(i => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const overdue = invoicesRes.data.filter(i => i.status === 'pending' && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        setStats({ totalPaid: paid, totalPending: pending, totalOverdue: overdue });
      }
      if (transactionsRes.data) setTransactions(transactionsRes.data);
    }
    setLoading(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'overdue': return <AlertCircle size={16} className="text-red-600" />;
      default: return <DollarSign size={16} className="text-slate-600" />;
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Payments & Fees" subtitle="Track school fees and payment history">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">Payments & Fees</h1>
            <p className="text-slate-500">Track school fees and payment history</p>
          </div>
        </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><DollarSign className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card"><div className="flex items-center gap-3 mb-2"><CheckCircle size={20} className="text-green-600" /><span className="text-sm text-slate-500">Total Paid</span></div><p className="text-2xl font-bold text-green-600">&#8358;{stats.totalPaid.toLocaleString()}</p></div>
            <div className="card"><div className="flex items-center gap-3 mb-2"><Clock size={20} className="text-yellow-600" /><span className="text-sm text-slate-500">Pending</span></div><p className="text-2xl font-bold text-yellow-600">&#8358;{stats.totalPending.toLocaleString()}</p></div>
            <div className="card"><div className="flex items-center gap-3 mb-2"><AlertCircle size={20} className="text-red-600" /><span className="text-sm text-slate-500">Overdue</span></div><p className="text-2xl font-bold text-red-600">&#8358;{stats.totalOverdue.toLocaleString()}</p></div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={18} className="text-slate-400" />Invoices</h2>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No invoices found</div>
            ) : (
              <div className="space-y-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(inv.status || 'pending')}
                      <div>
                        <p className="font-medium text-slate-800">{inv.description || 'School Fees'}</p>
                        <p className="text-xs text-slate-500">{inv.student?.first_name} {inv.student?.last_name} &bull; Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">&#8358;{inv.amount?.toLocaleString() || '0'}</p>
                      <span className={`text-xs capitalize ${inv.status === 'paid' ? 'text-green-600' : inv.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{inv.status || 'pending'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Payment History</h2>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No transactions yet</div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3"><CheckCircle size={16} className="text-green-600" /><div><p className="font-medium text-slate-800 text-sm">{tx.description || 'Payment'}</p><p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</p></div></div>
                    <p className="font-bold text-green-600">+&#8358;{tx.amount?.toLocaleString() || '0'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </DashboardLayout>
  );
}
