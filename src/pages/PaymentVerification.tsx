import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  Clock, 
  Search, 
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Printer
} from 'lucide-react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { thermalPrintService } from '../services/ThermalPrintService';

export default function PaymentVerification() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const res = await api.get('/api/payments', {
        params: { status: statusFilter }
      });
      // Handle paginated or flat data
      const data = res.data?.data || res.data || res;
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: number, status: 'success' | 'failed', notes: string = '') => {
    try {
      setProcessingId(id);
      await api.put(`/api/payments/${id}/status`, { status, notes });
      
      const payment = payments.find(p => p.id === id);
      setPayments(prev => prev.filter(p => p.id !== id));
      
      if (status === 'success' && payment) {
        const shouldPrint = confirm('Pembayaran disetujui! Cetak resi?');
        if (shouldPrint) {
          await handlePrintReceipt(payment);
        }
      } else {
        toast.error('Pembayaran ditolak');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintReceipt = async (payment: any) => {
    try {
      await thermalPrintService.print({
        billNumber: payment.transaction_id,
        name: payment.taxpayer?.name || 'Unknown',
        objectName: payment.tax_object?.name || 'Unknown',
        amount: payment.amount,
        penalty: 0,
        total: payment.amount,
        date: new Date().toLocaleDateString('id-ID'),
        period: payment.billing_period || '-'
      });
    } catch {
      toast.error('Gagal mencetak resi. Pastikan printer Bluetooth terhubung.');
    }
  };

  const filteredPayments = payments.filter(p => 
    p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.taxpayer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tax_object?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && payments.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C5C3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verifikasi Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Review klaim pembayaran dari warga untuk validasi data</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
           <button 
             onClick={() => setStatusFilter('pending')}
             className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${statusFilter === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm text-baubau-blue' : 'text-gray-500'}`}
           >
             Pending
           </button>
           <button 
             onClick={() => setStatusFilter('success')}
             className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${statusFilter === 'success' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600' : 'text-gray-500'}`}
           >
             Verified
           </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-baubau-blue transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Cari ID Transaksi, Nama WP, atau Objek..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-baubau-blue/20 transition-all font-medium text-sm"
        />
      </div>

      {filteredPayments.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center">
          <Clock className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Tidak ada antrean pembayaran saat ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPayments.map((p) => (
            <Card key={p.id} className="p-0 overflow-hidden border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 flex justify-between items-start">
                <div>
                   <p className="text-[10px] font-black text-baubau-blue uppercase tracking-widest">{p.transaction_id}</p>
                   <p className="text-xs text-gray-400 mt-0.5">{new Date(p.paid_at || p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                  p.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                  p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {p.status}
                </div>
              </div>

              <div className="p-5 flex gap-4">
                 <div className="w-20 h-20 shrink-0 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden relative group cursor-pointer border border-gray-100 dark:border-gray-700">
                    {p.proof_url ? (
                      <a href={p.proof_url} target="_blank" rel="noreferrer">
                        <img src={p.proof_url} alt="Proof" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <ExternalLink size={20} className="text-white" />
                        </div>
                      </a>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                         <ImageIcon size={24} />
                         <span className="text-[8px] mt-1 font-bold">NO PROOF</span>
                      </div>
                    )}
                 </div>

                 <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{p.taxpayer?.name || 'Unknown Taxpayer'}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate">{p.tax_object?.name || 'Unknown Object'}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                       <span className="text-xs font-bold text-gray-400">Total:</span>
                       <span className="text-sm font-black text-baubau-blue">
                         {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.amount)}
                       </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Periode: {p.billing_period}</p>
                 </div>
              </div>

              {p.status === 'pending' && (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-50 dark:border-gray-700 flex gap-3">
                   <button 
                     disabled={processingId === p.id}
                     onClick={() => {
                       const reason = prompt('Alasan penolakan?');
                       if (reason) handleUpdateStatus(p.id, 'failed', reason);
                     }}
                     className="flex-1 py-2 rounded-xl text-rose-500 border border-rose-200 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest transition-all"
                   >
                     Tolak
                   </button>
                   <button 
                     disabled={processingId === p.id}
                     onClick={() => handleUpdateStatus(p.id, 'success')}
                     className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                   >
                     {processingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                     Verifikasi
                   </button>
                </div>
              )}

              {p.status === 'success' && (
                <div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border-t border-emerald-50 dark:border-emerald-800 flex items-center justify-between">
                   {p.metadata?.verification_notes && (
                     <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium italic">Note: {p.metadata.verification_notes}</span>
                   )}
                   <button 
                     onClick={() => handlePrintReceipt(p)}
                     className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                   >
                     <Printer size={12} />
                     Cetak Resi
                   </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
