import { 
  Plus, Edit, Trash2, Search, Loader2, Filter, X, 
  User, CreditCard, MapPin, Phone, Briefcase, 
  FileCheck, Camera, Info, CheckCircle2, XCircle,
  Eye, FileText, Calendar, ExternalLink, MapPinned
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { Taxpayer, Opd, RetributionType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPicker } from '../components/MapPicker';

// Fix for default marker icon in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const BAUBAU_DATA = {
  "Batupoaro": ["Bone-bone", "Tarafu", "Wameo", "Kaobula", "Lanto", "Ngananaumala"],
  "Betoambari": ["Sulaa", "Waborobo", "Labalawa", "Lipu", "Katobengke"],
  "Bungi": ["Bugi", "Gonda Baru", "Kaisabu Baru", "Karya Baru", "Ngkari-Ngkari"],
  "Kokalukuna": ["Kadolomoko", "Waruruma", "Lakologou", "Kadolo", "Liwuto", "Sukanaeyo"],
  "Lea-lea": ["Palabusa", "Kalia-Lia", "Kantalai", "Kolese", "Lowu-Lowu"],
  "Murhum": ["Baadia", "Melai", "Wajo", "Lamangga", "Tanganapada"],
  "Sorawolio": ["Gonda Baru", "Karya Baru", "Bugis", "Gonda"],
  "Wolio": ["Bataraguru", "Tomba", "Wangkanapi", "Wale", "Batulo", "Bukit Wolio Indah", "Kadolokatapi"]
};

