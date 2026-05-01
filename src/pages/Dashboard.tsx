import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  Loader2, 
  QrCode, 
  Search as SearchIcon, 
  CreditCard,
  Map as MapIcon,
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  ImagePlus
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
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
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [potentials, setPotentials] = useState<Potential[]>([]);
  const [retributionTypes, setRetributionTypes] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      alert('Gagal mengambil tagihan pending');
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
        proof_url: uploadedProofUrl // Terlampir if available
      });
      alert(`Pembayaran periode ${paymentModal.selectedPeriod} berhasil dicatat`);
      setPaymentModal(prev => ({ ...prev, isOpen: false, submitting: false }));
      // Refresh map & stats
      fetchDashboardData();
    } catch (error) {
      console.error('Payment failed', error);
      alert('Gagal memproses pembayaran atau mengunggah gambar');
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
          <Loader2 className="w-12 h-12 animate-spin text-[#2d5cd5]" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  const createCustomIcon = (iconUrl: string | null, seed: any, status?: string) => {
    // If it's a taxpayer, use a user icon with color based on payment status
    if (status === 'taxpayer') {
      const color = seed?.is_paid ? '#10b981' : '#ef4444'; // Emerald-500 for paid, Red-500 for unpaid
      const label = seed?.is_paid ? 'LUNAS' : 'BELUM BAYAR';
      
      const photoUrl = seed?.taxpayer_photo?.startsWith('http') 
        ? seed.taxpayer_photo 
        : (seed?.taxpayer_photo ? `${import.meta.env.VITE_API_URL}${seed.taxpayer_photo.startsWith('/') ? '' : '/'}${seed.taxpayer_photo}` : null);

      const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed?.name || 'default'}&backgroundColor=b6e3f4`;

      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative;">
          </div>
        </div>
      `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });
    }

    const finalIconUrl = iconUrl?.startsWith('http') 
      ? iconUrl 
      : (iconUrl ? `${import.meta.env.VITE_API_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}` : `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=2563eb&shape1Color=white`);

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
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          overflow: hidden;
          border: 2px solid #10b981;
        ">
          <img src="${finalIconUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-32 w-full max-w-full overflow-hidden">
      
      {/* Desktop Top Section */}
      <div className="hidden lg:flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200 border border-slate-100">
            <img src="/mitra-logo.png" alt="Logo" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Pusat Kendali
              <span className="text-[10px] font-black bg-[#2d5cd5] text-white px-3 py-1 rounded-full uppercase tracking-widest align-middle">Beta</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">Halo, {user?.name}. Berikut ringkasan aktivitas hari ini.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Filters */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button 
              onClick={() => { setFilterType('day'); setCurrentDate(new Date()); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'day' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Harian
            </button>
            <button 
              onClick={() => { setFilterType('week'); setCurrentDate(new Date()); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'week' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Pekanan
            </button>
            <button 
              onClick={() => { setFilterType('month'); setCurrentDate(new Date()); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'month' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Bulanan
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button onClick={handlePrev} className="p-1 hover:bg-slate-50 rounded-full"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2 min-w-[140px] justify-center text-[#2d5cd5]">
              <Calendar size={14} />
              <span className="text-xs font-black uppercase tracking-widest">{getDisplayDate()}</span>
            </div>
            <button onClick={handleNext} className="p-1 hover:bg-slate-50 rounded-full"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Mobile Title & Navigator */}
      <div className="lg:hidden flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight shrink-0">Dashboard</h2>
            <ZoomControl variant="inline" />
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
            <button onClick={handlePrev} className="p-2 text-[#2d5cd5] active:bg-slate-50 transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2d5cd5] px-1 whitespace-nowrap">{getDisplayDate(true)}</span>
            <button onClick={handleNext} className="p-2 text-[#2d5cd5] active:bg-slate-50 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner w-full mb-2">
          <button 
            onClick={() => { setFilterType('day'); setCurrentDate(new Date()); }}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'day' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400'}`}
          >
            Harian
          </button>
          <button 
            onClick={() => { setFilterType('week'); setCurrentDate(new Date()); }}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'week' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400'}`}
          >
            Pekanan
          </button>
          <button 
            onClick={() => { setFilterType('month'); setCurrentDate(new Date()); }}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${filterType === 'month' ? 'bg-white dark:bg-slate-700 text-[#2d5cd5] shadow-sm' : 'text-slate-400'}`}
          >
            Bulanan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#2d5cd5] to-blue-500 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-blue-500/30 group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6 sm:gap-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Pendapatan</p>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{formatLargeCurrency(stats?.total_revenue || 0)}</h3>
                </div>
                <button 
                  onClick={() => navigate('/billing')}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-90"
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                  {stats?.trends.revenue || '+0%'}
                </div>
                <p className="text-blue-100 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">vs periode lalu</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full">
            {[
              { 
                label: 'Tingkat Penagihan', 
                value: `${stats?.collection_rate || 0}%`, 
                trend: 'up',
                icon: TrendingUp, 
                bg: 'bg-emerald-500/10', 
                text: 'text-emerald-600',
              },
              { 
                label: 'Tagihan Pending', 
                value: stats?.pending_bills.toLocaleString() || '0', 
                trend: 'down',
                icon: FileText, 
                bg: 'bg-amber-500/10', 
                text: 'text-amber-600',
              },
              { 
                label: 'Wajib Retribusi Aktif', 
                value: stats?.active_taxpayers.toLocaleString() || '0', 
                trend: 'up',
                icon: Users, 
                bg: 'bg-indigo-500/10', 
                text: 'text-indigo-600',
              }
            ].map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div className={`${kpi.bg} w-10 h-10 rounded-xl flex items-center justify-center ${kpi.text} mb-4 group-hover:scale-110 transition-transform`}>
                  <kpi.icon size={20} />
                </div>
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">{kpi.label}</p>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{kpi.value}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map + Petugas Achievement Section */}
      {stats?.petugas_achievement && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 origin-left">
          {/* Map - Left Side */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-2 shadow-xl overflow-hidden group h-full min-h-[300px] sm:min-h-[380px]">
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <h3 className="text-[11px] sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <MapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2d5cd5]" />
                Peta Potensi
              </h3>
              <button 
                onClick={() => navigate('/peta')}
                className="text-[9px] font-black text-[#2d5cd5] uppercase tracking-widest hover:underline"
              >
                Lihat Peta Penuh →
              </button>
            </div>
            <div className="h-[250px] sm:h-[calc(100%-4rem)] rounded-3xl overflow-hidden relative">
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
                        <p className="text-[10px] text-[#2d5cd5] font-black uppercase mb-2 tracking-wider">{potential.agency}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-[0.15em] ${potential.status === 'taxpayer' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {potential.status === 'taxpayer' ? 'Wajib Pajak' : 'Zona Potensi'}
                          </span>
                          {potential.status === 'taxpayer' && (
                            <span className={`inline-flex px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-[0.15em] ${potential.is_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {potential.is_paid ? 'Lunas' : 'Belum Bayar'}
                            </span>
                          )}
                        </div>

                        {potential.status === 'taxpayer' && (
                          <div className="pt-2 border-t mt-2 text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Klasifikasi</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                                {potential.classification_name || 'N/A'}
                              </span>
                            </div>
                            
                            {potential.tax_object_id && (
                              <div className="flex flex-col gap-2 mt-3">
                                <button 
                                  onClick={() => navigate('/calculator', {
                                    state: {
                                      taxObjectId: potential.tax_object_id,
                                      classificationId: potential.retribution_classification_id,
                                      defaultVars: {}
                                    }
                                  })}
                                  className="w-full py-2 bg-[#2d5cd5] hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calculator"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
                                  Buat SKPD (On-Site Billing)
                                </button>
                                
                                  <button
                                    onClick={() => handleOpenPayment(potential.tax_object_id!, potential.name)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                                    Bayar Tagihan
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white shadow-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#10b981] rounded-full border border-white shadow-sm"></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lunas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#ef4444] rounded-full border border-white shadow-sm"></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Belum Bayar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pencapaian Saya - Right Side */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
             <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <TrendingUp size={28} />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Pencapaian Saya</h4>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.petugas_achievement.total_amount)}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-3xl font-black text-emerald-500">{stats.petugas_achievement.collections_count}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Koleksi</p>
                </div>
             </div>
              <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 relative z-10">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WP Terdaftar</p>
                   <p className="text-xl font-black text-slate-900 dark:text-white">{stats.petugas_achievement.taxpayers_registered}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rasio Berhasil</p>
                   <p className="text-xl font-black text-slate-900 dark:text-white">{Math.round((stats.petugas_achievement.collections_count / (stats.petugas_achievement.collections_count + (stats.pending_bills / 10))) * 100) || 100}%</p>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Quick Actions Panel (Desktop & Tablet) */}
      <div className="hidden lg:grid grid-cols-2 gap-6">
        <button 
          onClick={() => navigate('/taxpayers')}
          className="relative overflow-hidden group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all text-left"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-all duration-700"></div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-[#2d5cd5] group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Tambah Wajib Pajak</h3>
              <p className="text-sm text-slate-500 font-medium">Daftarkan subjek retribusi baru langsung dari lapangan</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => navigate('/peta')}
          className="relative overflow-hidden group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all text-left"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <MapIcon size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Cek Peta Lapangan</h3>
              <p className="text-sm text-slate-500 font-medium">Pantau sebaran titik potensi objek pajak secara real-time</p>
            </div>
          </div>
        </button>
      </div>

      {/* Buttons (Mobile Quick Actions) */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/taxpayers')}
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-[#2d5cd5]">
              <Plus size={20} />
            </div>
            Tambah WP
          </button>
          <button 
            onClick={() => navigate('/scanner')}
            className="flex flex-col items-center justify-center gap-2 bg-[#2d5cd5] text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode size={20} />
            </div>
            Scan QR
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/billing')}
            className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
              <SearchIcon size={20} />
            </div>
            Cari WP
          </button>
          <button 
            onClick={() => navigate('/peta')}
            className="flex flex-col items-center justify-center gap-2 bg-emerald-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MapIcon size={20} />
            </div>
            Peta Lokasi
          </button>
        </div>

        <button 
          onClick={() => navigate('/field-check')}
          className="flex items-center justify-center gap-3 bg-slate-800 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          <Activity size={18} />
          Laporan Lapangan (GPS)
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Kategori</h2>
          <button 
            onClick={() => navigate('/master-data')}
            className="text-[10px] font-black text-slate-400 hover:text-[#2d5cd5] uppercase tracking-[0.2em] transition-colors"
          >
            Lihat Semua
          </button>
        </div>
        
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar lg:grid lg:grid-cols-6 lg:gap-6 relative">
          {retributionTypes.slice(0, 6).map((type, i) => (
            <button
              key={type.id || i}
              onClick={() => navigate(`/billing?type=${type.id}`)}
              className="flex-shrink-0 w-32 lg:w-full bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                <img 
                  src={type.icon?.startsWith('http') ? type.icon : (type.icon ? `${import.meta.env.VITE_API_URL}${type.icon.startsWith('/') ? '' : '/'}${type.icon}` : `/mitra-logo.png`)} 
                  alt={type.name} 
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/mitra-logo.png`;
                  }}
                />
              </div>
              <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider line-clamp-1">{type.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Aktivitas</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm overflow-hidden relative group">
          <div className="flex items-start justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#2d5cd5] rounded-full"></div>
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></div>
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</span>
              </div>
            </div>
          </div>
          
          <div className="h-40 sm:h-48 relative w-full overflow-hidden mt-2 sm:mt-4">
            <svg viewBox="0 0 400 150" className="w-full h-full preserve-3d">
              {[30, 60, 90, 120].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" className="text-slate-50 dark:text-slate-800/50" strokeWidth="1" />
              ))}
              
              {chartPath && (
                <path 
                  d={chartPath} 
                  fill="none" 
                  stroke="#2d5cd5" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  className="drop-shadow-[0_8px_15px_rgba(45,92,213,0.3)]"
                />
              )}
              
              <path 
                d="M 0 120 Q 50 90 100 110 T 200 100 T 300 70 T 400 90" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3" 
                strokeDasharray="8 6"
                strokeLinecap="round"
                className="opacity-40"
              />
            </svg>
            
            <div className="absolute left-0 bottom-0 top-0 flex flex-col justify-between text-[9px] font-black text-slate-300 uppercase py-2">
              <span>{formatLargeCurrency(Math.max(...revenueData.map(d => Number(d.amount))) || 0)}</span>
              <span>0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Riwayat Transaksi</h2>
          <button className="text-[10px] font-black text-slate-400 hover:text-[#2d5cd5] uppercase tracking-[0.2em] transition-colors">Lihat Semua</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="col-span-12 space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50`}>
                      <FileText className={`w-7 h-7 text-[#2d5cd5]`} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-1">{item.taxpayer_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors uppercase tracking-widest">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white mb-1">{formatCurrency(Number(item.amount))}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#2d5cd5] bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                      {recentTransactions.find(t => t.id === item.id)?.status || 'Verified'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                Belum ada riwayat transaksi
              </div>
            )}
          </div>
        </div>
      </div>
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Bayar Tagihan</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{paymentModal.taxpayerName}</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                disabled={paymentModal.submitting}
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {paymentModal.loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2d5cd5] mb-4" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mencari Tagihan...</p>
                </div>
              ) : paymentModal.periods.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card text-slate-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Tidak ada tagihan tertunggak</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Wajib Pajak ini telah melunasi semua tagihan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Periode Tunggakan</label>
                     <select
                       value={paymentModal.selectedPeriod}
                       onChange={(e) => setPaymentModal(prev => ({...prev, selectedPeriod: e.target.value}))}
                       className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#2d5cd5] outline-none"
                     >
                       {paymentModal.periods.map(p => (
                         <option key={p.period} value={p.period}>
                           Periode {p.period} - Rp {(p.total_amount || p.amount || 0).toLocaleString('id-ID')}
                         </option>
                       ))}
                     </select>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Bayar Kasir</span>
                       <span className="text-lg font-black text-[#2d5cd5]">
                         Rp {(paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod)?.total_amount || paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod)?.amount || 0).toLocaleString('id-ID')}
                       </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {paymentModal.periods.length > 0 && !paymentModal.loading && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {/* Upload Bukti Pembayaran */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bukti Pembayaran (Opsional)</label>
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${paymentModal.proofFile ? 'border-[#2d5cd5] bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'}`}>
                      {paymentModal.proofFile ? (
                        <>
                          <img src={URL.createObjectURL(paymentModal.proofFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                          <div className="z-10 flex flex-col items-center bg-white/80 dark:bg-black/60 px-4 py-2 rounded-xl text-center">
                            <span className="text-xs font-black text-[#2d5cd5] dark:text-blue-400 truncate max-w-[150px]">{paymentModal.proofFile.name}</span>
                            <span className="text-[9px] font-bold text-blue-500 uppercase mt-1">Ganti Foto</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-500">Ketuk untuk Ambil Foto</span>
                          <span className="text-[9px] font-medium text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setPaymentModal(prev => ({...prev, proofFile: e.target.files![0]}));
                          }
                        }} 
                      />
                    </label>
                  </div>

                 <button
                   onClick={handleProcessPayment}
                   disabled={paymentModal.submitting}
                   className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                 >
                   {paymentModal.uploadingProof ? (
                     <><Loader2 className="w-4 h-4 animate-spin"/> MENGUNGGAH BUKTI...</>
                   ) : paymentModal.submitting ? (
                     <><Loader2 className="w-4 h-4 animate-spin" /> MEMPROSES...</>
                   ) : (
                     'Proses Pembayaran TUNAI'
                   )}
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
