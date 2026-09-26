// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  Loader2, 
  QrCode, 
  Search as SearchIcon, 
  Map as MapIcon,
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  ImagePlus,
  Wallet,
  Bell,
  Menu,
  Building2,
  Flag,
  CheckCircle2,
  ShieldCheck,
  Home as HomeIcon,
  User as UserIcon,
  MapPin,
  Store,
  Wrench,
  Gauge,
  ClipboardList,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { isDisperindagOfficer, isPuprOfficer } from '../lib/officerRoleUtils';
import ZoomControl from '../components/ZoomControl';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Stats {
  total_revenue: number;
  collection_rate: number;
  pending_bills: number;
  active_taxpayers: number;
  petugas_achievement?: {
    collections_count: number;
    total_amount: number;
    taxpayers_registered: number;
  } | null;
  trends: {
    revenue: string;
    collection_rate: string;
    pending_bills: string;
    active_taxpayers: string;
  };
}

interface RevenueItem {
  month: string;
  amount: string | number;
}

interface Potential {
  position: [number, number];
  name: string;
  agency: string;
  address?: string;
  status: string;
  is_paid?: boolean;
  classification_name?: string;
  taxpayer_photo?: string | null;
  icon?: string | null;
  retribution_type_id?: number | string;
  tax_object_id?: number | string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isPupr = isPuprOfficer(user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [potentials, setPotentials] = useState<Potential[]>([]);
  const [retributionTypes, setRetributionTypes] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'beranda' | 'transaksi' | 'peta' | 'laporan'>('beranda');
  
  // Date Filtering State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('month');

  // Modal Pembayaran State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    taxObjectId: string | number | null;
    taxpayerName: string;
    loading: boolean;
    submitting: boolean;
    periods: any[];
    selectedPeriod: string;
    proofFile: File | null;
    uploadingProof: boolean;
  }>({
    isOpen: false, taxObjectId: null, taxpayerName: '', loading: false, submitting: false, periods: [], selectedPeriod: '', proofFile: null, uploadingProof: false
  });

  const handleOpenPayment = async (taxObjectId: string | number, taxpayerName: string) => {
    setPaymentModal(prev => ({ ...prev, isOpen: true, loading: true, taxObjectId, taxpayerName, periods: [], selectedPeriod: '', proofFile: null, uploadingProof: false }));
    try {
      const res = await api.get(`/api/tax-objects/${taxObjectId}/pending-periods`);
      const periods = res.data || res;
      setPaymentModal(prev => ({ 
        ...prev, 
        loading: false, 
        periods,
        selectedPeriod: periods.length > 0 ? periods[0].period : ''
      }));
    } catch (error) {
      console.error('Failed to load periods', error);
      toast.error('Gagal mengambil tagihan pending');
      setPaymentModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'retribusi/bukti_bayar');

    const res = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.url || res.url;
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.taxObjectId || !paymentModal.selectedPeriod) return;
    setPaymentModal(prev => ({ ...prev, submitting: true }));
    let uploadedProofUrl = null;

