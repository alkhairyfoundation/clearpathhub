'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, DollarSign, FileText, Printer, Check, Clock } from 'lucide-react';

export default function AccountantInvoicesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({ student_id: '', amount: 0, description: '', due_date: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [invRes, stuRes] = await Promise.all([
      supabase.from('invoices').select('*, student:profiles(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'student').order('first_name'),
    ]);
    if (invRes.data) setInvoices(invRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    setLoading(false);
  }

  async function handleSave() {
    const invoiceNumber = `INV-${Date.now()}`;
    await supabase.from('invoices').insert({ ...formData, invoice_number: invoiceNumber, amount: parseFloat(formData.amount.toString()), student_id: formData.student_id || null });
    setShowModal(false); setFormData({ student_id: '', amount: 0, description: '', due_date: '' }); fetchData();
  }

  async function handlePay(id: string) {
    const receiptNumber = `RCP-${Date.now()}`;
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
      await supabase.from('receipts').insert({ invoice_id: id, receipt_number: receiptNumber, amount_paid: invoice.amount });
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
      fetchData();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Invoices</h1><p className="text-slate-500">Create and manage invoices</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Create Invoice</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : invoices.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No invoices yet</p></div> : (
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Invoice #</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Student</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Amount</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Due Date</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th><th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th></tr></thead>
            <tbody>{invoices.map(inv => (<tr key={inv.id} className="border-b"><td className="py-3 px-4 font-medium text-slate-800">{inv.invoice_number}</td><td className="py-3 px-4">{inv.student ? `${inv.student.first_name} ${inv.student.last_name}` : '-'}</td><td className="py-3 px-4">${inv.amount}</td><td className="py-3 px-4 text-slate-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td><td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{inv.status}</span></td><td className="py-3 px-4 text-right">{inv.status !== 'paid' && <button onClick={() => handlePay(inv.id)} className="btn-primary text-sm py-1">Mark Paid</button>}</td></tr>))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Create Invoice</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Student</label><select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input"><option value="">Select Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div><label className="label">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="input" /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="e.g., Tuition Fee, Hostel Fee" /></div>
              <div><label className="label">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary">Create Invoice</button></div>
          </div>
        </div>
      )}
    </div>
  );
}