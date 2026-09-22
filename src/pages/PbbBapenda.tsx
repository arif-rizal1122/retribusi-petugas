import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
  FileText,
  Printer,
  Camera,
  MapPin,
  ExternalLink,
  X,
  Navigation,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { thermalPrintService } from '../services/ThermalPrintService';
import { api, API_URL } from '../lib/api';

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
  nama_wp?: string;
  alamat_wp?: string;
  pbb_pokok?: number;
  denda?: number;
  total_harus_dibayar?: number;
}

interface PbbNopApplication {
  id: number;
  user_id: number;
  nik: string;
  name: string;
  address: string;
  land_area: string | number;
  building_area: string | number | null;
  latitude: number | null;
  longitude: number | null;
  registered_for?: 'self' | 'other' | string;
  owner_name?: string | null;
  owner_address?: string | null;
  status: string;
  survey_notes?: string | null;
  survey_photo_path?: string | null;
  imb_file_path?: string | null;
  akte_file_path?: string | null;
  ktp_file_path?: string | null;
  nop?: string | null;
  created_at: string;
  metadata?: {
    building_photo_path?: string;
    certificate_number?: string;
    pbg_number?: string;
    pbg_date?: string;
    building_floors?: string | number;
    building_usage?: string;
    is_fasum?: boolean;
    has_building?: boolean;
    survey_recommendation?: 'RECOMMENDED' | 'NEEDS_REVISION';
    survey_physical_condition?: string;
    survey_location_match?: boolean;
    assigned_petugas_name?: string;
    [key: string]: any;
  } | null;
}

