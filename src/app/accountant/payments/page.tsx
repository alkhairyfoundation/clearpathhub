'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { DollarSign, Search, CheckCircle, Clock, AlertCircle, X, Plus, Filter, Download, ChevronDown, TrendingUp, Users } from 'lucide-react';

export default function AccountantPaymentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [paymentUploads, setPaymentUploads] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0, totalInvoices: 0, studentsWithBalance: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({ student_id: '', amount: 0, payment_method: 'cash', description: '', reference_number: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [invRes, recRes, uploadRes, stuRes] = await Promise.all([
      supabase.from('invoices').select('*, student:profiles(first_name, last_name), class:classes(name)').order('created_at', { ascending: false }),
      supabase.from('receipts').select('*, invoice:invoices(invoice_number, student:profiles(first_name, last_name))').order('created_at', { ascending: false }).limit(50),
      supabase.from('payment_uploads').select('*, student:profiles(first_name, last_name), parent:profiles!payment_uploads_parent_id_fkey(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, student:students!profile_id(class_id, classes:class_id(name))').eq('role', 'student').order('first_name'),
    ]);
    if (invRes.data) {
      setInvoices(invRes.data);
      const paid = invRes.data.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const pending = invRes.data.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const overdue = invRes.data.filter((i: any) => i.status === 'pending' && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const total = invRes.data.reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
      const uniqueStudents = new Set(invRes.data.filter((i: any) => i.status !== 'paid').map((i: any) => i.student_id));
      setStats({ totalCollected: paid, totalPending: pending, totalOverdue: overdue, collectionRate: rate, totalInvoices: invRes.data.length, studentsWithBalance: uniqueStudents.size });
    }
    if (recRes.data) setReceipts(recRes.data);
    if (uploadRes.data) setPaymentUploads(uploadRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    setLoading(false);
  }

  async function handleCreateReceipt() {
    const receiptNumber = `RCP-${Date.now()}`;
    await supabase.from('receipts').insert({
      receipt_number: receiptNumber,
      amount_paid: parseFloat(formData.amount.toString()),
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || null,
      notes: formData.description,
      uploaded_by: profile?.id,
      verified_status: 'verified',
      payment_type: 'full',
      balance_remaining: 0,
    });
    await supabase.from('transactions').insert({
      student_id: formData.student_id || null,
      type: 'income',
      category: 'School Fees',
      amount: parseFloat(formData.amount.toString()),
      description: formData.description || 'Manual payment receipt',
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || null,
      recorded_by: profile?.id,
    });
    setShowReceiptModal(false);
    setFormData({ student_id: '', amount: 0, payment_method: 'cash', description: '', reference_number: '' });
    fetchData();
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const filteredInvoices = invoices.filter((inv: any) => {
    const matchesSearch = !searchQuery || 
      inv.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingUploads = paymentUploads.filter((u: any) => u.status === 'pending');

  if (loading) {
    return (
      <DashboardLayout title="Payments" subtitle="Payment management dashboard">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payments" subtitle="Track and manage all payments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Payments</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Track and manage all payments</p>
          </div>
          <button onClick={() => setShowReceiptModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Record Payment</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card"><div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-green-600 dark:text-green-400 dark:text-green-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total Collected</span></div><p className="text-lg font-bold text-green-600 dark:text-green-400 dark:text-green-400">{formatCurrency(stats.totalCollected)}</p></div>
          <div className="card"><div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-yellow-600 dark:text-yellow-400 dark:text-yellow-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Pending</span></div><p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 dark:text-yellow-400">{formatCurrency(stats.totalPending)}</p></div>
          <div className="card"><div className="flex items-center gap-2 mb-2"><AlertCircle size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Overdue</span></div><p className="text-lg font-bold text-red-600 dark:text-red-400 dark:text-red-400">{formatCurrency(stats.totalOverdue)}</p></div>
          <div className="card"><div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Collection Rate</span></div><p className="text-lg font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{stats.collectionRate}%</p></div>
          <div className="card"><div className="flex items-center gap-2 mb-2"><Users size={16} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Students w/ Balance</span></div><p className="text-lg font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">{stats.studentsWithBalance}</p></div>
        </div>

        {pendingUploads.length > 0 && (
          <div className="card border-2 border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2"><AlertCircle size={18} />Pending Receipt Approvals ({pendingUploads.length})</h2>
              <a href="/accountant/payment-uploads" className="text-sm text-amber-700 dark:text-amber-300 dark:text-amber-300 hover:text-amber-800 font-medium underline">Review All</a>
            </div>
            <div className="space-y-2">
              {pendingUploads.slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 rounded-full flex items-center justify-center"><AlertCircle size={14} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white">{u.student?.first_name} {u.student?.last_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">₦{u.amount?.toLocaleString()} — {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <a href="/accountant/payment-uploads" className="text-xs text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 dark:text-blue-300 font-medium">Review</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search by student or invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            <div className="flex gap-2">
              {['all', 'paid', 'pending', 'overdue'].map(status => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 text-gray-600 dark:text-slate-400 dark:text-slate-400'}`}>{status}</button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12"><DollarSign className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No payments found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv: any) => {
                    const relatedReceipts = receipts.filter((r: any) => r.invoice_id === inv.id);
                    const totalPaid = relatedReceipts.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);
                    const balance = Math.max(0, (inv.amount || 0) - totalPaid);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                        <td className="py-3 px-4 font-mono text-sm font-medium">{inv.invoice_number}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white dark:text-white">{inv.student?.first_name} {inv.student?.last_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{inv.description || 'School Fees'}</td>
                        <td className="py-3 px-4 font-semibold">{formatCurrency(inv.amount)}</td>
                        <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            inv.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' : 
                            inv.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400' : 
                            'bg-yellow-100 text-yellow-700'
                          }`}>{inv.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          {balance > 0 ? (
                            <span className="text-sm font-medium text-red-600 dark:text-red-400 dark:text-red-400">{formatCurrency(balance)}</span>
                          ) : (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 dark:text-green-400">Fully Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showReceiptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Record Payment</h2>
                <button onClick={() => setShowReceiptModal(false)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Student</label>
                  <select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input">
                    <option value="">Select Student (optional)</option>
                    {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="input">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="label">Reference Number</label>
                  <input type="text" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} className="input" placeholder="e.g., Teller or Transaction ID" />
                </div>
                <div>
                  <label className="label">Description/Notes</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="Payment notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setShowReceiptModal(false)} className="btn-outline">Cancel</button>
                <button onClick={handleCreateReceipt} className="btn-primary" disabled={!formData.amount || formData.amount <= 0}>Record Payment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
