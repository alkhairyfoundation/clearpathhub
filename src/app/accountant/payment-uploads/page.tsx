'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { CheckCircle, XCircle, Eye, Search, Filter, DollarSign, AlertCircle, Clock, Loader2 } from 'lucide-react';

export default function PaymentUploadsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    id: string; student_id: string; amount: number; invoice_id?: string;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_type: 'full' as 'full' | 'partial',
    amount_paid: 0,
    balance_remaining: 0,
  });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('payment_uploads')
      .select('*, student:profiles!payment_uploads_student_id_fkey(first_name, last_name), parent:profiles!payment_uploads_parent_id_fkey(first_name, last_name, email, phone)')
      .order('created_at', { ascending: false });
    if (data) setUploads(data);
    setLoading(false);
  }

  async function deleteReceiptFile(storagePath: string) {
    try {
      const { error } = await supabase.storage.from('receipts').remove([storagePath]);
      if (error) console.warn('Failed to delete file from storage:', error.message);
    } catch (e) {
      console.warn('Storage deletion error:', e);
    }
  }

  async function handleVerify(id: string, upload: any) {
    setPaymentModal({
      id,
      student_id: upload.student_id,
      amount: upload.amount,
      invoice_id: upload.invoice_id,
    });
    setPaymentForm({
      payment_type: 'full',
      amount_paid: upload.amount,
      balance_remaining: 0,
    });
  }

  async function confirmPayment() {
    if (!paymentModal) return;
    setActionLoading(paymentModal.id);
    const upload = uploads.find(u => u.id === paymentModal.id);
    if (!upload) return;

    const receiptNumber = `RCP-${Date.now()}`;

    const receiptData: any = {
      invoice_id: upload.invoice_id || null,
      receipt_number: receiptNumber,
      amount_paid: paymentForm.amount_paid,
      payment_method: 'bank_transfer',
      reference_number: upload.id.slice(0, 8),
      uploaded_by: profile?.id,
      verified_status: 'verified',
      payment_type: paymentForm.payment_type,
      balance_remaining: paymentForm.balance_remaining,
      notes: upload.notes || null,
      storage_path: upload.storage_path || null,
    };

    const { error: receiptError } = await supabase.from('receipts').insert(receiptData);
    if (receiptError) {
      alert('Error creating receipt: ' + receiptError.message);
      setActionLoading(null);
      return;
    }

    if (upload.invoice_id && paymentForm.payment_type === 'full') {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', upload.invoice_id);
    }

    await supabase.from('transactions').insert({
      student_id: upload.student_id,
      type: 'income',
      category: 'School Fees',
      amount: paymentForm.amount_paid,
      description: `Payment via receipt upload - ${upload.notes || 'Parent upload'}`,
      payment_method: 'bank_transfer',
      reference_number: upload.id.slice(0, 8),
      recorded_by: profile?.id,
    });

    await supabase.from('payment_uploads').update({
      status: 'verified',
      verified_by: profile?.id,
      verified_at: new Date().toISOString(),
    }).eq('id', paymentModal.id);

    if (upload.storage_path) {
      await deleteReceiptFile(upload.storage_path);
    }

    setPaymentModal(null);
    setActionLoading(null);
    fetchData();
  }

  async function handleReject() {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    const upload = uploads.find(u => u.id === rejectModal.id);

    await supabase.from('payment_uploads').update({
      status: 'rejected',
      verified_by: profile?.id,
      verified_at: new Date().toISOString(),
      rejection_reason: rejectModal.reason,
    }).eq('id', rejectModal.id);

    if (upload?.storage_path) {
      await deleteReceiptFile(upload.storage_path);
    }

    setRejectModal(null);
    setActionLoading(null);
    fetchData();
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const filtered = uploads.filter((u: any) => {
    const matchesFilter = filter === 'all' || u.status === filter;
    const matchesSearch = !searchQuery ||
      u.student?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.student?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.parent?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = uploads.filter((u: any) => u.status === 'pending').length;
  const verifiedCount = uploads.filter((u: any) => u.status === 'verified').length;
  const rejectedCount = uploads.filter((u: any) => u.status === 'rejected').length;

  if (loading) {
    return (
      <DashboardLayout title="Payment Uploads" subtitle="Verify parent payment receipts">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payment Uploads" subtitle="Review and verify parent-uploaded payment receipts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Uploads</h1>
          <p className="text-slate-500">Review and verify payment receipts uploaded by parents</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card cursor-pointer" onClick={() => setFilter('pending')}>
            <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-amber-600" /><span className="text-xs text-slate-500">Pending</span></div>
            <p className={`text-2xl font-bold ${filter === 'pending' ? 'text-amber-600' : 'text-slate-900'}`}>{pendingCount}</p>
          </div>
          <div className="card cursor-pointer" onClick={() => setFilter('verified')}>
            <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-600" /><span className="text-xs text-slate-500">Verified</span></div>
            <p className={`text-2xl font-bold ${filter === 'verified' ? 'text-green-600' : 'text-slate-900'}`}>{verifiedCount}</p>
          </div>
          <div className="card cursor-pointer" onClick={() => setFilter('rejected')}>
            <div className="flex items-center gap-2 mb-2"><XCircle size={16} className="text-red-600" /><span className="text-xs text-slate-500">Rejected</span></div>
            <p className={`text-2xl font-bold ${filter === 'rejected' ? 'text-red-600' : 'text-slate-900'}`}>{rejectedCount}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search by student or parent name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            <div className="flex gap-2">
              {['pending', 'verified', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-slate-500">No payment uploads found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u: any) => (
                <div key={u.id} className={`p-4 rounded-xl border ${u.status === 'pending' ? 'bg-amber-50 border-amber-200' : u.status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{u.student?.first_name} {u.student?.last_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          u.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          u.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{u.status}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Uploaded by {u.parent?.first_name} {u.parent?.last_name}
                        {u.parent?.email && <> &bull; {u.parent.email}</>}
                      </p>
                      <p className="text-sm text-slate-500">
                        Amount: <span className="font-semibold text-slate-700">{formatCurrency(u.amount)}</span>
                        {u.notes && <> &bull; Note: {u.notes}</>}
                        &bull; {new Date(u.created_at).toLocaleDateString()}
                      </p>
                      {u.rejection_reason && (
                        <p className="text-sm text-red-600 mt-1">Rejection reason: {u.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.receipt_url && (
                        <button onClick={() => setPreviewUrl(u.receipt_url)} className="btn-outline text-sm flex items-center gap-1">
                          <Eye size={14} />View Receipt
                        </button>
                      )}
                      {u.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerify(u.id, u)}
                            disabled={actionLoading === u.id}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Verify
                          </button>
                          <button
                            onClick={() => setRejectModal({ id: u.id, reason: '' })}
                            disabled={actionLoading === u.id}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle size={14} />Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {previewUrl && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-xl max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Receipt Preview</h3>
                <button onClick={() => setPreviewUrl(null)} className="p-1 hover:bg-slate-100 rounded"><XCircle size={20} /></button>
              </div>
              <img src={previewUrl} alt="Payment Receipt" className="w-full" />
            </div>
          </div>
        )}

        {paymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800">Verify Payment</h2>
                <button onClick={() => setPaymentModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Payment amount from upload: <span className="font-bold text-slate-900">{formatCurrency(paymentModal.amount)}</span></p>
                
                <div>
                  <label className="label">Payment Type</label>
                  <select value={paymentForm.payment_type} onChange={(e) => {
                    const isFull = e.target.value === 'full';
                    setPaymentForm({
                      payment_type: e.target.value as 'full' | 'partial',
                      amount_paid: isFull ? paymentModal.amount : 0,
                      balance_remaining: isFull ? 0 : paymentModal.amount,
                    });
                  }} className="input">
                    <option value="full">Full Payment</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>

                <div>
                  <label className="label">Amount Paid</label>
                  <input type="number" value={paymentForm.amount_paid} onChange={(e) => {
                    const paid = parseFloat(e.target.value) || 0;
                    setPaymentForm({
                      ...paymentForm,
                      amount_paid: paid,
                      balance_remaining: Math.max(0, paymentModal.amount - paid),
                    });
                  }} className="input" />
                </div>

                <div>
                  <label className="label">Balance Remaining</label>
                  <input type="number" value={paymentForm.balance_remaining} className="input bg-slate-50" readOnly />
                  <p className="text-xs text-slate-400 mt-1">
                    {paymentForm.balance_remaining > 0 
                      ? `Student still owes ${formatCurrency(paymentForm.balance_remaining)}`
                      : 'Payment is complete — no balance remaining'}
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${paymentForm.balance_remaining > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {paymentForm.balance_remaining > 0 ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    {paymentForm.balance_remaining > 0 
                      ? `Partial payment recorded. Outstanding: ${formatCurrency(paymentForm.balance_remaining)}`
                      : 'Fully paid. Receipt file will be deleted from storage.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setPaymentModal(null)} className="btn-outline">Cancel</button>
                <button onClick={confirmPayment} disabled={!paymentForm.amount_paid || actionLoading !== null} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Confirm & Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {rejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800">Reject Payment</h2>
                <button onClick={() => setRejectModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Provide a reason for rejection. The parent will see this and can re-upload a corrected receipt.</p>
                <div>
                  <label className="label">Rejection Reason</label>
                  <textarea value={rejectModal.reason} onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })} className="input" rows={3} placeholder="e.g., Receipt is blurry, amount mismatch, incorrect reference..." />
                </div>
                <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> The receipt file will be deleted from storage on rejection.</p>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setRejectModal(null)} className="btn-outline">Cancel</button>
                <button onClick={handleReject} disabled={!rejectModal.reason || actionLoading !== null} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject & Delete File
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