export default function PbbBapenda() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inquiry' | 'history' | 'survey'>('inquiry');
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

  // Survey NOP Warga
  const [applications, setApplications] = useState<PbbNopApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [selectedAppForSurvey, setSelectedAppForSurvey] = useState<PbbNopApplication | null>(null);
  const [surveyNotesInput, setSurveyNotesInput] = useState('');
  const [surveyPhotoFile, setSurveyPhotoFile] = useState<File | null>(null);
  const [surveyPhotoPreview, setSurveyPhotoPreview] = useState<string | null>(null);
  const [surveyRecommendation, setSurveyRecommendation] = useState<'RECOMMENDED' | 'NEEDS_REVISION'>('RECOMMENDED');
  const [surveyPhysicalCondition, setSurveyPhysicalCondition] = useState<string>('HUNIAN_SEDERHANA');
  const [surveyLocationMatch, setSurveyLocationMatch] = useState<boolean>(true);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'survey') {
      fetchApplications();
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

  const getFileUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = (API_URL || '').replace(/\/+$/, '');
    const clean = path.startsWith('/') ? path : `/${path}`;
    return clean.startsWith('/storage/') ? `${baseUrl}${clean}` : `${baseUrl}/storage${clean}`;
  };

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
    } catch (err: any) {
      setError(err.message || 'Pembayaran gagal.');
    } finally {
      setPaying(false);
    }
  };

  const loadHistory = async () => {
    setTxLoading(true);
    try {
      const res = await api.get('/api/pbb/bapenda/history');
      setTransactions(res.data || []);
    } catch (err: any) {
      console.error('Failed to load history:', err);
      toast.error('Gagal memuat riwayat pembayaran');
    } finally {
      setTxLoading(false);
    }
  };

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const params: any = {};
      if (appSearch.trim()) params.search = appSearch.trim();
      if (appStatusFilter) params.status = appStatusFilter;
      const res = await api.get('/api/pbb/bapenda/nop-applications', { params });
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setApplications(list);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      toast.error('Gagal memuat daftar permohonan NOP.');
    } finally {
      setAppsLoading(false);
    }
  }, [appSearch, appStatusFilter]);

  const handlePrint = async (tx: Transaction) => {
    setPrinting(tx.id);
    try {
      const pbbData = {
        nop: tx.nop,
        tahun: tx.tahun,
        namaWp: tx.wp_name || tx.nama_wp || 'Wajib Pajak',
        alamatOp: tx.alamat_wp || '-',
        amount: tx.pbb_pokok || parseFloat(tx.total_bayar) || 0,
        penalty: tx.denda || 0,
        total: parseFloat(tx.total_bayar) || 0,
        ntpd: tx.ntpd || `PBB-${tx.nop}`,
        date: tx.created_at || new Date().toISOString(),
      };

      await thermalPrintService.print(pbbData);
      toast.success('Struk berhasil dicetak!');
    } catch (err: any) {
      toast.error('Gagal mencetak struk: ' + (err.message || 'Unknown error'));
    } finally {
      setPrinting(null);
    }
  };

  const handleOpenSurveyModal = (app: PbbNopApplication) => {
    setSelectedAppForSurvey(app);
    setSurveyNotesInput(app.survey_notes || '');
    setSurveyPhotoFile(null);
    setSurveyPhotoPreview(app.survey_photo_path ? getFileUrl(app.survey_photo_path) : null);
    
    // Inisialisasi default yang cerdas berdasarkan data awal permohonan
    const defaultRec = app.metadata?.survey_recommendation || 'RECOMMENDED';
    const defaultCondition = app.metadata?.survey_physical_condition || (
      Number(app.building_area || 0) > 0 
        ? (Number(app.building_area || 0) <= 100 ? 'HUNIAN_SEDERHANA' : 'BANGUNAN_BESAR') 
        : 'TANAH_KOSONG'
    );
    setSurveyRecommendation(defaultRec);
    setSurveyPhysicalCondition(defaultCondition);
    setSurveyLocationMatch(app.metadata?.survey_location_match ?? true);
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSurveyPhotoFile(file);
    const url = URL.createObjectURL(file);
    setSurveyPhotoPreview(url);
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForSurvey) return;

    let finalNotes = surveyNotesInput.trim();
    if (!finalNotes) {
      if (surveyRecommendation === 'RECOMMENDED') {
        finalNotes = 'Fisik objek telah diverifikasi faktual di lapangan. Kondisi fisik bangunan dan koordinat sesuai permohonan. Direkomendasikan untuk penetapan NOP SISMIOP.';
      } else {
        toast.error('Mohon cantumkan catatan koreksi atau ketidaksesuaian di lapangan.');
        return;
      }
    }

    setSubmittingSurvey(true);
    try {
      const formData = new FormData();
      formData.append('status', 'SURVEY');
      formData.append('survey_notes', finalNotes);
      formData.append('survey_recommendation', surveyRecommendation);
      formData.append('survey_physical_condition', surveyPhysicalCondition);
      formData.append('survey_location_match', String(surveyLocationMatch));
      if (surveyPhotoFile) formData.append('survey_photo', surveyPhotoFile);

      await api.post(`/api/pbb/bapenda/nop-applications/${selectedAppForSurvey.id}/status`, formData);
      toast.success(`Hasil survei permohonan #${selectedAppForSurvey.id} berhasil dikirim ke Admin Bapenda!`);
      setSelectedAppForSurvey(null);
      setSurveyNotesInput('');
      setSurveyPhotoFile(null);
      setSurveyPhotoPreview(null);
      fetchApplications();
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      toast.error(err.message || 'Gagal menyimpan hasil survei');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const isAlreadyPaid = (status: string) => {
    const s = (status || '').toUpperCase();
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

  const appStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Menunggu Verifikasi</span>;
      case 'SURVEY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Survei Lapangan</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">NOP Terbit</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Ditolak</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PBB Bapenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cek tagihan, survei objek baru & bayar PBB warga - Bapenda Kota Baubau</p>
        </div>
        <Building2 className="w-8 h-8 text-baubau-blue dark:text-blue-400" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => { setActiveTab('inquiry'); setError(''); setSuccess(''); }}
          className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'inquiry'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Cek &amp; Bayar Tagihan
        </button>
        <button
          onClick={() => { setActiveTab('survey'); setError(''); setSuccess(''); fetchApplications(); }}
          className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'survey'
              ? 'bg-white dark:bg-gray-700 text-baubau-blue dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>Survei Objek Baru</span>
          <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
            Warga
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); loadHistory(); }}
          className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Tahun Pajak</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  placeholder="2026"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  maxLength={4}
                />
              </div>
            </div>
            <button
              onClick={handleInquiry}
              disabled={loading || nop.length !== 18}
              className="w-full sm:w-auto px-6 py-2.5 bg-baubau-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cek Tagihan</span>
            </button>
          </div>

          {inquiryResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{inquiryResult.nama_wp}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">NOP: {inquiryResult.nop}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isAlreadyPaid(inquiryResult.status_bayar)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {inquiryResult.status_bayar}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Tahun Pajak" value={inquiryResult.tahun} />
                <DetailRow label="Alamat Objek" value={inquiryResult.alamat_wp || '-'} />
                <DetailRow label="Kelurahan" value={inquiryResult.kelurahan || '-'} />
                <DetailRow label="Kota" value={inquiryResult.kota || 'Kota Baubau'} />
                <DetailRow label="PBB Pokok" value={formatCurrency(inquiryResult.pbb_pokok)} />
                <DetailRow label="Denda" value={formatCurrency(inquiryResult.denda)} />
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total Tagihan:</span>
                <span className="text-xl font-bold text-baubau-blue dark:text-blue-400">
                  {formatCurrency(inquiryResult.total_harus_dibayar)}
                </span>
              </div>

              {!isAlreadyPaid(inquiryResult.status_bayar) && !paymentResult && (
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  <span>Bayar Sekarang ({formatCurrency(inquiryResult.total_harus_dibayar)})</span>
                </button>
              )}

              {paymentResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Pembayaran Berhasil Dilakukan</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">NTPD:</span> <span className="font-mono font-semibold">{paymentResult.ntpd}</span></div>
                    <div><span className="text-gray-500">Total:</span> <span className="font-bold">{formatCurrency(paymentResult.total_bayar)}</span></div>
                  </div>
                  <button
                    onClick={() => handlePrint({
                      id: paymentResult.transaction_id,
                      nop: paymentResult.nop,
                      tahun: paymentResult.tahun,
                      total_bayar: String(paymentResult.total_bayar),
                      ntpd: paymentResult.ntpd,
                      payment_status: 'success',
                      wp_name: paymentResult.wp_name,
                      created_at: new Date().toISOString(),
                    })}
                    className="w-full py-2 bg-baubau-blue text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Struk Pembayaran</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───── Survei Objek Baru Tab (Sinkron dengan Mobile & Admin) ───── */}
      {activeTab === 'survey' && (
        <div className="space-y-4">
          {/* Filter & Kontrol */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-baubau-blue" />
                  Daftar Pendaftaran Objek Pajak Baru dari Warga
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Verifikasi fisik lapangan pengajuan NOP PBB (SPOP/LSPOP Digital)
                </p>
              </div>
              <button
                onClick={fetchApplications}
                disabled={appsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${appsLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
                  placeholder="Cari Nama, NIK, NIB BPN, No. Sertifikat..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={appStatusFilter}
                  onChange={(e) => { setAppStatusFilter(e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium"
                >
                  <option value="">Semua Status</option>
                  <option value="PENDING">Menunggu Verifikasi (Pending)</option>
                  <option value="SURVEY">Tinjauan Lapangan (Survei)</option>
                  <option value="APPROVED">NOP Resmi Terbit</option>
                  <option value="REJECTED">Ditolak</option>
                </select>
              </div>
            </div>
          </div>

          {/* List Cards */}
          {appsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-baubau-blue" />
              <p className="text-xs text-gray-500 mt-2">Memuat permohonan NOP dari server...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tidak ada data permohonan objek baru</p>
              <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const hasBgn = Number(app.building_area || 0) > 0 || app.metadata?.has_building;
                const bgnArea = Number(app.building_area || 0);
                const isOther = app.registered_for === 'other';

                return (
                  <div
                    key={app.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm hover:border-blue-300 transition-all"
                  >
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-baubau-blue">#{app.id}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {isOther ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            <UserCheck size={10} /> Kuasa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <ShieldCheck size={10} /> Pribadi
                          </span>
                        )}
                      </div>
                      <div>
                        {appStatusBadge(app.status)}
                      </div>
                    </div>

                    {/* Informasi Pemohon & Alamat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{app.name}</div>
                        <div className="text-gray-500 font-mono mt-0.5">NIK: {app.nik}</div>
                        {isOther && app.owner_name && (
                          <div className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded mt-1">
                            Pemilik Asli: <strong>{app.owner_name}</strong>
                          </div>
                        )}
                        <div className="text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                          <strong>Lokasi:</strong> {app.address}
                        </div>
                      </div>

                      {/* Detail Objek Tanah & Bangunan */}
                      <div className="space-y-1.5 bg-gray-50 dark:bg-gray-750 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Luas Tanah:</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{app.land_area} m²</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Bangunan Fisik:</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400">
                            {hasBgn ? `${bgnArea} m²` : 'Tanah Kosong'}
                          </span>
                        </div>
                        {app.metadata?.building_usage && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">Peruntukan:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{app.metadata.building_usage}</span>
                          </div>
                        )}
                        {app.metadata?.certificate_number && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">No. Sertifikat:</span>
                            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">{app.metadata.certificate_number}</span>
                          </div>
                        )}
                        {app.nop && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-bold text-emerald-700">NOP Resmi:</span>
                            <span className="font-mono font-bold text-emerald-700 text-xs">{app.nop}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lampiran Dokumen Warga & Foto Bangunan */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Dokumen Permohonan Warga
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {/* Akte / Sertifikat */}
                        {app.akte_file_path && (
                          <a
                            href={getFileUrl(app.akte_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between"
                          >
                            <span className="truncate font-medium">Sertifikat Tanah</span>
                            <ExternalLink size={12} className="shrink-0 ml-1" />
                          </a>
                        )}

                        {/* e-KTP */}
                        {app.ktp_file_path && app.ktp_file_path !== 'verified_via_account' && (
                          <a
                            href={getFileUrl(app.ktp_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 flex items-center justify-between"
                          >
                            <span className="truncate font-medium">KTP Pemilik</span>
                            <ExternalLink size={12} className="shrink-0 ml-1" />
                          </a>
                        )}

                        {/* PBG / IMB (Opsional) */}
                        {app.imb_file_path ? (
                          <a
                            href={getFileUrl(app.imb_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-between"
                          >
                            <span className="truncate font-medium">Dokumen PBG</span>
                            <ExternalLink size={12} className="shrink-0 ml-1" />
                          </a>
                        ) : (
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-400 border border-dashed border-gray-200 text-center truncate">
                            {hasBgn ? 'PBG (Opsional/Bila Ada)' : 'Tanah Kosong'}
                          </div>
                        )}

                        {/* Foto Fisik Bangunan dari Warga */}
                        {app.metadata?.building_photo_path ? (
                          <a
                            href={getFileUrl(app.metadata.building_photo_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 font-bold flex items-center justify-between"
                          >
                            <span className="truncate flex items-center gap-1">
                              <Camera size={12} className="text-amber-700 shrink-0" />
                              <span>Foto Bangunan</span>
                            </span>
                            <ExternalLink size={12} className="shrink-0 ml-1 text-amber-700" />
                          </a>
                        ) : (
                          <div className="p-2 rounded-lg bg-gray-50 text-gray-400 border border-dashed border-gray-200 text-center truncate">
                            Tanpa Foto Warga
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Foto Bangunan Warga jika ada */}
                    {app.metadata?.building_photo_path && (
                      <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center gap-3">
                        <img
                          src={getFileUrl(app.metadata.building_photo_path)}
                          alt="Foto Bangunan Pemohon"
                          className="w-14 h-14 object-cover rounded-lg border border-amber-300 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-950">Foto Fisik Bangunan Tampak Depan (Wajib Pajak)</p>
                          <p className="text-[11px] text-amber-800">
                            Gunakan sebagai acuan visual peninjauan objek saat mendatangi lokasi lapangan.
                          </p>
                        </div>
                        <a
                          href={getFileUrl(app.metadata.building_photo_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-amber-200 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-300 shrink-0"
                        >
                          Buka Foto
                        </a>
                      </div>
                    )}

                    {/* Hasil Survei Petugas Lapangan Sebelumnya jika ada */}
                    {app.status === 'SURVEY' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1.5 text-xs">
                        <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-blue-600" />
                          <span>Catatan Hasil Tinjauan Lapangan</span>
                        </div>
                        <p className="text-blue-950 dark:text-blue-200">{app.survey_notes || 'Tinjauan lapangan telah dilakukan.'}</p>
                        {app.survey_photo_path && (
                          <a
                            href={getFileUrl(app.survey_photo_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-baubau-blue font-bold hover:underline mt-1"
                          >
                            <Camera size={12} /> Lihat Foto Survei Lapangan
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action Buttons: Navigasi GPS & Input Survei */}
                    <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        {app.latitude && app.longitude ? (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${app.latitude},${app.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors"
                          >
                            <Navigation size={12} />
                            <span>Navigasi Peta ({Number(app.latitude).toFixed(4)}, {Number(app.longitude).toFixed(4)})</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Koordinat GPS belum tercatat</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenSurveyModal(app)}
                        className="px-3.5 py-1.5 bg-baubau-blue hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Camera size={13} />
                        <span>{app.status === 'SURVEY' ? 'Perbarui Hasil Survei' : 'Input Hasil Survei Lapangan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───── Modal Input Hasil Survei Lapangan Cerdas (3-Tap Flow) ───── */}
      {selectedAppForSurvey && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-baubau-blue" />
                  <span>Tinjauan Lapangan NOP #{selectedAppForSurvey.id}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pemohon: <strong>{selectedAppForSurvey.name}</strong> • Alamat: {selectedAppForSurvey.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppForSurvey(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSurvey} className="space-y-4 text-xs sm:text-sm overflow-y-auto pr-1 flex-1 py-1">
              {/* Komparasi Visual Foto Warga */}
              {selectedAppForSurvey.metadata?.building_photo_path && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>Foto Bangunan dari Wajib Pajak:</span>
                    </span>
                    <a
                      href={getFileUrl(selectedAppForSurvey.metadata.building_photo_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-700 dark:text-amber-300 underline font-bold"
                    >
                      Buka Asli ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={getFileUrl(selectedAppForSurvey.metadata.building_photo_path)}
                      alt="Foto WP"
                      className="w-20 h-20 object-cover rounded-xl border border-amber-300 shrink-0 bg-amber-100"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (selectedAppForSurvey.metadata?.building_photo_path?.startsWith('http')) {
                          target.src = selectedAppForSurvey.metadata.building_photo_path;
                        } else {
                          target.src = 'https://res.cloudinary.com/ddhgtgsed/image/upload/v1790060510/pbb_applications/building_photos/qop1hljmrhoutf4xpl7a.jpg';
                        }
                      }}
                    />
                    <div className="flex-1 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                      <p>Cocokkan foto ini dengan bangunan riil di depan Anda saat ini.</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        Luas Tanah: {selectedAppForSurvey.land_area} m² • Luas Bgn: {selectedAppForSurvey.building_area || 0} m²
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Titik GPS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                  <span>1. Kesesuaian Titik Lokasi GPS</span>
                  {selectedAppForSurvey.latitude && selectedAppForSurvey.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedAppForSurvey.latitude},${selectedAppForSurvey.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Navigation size={11} /> Cek di Peta
                    </a>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSurveyLocationMatch(true)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      surveyLocationMatch
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 size={14} className={surveyLocationMatch ? 'text-emerald-600' : 'text-gray-400'} />
                    <span>✓ Sesuai Koordinat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyLocationMatch(false)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !surveyLocationMatch
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <XCircle size={14} className={!surveyLocationMatch ? 'text-rose-600' : 'text-gray-400'} />
                    <span>✕ Beda Lokasi / Titik Geser</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Karakteristik Fisik */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  2. Kondisi Fisik Faktual di Lapangan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'TANAH_KOSONG', label: 'Tanah Kosong (0 m²)', desc: 'Belum ada bangunan' },
                    { id: 'HUNIAN_SEDERHANA', label: 'Hunian Sederhana', desc: '≤ 100 m² (Kategori A)' },
                    { id: 'BANGUNAN_BESAR', label: 'Bangunan Menengah/Besar', desc: '> 100 m² (Kategori B)' },
                    { id: 'FASUM', label: 'Fasilitas Umum / Sosial', desc: 'Masjid/Gereja/Balai' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSurveyPhysicalCondition(item.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        surveyPhysicalCondition === item.id
                          ? 'bg-blue-50 border-baubau-blue text-baubau-blue ring-2 ring-baubau-blue/20'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className="text-[10px] text-gray-500">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Ambil Foto Lapangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  3. Foto Bukti Lapangan (Kamera Petugas)
                </label>
                {surveyPhotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center gap-3">
                    <img
                      src={surveyPhotoPreview}
                      alt="Preview Survei"
                      className="w-16 h-16 object-cover rounded-lg border border-emerald-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-900 truncate">
                        {surveyPhotoFile ? surveyPhotoFile.name : 'Foto Lapangan Tersimpan'}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium">✓ Foto bukti siap dilampirkan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSurveyPhotoFile(null); setSurveyPhotoPreview(null); }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Hapus foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelected}
                      className="hidden"
                    />
                    <div className="py-3.5 px-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-100/60 text-blue-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                      <Camera size={18} className="text-baubau-blue shrink-0" />
                      <span>Ambil Foto Langsung dari Kamera HP</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Step 4: Rekomendasi Akhir Petugas (1-Tap) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  4. Rekomendasi Hasil Survei untuk Admin Bapenda
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSurveyRecommendation('RECOMMENDED');
                      if (!surveyNotesInput.trim() || surveyNotesInput.includes('tidak sesuai')) {
                        setSurveyNotesInput('Fisik objek telah diverifikasi faktual di lapangan. Kondisi fisik bangunan dan koordinat sesuai permohonan. Direkomendasikan untuk penetapan NOP SISMIOP.');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      surveyRecommendation === 'RECOMMENDED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 font-black ring-2 ring-emerald-600 ring-offset-1'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">✓ LAYAK TERBIT NOP</div>
                    <div className="text-[10px] opacity-90 font-normal">Sesuai Faktual Lapangan</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSurveyRecommendation('NEEDS_REVISION');
                      if (!surveyNotesInput.trim() || surveyNotesInput.includes('Direkomendasikan')) {
                        setSurveyNotesInput('');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      surveyRecommendation === 'NEEDS_REVISION'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20 font-black ring-2 ring-rose-600 ring-offset-1'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">✕ PERLU KOREKSI</div>
                    <div className="text-[10px] opacity-90 font-normal">Terdapat Ketidaksesuaian</div>
                  </button>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 block">
                  Catatan Tambahan (Otomatis / Khusus):
                </label>
                <textarea
                  rows={2}
                  value={surveyNotesInput}
                  onChange={(e) => setSurveyNotesInput(e.target.value)}
                  placeholder={
                    surveyRecommendation === 'RECOMMENDED'
                      ? 'Catatan standar otomatis terisi...'
                      : 'Contoh: Luas fisik bangunan berbeda (riil 120 m²), atau tanah berada di luar batas sertifikat.'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-baubau-blue focus:outline-none"
                />
              </div>

              {/* Tombol Simpan (Sticky / Pinned Footer) */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 shrink-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedAppForSurvey(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingSurvey}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md ${
                    surveyRecommendation === 'RECOMMENDED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  } disabled:opacity-50`}
                >
                  {submittingSurvey ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Kirim Hasil Survei ke Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── History Tab ───── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari NOP..."
                value={searchNop}
                onChange={(e) => setSearchNop(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadHistory}
              disabled={txLoading}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <Loader2 className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {txLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-baubau-blue" />
              <p className="text-sm text-gray-500 mt-2">Memuat riwayat...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p>Belum ada riwayat transaksi</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                    <tr>
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
