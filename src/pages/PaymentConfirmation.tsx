import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  QrCode, 
  Building2, 
  Wallet,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';
import { Billing as BillingType } from '../types';
import { thermalPrintService } from '../services/ThermalPrintService';
import { createOfficerPayment } from '../services/paymentRequestService';

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get('ids')?.split(',').map(s => s.trim()).filter(Boolean) || [];
  
  const [billings, setBillings] = useState<BillingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'va' | 'transfer'>('cash');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillings() {
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/api/bills');
        const allBills = res.data || res;
        
        const filtered = allBills.filter((b: any) => ids.includes(b.id.toString())).map((b: any) => ({
          id: b.id.toString(),
          invoiceNumber: b.bill_number,
          taxpayerName: b.taxpayer?.name || b.user?.name || 'Wajib Pajak',
          taxpayerId: b.taxpayer?.taxpayer_id || b.taxpayer?.npwpd || 'N/A',
          amount: Number(b.amount || 0),
          penalty_amount: Number(b.penalty_amount || 0),
          total_amount: Number(b.total_amount || b.amount || 0),
          status: b.status,
          type: b.classification?.name || b.retribution_type?.name || 'Retribusi Daerah',
          taxObjectId: b.tax_object_id,
          period: b.period || b.due_date || new Date().toISOString()
        }));

        setBillings(filtered);
      } catch (error) {
        console.error('Error fetching billings:', error);
        toast.error('Gagal mengambil data tagihan');
      } finally {
        setLoading(false);
      }
    }

    fetchBillings();
  }, [searchParams]);

  const totalAmount = billings.reduce((sum, b) => sum + (b.total_amount || b.amount), 0);

  const handlePrintReceipt = async (singleBill?: BillingType) => {
    const billsToPrint = singleBill ? [singleBill] : billings;
    setIsPrinting(true);
    setPrintStatus('Menghubungkan ke printer...');

    try {
      for (const bill of billsToPrint) {
        await thermalPrintService.print({
          billNumber: bill.invoiceNumber,
          name: bill.taxpayerName,
          objectName: bill.type,
          amount: bill.amount,
          penalty: bill.penalty_amount || 0,
          total: bill.total_amount || bill.amount,
          date: new Date().toLocaleDateString('id-ID'),
          period: bill.period ? new Date(bill.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'
        });
      }
      setPrintStatus('Resi berhasil dicetak!');
      toast.success('Resi berhasil dicetak!');
    } catch (err: any) {
      console.error('Printing failed', err);
      setPrintStatus('Gagal mencetak resi: ' + (err.message || 'Periksa koneksi Bluetooth printer'));
      toast.error('Gagal mencetak resi. Pastikan Bluetooth aktif.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePayAll = async () => {
    setProcessing(true);
    try {
      await createOfficerPayment({
        billIds: billings.map(b => b.id),
        paymentMethod: paymentMethod,
        bills: billings.map(b => ({
          id: b.id,
          bill_number: b.invoiceNumber,
          amount: b.amount,
          total_amount: b.total_amount || b.amount,
          period: b.period,
          tax_object_id: b.taxObjectId
        }))
      });

      setSuccess(true);
      toast.success('Pembayaran berhasil diproses!');
      
      // Auto-trigger print for Cash
      if (paymentMethod === 'cash') {
        handlePrintReceipt();
      }
    } catch (error: any) {
      console.error('Payment failed', error);
      toast.error(error?.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-baubau-blue" />
        <p className="text-sm font-medium text-slate-500">Memuat rincian tagihan...</p>
      </div>
    );
  }

  if (billings.length === 0 && !success) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl inline-block text-amber-600">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tidak Ada Tagihan Terpilih</h2>
        <p className="text-xs text-gray-500">Pilih tagihan terlebih dahulu dari menu Billing atau Scan QR Wajib Pajak.</p>
        <button
          onClick={() => navigate('/billing')}
          className="w-full py-3 bg-baubau-blue text-white rounded-xl font-bold text-xs"
        >
          Kembali ke Billing
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-6">
        <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
          <CheckCircle2 className="w-16 h-16 animate-bounce" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {billings.length} tagihan telah lunas menggunakan metode <strong>{paymentMethod.toUpperCase()}</strong>.
        </p>

        {/* Resi printing card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-baubau-blue" />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Cetak Resi Thermal (58mm)</span>
            </div>
            <button
              onClick={() => handlePrintReceipt()}
              disabled={isPrinting}
              className="px-3 py-1.5 bg-baubau-blue hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              {isPrinting ? 'Mencetak...' : 'Cetak Ulang'}
            </button>
          </div>
          {printStatus && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
              {printStatus}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Daftar Billing
          </button>
          <button
            onClick={() => navigate('/scanner')}
            className="py-3 bg-baubau-blue text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            Scan Berikutnya
          </button>
        </div>
      </div>
    );
  }

  const renderPaymentInstructions = () => {
    if (paymentMethod === 'qris') {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-4">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">QRIS Dinamis Pemkot Baubau</h2>
          <div className="w-44 h-44 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl mx-auto flex flex-col items-center justify-center p-2 relative group">
            <QrCode className="w-20 h-20 text-baubau-blue" />
            <span className="text-[10px] font-bold text-slate-500 mt-2">NMID: ID102003882910</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Tunjukkan QRIS kepada Wajib Pajak untuk discan melalui BCA Mobile, Livin, GoPay, OVO, ShopeePay, dll.</p>
        </div>
      );
    }

    if (paymentMethod === 'va') {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-4">
          <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Virtual Account BRIVA / BNI</h2>
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">Nomor Virtual Account</p>
            <div className="flex justify-between items-center">
              <p className="text-lg font-black text-baubau-blue tracking-wider font-mono">1289 0821 9920 1823</p>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Berikan nomor VA kepada Wajib Pajak untuk transfer melalui ATM / Mobile Banking.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-32">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Pembayaran</h1>
          <p className="text-xs text-slate-500">Validasi tagihan dan konfirmasi penerimaan</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tagihan yang akan dibayar ({billings.length})</p>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto">
            {billings.map((bill) => (
              <div key={bill.id} className="py-2.5 flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{bill.taxpayerName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{bill.invoiceNumber}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-semibold">
                    {bill.type}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-gray-900 dark:text-white">{formatCurrency(bill.total_amount || bill.amount)}</p>
                  {(bill.penalty_amount || 0) > 0 && (
                    <p className="text-[9px] text-rose-500 font-medium">+Denda {formatCurrency(bill.penalty_amount || 0)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pilih Metode Pembayaran</h2>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash' 
                ? 'border-baubau-blue bg-blue-50/50 dark:bg-blue-900/20 text-baubau-blue' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'cash' ? 'bg-baubau-blue text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-xs">Tunai (Cash / Lapangan)</p>
                <p className="text-[10px] opacity-75">Diterima langsung oleh petugas + cetak SSPD</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('qris')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                paymentMethod === 'qris' 
                ? 'border-baubau-blue bg-blue-50/50 dark:bg-blue-900/20 text-baubau-blue' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'qris' ? 'bg-baubau-blue text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <QrCode className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-xs">QRIS Dinamis</p>
                <p className="text-[10px] opacity-75">Scan dari e-wallet & mobile banking</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('va')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                paymentMethod === 'va' 
                ? 'border-baubau-blue bg-blue-50/50 dark:bg-blue-900/20 text-baubau-blue' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'va' ? 'bg-baubau-blue text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-xs">Virtual Account (BRIVA)</p>
                <p className="text-[10px] opacity-75">Transfer Bank BRI & Jaringan Bersama</p>
              </div>
            </button>
          </div>
        </div>

        {paymentMethod !== 'cash' && renderPaymentInstructions()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Tagihan</p>
            <p className="text-lg font-black text-baubau-blue dark:text-blue-400">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <button
            disabled={billings.length === 0 || processing}
            onClick={handlePayAll}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 active:scale-95"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Konfirmasi Lunas ({formatCurrency(totalAmount)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
