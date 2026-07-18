import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CreditCard, Loader2, CheckCircle2, QrCode, Building2, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { Billing as BillingType } from '../types';

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get('ids')?.split(',') || [];
  
  const [billings, setBillings] = useState<BillingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'va'>('cash');

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
          taxpayerName: b.taxpayer?.name || b.user?.name || 'Unknown',
          amount: Number(b.amount),
          status: b.status,
          type: b.retribution_type?.name || 'N/A'
        }));

        setBillings(filtered);
      } catch (error) {
        console.error('Error fetching billings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBillings();
  }, [searchParams]);

  const totalAmount = billings.reduce((sum, b) => sum + b.amount, 0);

  const handlePayAll = async () => {
    setProcessing(true);
    try {
      await Promise.all(billings.map(b => 
        api.post(`/api/bills/${b.id}/pay`, {
          payment_method: paymentMethod,
          amount: b.amount
        })
      ));
      setSuccess(true);
    } catch (error) {
      toast.error('Gagal memproses pembayaran');
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-6">
        <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {billings.length} tagihan telah berhasil dibayar menggunakan metode <strong>{paymentMethod.toUpperCase()}</strong>.
        </p>
        <button
          onClick={() => navigate('/billing')}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Kembali ke Billing
        </button>
      </div>
    );
  }

  const renderPaymentInstructions = () => {
    if (paymentMethod === 'qris') {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Scan QRIS</h2>
          <div className="w-48 h-48 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl mx-auto flex items-center justify-center relative group">
            <QrCode className="w-24 h-24 text-gray-300 group-hover:text-blue-600 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-black text-blue-600 uppercase">Generated</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Berlaku untuk semua aplikasi pembayaran digital</p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1">Status Pembayaran</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Menunggu Pembayaran...</span>
            </div>
          </div>
        </div>
      );
    }

    if (paymentMethod === 'va') {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Virtual Account</h2>
          <div className="space-y-4">
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left">Nomor Virtual Account</p>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-widest">9880 1234 5678 9012</p>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank</p>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase">BANK BNI</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Berlaku Hingga</p>
                <p className="text-xs font-black text-gray-900 dark:text-white">2 jam lagi</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1">Status Pembayaran</p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Menandai Transfer...</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-32">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfirmasi Bayar</h1>
      </div>

      <div className="space-y-4">
        {billings.map((bill) => (
          <div key={bill.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{bill.invoiceNumber}</p>
                <h3 className="font-bold text-gray-900 dark:text-white mt-1">{bill.taxpayerName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{bill.type}</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(bill.amount)}</p>
            </div>
          </div>
        ))}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Metode Pembayaran</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash' 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Tunai (Cash)</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tight font-bold">Bayar langsung di tempat</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('qris')}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'qris' 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'qris' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">QRIS</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tight font-bold">Gopay, OVO, Dana, LinkAja</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('va')}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'va' 
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-lg ${paymentMethod === 'va' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Virtual Account</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tight font-bold">Transfer Bank (BCA, Mandiri, BNI)</p>
              </div>
            </button>
          </div>
        </div>

        {paymentMethod !== 'cash' && renderPaymentInstructions()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Pembayaran</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <button
            disabled={billings.length === 0 || processing}
            onClick={handlePayAll}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Bayar Sekarang
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
