'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile, STORAGE_BUCKETS } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, CheckCircle, Clock, AlertCircle, CreditCard, Upload, X, Eye, Loader2, FileText, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function ParentPaymentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [paymentUploads, setPaymentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, totalOverdue: 0 });
  const [error, setError] = useState('');
  const [uploadModal, setUploadModal] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile_, setUploadFile_] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const childrenRes = await supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(id, name)').eq('parent_id', profile?.id);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      if (childrenRes.data?.length) {
        setChildren(childrenRes.data);
        const childIds = childrenRes.data.map((c: any) => c.profile_id);
        const classIds = childrenRes.data.map((c: any) => c.class_id).filter(Boolean);

        const [invoicesRes, transactionsRes, feeRes, uploadRes] = await Promise.all([
          supabase.from('invoices').select('*, student:profiles!student_id(first_name, last_name)').in('student_id', childIds).order('due_date', { ascending: true }),
          supabase.from('transactions').select('*, student:profiles!student_id(first_name, last_name)').in('student_id', childIds).order('created_at', { ascending: false }).limit(20),
          classIds.length > 0
            ? supabase.from('fee_structures').select('*, class:classes(name), term:terms(name), academic_session:academic_sessions(name), items:fee_structure_items(*)').in('class_id', classIds).eq('status', 'published').order('created_at', { ascending: false })
            : { data: [] },
          supabase.from('payment_uploads').select('*, student:profiles!payment_uploads_student_id_fkey(first_name, last_name)').eq('parent_id', profile?.id).order('created_at', { ascending: false }),
        ]);

        if (invoicesRes.data) {
          setInvoices(invoicesRes.data);
          const paid = invoicesRes.data.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
          const pending = invoicesRes.data.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount || 0), 0);
          const overdue = invoicesRes.data.filter((i: any) => i.status === 'pending' && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + (i.amount || 0), 0);
          setStats({ totalPaid: paid, totalPending: pending, totalOverdue: overdue });
        }
        if (transactionsRes.data) setTransactions(transactionsRes.data);
        if (feeRes.data) setFeeStructures(feeRes.data);
        if (uploadRes.data) setPaymentUploads(uploadRes.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleUploadReceipt() {
    if (!uploadModal || !uploadFile_) return;
    setUploading(true);
    try {
      const { url, error: uploadError } = await uploadFile(STORAGE_BUCKETS.RECEIPTS, uploadFile_, `${profile?.id}/${Date.now()}`);
      if (uploadError || !url) throw new Error(uploadError?.message || 'Upload failed');

      const storagePath = `${profile?.id}/${Date.now()}-${uploadFile_.name}`;

      await supabase.from('payment_uploads').insert({
        invoice_id: uploadModal.id,
        student_id: uploadModal.student_id,
        parent_id: profile?.id,
        amount: uploadModal.amount,
        receipt_url: url,
        storage_path: storagePath,
        notes: uploadNotes,
        status: 'pending',
      });

      setUploadModal(null);
      setUploadFile_(null);
      setUploadNotes('');
      fetchData();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'overdue': return <AlertCircle size={16} className="text-red-600" />;
      default: return <DollarSign size={16} className="text-slate-600" />;
    }
  }

  function getUploadStatusIcon(status: string) {
    switch (status) {
      case 'verified': return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected': return <AlertCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-amber-600" />;
    }
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const uploadsForInvoice = (invoiceId: string) => paymentUploads.filter((u: any) => u.invoice_id === invoiceId);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Payments & Fees" subtitle="Track school fees and payment history">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1"><h1 className="text-2xl font-bold text-slate-800">Payments & Fees</h1><p className="text-slate-500">Track school fees and payment history</p></div>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center"><DollarSign className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card"><div className="flex items-center gap-3 mb-2"><CheckCircle size={20} className="text-green-600" /><span className="text-sm text-slate-500">Total Paid</span></div><p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p></div>
              <div className="card"><div className="flex items-center gap-3 mb-2"><Clock size={20} className="text-yellow-600" /><span className="text-sm text-slate-500">Pending</span></div><p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending)}</p></div>
              <div className="card"><div className="flex items-center gap-3 mb-2"><AlertCircle size={20} className="text-red-600" /><span className="text-sm text-slate-500">Overdue</span></div><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)}</p></div>
            </div>

            {feeStructures.length > 0 && (
              <div className="card border-2 border-blue-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BookOpen size={18} className="text-blue-500" />Upcoming Term Fees</h2>
                <div className="space-y-4">
                  {feeStructures.map((fs: any) => {
                    const child = children.find((c: any) => c.class_id === fs.class_id);
                    return (
                      <div key={fs.id} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{fs.title}</p>
                            <p className="text-sm text-slate-500">
                              {fs.class?.name} &bull; {fs.term?.name || ''} {fs.academic_session?.name || ''}
                              {child && <> &bull; {child.profile?.first_name} {child.profile?.last_name}</>}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-blue-700">{formatCurrency(fs.total_amount)}</span>
                        </div>
                        {fs.items && fs.items.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {fs.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm pl-4">
                                <span className="text-slate-600">{item.item_name}</span>
                                <span className="font-medium">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Due: {new Date(fs.due_date).toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={18} className="text-slate-400" />Invoices</h2>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No invoices found</div>
              ) : (
                <div className="space-y-3">
                  {invoices.map(inv => {
                    const uploads = uploadsForInvoice(inv.id);
                    const hasPendingUpload = uploads.some((u: any) => u.status === 'pending');
                    const hasVerifiedUpload = uploads.some((u: any) => u.status === 'verified');
                    return (
                      <div key={inv.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(inv.status || 'pending')}
                            <div>
                              <p className="font-medium text-slate-800">{inv.description || 'School Fees'}</p>
                              <p className="text-xs text-slate-500">{inv.student?.first_name} {inv.student?.last_name} &bull; Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrency(inv.amount || 0)}</p>
                            <span className={`text-xs capitalize ${inv.status === 'paid' ? 'text-green-600' : inv.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{inv.status || 'pending'}</span>
                          </div>
                        </div>

                        {inv.status !== 'paid' && (
                          <div className="mt-3 flex items-center gap-2">
                            {hasVerifiedUpload ? (
                              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Payment verified</span>
                            ) : hasPendingUpload ? (
                              <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} /> Receipt under review</span>
                            ) : (
                              <button onClick={() => setUploadModal(inv)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                                <Upload size={12} />Upload Receipt
                              </button>
                            )}
                          </div>
                        )}

                        {uploads.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploads.map((u: any) => (
                              <div key={u.id} className="flex items-center gap-2 text-xs text-slate-500 pl-7">
                                {getUploadStatusIcon(u.status)}
                                <span>Receipt uploaded {new Date(u.created_at).toLocaleDateString()}</span>
                                <span className={`capitalize font-medium ${u.status === 'verified' ? 'text-green-600' : u.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{u.status}</span>
                                {u.rejection_reason && <span className="text-red-500">— {u.rejection_reason}</span>}
                                {u.receipt_url && (
                                  <button onClick={() => setPreviewUrl(u.receipt_url)} className="text-blue-600 hover:underline"><Eye size={12} /></button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      <p className="font-bold text-green-600">+{formatCurrency(tx.amount || 0)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {uploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800">Upload Payment Receipt</h2>
                <button onClick={() => { setUploadModal(null); setUploadFile_(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">{uploadModal.description || 'School Fees'}</p>
                  <p className="text-xs text-slate-500">{uploadModal.student?.first_name} {uploadModal.student?.last_name} &bull; Amount: {formatCurrency(uploadModal.amount)}</p>
                </div>
                <div>
                  <label className="label">Upload Receipt Image/PDF</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400" onClick={() => fileInputRef.current?.click()}>
                    {uploadFile_ ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <FileText size={20} />
                        <span className="text-sm font-medium">{uploadFile_.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setUploadFile_(null); }} className="p-1 hover:bg-blue-100 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Click to upload bank teller, transfer receipt, or payment screenshot</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, PDF (max 5MB)</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={(e) => setUploadFile_(e.target.files?.[0] || null)} hidden />
                  </div>
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} className="input" rows={2} placeholder="e.g., Bank teller #12345, paid via GTBank" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => { setUploadModal(null); setUploadFile_(null); }} className="btn-outline">Cancel</button>
                <button onClick={handleUploadReceipt} disabled={!uploadFile_ || uploading} className="btn-primary flex items-center gap-2">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : 'Submit Receipt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-xl max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Receipt Preview</h3>
                <button onClick={() => setPreviewUrl(null)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
              </div>
              <img src={previewUrl} alt="Receipt" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
