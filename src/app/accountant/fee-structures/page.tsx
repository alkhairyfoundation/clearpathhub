'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, X, Send, Eye, EyeOff, DollarSign, BookOpen, Calendar, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';

export default function FeeStructuresPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    academic_session_id: '',
    term_id: '',
    class_id: '',
    title: '',
    due_date: '',
    items: [] as { item_name: string; amount: number; description: string }[],
  });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [feeRes, classRes, sessionRes, termRes] = await Promise.all([
      supabase.from('fee_structures').select('*, class:classes(name), term:terms(name), academic_session:academic_sessions(name)').order('created_at', { ascending: false }),
      supabase.from('classes').select('*').order('name'),
      supabase.from('academic_sessions').select('*').order('name', { ascending: false }),
      supabase.from('terms').select('*').order('name'),
    ]);
    if (feeRes.data) setFeeStructures(feeRes.data);
    if (classRes.data) setClasses(classRes.data);
    if (sessionRes.data) setSessions(sessionRes.data);
    if (termRes.data) setTerms(termRes.data);
    setLoading(false);
  }

  function addItem() {
    setFormData({ ...formData, items: [...formData.items, { item_name: '', amount: 0, description: '' }] });
  }

  function removeItem(index: number) {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  }

  function updateItem(index: number, field: string, value: any) {
    const items = [...formData.items];
    (items[index] as any)[field] = value;
    setFormData({ ...formData, items });
  }

  const totalAmount = formData.items.reduce((s, item) => s + (item.amount || 0), 0);

  async function handleSave() {
    if (!formData.title || !formData.class_id || !formData.due_date || formData.items.length === 0) {
      alert('Please fill all required fields');
      return;
    }
    const { data: newFee, error } = await supabase.from('fee_structures').insert({
      academic_session_id: formData.academic_session_id || null,
      term_id: formData.term_id || null,
      class_id: formData.class_id,
      title: formData.title,
      total_amount: totalAmount,
      due_date: formData.due_date,
      status: 'draft',
      created_by: profile?.id,
    }).select().single();

    if (error) { alert('Error: ' + error.message); return; }

    if (newFee && formData.items.length > 0) {
      const { error: itemError } = await supabase.from('fee_structure_items').insert(
        formData.items.map(item => ({
          fee_structure_id: newFee.id,
          item_name: item.item_name,
          amount: item.amount,
          description: item.description || null,
        }))
      );
      if (itemError) { alert('Error adding items: ' + itemError.message); return; }
    }

    setShowModal(false);
    setFormData({ academic_session_id: '', term_id: '', class_id: '', title: '', due_date: '', items: [] });
    fetchData();
  }

  async function togglePublish(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
    const { error } = await supabase.from('fee_structures').update({ status: newStatus }).eq('id', id);
    if (error) { alert('Error updating status'); return; }
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this fee structure? This cannot be undone.')) {
      await supabase.from('fee_structures').delete().eq('id', id);
      fetchData();
    }
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  if (loading) {
    return (
      <DashboardLayout title="Fee Structures" subtitle="Create and manage term fees">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Fee Structures" subtitle="Create and publish term fees for each class">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Fee Structures</h1><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Create and manage term fee structures</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />New Fee Structure</button>
        </div>

        {feeStructures.length === 0 ? (
          <div className="card text-center py-16">
            <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">No fee structures created yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">Create a fee structure to publish term fees that parents can view and pay against</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Create Your First Fee Structure</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {feeStructures.map((fs: any) => (
              <div key={fs.id} className={`card border-2 ${fs.status === 'published' ? 'border-green-200 dark:border-green-900/40 dark:border-green-900/40' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white dark:text-white text-lg">{fs.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{fs.class?.name} — {fs.term?.name || ''} {fs.academic_session?.name || ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${fs.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400'}`}>{fs.status}</span>
                </div>

                <p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white mb-3">{formatCurrency(fs.total_amount)}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mb-3">Due: {new Date(fs.due_date).toLocaleDateString()}</p>

                <div className="flex items-center gap-2">
                  <button onClick={() => togglePublish(fs.id, fs.status)} className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg ${fs.status === 'published' ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300 hover:bg-amber-200' : 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300 hover:bg-green-200'}`}>
                    {fs.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                    {fs.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(fs.id)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 text-red-600 dark:text-red-400 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30">
                    <Trash2 size={14} />Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Create Fee Structure</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Academic Session</label>
                    <select value={formData.academic_session_id} onChange={(e) => setFormData({ ...formData, academic_session_id: e.target.value })} className="input">
                      <option value="">Select Session</option>
                      {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Term</label>
                    <select value={formData.term_id} onChange={(e) => setFormData({ ...formData, term_id: e.target.value })} className="input">
                      <option value="">Select Term</option>
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Class</label>
                  <select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Fee Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., 2025/2026 First Term Fees" />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Fee Items</h3>
                    <button onClick={addItem} className="btn-outline text-sm flex items-center gap-1"><Plus size={14} />Add Item</button>
                  </div>

                  {formData.items.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-4">No items added yet. Click "Add Item" to start building the fee breakdown.</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                          <div className="flex-1">
                            <input type="text" value={item.item_name} onChange={(e) => updateItem(index, 'item_name', e.target.value)} className="input text-sm" placeholder="e.g., Tuition" />
                          </div>
                          <div className="w-32">
                            <input type="number" value={item.amount} onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} className="input text-sm" placeholder="Amount" />
                          </div>
                          <button onClick={() => removeItem(index)} className="p-2 hover:bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 rounded-lg mt-0.5"><X size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.items.length > 0 && (
                    <div className="flex justify-between items-center mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 rounded-lg">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Total Amount</span>
                      <span className="font-bold text-lg text-blue-700 dark:text-blue-300 dark:text-blue-300">{formatCurrency(totalAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={16} />Create Fee Structure</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Save(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
