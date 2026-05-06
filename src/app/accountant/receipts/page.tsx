'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Download, Printer, FileText, X } from 'lucide-react';

export default function AccountantReceiptsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('receipts').select('*, invoice:invoices(*), invoice.student:profiles(*)').order('created_at', { ascending: false });
    if (data) setReceipts(data);
    setLoading(false);
  }

  function handlePrint(receipt: any) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Receipt ${receipt.receipt_number}</title><style>body{font-family:Arial;padding:20px;}</style></head><body>
          <div style="max-width:400px;margin:0 auto;border:2px solid #2563eb;padding:20px;border-radius:8px;">
            <h2 style="color:#2563eb;text-align:center;">ClearPath Edu Hub</h2>
            <p style="text-align:center;">RECEIPT</p>
            <hr />
            <p><strong>Receipt #:</strong> ${receipt.receipt_number}</p>
            <p><strong>Date:</strong> ${new Date(receipt.created_at).toLocaleDateString()}</p>
            <p><strong>Invoice #:</strong> ${receipt.invoice?.invoice_number}</p>
            <p><strong>Student:</strong> ${receipt.invoice?.student?.first_name} ${receipt.invoice?.student?.last_name}</p>
            <hr />
            <p style="font-size:24px;text-align:center;"><strong>$${receipt.amount_paid}</strong></p>
            <hr />
            <p><strong>Payment Method:</strong> ${receipt.payment_method || 'N/A'}</p>
            <p><strong>Reference #:</strong> ${receipt.reference_number || 'N/A'}</p>
            <p style="text-align:center;margin-top:20px;color:#666;">Thank you for your payment!</p>
          </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Receipts</h1><p className="text-slate-500">View and print payment receipts</p></div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : receipts.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No receipts yet</p></div> : (
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Receipt #</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Invoice #</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Amount</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th><th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th></tr></thead>
            <tbody>{receipts.map(r => (<tr key={r.id} className="border-b"><td className="py-3 px-4 font-medium text-slate-800">{r.receipt_number}</td><td className="py-3 px-4 text-slate-600">{r.invoice?.invoice_number}</td><td className="py-3 px-4 text-green-600 font-medium">${r.amount_paid}</td><td className="py-3 px-4 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td><td className="py-3 px-4 text-right"><button onClick={() => handlePrint(r)} className="btn-outline text-sm py-1"><Printer size={14} /> Print</button></td></tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}