const ensureArray = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const CompletionBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="w-full mt-2 group cursor-help relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Integritas Data</span>
      </div>
      <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/50 relative shadow-inner">
        <div 
          className="h-full bg-blue-600 shadow-[2px_0_8px_rgba(37,99,235,0.4)] transition-all duration-1000 ease-out relative flex items-center justify-center"
          style={{ width: `${percentage}%` }}
        >
          {percentage >= 20 && (
            <span className="text-[7px] font-black text-white uppercase tracking-tighter drop-shadow-sm">
              {percentage}%
            </span>
          )}
        </div>
      </div>
      
      {/* Hover Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-black uppercase tracking-widest shadow-xl">
        Kualitas Input: {percentage}%
      </div>
    </div>
  );
};

const StatusIndicator = ({ tp }: { tp: Taxpayer }) => {
  const hasPersonal = !!(tp.nik && tp.name && tp.phone);
  const hasTax = !!(tp.retribution_types && tp.retribution_types.length > 0 && Object.keys(tp.metadata || {}).length > 0);
  
  const isDefaultLoc = (lat: any, lng: any) => {
    const dLat = -5.4632;
    const dLng = 122.6075;
    if (!lat || !lng) return true;
    return Math.abs(parseFloat(lat) - dLat) < 0.0001 && Math.abs(parseFloat(lng) - dLng) < 0.0001;
  };
  
  const hasLocation = !isDefaultLoc((tp as any).latitude, (tp as any).longitude);
  const isActive = !!tp.is_active;

  return (
    <div className="flex items-center gap-3">
      <div className="group relative">
        <User size={16} className={hasPersonal ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-gray-300 dark:text-gray-600'} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
          Identitas: {hasPersonal ? 'SUDAH LENGKAP' : 'BELUM LENGKAP'}
        </div>
      </div>
      <div className="group relative">
        <CreditCard size={16} className={hasTax ? 'text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]' : 'text-gray-300 dark:text-gray-600'} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
          Data Pajak: {hasTax ? 'SUDAH LENGKAP' : 'BELUM LENGKAP'}
        </div>
      </div>
      <div className="group relative">
        <MapPin size={16} className={hasLocation ? 'text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]' : 'text-gray-300 dark:text-gray-600'} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
          Lokasi: {hasLocation ? 'SUDAH LENGKAP' : 'BELUM LENGKAP'}
        </div>
      </div>
      <div className="group relative">
        <CheckCircle2 size={16} className={isActive ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
          Status: {isActive ? 'SUDAH AKTIF' : 'NON-AKTIF'}
        </div>
      </div>
    </div>
  );
};

export default function TaxpayerManagement() {
  const { user } = useAuth();
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [opds, setOpds] = useState<Opd[]>([]);
  const [retributionTypes, setRetributionTypes] = useState<RetributionType[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opdFilter, setOpdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTaxpayer, setEditingTaxpayer] = useState<Taxpayer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCheckingNik, setIsCheckingNik] = useState(false);
  const [foundAssets, setFoundAssets] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taxpayerToDelete, setTaxpayerToDelete] = useState<number | null>(null);
  const nav = useNavigate();

  const [form, setForm] = useState({
    nik: '',
    name: '',
    address: '',
    phone: '',
    npwpd: '',
    object_name: '',
    object_address: '',
    district: '',
    sub_district: '',
    latitude: -5.4632,
    longitude: 122.6075,
    is_active: true,
    opd_id: '',
    retribution_type_ids: [] as number[],
    retribution_classification_ids: [] as number[],
    metadata: {} as Record<string, any>,
  });

  const [files, setFiles] = useState<Record<string, File | null>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        search: search,
        ...(opdFilter ? { opd_id: opdFilter } : user?.role !== 'super_admin' ? { opd_id: user?.opd_id?.toString() || '' } : {}),
      });

      const [taxpayersRes, opdsRes, typesRes, classificationsRes] = await Promise.all([
        api.get(`/api/taxpayers?${queryParams}`),
        user?.role === 'super_admin' ? api.get('/api/opds') : Promise.resolve({ data: [] }),
        api.get('/api/retribution-types'),
        api.get('/api/retribution-classifications'),
      ]);

      setTaxpayers(taxpayersRes.data);
      setTotalPages(taxpayersRes.last_page);
      
      if (user?.role === 'super_admin') {
        setOpds(opdsRes.data || opdsRes);
      }
      
      setRetributionTypes((typesRes.data || typesRes).filter((t: any) => t.is_active));
      setClassifications(classificationsRes.data || classificationsRes);
    } catch (error) {
      console.error('Error fetching taxpayers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, opdFilter]);

  // Auto-open edit modal when coming from detail page
  const location = useLocation();
  useEffect(() => {
    const editId = (location.state as any)?.editId;
    if (editId) {
      // Clear the state so it doesn't re-trigger on navigation
      window.history.replaceState({}, '');
      api.get(`/api/taxpayers/${editId}`).then(res => {
        handleEdit(res.data);
      }).catch(() => {});
    }
  }, [location.state]);

  const handleAdd = () => {
    setEditingTaxpayer(null);
    setFoundAssets([]);
    setForm({
      nik: '',
      name: '',
      address: '',
      phone: '',
      npwpd: '',
      object_name: '',
      object_address: '',
      district: '',
      sub_district: '',
      latitude: -5.4632,
      longitude: 122.6075,
      is_active: true,
      opd_id: user?.opd_id?.toString() || '',
      retribution_type_ids: [],
      retribution_classification_ids: [],
      metadata: {},
    });
    setFiles({
      foto_lokasi_open_kamera: null,
      formulir_data_dukung: null,
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const checkNik = async () => {
    const nikRegex = /^\d{16}$/;
    if (!form.nik || !nikRegex.test(form.nik)) {
      alert('NIK harus terdiri dari 16 digit angka sesuai standar KTP.');
      return;
    }
    
    setIsCheckingNik(true);
    try {
      const res = await api.get(`/api/taxpayers/search/${form.nik}`);
      if (res.found && res.data) {
        setForm(prev => ({
          ...prev,
          name: res.data.name,
          address: res.data.address || '',
          phone: res.data.phone || '',
          npwpd: res.data.npwpd || prev.npwpd,
          district: res.data.district || prev.district,
          sub_district: res.data.sub_district || prev.sub_district,
        }));
        setFoundAssets(res.all_assets || []);
        alert(`Data wajib pajak ditemukan! (Terdeteksi ${res.count} aset terdaftar). Informasi identitas telah otomatis terisi.`);
      } else {
        setFoundAssets([]);
        alert('NIK belum terdaftar di sistem. Silakan lengkapi data profil baru.');
      }
    } catch (error: any) {
      console.error('Error checking NIK:', error);
      alert('Gagal mengecek NIK. Silakan coba lagi.');
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleEdit = (taxpayer: Taxpayer) => {
    setEditingTaxpayer(taxpayer);
    setFoundAssets([]);
    setForm({
      nik: taxpayer.nik ?? '',
      name: taxpayer.name ?? '',
      address: taxpayer.address || '',
      phone: taxpayer.phone || '',
      npwpd: taxpayer.npwpd || '',
      object_name: taxpayer.object_name || '',
      object_address: taxpayer.object_address || '',
      district: (taxpayer as any).district || '',
      sub_district: (taxpayer as any).sub_district || '',
      is_active: taxpayer.is_active ?? true,
      latitude: parseFloat((taxpayer as any).latitude) || -5.4632,
      longitude: parseFloat((taxpayer as any).longitude) || 122.6075,
      opd_id: taxpayer.opd_id?.toString() ?? '',
      retribution_type_ids: taxpayer.retribution_types?.map(t => t.id) || [],
      retribution_classification_ids: (taxpayer as any).retribution_classifications?.map((c: any) => c.id) || [],
      metadata: taxpayer.metadata || {},
    });
    setFiles({
      foto_lokasi_open_kamera: null,
      formulir_data_dukung: null,
    });
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    console.log('Triggering delete for taxpayer:', id);
    setTaxpayerToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taxpayerToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/api/taxpayers/${taxpayerToDelete}`);
      setShowDeleteModal(false);
      setTaxpayerToDelete(null);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus wajib pajak');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      
      // Append basic fields
      Object.keys(form).forEach(key => {
        if (key === 'retribution_type_ids') {
          form.retribution_type_ids.forEach(id => formData.append('retribution_type_ids[]', id.toString()));
        } else if (key === 'retribution_classification_ids') {
          form.retribution_classification_ids.forEach(id => formData.append('retribution_classification_ids[]', id.toString()));
        } else if (key === 'latitude' || key === 'longitude') {
          formData.append(key, form[key].toString());
        } else if (key === 'metadata') {
          formData.append('metadata', JSON.stringify(form.metadata));
        } else {
          formData.append(key, (form as any)[key]);
        }
      });

      // Append files dynamically based on selected classifications' requirements
      const selectedClassifications = classifications.filter(c => form.retribution_classification_ids.includes(c.id));
      const requirements = selectedClassifications.reduce((acc, current) => {
        current.requirements?.forEach((req: any) => {
          if (!acc.find((r: any) => r.key === req.key)) acc.push(req);
        });
        return acc;
      }, [] as any[]);

      requirements.forEach((req: any) => {
        if (files[req.key]) {
          formData.append(req.key, files[req.key] as File);
        }
      });

      // Backward compatibility for old hardcoded file keys
      if (files.foto_lokasi_open_kamera && !formData.has('foto_lokasi_open_kamera')) {
        formData.append('foto_lokasi_open_kamera', files.foto_lokasi_open_kamera);
      }
      if (files.formulir_data_dukung && !formData.has('formulir_data_dukung')) {
        formData.append('formulir_data_dukung', files.formulir_data_dukung);
      }

      if (editingTaxpayer) {
        // Use POST with _method=PUT for multipart/form-data update
        formData.append('_method', 'PUT');
        await api.post(`/api/taxpayers/${editingTaxpayer.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/taxpayers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Update/Store Error:', error);
      const message = error.response?.data?.message || error.message || 'Gagal menyimpan data';
      const detail = error.response?.data?.errors ? '\n\n' + Object.values(error.response.data.errors).flat().join('\n') : '';
      alert(message + detail);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRetributionType = (id: number) => {
    setForm(prev => {
      const isSelected = prev.retribution_type_ids.includes(id);
      const newTypeIds = isSelected
        ? prev.retribution_type_ids.filter(tid => tid !== id)
        : [...prev.retribution_type_ids, id];
      
      // If de-selecting a type, also de-select all its classifications
      const newClassificationIds = isSelected
        ? prev.retribution_classification_ids.filter(cid => {
            const cls = classifications.find(c => c.id === cid);
            return cls?.retribution_type_id !== id;
          })
        : prev.retribution_classification_ids;

      return {
        ...prev,
        retribution_type_ids: newTypeIds,
        retribution_classification_ids: newClassificationIds
      };
    });
  };

  const toggleClassification = (id: number, typeId: number) => {
    setForm(prev => {
      const isSelected = prev.retribution_classification_ids.includes(id);
      const newClassificationIds = isSelected
        ? prev.retribution_classification_ids.filter(cid => cid !== id)
        : [...prev.retribution_classification_ids, id];

      // Automatically select the type if any classification is selected
      const newTypeIds = !isSelected && !prev.retribution_type_ids.includes(typeId)
        ? [...prev.retribution_type_ids, typeId]
        : prev.retribution_type_ids;

      return {
        ...prev,
        retribution_type_ids: newTypeIds,
        retribution_classification_ids: newClassificationIds
      };
    });
  };

  function MapEvents() {
    useMapEvents({
      click(e) {
        setForm(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
      },
    });
    return null;
  }

  const calculateCompletion = (tp: Taxpayer) => {
    let score = 0;
    const fields = [
      tp.nik, tp.name, tp.phone, tp.address, tp.npwpd, 
      tp.object_name, tp.object_address, (tp as any).district, (tp as any).sub_district,
      (tp as any).latitude, (tp as any).longitude
    ];
    
    fields.forEach(f => { if (f && f !== '' && f !== 0) score += 8; });
    
    if (tp.metadata && Object.keys(tp.metadata).length > 0) {
      const metaKeys = Object.keys(tp.metadata).length;
      score += Math.min(metaKeys * 4, 12);
    }

    return Math.min(score, 100);
  };

  const isFilterActive = statusFilter !== 'all' || completionFilter !== 'all' || sortConfig !== null;

  const clearFilters = () => {
    setStatusFilter('all');
    setCompletionFilter('all');
    setSortConfig(null);
  };

  const processedTaxpayers = useMemo(() => {
    let result = [...taxpayers];

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(tp => tp.is_active === isActive);
    }

    if (completionFilter !== 'all') {
      result = result.filter(tp => {
        const score = calculateCompletion(tp);
        if (completionFilter === 'critical') return score < 50;
        if (completionFilter === 'needs_review') return score >= 50 && score < 90;
        if (completionFilter === 'ready') return score >= 90;
        return true;
      });
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'completion') {
          aValue = calculateCompletion(a);
          bValue = calculateCompletion(b);
        } else {
          aValue = (a as any)[sortConfig.key] || '';
          bValue = (b as any)[sortConfig.key] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Client-side orphan filter
    if (showOrphansOnly) {
      result = result.filter(tp => !tp.tax_objects || tp.tax_objects.length === 0);
    }

    return result;
  }, [taxpayers, statusFilter, completionFilter, sortConfig]);

  const filteredRetributionTypes = useMemo(() => {
    const selectedOpdId = parseInt(form.opd_id);
    if (!selectedOpdId) return [];
    return retributionTypes.filter(t => t.opd_id === selectedOpdId);
  }, [form.opd_id, retributionTypes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Taxpayers</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola data subjek dan objek retribusi</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-lg transition-all font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Tambah Wajib Pajak
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari NIK, Nama, atau NPWPD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
             <div className="relative w-full md:w-36">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-[10px] font-black uppercase tracking-widest appearance-none"
                >
                  <option value="all">Status: Semua</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Non-Aktif</option>
                </select>
             </div>

             <div className="relative w-full md:w-44">
                <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-[10px] font-black uppercase tracking-widest appearance-none"
                >
                  <option value="all">Integritas: Semua</option>
                  <option value="critical">Kritis (&lt; 50%)</option>
                  <option value="needs_review">Review</option>
                  <option value="ready">Siap (90%+)</option>
                </select>
             </div>

             {isFilterActive && (
               <button 
                onClick={() => {
                  clearFilters();
                  setShowOrphansOnly(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-[10px] font-black uppercase tracking-widest"
               >
                 <XCircle className="w-4 h-4" /> Reset
               </button>
             )}

             <div className="flex items-center gap-2 ml-auto">
               <button
                onClick={() => setShowOrphansOnly(!showOrphansOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  showOrphansOnly 
                    ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
               >
                 <Info size={14} className={showOrphansOnly ? 'text-amber-600' : ''} />
                 {showOrphansOnly ? 'Tanpa Objek' : 'Filter Tanpa Objek'}
               </button>
             </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NIK & Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kontak</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Objek & OPD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : taxpayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data wajib pajak ditemukan
                  </td>
                </tr>
              ) : (
                processedTaxpayers?.map((tp) => (
                  <tr key={tp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tp.name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">NIK: {tp.nik}</div>
                        {tp.npwpd && <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-tighter mt-0.5">NPWPD: {tp.npwpd}</div>}
                        
                        <div className="max-w-[180px]">
                          <CompletionBar percentage={calculateCompletion(tp)} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{tp.phone || '-'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={tp.address || ''}>
                        {tp.address || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {tp.tax_objects && tp.tax_objects.length > 0 
                          ? (tp.tax_objects.length === 1 ? tp.tax_objects[0].name : `Memiliki ${tp.tax_objects.length} Objek`) 
                          : (
                            <div className="flex flex-col">
                              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <Info size={12} /> Tanpa Objek
                              </span>
                              <span className="text-[10px] text-gray-400 italic font-medium uppercase tracking-tight">Butuh Aksi</span>
                            </div>
                          )}
                      </div>
                      <div className="text-xs text-gray-500">{tp.opd?.name || 'No Department'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusIndicator tp={tp} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => nav(`/taxpayers/${tp.id}`)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(tp)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tp.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : taxpayers.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-bold text-sm uppercase tracking-widest">
              Tidak ada data ditemukan
            </div>
          ) : (
            taxpayers?.map((tp) => (
              <div key={tp.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{tp.name}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">NIK: {tp.nik}</p>
                    <div className="max-w-[150px]">
                      <CompletionBar percentage={calculateCompletion(tp)} />
                    </div>
                  </div>
                  <StatusIndicator tp={tp} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">NPWPD</p>
                    <p className="text-[10px] font-bold text-blue-600 truncate">{tp.npwpd || '-'}</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Kontak</p>
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{tp.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Briefcase size={12} className="text-gray-400" />
                    <span className="text-[10px] font-bold truncate max-w-[120px]">{tp.opd?.name || 'No Department'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => nav(`/taxpayers/${tp.id}`)}
                      className="w-8 h-8 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg active:scale-90 transition-all"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => handleEdit(tp)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg active:scale-90 transition-all"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(tp.id)}
                      className="w-8 h-8 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg active:scale-90 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Halaman <span className="font-medium">{page}</span> dari <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[200] p-0 sm:p-4 pb-24 sm:pb-4 transition-all duration-500 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 sm:rounded-[2rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] max-w-5xl w-full sm:max-h-[92vh] flex flex-col md:flex-row sm:overflow-hidden animate-in fade-in zoom-in duration-300 relative mb-20 sm:mb-0">
            
            {/* Left Sidebar: Stepper */}
            <div className="hidden md:flex w-80 bg-slate-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-800 p-10 flex-col shrink-0">
              <div className="mb-10">
                <div className="flex items-center gap-3 text-blue-600 mb-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-xl tracking-tighter">RETRIBUSI</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {editingTaxpayer ? 'Perbarui Data' : 'Daftar WP Baru'}
                </h2>
              </div>

              <div className="flex-1 space-y-2 relative">
                <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                {[
                  { id: 1, title: 'Identitas WP', icon: User },
                  { id: 2, title: 'Objek & Kategori', icon: CreditCard },
                  { id: 3, title: 'Data Dukung', icon: FileCheck },
                  { id: 4, title: 'Lokasi', icon: MapPin },
                  { id: 5, title: 'Review', icon: CheckCircle2 },
                ].map((step) => (
                  <div key={step.id} className="relative z-10 flex items-center gap-4 group">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                      currentStep === step.id 
                        ? 'bg-blue-600 border-blue-100 dark:border-blue-900 text-white shadow-lg' 
                        : currentStep > step.id
                        ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-50 dark:border-gray-800 text-gray-400'
                    }`}>
                      {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === step.id ? 'text-blue-600' : 'text-gray-400'}`}>Step 0{step.id}</span>
                      <span className={`text-sm font-bold ${currentStep === step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{step.title}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowModal(false)}
                className="mt-10 py-4 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Batalkan
              </button>
            </div>

            {/* Mobile Floating Stepper */}
            <div className="md:hidden sticky top-0 z-[210] px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Step 0{currentStep}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {[
                      'Identitas WP',
                      'Objek & Kategori',
                      'Data Dukung',
                      'Lokasi',
                      'Review'
                    ][currentStep - 1]}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      currentStep === s ? 'w-6 bg-blue-600' : currentStep > s ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-gray-200 dark:bg-gray-800'
                    }`}
                  />
                ))}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>

            {/* Right Pane: Form Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pb-40 sm:pb-6 custom-scrollbar">
                {currentStep === 1 && (
                  <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-500 pb-6">
                    <div className="md:block">
                      <h3 className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-1 md:mb-2 text-center md:text-left">Identitas Wajib Pajak</h3>
                      <p className="text-gray-400 md:text-gray-500 text-xs md:text-sm font-medium text-center md:text-left">Gunakan NIK untuk mencari atau mendaftarkan subjek pajak</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {user?.role === 'super_admin' ? (
                        <div className="group">
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Dinas/OPD Terkait</label>
                          <select
                            value={form.opd_id}
                            onChange={(e) => setForm({ ...form, opd_id: e.target.value, retribution_type_ids: [], retribution_classification_ids: [] })}
                            className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold appearance-none cursor-pointer text-sm md:text-base"
                          >
                            <option value="">Pilih Dinas Pengelola</option>
                            {opds?.map(opd => <option key={opd.id} value={opd.id}>{opd.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="p-4 md:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                          <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dinas Pengelola</label>
                          <div className="text-blue-900 dark:text-blue-200 font-bold text-sm md:text-base">{user?.department || 'OPD Terkait'}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="group relative">
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">NIK (Wajib Pajak)</label>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={16}
                              placeholder="01010102302..."
                              value={form.nik}
                              onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '') })}
                              className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm md:text-base pr-28"
                            />
                            <button
                              type="button"
                              onClick={checkNik}
                              disabled={isCheckingNik || !form.nik}
                              className="absolute right-2 top-2 bottom-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:bg-gray-300"
                            >
                              {isCheckingNik ? 'Checking...' : 'Cek NIK'}
                            </button>
                          </div>

                          {/* FOUND ASSETS PREVIEW */}
                          {foundAssets.length > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center gap-2 mb-3">
                                <Briefcase size={12} className="text-blue-500" />
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aset Terdaftar ({foundAssets.length})</h4>
                                <div className="ml-auto flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                  <span className="text-[8px] font-bold text-blue-500 uppercase">Potensi Aktif</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {foundAssets?.map((asset, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-50 dark:border-gray-700/50 shadow-sm">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-black text-gray-900 dark:text-white leading-tight">
                                        {asset.object_name || 'Tanpa Nama Objek'}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                                        {asset.retribution_types?.[0]?.name || 'Tanpa Kategori'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[9px] font-black text-gray-400 uppercase">{asset.opd?.name || '-'}</span>
                                      <span className="block text-[8px] font-bold text-gray-300">{asset.object_address || asset.district || '-'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 text-center">
                                <p className="text-[9px] font-bold text-gray-400 italic">"Gunakan data di atas sebagai referensi kepemilikan aset wajib pajak ini."</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="group">
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                          <input
                            type="text"
                            placeholder="Sesuai KTP"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm md:text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="group">
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">No. WhatsApp</label>
                          <input
                            type="text"
                            placeholder="0812..."
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm md:text-base"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">NPWPD (Opsional)</label>
                          <input
                            type="text"
                            placeholder="Nomor Pokok Wajib Pajak Daerah"
                            value={form.npwpd}
                            onChange={(e) => setForm({ ...form, npwpd: e.target.value })}
                            className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm md:text-base"
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alamat Domisili WP</label>
                        <textarea
                          rows={2}
                          placeholder="Alamat penanggung jawab..."
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none text-sm md:text-base"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-500 pb-10">
                    <div className="md:block">
                      <h3 className="text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 md:mb-2 text-center md:text-left">Data Objek & Kategori</h3>
                      <p className="text-gray-400 md:text-gray-500 text-xs md:text-sm font-medium text-center md:text-left">Tentukan nama objek dan klasifikasi retribusi</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="group col-span-1 md:col-span-2">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Objek/Unit</label>
                        <input
                          type="text"
                          placeholder="Contoh: Kios Pasar B / Tower 1"
                          value={form.object_name}
                          onChange={(e) => setForm({ ...form, object_name: e.target.value })}
                          className="w-full px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-emerald-900 rounded-2xl font-black text-sm md:text-lg shadow-sm"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kecamatan</label>
                        <select
                          value={form.district}
                          onChange={(e) => setForm({ ...form, district: e.target.value, sub_district: '' })}
                          className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold cursor-pointer text-sm md:text-base"
                        >
                          <option value="">Pilih Kecamatan</option>
                          {Object.keys(BAUBAU_DATA).map(kec => <option key={kec} value={kec}>{kec}</option>)}
                        </select>
                      </div>
                      <div className="group">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kelurahan</label>
                        <select
                          value={form.sub_district}
                          onChange={(e) => setForm({ ...form, sub_district: e.target.value })}
                          className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold cursor-pointer text-sm md:text-base"
                          disabled={!form.district}
                        >
                          <option value="">Pilih Kelurahan</option>
                          {form.district && (BAUBAU_DATA as any)[form.district]?.map((kel: string) => <option key={kel} value={kel}>{kel}</option>)}
                        </select>
                      </div>
                      <div className="group col-span-1 md:col-span-2">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alamat Lengkap Lokasi Objek</label>
                        <textarea
                          rows={2}
                          placeholder="Alamat unit retribusi..."
                          value={form.object_address}
                          onChange={(e) => setForm({ ...form, object_address: e.target.value })}
                          className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none text-sm md:text-base"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-800/10 p-5 md:p-8 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-4 mb-6 md:mb-8">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                          <CreditCard size={20} />
                        </div>
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Pilih Klasifikasi</h4>
                      </div>

                      {!form.opd_id ? (
                        <div className="py-12 text-center bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Pilih Dinas pada langkah sebelumnya</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                          {filteredRetributionTypes?.map(type => (
                            <div key={type.id} className="space-y-4">
                              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">{type.name}</h5>
                              <div className="space-y-2">
                                {classifications
                                  ?.filter(c => c.retribution_type_id === type.id)
                                  ?.map(cls => (
                                    <div 
                                      key={cls.id}
                                      onClick={() => toggleClassification(cls.id, type.id)}
                                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                        form.retribution_classification_ids.includes(cls.id)
                                          ? 'border-emerald-500 bg-white dark:bg-gray-800 shadow-md'
                                          : 'border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        form.retribution_classification_ids.includes(cls.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                                      }`}>
                                        {form.retribution_classification_ids.includes(cls.id) && <Plus className="w-4 h-4 text-white" />}
                                      </div>
                                      <span className={`text-[11px] font-black uppercase tracking-tight ${
                                        form.retribution_classification_ids.includes(cls.id) ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                                      }`}>
                                        {cls.name}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-10 md:space-y-12 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-500 pb-10">
                    <div>
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2 text-center md:text-left">Data Dukung</h3>
                      <p className="text-gray-500 text-sm font-medium text-center md:text-left">Lengkapi formulir teknis dan unggah dokumen untuk setiap kategori</p>
                    </div>

                    {classifications
                      ?.filter(c => form.retribution_classification_ids.includes(c.id))
                      ?.map((cls) => (
                        <div key={cls.id} className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800 text-center">
                              {cls.name}
                            </span>
                            <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800"></div>
                          </div>

                          {/* Technical Fields Group */}
                          {ensureArray(cls.form_schema).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-6 md:p-8 bg-slate-50 dark:bg-gray-800/30 rounded-[2rem] md:rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800">
                              {ensureArray(cls.form_schema).map((field: any) => (
                                <div key={field.key} className={`${field.type === 'google_map' ? 'col-span-1 md:col-span-2' : 'col-span-1'} group`}>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{field.label}</label>
                                  {field.type === 'select' ? (
                                    <select
                                      value={form.metadata[field.key] || ''}
                                      onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, [field.key]: e.target.value } })}
                                      className="w-full px-5 md:px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm"
                                    >
                                      <option value="">Pilih {field.label}</option>
                                      {field.options?.map((opt: any) => (
                                        <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
                                          {typeof opt === 'object' ? opt.label : opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.type === 'constant' ? (
                                    <div className="w-full px-5 md:px-6 py-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-sm text-gray-500 cursor-not-allowed">
                                      {(() => {
                                        if (!form.metadata[field.key] && field.default_value) {
                                          setTimeout(() => setForm(prev => ({...prev, metadata: {...prev.metadata, [field.key]: field.default_value}})), 0);
                                        }
                                        return form.metadata[field.key] || field.default_value || '-';
                                      })()}
                                    </div>
                                  ) : field.type === 'textarea' ? (
                                    <textarea
                                      rows={3}
                                      value={form.metadata[field.key] || ''}
                                      onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, [field.key]: e.target.value } })}
                                      className="w-full px-5 md:px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm resize-none"
                                      placeholder={field.label}
                                    />
                                  ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-3 px-5 md:px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-blue-300 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={form.metadata[field.key] === 'Ya' || form.metadata[field.key] === true}
                                        onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, [field.key]: e.target.checked ? 'Ya' : 'Tidak' } })}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">{form.metadata[field.key] === 'Ya' ? 'Ya' : 'Tidak'}</span>
                                    </label>
                                  ) : field.type === 'google_map' ? (
                                    <MapPicker
                                      label={field.label}
                                      value={form.metadata[field.key] || ''}
                                      onChange={(val) => setForm({ ...form, metadata: { ...form.metadata, [field.key]: val } })}
                                    />
                                  ) : (
                                    <input
                                      type={field.type}
                                      value={form.metadata[field.key] || ''}
                                      onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, [field.key]: e.target.value } })}
                                      className="w-full px-5 md:px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm"
                                      placeholder={field.label}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Requirements Group */}
                          {ensureArray(cls.requirements).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {ensureArray(cls.requirements).map((req: any, idx: number) => (
                                <label key={req.key} className="block group cursor-pointer">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{req.label}</div>
                                  <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${
                                    files[req.key] ? 'bg-emerald-50 border-emerald-500/50' : idx % 2 === 0 ? 'bg-orange-50/50 border-orange-100 hover:border-orange-500' : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-500'
                                  }`}>
                                    <input type="file" onChange={e => setFiles({...files, [req.key]: e.target.files?.[0] || null})} className="hidden" />
                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center ${files[req.key] ? 'bg-emerald-500 text-white' : idx % 2 === 0 ? 'bg-white text-orange-400' : 'bg-white text-indigo-400'}`}>
                                      {idx % 2 === 0 ? <Camera className="w-7 h-7" /> : <FileCheck className="w-7 h-7" />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter text-center">
                                      {files[req.key] ? (files[req.key] as File).name : 'Klik untuk Upload'}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                    {form.retribution_classification_ids.length === 0 && (
                      <div className="py-20 text-center text-gray-400 bg-slate-50 dark:bg-gray-800/10 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col items-center gap-4">
                          <Info className="w-8 h-8 text-gray-300" />
                          <p className="font-bold uppercase text-[11px] tracking-widest">Pilih klasifikasi untuk melihat formulir tambahan</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-500 flex flex-col h-full pb-10">
                    <div className="md:block">
                      <h3 className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 md:mb-2 text-center md:text-left">Lokasi Objek</h3>
                      <p className="text-gray-400 md:text-gray-500 text-xs md:text-sm font-medium text-center md:text-left">Tentukan koordinat lokasi unit retribusi</p>
                    </div>

                    <div className="h-[300px] sm:flex-1 sm:min-h-[400px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shadow-inner">
                      <MapContainer 
                        center={[form.latitude, form.longitude]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapEvents />
                        <Marker position={[form.latitude, form.longitude]}>
                          <Popup>
                            <div className="p-2 font-sans text-center">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Lokasi Terpilih</p>
                              <p className="text-[10px] text-blue-600 font-mono">
                                {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                      <div className="group">
                        <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                          className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                          className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-500 pb-10">
                    <div className="md:block">
                      <h3 className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 md:mb-2 text-center md:text-left">Review & Selesai</h3>
                      <p className="text-gray-400 md:text-gray-500 text-xs md:text-sm font-medium text-center md:text-left">Tinjau kembali data pendaftaran</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800">
                        <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-2">Nama Wajib Pajak</div>
                        <div className="text-gray-900 dark:text-white font-bold text-sm sm:text-base">{form.name}</div>
                      </div>
                      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800">
                        <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-2">Nama Objek</div>
                        <div className="text-gray-900 dark:text-white font-bold text-sm sm:text-base">{form.object_name}</div>
                      </div>
                      <div className="col-span-1 sm:col-span-2 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800">
                        <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 sm:mb-2">Klasifikasi Terpilih</div>
                        <div className="flex flex-wrap gap-2">
                          {classifications
                            ?.filter(c => form.retribution_classification_ids.includes(c.id))
                            ?.map(c => (
                              <span key={c.id} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] sm:text-[10px] font-black rounded-lg uppercase tracking-wider">
                                {c.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-blue-600 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-lg shadow-blue-500/20">
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl">
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <h4 className="font-black text-base sm:text-lg">Konfirmasi</h4>
                      </div>
                      <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed">
                        Pastikan seluruh data yang dimasukkan telah sesuai dengan persyaratan asli. 
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar - Sticky at bottom */}
              <div className="p-4 sm:p-6 md:p-10 border-t border-gray-100 dark:border-gray-800 flex justify-between bg-white dark:bg-gray-900 sm:rounded-b-[2rem] sticky bottom-0 z-[205] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:shadow-none mb-20 sm:mb-0">
                <button
                  type="button"
                  onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 1}
                  className="px-6 md:px-10 py-4 border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-2xl hover:bg-gray-50 disabled:opacity-0 transition-all active:scale-95"
                >
                  Prev
                </button>
                
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-8 md:px-12 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                  >
                    Lanjut
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 md:px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                  >
                    {submitting ? '...' : (editingTaxpayer ? 'Simpan' : 'Daftarkan')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Hapus Wajib Pajak?</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                Tindakan ini tidak dapat dibatalkan. Seluruh data penagihan terkait juga mungkin akan terdampak.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-600/30 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
