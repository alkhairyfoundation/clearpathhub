'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, BarChart3, DollarSign, TrendingUp, TrendingDown, Calendar, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AccountantReportsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalPending: 0, totalOverdue: 0, transactionCount: 0, byMethod: {} as Record<string, number> });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateRange({ start, end });
    fetchData(start, end);
  }, [profile]);

  async function fetchData(start: string, end: string) {
    setLoading(true);
    const [transactionsRes, invoicesRes] = await Promise.all([
      supabase.from('transactions').select('*').gte('created_at', start).lte('created_at', end + 'T23:59:59').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, student:profiles(first_name, last_name)').gte('created_at', start).lte('created_at', end + 'T23:59:59').order('due_date', { ascending: true }),
    ]);
    if (transactionsRes.data) {
      setTransactions(transactionsRes.data);
      const byMethod: Record<string, number> = {};
      transactionsRes.data.forEach(t => { const m = t.payment_method || 'cash'; byMethod[m] = (byMethod[m] || 0) + (t.amount || 0); });
      setStats(prev => ({ ...prev, totalIncome: transactionsRes.data.reduce((s: number, t: any) => s + (t.amount || 0), 0), transactionCount: transactionsRes.data.length, byMethod }));
    }
    if (invoicesRes.data) {
      setInvoices(invoicesRes.data);
      const pending = invoicesRes.data.filter(i => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const overdue = invoicesRes.data.filter(i => i.status === 'pending' && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + (i.amount || 0), 0);
      setStats(prev => ({ ...prev, totalPending: pending, totalOverdue: overdue }));
    }
    setLoading(false);
  }

  async function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Financial Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${dateRange.start} to ${dateRange.end}`, pageWidth / 2, 25, { align: 'center' });

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.text('Summary', 14, 45);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Income: ₦${stats.totalIncome.toLocaleString()}`, 14, 55);
    doc.text(`Total Pending: ₦${stats.totalPending.toLocaleString()}`, 14, 62);
    doc.text(`Total Overdue: ₦${stats.totalOverdue.toLocaleString()}`, 14, 69);
    doc.text(`Transactions: ${stats.transactionCount}`, 14, 76);

    (doc as any).autoTable({
      startY: 88,
      head: [['Description', 'Student', 'Amount', 'Date']],
      body: transactions.slice(0, 50).map(t => [t.description || 'Payment', t.student ? `${t.student.first_name} ${t.student.last_name}` : 'N/A', `₦${(t.amount || 0).toLocaleString()}`, new Date(t.created_at).toLocaleDateString()]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
    });

    doc.save(`financial-report-${dateRange.start}.pdf`);
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Financial Reports" subtitle="Comprehensive financial analytics and export">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Financial Reports</h1><p className="text-slate-500">Comprehensive financial analytics and export</p></div>
          </div>
          <button onClick={downloadPDF} className="btn-outline flex items-center gap-2"><Download size={16} />Export PDF</button>
        </div>

        <div className="flex gap-4 items-end">
          <div><label className="label">Start Date</label><input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="input" /></div>
          <div><label className="label">End Date</label><input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="input" /></div>
          <button onClick={() => fetchData(dateRange.start, dateRange.end)} className="btn-primary">Generate Report</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card"><div className="flex items-center gap-3 mb-2"><TrendingUp size={20} className="text-green-600" /><span className="text-sm text-slate-500">Total Income</span></div><p className="text-2xl font-bold text-green-600">&#8358;{stats.totalIncome.toLocaleString()}</p></div>
          <div className="card"><div className="flex items-center gap-3 mb-2"><DollarSign size={20} className="text-yellow-600" /><span className="text-sm text-slate-500">Pending</span></div><p className="text-2xl font-bold text-yellow-600">&#8358;{stats.totalPending.toLocaleString()}</p></div>
          <div className="card"><div className="flex items-center gap-3 mb-2"><TrendingDown size={20} className="text-red-600" /><span className="text-sm text-slate-500">Overdue</span></div><p className="text-2xl font-bold text-red-600">&#8358;{stats.totalOverdue.toLocaleString()}</p></div>
          <div className="card"><div className="flex items-center gap-3 mb-2"><FileText size={20} className="text-blue-600" /><span className="text-sm text-slate-500">Transactions</span></div><p className="text-2xl font-bold text-blue-600">{stats.transactionCount}</p></div>
        </div>

        {Object.keys(stats.byMethod).length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Payment Methods</h2>
            <div className="space-y-3">
              {Object.entries(stats.byMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium capitalize">{method}</span>
                  <span className="font-bold">&#8358;{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400" />Invoices</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No invoices in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Student</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Description</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Amount</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Due Date</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{inv.student?.first_name} {inv.student?.last_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{inv.description || 'School Fees'}</td>
                      <td className="py-3 px-4 font-semibold">&#8358;{inv.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 hidden md:table-cell">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Transactions</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No transactions in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Description</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Amount</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Method</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{tx.description || 'Payment'}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">+&#8358;{tx.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 hidden sm:table-cell capitalize">{tx.payment_method || 'cash'}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