    try {
      if (paymentModal.proofFile) {
        setPaymentModal(prev => ({ ...prev, uploadingProof: true }));
        uploadedProofUrl = await uploadToCloudinary(paymentModal.proofFile);
      }

      const selectedObj = paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod);
      await api.post('/api/payments', {
        tax_object_id: Number(paymentModal.taxObjectId),
        billing_period: paymentModal.selectedPeriod,
        payment_method: 'cash',
        amount: selectedObj?.total_amount || selectedObj?.amount || 0,
        proof_url: uploadedProofUrl
      });
      toast.success(`Pembayaran periode ${paymentModal.selectedPeriod} berhasil dicatat`);
      setPaymentModal(prev => ({ ...prev, isOpen: false, submitting: false }));
      fetchDashboardData();
    } catch (error) {
      console.error('Payment failed', error);
      toast.error('Gagal memproses pembayaran atau mengunggah gambar');
      setPaymentModal(prev => ({ ...prev, submitting: false, uploadingProof: false }));
    }
  };

  const getDayDates = (date: Date) => {
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);
    return { start, end };
  };

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0,0,0,0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    return { start, end };
  };

  const getMonthDates = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let range;
      if (filterType === 'day') range = getDayDates(currentDate);
      else if (filterType === 'week') range = getWeekDates(currentDate);
      else range = getMonthDates(currentDate);

      const params = {
        start_date: range.start.toISOString().split('T')[0],
        end_date: range.end.toISOString().split('T')[0]
      };

      const [statsRes, trendRes, mapRes, typesRes, recentRes] = await Promise.all([
        api.get('/api/dashboard/stats', { params }),
        api.get('/api/dashboard/revenue-trend', { params }),
        api.get('/api/dashboard/map-potentials'),
        api.get('/api/retribution-types?is_active=1'),
        api.get('/api/reports/recent'),
      ]);

      setStats(statsRes);
      setRevenueData(trendRes);
      setPotentials(mapRes);
      setRetributionTypes(typesRes.data || typesRes);
      setRecentTransactions(recentRes.data || recentRes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, filterType]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (filterType === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (filterType === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (filterType === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (filterType === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const getDisplayDate = (short = false) => {
    if (filterType === 'day') {
      return currentDate.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: short ? 'short' : 'long', 
        year: 'numeric' 
      });
    }
    if (filterType === 'month') {
      return currentDate.toLocaleString('id-ID', { 
        month: short ? 'short' : 'long', 
        year: 'numeric' 
      });
    }
    const { start, end } = getWeekDates(currentDate);
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatLargeCurrency = (amount: number) => {
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}Jt`;
    return formatCurrency(amount);
  };

  const chartPath = useMemo(() => {
    if (revenueData.length < 2) return '';
    const maxAmount = Math.max(...revenueData.map(d => Number(d.amount))) || 1;
    const points = revenueData.map((d, i) => ({
      x: (i / (revenueData.length - 1)) * 400,
      y: 130 - (Number(d.amount) / maxAmount) * 100
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` Q ${cpX} ${p0.y} ${cpX} ${(p0.y + p1.y) / 2} T ${p1.x} ${p1.y}`;
    }
    return d;
  }, [revenueData]);

  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#00C8E5]" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  const createCustomIcon = (iconUrl: string | null, seed: any, status?: string) => {
    if (status === 'taxpayer') {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="position: relative;"></div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });
    }

    const finalIconUrl = iconUrl?.startsWith('http') 
      ? iconUrl 
      : (iconUrl ? `${import.meta.env.VITE_API_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}` : `/mitra-logo.png`);

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 32px; 
          height: 32px; 
          background: white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 2px solid #00C8E5;
        ">
          <img src="${finalIconUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const userName = user?.name || 'Budi Santoso';
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-32 w-full max-w-full overflow-hidden font-sans">
      
      {/* ============================================================== */}
      {/* MOBILE DASHBOARD REDESIGN (lg:hidden) - MATCHING MOCKUP */}
      {/* ============================================================== */}
      <div className="lg:hidden flex flex-col gap-5 px-1 pt-1">

        {/* User Greeting Bar */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              Halo, {userName}! 👋
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {isPupr ? 'Petugas Lapangan UPTD Workshop Dinas PUPR' : 'Selamat bertugas hari ini'}
            </p>
          </div>

          <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-[#EBF8FF] text-sky-800 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold border border-sky-100/90 shadow-sm flex items-center gap-1.5 shrink-0">
            <Calendar size={13} className="text-[#00C8E5]" />
            <span>{currentDateStr}</span>
          </div>
        </div>

        {/* Hero Card Khusus Petugas PUPR Aset */}
        {isPupr && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-amber-900/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-amber-100 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                <Wrench className="w-3.5 h-3.5" /> UPTD Peralatan & Workshop PUPR
              </span>
              <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full">
                Sewa Alat Berat
              </span>
            </div>
            <div>
              <h3 className="text-base font-black">Operasional & Survei Lapangan</h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Verifikasi 4 butir kelayakan lokasi proyek, cek akses tronton, dan catat Hour Meter (HM) unit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => navigate('/tasks')}
                className="p-2.5 bg-white text-slate-900 hover:bg-amber-50 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <ClipboardList size={14} className="text-amber-600" />
                <span>Survei Sewa</span>
              </button>
              <button
                onClick={() => navigate('/pupr-inspection')}
                className="p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Gauge size={14} />
                <span>Inspeksi HM</span>
              </button>
            </div>
          </div>
        )}

        {/* 4-Tab Navigation Pills Switcher */}
        <div className="bg-white p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 grid grid-cols-4 gap-1 text-center">
          {isPupr ? (
            <>
              <button
                onClick={() => setActiveTab('beranda')}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'beranda'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <HomeIcon size={14} /> Beranda
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ClipboardList size={14} /> Survei
              </button>
              <button
                onClick={() => navigate('/pupr-inspection')}
                className="py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 text-slate-600 hover:bg-slate-50"
              >
                <Gauge size={14} /> Inspeksi
              </button>
              <button
                onClick={() => navigate('/peta')}
                className="py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 text-slate-600 hover:bg-slate-50"
              >
                <MapPin size={14} /> Peta
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('beranda')}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'beranda'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <HomeIcon size={14} /> Beranda
              </button>
              <button
                onClick={() => { setActiveTab('transaksi'); navigate('/billing'); }}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'transaksi'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText size={14} /> Transaksi
              </button>
              <button
                onClick={() => { setActiveTab('peta'); navigate('/peta'); }}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'peta'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MapPin size={14} /> Peta
              </button>
              <button
                onClick={() => { setActiveTab('laporan'); navigate('/reporting'); }}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === 'laporan'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingUp size={14} /> Laporan
              </button>
            </>
          )}
        </div>

        {/* Peta Aset Daerah Card */}
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#00C8E5]" />
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800">
                PETA ASET DAERAH
              </h3>
            </div>

            <button
              onClick={() => navigate('/peta')}
              className="px-2 py-1 sm:px-3 bg-sky-50 text-sky-700 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-sky-100 transition-colors flex items-center gap-1"
            >
              Lihat Peta Penuh <ChevronRight size={13} />
            </button>
          </div>

          {/* Interactive Map Preview */}
          <div className="h-48 sm:h-56 rounded-2xl sm:rounded-3xl overflow-hidden relative z-0 border border-slate-100">
            <MapContainer center={[-5.47, 122.6]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {potentials.map((potential, index) => (
                <Marker 
                  key={index} 
                  position={potential.position}
                  icon={createCustomIcon(potential.icon || null, potential, potential.status)}
                >
                  <Popup>
                    <div className="p-2 text-xs font-bold">
                      <p>{potential.name}</p>
                      <p className="text-[10px] text-sky-600">{potential.agency}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Legend Pills */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-100 shadow-md flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hotel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Restoran
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Aset Lain
              </span>
            </div>
          </div>
        </div>

        {/* Ringkasan Hari Ini Section (2x2 Grid of Stat Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#00C8E5]" />
              <h3 className="text-sm font-extrabold text-slate-800">
                Ringkasan Hari Ini
              </h3>
            </div>
            <button 
              onClick={() => navigate('/billing')}
              className="text-xs font-bold text-sky-600 flex items-center gap-1 hover:underline"
            >
              Detail <ChevronRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Stat Card 1: Wajib Pajak */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-50 text-sky-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <Wallet size={16} className="sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                  ↑ +12%
                </span>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500">Wajib Pajak</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {stats?.active_taxpayers || 59}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1">dari minggu lalu</p>
              </div>
            </div>

            {/* Stat Card 2: Pemeriksaan */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 text-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <Users size={16} className="sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                  ↑ +2
                </span>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500">Pemeriksaan</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {stats?.petugas_achievement?.collections_count || 8}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1">hari ini</p>
              </div>
            </div>

            {/* Stat Card 3: SPTPD Masuk */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <FileText size={16} className="sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                  ↑ +5%
                </span>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500">SPTPD Masuk</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">24</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1">hari ini</p>
              </div>
            </div>

            {/* Stat Card 4: Tugas Aktif */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <Flag size={16} className="sm:w-5 sm:h-5" />
                </div>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500">Tugas Aktif</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">3</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-1">penugasan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Disperindag Special Officer Banner */}
        {isDisperindagOfficer(user) && (
          <div 
            onClick={() => navigate('/pasar')}
            className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-4 shadow-md cursor-pointer hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">Petugas Pasar Disperindag</span>
                  <span className="text-[9px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">Perda 1/2024</span>
                </div>
                <h4 className="font-extrabold text-sm leading-tight">Terminal Retribusi Pasar</h4>
                <p className="text-[11px] text-emerald-100 font-medium leading-tight mt-0.5">Karcis PKL Rp 1.000 • Los Bulanan • Kios Sewa</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-200 shrink-0 ml-2" />
          </div>
        )}

        {/* Aksi Cepat Section (4 Cards Grid) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-extrabold text-slate-800">
              Aksi Cepat
            </h3>
            <button 
              onClick={() => navigate('/master-data')}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded-full"
            >
              Kelola
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {isPupr ? (
              <>
                {/* Action 1: Survei Sewa */}
                <button
                  onClick={() => navigate('/tasks')}
                  className="bg-amber-50/80 border border-amber-200/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-amber-600 mb-1.5 sm:mb-2">
                    <ClipboardList size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Survei Sewa</span>
                </button>

                {/* Action 2: Inspeksi HM */}
                <button
                  onClick={() => navigate('/pupr-inspection')}
                  className="bg-indigo-50/80 border border-indigo-200/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-1.5 sm:mb-2">
                    <Gauge size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Inspeksi HM</span>
                </button>

                {/* Action 3: Peta Proyek */}
                <button
                  onClick={() => navigate('/peta')}
                  className="bg-sky-50/80 border border-sky-200/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-sky-600 mb-1.5 sm:mb-2">
                    <MapPin size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Peta Proyek</span>
                </button>

                {/* Action 4: Panduan */}
                <button
                  onClick={() => navigate('/user-guide')}
                  className="bg-slate-50 border border-slate-200 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-slate-600 mb-1.5 sm:mb-2">
                    <ShieldCheck size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Panduan UPTD</span>
                </button>
              </>
            ) : (
              <>
                {/* Action 1: Input SPTPD */}
                <button
                  onClick={() => navigate('/sptpd')}
                  className="bg-sky-50/80 border border-sky-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-sky-600 mb-1.5 sm:mb-2">
                    <FileText size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Input SPTPD</span>
                </button>

                {/* Action 2: Cek Wajib Pajak */}
                <button
                  onClick={() => navigate('/taxpayers')}
                  className="bg-emerald-50/80 border border-emerald-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-emerald-600 mb-1.5 sm:mb-2">
                    <Building2 size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Cek Wajib Pajak</span>
                </button>

                {/* Action 3: Scan Aset */}
                <button
                  onClick={() => navigate('/scanner')}
                  className="bg-purple-50/80 border border-purple-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-purple-600 mb-1.5 sm:mb-2">
                    <QrCode size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Scan Aset</span>
                </button>

                {/* Action 4: Laporan Cepat */}
                <button
                  onClick={() => navigate('/reporting')}
                  className="bg-amber-50/80 border border-amber-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl shadow-sm flex items-center justify-center text-amber-600 mb-1.5 sm:mb-2">
                    <TrendingUp size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">Laporan Cepat</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sinergi Banner */}
        <div className="bg-sky-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-sky-200/60 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs leading-tight">
                Sinergi untuk Pendapatan Daerah
              </h4>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Bersama wujudkan pelayanan pajak yang lebih baik
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] w-full">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-2 py-1.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 text-[#00C8E5]"
            >
              <div className="px-3 py-1 bg-sky-50 rounded-xl">
                <HomeIcon size={20} />
              </div>
              <span className="text-[10px] font-extrabold">Beranda</span>
            </button>

            <button
              onClick={() => navigate('/taxpayers')}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 text-slate-400 hover:text-slate-600"
            >
              <Building2 size={20} />
              <span className="text-[10px] font-bold">Wajib Pajak</span>
            </button>

            {/* Central Floating Logo Button */}
            <div className="flex-1 flex flex-col items-center -mt-6">
              <button
                onClick={() => navigate('/scanner')}
                className="w-14 h-14 rounded-full bg-[#0F2547] hover:bg-[#0B1E36] flex items-center justify-center shadow-lg shadow-blue-950/30 border-4 border-white transition-all active:scale-95"
              >
                <img src="/mitra-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              </button>
            </div>

            <button
              onClick={() => navigate('/peta')}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 text-slate-400 hover:text-slate-600"
            >
              <MapPin size={20} />
              <span className="text-[10px] font-bold">Peta</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 text-slate-400 hover:text-slate-600"
            >
              <UserIcon size={20} />
              <span className="text-[10px] font-bold">Profil</span>
            </button>
          </div>
        </nav>

      </div>

      {/* ============================================================== */}
      {/* DESKTOP DASHBOARD VIEW (hidden lg:flex) - FULLY PRESERVED */}
      {/* ============================================================== */}
      <div className="hidden lg:flex flex-col gap-6 lg:gap-8">
        
        {/* Desktop Top Header & Date Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200 border border-slate-100">
              <img src="/mitra-logo.png" alt="Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Pusat Kendali
                <span className="text-[10px] font-black bg-[#0F2547] text-white px-3 py-1 rounded-full uppercase tracking-widest align-middle">Portal</span>
              </h1>
              <p className="text-slate-500 font-medium mt-1">Halo, {user?.name}. Berikut ringkasan aktivitas hari ini.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button 
                onClick={() => { setFilterType('day'); setCurrentDate(new Date()); }}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'day' ? 'bg-white dark:bg-slate-700 text-[#00C8E5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Harian
              </button>
              <button 
                onClick={() => { setFilterType('week'); setCurrentDate(new Date()); }}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'week' ? 'bg-white dark:bg-slate-700 text-[#00C8E5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Pekanan
              </button>
              <button 
                onClick={() => { setFilterType('month'); setCurrentDate(new Date()); }}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'month' ? 'bg-white dark:bg-slate-700 text-[#00C8E5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Bulanan
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button onClick={handlePrev} className="p-1 hover:bg-slate-50 rounded-full"><ChevronLeft size={16} /></button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center text-[#0F2547]">
                <Calendar size={14} />
                <span className="text-xs font-black uppercase tracking-widest">{getDisplayDate()}</span>
              </div>
              <button onClick={handleNext} className="p-1 hover:bg-slate-50 rounded-full"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* Disperindag Special Officer Desktop Banner */}
        {isDisperindagOfficer(user) && (
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-[2rem] p-6 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Petugas Khusus Disperindag</span>
                  <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full">Perda No. 1 Thn 2024</span>
                  <span className="text-xs font-bold bg-emerald-500/50 text-white px-2.5 py-1 rounded-full">Pasar Wameo &amp; Karya Baru</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">Terminal Retribusi Pasar &amp; Los Pedagang</h3>
                <p className="text-sm text-emerald-100 mt-1">Penerbitan Karcis PKL Harian Rp 1.000, Penagihan Meja Los Bulanan Rp 40.000, &amp; Manajemen Kios Sewa.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pasar')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
            >
              Buka Terminal Pasar <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Desktop Revenue Card + KPIs */}
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-4">
            <div className="relative overflow-hidden bg-[#0F2547] rounded-[2rem] p-8 text-white shadow-xl shadow-blue-950/30 group">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-bl-full transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div>
                  <h3 className="text-4xl font-black tracking-tight mb-1">{formatLargeCurrency(stats?.total_revenue || 0)}</h3>
                  <p className="text-blue-100 text-sm font-medium opacity-90">Total Pendapatan Terkumpul</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00C8E5]" />
                    {stats?.trends.revenue || '+0%'} bulan ini
                  </div>

                  <button 
                    onClick={() => navigate('/billing')}
                    className="bg-[#00C8E5] text-white hover:bg-[#00B4D8] px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-8">
            <div className="grid grid-cols-3 gap-6 h-full">
              {[
                { 
                  label: 'Tingkat Penagihan', 
                  value: `${stats?.collection_rate || 0}%`, 
                  icon: TrendingUp, 
                  bg: 'bg-emerald-500/10', 
                  text: 'text-emerald-600',
                },
                { 
                  label: 'Tagihan Pending', 
                  value: stats?.pending_bills.toLocaleString() || '0', 
                  icon: FileText, 
                  bg: 'bg-amber-500/10', 
                  text: 'text-amber-600',
                },
                { 
                  label: 'Wajib Aktif', 
                  value: stats?.active_taxpayers.toLocaleString() || '0', 
                  icon: Users, 
                  bg: 'bg-indigo-500/10', 
                  text: 'text-indigo-600',
                }
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`${kpi.bg} w-12 h-12 rounded-full flex items-center justify-center ${kpi.text} shadow-sm`}>
                      <kpi.icon size={22} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{kpi.value}</h4>
                    <p className="text-slate-500 font-bold text-xs leading-tight uppercase tracking-widest">{kpi.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Map & Achievement Section */}
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-6 bg-white rounded-[2rem] border border-slate-100 p-2 shadow-xl overflow-hidden min-h-[380px]">
            <div className="p-5 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-[#00C8E5]" />
                Peta Potensi Digital
              </h3>
              <button 
                onClick={() => navigate('/peta')}
                className="text-[9px] font-black text-[#00C8E5] uppercase tracking-widest hover:underline"
              >
                Lihat Peta Penuh →
              </button>
            </div>
            <div className="h-[300px] rounded-3xl overflow-hidden relative z-0">
              <MapContainer center={[-5.47, 122.6]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {potentials.map((potential, index) => (
                  <Marker 
                    key={index} 
                    position={potential.position}
                    icon={createCustomIcon(potential.icon || null, potential, potential.status)}
                  >
                    <Popup>
                      <div className="p-3 min-w-[200px] font-sans">
                        <h3 className="font-black text-slate-900 text-sm mb-1">{potential.name}</h3>
                        <p className="text-[10px] text-sky-600 font-black uppercase mb-2 tracking-wider">{potential.agency}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="col-span-6 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Pencapaian Saya</h4>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(stats?.petugas_achievement?.total_amount || 0)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-500">{stats?.petugas_achievement?.collections_count || 0}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Koleksi</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WP Terdaftar</p>
                <p className="text-xl font-black text-slate-900">{stats?.petugas_achievement?.taxpayers_registered || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Penugasan</p>
                <p className="text-xl font-black text-emerald-600">Aktif</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Bayar Tagihan</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{paymentModal.taxpayerName}</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={paymentModal.submitting}
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {paymentModal.loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00C8E5] mb-4" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mencari Tagihan...</p>
                </div>
              ) : paymentModal.periods.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-black text-slate-900 mb-1">Tidak ada tagihan tertunggak</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Wajib Pajak ini telah melunasi semua tagihan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Periode Tunggakan</label>
                    <select
                      value={paymentModal.selectedPeriod}
                      onChange={(e) => setPaymentModal(prev => ({...prev, selectedPeriod: e.target.value}))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#00C8E5] outline-none"
                    >
                      {paymentModal.periods.map(p => (
                        <option key={p.period} value={p.period}>
                          Periode {p.period} - Rp {(p.total_amount || p.amount || 0).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {paymentModal.periods.length > 0 && !paymentModal.loading && (
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={handleProcessPayment}
                  disabled={paymentModal.submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentModal.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proses Pembayaran TUNAI'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
