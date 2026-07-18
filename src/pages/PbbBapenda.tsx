import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Loader2, CheckCircle2, XCircle, CreditCard, Building2, FileText, Printer } from 'lucide-react';
import { thermalPrintService } from '../services/ThermalPrintService';
import { api } from '../lib/api';

interface InquiryResult {
  nop: string;
  tahun: string;
  nama_wp: string;
  alamat_wp: string;
  kelurahan: string;
  kota: string;
  pbb_pokok: number;
  denda: number;
  total_harus_dibayar: number;
  status_bayar: string;
}

interface PaymentResult {
  transaction_id: number;
  ntpd: string;
  nop: string;
  tahun: string;
  total_bayar: number;
  wp_name: string;
}

interface Transaction {
  id: number;
  nop: string;
  tahun: string;
  total_bayar: string;
  ntpd: string;
  payment_status: string;
  wp_name: string;
  created_at: string;
  // Add other fields that might be needed for printing if they are not already in InquiryResult
  nama_wp?: string;
  alamat_wp?: string;
  pbb_pokok?: number;
  denda?: number;
  total_harus_dibayar?: number;
}

export default function PbbBapenda() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inquiry' | 'history'>('inquiry');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inquiry
  const [nop, setNop] = useState(searchParams.get('nop') || '');
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [inquiryResult, setInquiryResult] = useState<InquiryResult | null>(null);

  // Payment
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  // History
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [searchNop, setSearchNop] = useState('');
  const [printing, setPrinting] = useState<number | string | null>(null);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNop = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 18);

  const handleInquiry = useCallback(async () => {
    if (nop.length !== 18) {
      setError('NOP harus 18 digit.');
      return;
    }
    setLoading(true);
    setError('');
    setInquiryResult(null);
    setPaymentResult(null);

    try {
      const res = await api.post('/api/pbb/bapenda/inquiry', { nop, tahun });
      setInquiryResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Gagal mengecek tagihan.');
    } finally {
      setLoading(false);
    }
  }, [nop, tahun]);

  // Auto-inquiry logic for QR scan
  useEffect(() => {
    if (searchParams.get('autoplay') === 'true' && nop.length === 18 && !inquiryResult && !loading) {
      handleInquiry();
      
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('autoplay');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [loading, nop, searchParams, navigate, inquiryResult, handleInquiry]);

  const handlePay = async () => {
    if (!inquiryResult) return;
    if (!confirm(`Konfirmasi pembayaran PBB untuk NOP ${inquiryResult.nop} sebesar ${formatCurrency(inquiryResult.total_harus_dibayar)}?`)) return;

    setPaying(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/api/pbb/bapenda/pay', {
        nop: inquiryResult.nop,
        tahun: inquiryResult.tahun,
      });
      setPaymentResult(res.data);
      setSuccess('Pembayaran PBB berhasil!');
      // Do not set inquiryResult to null immediately, it's needed for printing
    } catch (err: any) {
      setError(err.message || 'Pembayaran gagal.');
    } finally {
      setPaying(false);
    }
  };

  const loadHistory = async () => {
    setTxLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchNop) params.nop = searchNop;
      const res = await api.get('/api/pbb/bapenda/transactions', { params });
      setTransactions(res.data?.data || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat.');
    } finally {
      setTxLoading(false);
    }
  };

  const handlePrint = async (tx: any) => {
    try {
      const ntpd = tx.ntpd || (paymentResult ? paymentResult.ntpd : '-');
      setPrinting(tx.id || ntpd);
      
      await thermalPrintService.print({
        nop: tx.nop,
        tahun: tx.tahun,
        namaWp: tx.wp_name || tx.nama_wp || (paymentResult ? paymentResult.wp_name : ''),
        alamatOp: tx.alamat_wp || '',
        amount: parseFloat(String(tx.pbb_pokok || 0)),
        penalty: parseFloat(String(tx.denda || 0)),
        total: parseFloat(String(tx.total_bayar || tx.total_harus_dibayar || 0)),
        ntpd: ntpd,
        date: new Date(tx.created_at || new Date()).toLocaleDateString('id-ID')
      });
    } catch (err: any) {
      toast.error("Gagal mencetak: " + (err.message || "Pastikan printer Bluetooth terhubung"));
    } finally {
      setPrinting(null);
    }
  };

  const isLunas = (status: string) => {
    const s = status.toUpperCase();
    return s.includes('LUNAS') || s.includes('SDH BAYAR');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'reversed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PBB Bapenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cek tagihan & bayar PBB warga - Bapenda Kota Baubau</p>
        </div>
        <Building2 className="w-8 h-8 text-baubau-blue dark:text-blue-400" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => { setActiveTab('inquiry'); setError(''); setSuccess(''); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inquiry'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Cek & Bayar Tagihan
        </button>
        <button
          onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); loadHistory(); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Riwayat Transaksi
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* ───── Inquiry Tab ───── */}
      {activeTab === 'inquiry' && (
        <div className="space-y-4">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white">Cek Tagihan PBB Warga</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">NOP (18 digit)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nop}
                  onChange={(e) => setNop(formatNop(e.target.value))}
                  placeholder="Masukkan Nomor Objek Pajak"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  maxLength={18}
                />
                <p className="text-xs text-gray-400 mt-1">{nop.length}/18 digit</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Tahun</label>
                <select
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleInquiry}
              disabled={loading || nop.length !== 18}
              className="px-6 py-2.5 bg-baubau-blue hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Mengecek...' : 'Cek Tagihan'}
            </button>
          </div>

          {/* Inquiry Result */}
          {inquiryResult && !paymentResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white text-lg">Detail Tagihan PBB</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isLunas(inquiryResult.status_bayar)
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {inquiryResult.status_bayar}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DetailRow label="NOP" value={inquiryResult.nop} mono />
                    <DetailRow label="Nama Wajib Pajak" value={inquiryResult.nama_wp} />
                    <DetailRow label="Alamat" value={inquiryResult.alamat_wp} />
                    <DetailRow label="Kelurahan" value={inquiryResult.kelurahan} />
                    <DetailRow label="Kota" value={inquiryResult.kota} />
                    <DetailRow label="Tahun Pajak" value={inquiryResult.tahun} />
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                      <DetailRow label="Pokok PBB" value={formatCurrency(inquiryResult.pbb_pokok)} />
                      <DetailRow label="Denda" value={formatCurrency(inquiryResult.denda)} />
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800 dark:text-white">Total Bayar</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(inquiryResult.total_harus_dibayar)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isLunas(inquiryResult.status_bayar) && (
                      <button
                        onClick={handlePay}
                        disabled={paying}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {paying ? 'Memproses Pembayaran...' : 'Proses Pembayaran'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Success */}
          {paymentResult && inquiryResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center space-y-3 border border-green-200 dark:border-green-700 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-bold text-green-700 dark:text-green-400">Pembayaran Berhasil</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-500 mb-1">NTPD (Bukti Bayar)</p>
                <p className="text-xl font-bold font-mono text-gray-900 dark:text-white tracking-widest leading-none py-1">
                  {paymentResult.ntpd}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint({ ...inquiryResult, ntpd: paymentResult.ntpd, wp_name: paymentResult.wp_name, total_bayar: paymentResult.total_bayar })}
                  disabled={printing === paymentResult.ntpd}
                  className="flex-1 py-3 bg-baubau-blue text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {printing === paymentResult.ntpd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer size={18} />}
                  Cetak Struk
                </button>
                <button
                  onClick={() => {
                    setPaymentResult(null);
                    setInquiryResult(null);
                    setNop('');
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── History Tab ───── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchNop}
              onChange={(e) => setSearchNop(formatNop(e.target.value))}
              placeholder="Cari berdasarkan NOP..."
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={loadHistory}
              disabled={txLoading}
              className="px-4 py-2.5 bg-baubau-blue text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Cari
            </button>
          </div>

          {txLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada riwayat transaksi PBB.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">NOP</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Nama WP</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tahun</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">NTPD</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tanggal</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-mono text-xs">{tx.nop}</td>
                        <td className="px-4 py-3">{tx.wp_name || '-'}</td>
                        <td className="px-4 py-3">{tx.tahun}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(parseFloat(tx.total_bayar))}</td>
                        <td className="px-4 py-3 font-mono text-xs">{tx.ntpd || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(tx.payment_status)}`}>
                            {tx.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-3 text-center">
                          {tx.payment_status === 'success' && (
                            <button
                              onClick={() => handlePrint(tx)}
                              disabled={printing === tx.id}
                              className="p-2 bg-baubau-blue/10 text-baubau-blue rounded-lg hover:bg-baubau-blue/20 transition-all"
                              title="Cetak Struk"
                            >
                              {printing === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono' : ''} ${highlight ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
        {value}
      </span>
    </div>
  );
}
