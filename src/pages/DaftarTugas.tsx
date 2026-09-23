import { useState, useEffect, useMemo } from 'react';
import api, { API_URL } from '../lib/api';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Search,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  Building2,
  Camera,
  Navigation,
  ExternalLink,
  X,
  Loader2,
  Filter,
  Layers,
  FileText,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AssetSurveyForm, type AssetRentalSurveyItem } from '../components/AssetSurveyForm';
import { AssetInspectionModal } from '../components/AssetInspectionModal';

interface PbbMutationItem {
  id: number;
  ticket_no: string;
  mutation_type: string;
  applicant_nik: string;
  applicant_name: string;
  applicant_phone?: string | null;
  applicant_address?: string | null;
  parent_nop?: string | null;
  status: string;
  notes?: string | null;
  survey_notes?: string | null;
  survey_photo_path?: string | null;
  parent_land_area?: number | string | null;
  total_parent_debt?: number | string | null;
  previous_taxpayer_name?: string | null;
  new_taxpayer_name?: string | null;
  correction_data?: any;
  split_items?: Array<{
    id: number;
    kavling_name?: string;
    land_area: number | string;
    building_area?: number | string | null;
    owner_name?: string | null;
    owner_nik?: string | null;
  }>;
  attachment_files?: any;
  created_at: string;
}

const getMutationTypeLabel = (type: string) => {
  switch (type) {
    case 'SPLIT_KAVLING': return 'Pecah Bidang / Kavling';
    case 'TRANSFER_OWNERSHIP': return 'Balik Nama / Peralihan Hak';
    case 'RECTIFICATION': return 'Pembetulan Data SPPT';
    case 'AMALGAMATION': return 'Penggabungan Bidang';
    case 'CANCELLATION': return 'Pembatalan / NOP Ganda';
    default: return type;
  }
};

interface Task {
  id: number;
  user_id: number;
  zone_id: number | null;
  taxpayer_id: number | null;
  tax_object_id?: number | null;
  verification_id?: number | null;
  task_type?: string;
  due_date: string;
  notes: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
  completion_photo_path?: string | null;
  completion_photo_url?: string | null;
  created_at: string;
  taxpayer?: {
    name: string;
    npwpd?: string | null;
  };
  tax_object?: {
    id: number;
    name: string;
    address?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
    is_verified_physically?: boolean;
    metadata?: any;
    classification?: {
      id: number;
      name: string;
      code: string;
    };
  } | null;
  verification?: {
    id: number;
    status: string;
    proof_file_url?: string;
    notes?: string;
    verified_at?: string | null;
  } | null;
  zone?: {
    name: string;
  };
}

interface PbbNopApplication {
  id: number;
  user_id: number;
  nik: string;
  name: string;
  address: string;
  land_area: string | number;
  building_area: string | number | null;
  latitude: number | string | null;
  longitude: number | string | null;
  registered_for?: string;
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

export default function DaftarTugas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assetRentals, setAssetRentals] = useState<AssetRentalSurveyItem[]>([]);
  const [pbbApplications, setPbbApplications] = useState<PbbNopApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pbbLoading, setPbbLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'asset_survey' | 'pbb_survey'>('pending');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; title: string } | null>(null);
  const [selectedRentalForSurvey, setSelectedRentalForSurvey] = useState<AssetRentalSurveyItem | null>(null);
  const [selectedRentalForInspection, setSelectedRentalForInspection] = useState<AssetRentalSurveyItem | null>(null);
  
  // PBB Survey Modal State (NOP Baru)
  const [selectedPbbForSurvey, setSelectedPbbForSurvey] = useState<PbbNopApplication | null>(null);
  const [surveyNotesInput, setSurveyNotesInput] = useState('');
  const [surveyPhotoFile, setSurveyPhotoFile] = useState<File | null>(null);
  const [surveyPhotoPreview, setSurveyPhotoPreview] = useState<string | null>(null);
  const [surveyRecommendation, setSurveyRecommendation] = useState<'RECOMMENDED' | 'NEEDS_REVISION'>('RECOMMENDED');
  const [surveyPhysicalCondition, setSurveyPhysicalCondition] = useState<string>('HUNIAN_SEDERHANA');
  const [surveyLocationMatch, setSurveyLocationMatch] = useState<boolean>(true);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  // PBB Mutasi State & Modal (Pecah/Gabung/Balik Nama/dll)
  const [pbbMutations, setPbbMutations] = useState<PbbMutationItem[]>([]);
  const [pbbSubFilter, setPbbSubFilter] = useState<'all' | 'nop_baru' | 'mutasi'>('all');
  const [selectedMutationForSurvey, setSelectedMutationForSurvey] = useState<PbbMutationItem | null>(null);
  const [mutationSurveyNotes, setMutationSurveyNotes] = useState('');
  const [mutationSurveyPhotoFile, setMutationSurveyPhotoFile] = useState<File | null>(null);
  const [mutationSurveyPhotoPreview, setMutationSurveyPhotoPreview] = useState<string | null>(null);
  const [mutationRecommendation, setMutationRecommendation] = useState<'RECOMMENDED' | 'NEEDS_REVISION'>('RECOMMENDED');
  const [submittingMutationSurvey, setSubmittingMutationSurvey] = useState(false);

  const getFileUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = (API_URL || '').replace(/\/+$/, '');
    const clean = path.startsWith('/') ? path : `/${path}`;
    return clean.startsWith('/storage/') ? `${baseUrl}${clean}` : `${baseUrl}/storage${clean}`;
  };

  const fetchPbbApplications = async () => {
    try {
      setPbbLoading(true);
      const [nopRes, mutRes] = await Promise.allSettled([
        api.get('/api/pbb/bapenda/nop-applications', { params: { status: 'SURVEY' } }),
        api.get('/api/pbb/mutations/my-assignments'),
      ]);

      if (nopRes.status === 'fulfilled') {
        const list = nopRes.value.data?.data || (Array.isArray(nopRes.value.data) ? nopRes.value.data : []);
        setPbbApplications(list);
      }
      if (mutRes.status === 'fulfilled') {
        const list = mutRes.value.data?.data || (Array.isArray(mutRes.value.data) ? mutRes.value.data : []);
        setPbbMutations(list);
      }
    } catch (err) {
      console.error('Error fetching PBB applications for survey:', err);
    } finally {
      setPbbLoading(false);
    }
  };

  useEffect(() => {
    fetchPbbApplications();
  }, []);

  useEffect(() => {
    if (activeTab === 'asset_survey') {
      fetchAssetRentals();
    } else if (activeTab === 'pbb_survey') {
      fetchPbbApplications();
    } else {
      fetchTasks();
    }
  }, [activeTab]);

  const handleOpenPbbSurveyModal = (app: PbbNopApplication) => {
    setSelectedPbbForSurvey(app);
    setSurveyNotesInput(app.survey_notes || '');
    setSurveyPhotoFile(null);
    setSurveyPhotoPreview(app.survey_photo_path ? getFileUrl(app.survey_photo_path) : null);
    setSurveyRecommendation(app.metadata?.survey_recommendation || 'RECOMMENDED');
    setSurveyPhysicalCondition(app.metadata?.survey_physical_condition || (
      Number(app.building_area || 0) > 0 
        ? (Number(app.building_area || 0) <= 100 ? 'HUNIAN_SEDERHANA' : 'BANGUNAN_BESAR') 
        : 'TANAH_KOSONG'
    ));
    setSurveyLocationMatch(app.metadata?.survey_location_match ?? true);
  };

  const handleSubmitPbbSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPbbForSurvey) return;

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

      await api.post(`/api/pbb/bapenda/nop-applications/${selectedPbbForSurvey.id}/status`, formData);
      toast.success(`Hasil survei permohonan #${selectedPbbForSurvey.id} berhasil dikirim ke Admin Bapenda!`);
      setSelectedPbbForSurvey(null);
      setSurveyNotesInput('');
      setSurveyPhotoFile(null);
      setSurveyPhotoPreview(null);
      fetchPbbApplications();
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      toast.error(err.message || 'Gagal menyimpan hasil survei');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const handleOpenMutationSurveyModal = (mutation: PbbMutationItem) => {
    setSelectedMutationForSurvey(mutation);
    setMutationSurveyNotes(mutation.survey_notes || '');
    setMutationSurveyPhotoFile(null);
    setMutationSurveyPhotoPreview(mutation.survey_photo_path ? getFileUrl(mutation.survey_photo_path) : null);
    setMutationRecommendation('RECOMMENDED');
  };

  const handleSubmitMutationSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutationForSurvey) return;

    let finalNotes = mutationSurveyNotes.trim();
    if (!finalNotes) {
      if (mutationRecommendation === 'RECOMMENDED') {
        finalNotes = 'Hasil survei lapangan mutasi telah diverifikasi faktual. Kondisi batas tanah dan data fisik sesuai permohonan.';
      } else {
        toast.error('Mohon cantumkan catatan koreksi atau temuan lapangan.');
        return;
      }
    }

    setSubmittingMutationSurvey(true);
    try {
      const formData = new FormData();
      formData.append('status', 'SURVEY');
      formData.append('survey_notes', finalNotes);
      formData.append('survey_metadata', JSON.stringify({
        recommendation: mutationRecommendation,
        surveyed_at: new Date().toISOString(),
      }));
      if (mutationSurveyPhotoFile) {
        formData.append('survey_photo', mutationSurveyPhotoFile);
      }

      await api.post(`/api/pbb/mutations/${selectedMutationForSurvey.id}/status`, formData);
      toast.success(`Hasil survei mutasi ${selectedMutationForSurvey.ticket_no} berhasil dikirim ke Admin Bapenda!`);
      setSelectedMutationForSurvey(null);
      setMutationSurveyNotes('');
      setMutationSurveyPhotoFile(null);
      setMutationSurveyPhotoPreview(null);
      fetchPbbApplications();
    } catch (err: any) {
      console.error('Error submitting mutation survey:', err);
      toast.error(err.message || 'Gagal menyimpan hasil survei mutasi');
    } finally {
      setSubmittingMutationSurvey(false);
    }
  };

  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const fetchAssetRentals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/asset/rentals');
      const items = res.data?.data || res.data || [];
      setAssetRentals(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error fetching asset rentals for survey:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/petugas-tasks', {
        params: { status: activeTab }
      });
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      setTasks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (id: number, photo: File | null) => {
    if (!photo) {
      toast.error('Gunakan Kamera untuk bukti penyelesaian!');
      return;
    }

    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append('status', 'completed');
      formData.append('photo', photo);
      // Laravel PUT with file requires _method spoofing if using POST or a proper multipart PUT (which is tricky with some PHP versions)
      // Since our backend is PHP, we use POST + _method: PUT
      formData.append('_method', 'PUT');

      const res = await api.post(`/api/petugas-tasks/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.status === 'success') {
        toast.success('Tugas ditandai selesai dengan bukti foto');
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyelesaikan tugas');
      console.error(err);
    } finally {
      setUploadingId(null);
    }
  };

  const isTaskVerified = (task: Task) => {
    if (task.verification) {
      return task.verification.status === 'approved';
    }
    return Boolean(task.tax_object?.is_verified_physically || (task.tax_object?.metadata as any)?.is_verified_physically);
  };

  const isTaskRejected = (task: Task) => {
    return task.verification?.status === 'rejected';
  };

  const verifiedCount = useMemo(() => {
    return tasks.filter(t => isTaskVerified(t)).length;
  }, [tasks]);

  const unverifiedCount = useMemo(() => {
    return tasks.filter(t => !isTaskVerified(t)).length;
  }, [tasks]);

  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      task.notes?.toLowerCase().includes(searchLower) ||
      task.taxpayer?.name?.toLowerCase().includes(searchLower) ||
      task.tax_object?.name?.toLowerCase().includes(searchLower) ||
      task.zone?.name?.toLowerCase().includes(searchLower)
    );

    if (!matchesSearch) return false;

    if (activeTab === 'completed' && verificationFilter !== 'all') {
      const isVerified = isTaskVerified(task);
      if (verificationFilter === 'verified') return isVerified;
      if (verificationFilter === 'unverified') return !isVerified;
    }

    return true;
  });

  const getStatusColor = (status: string, dueDate: string) => {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    const isLate = new Date(dueDate) < new Date();
    if (isLate) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    const isLate = new Date(dueDate) < new Date();
    if (isLate) return <AlertCircle className="w-5 h-5 text-rose-500" />;
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  const getStatusLabel = (status: string, dueDate: string) => {
    if (status === 'completed') return 'Selesai';
    const isLate = new Date(dueDate) < new Date();
    if (isLate) return 'Terlambat';
    return 'Menunggu';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            Daftar Tugas
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Kelola dan pantau penugasan lapangan Anda
          </p>
        </div>
      </div>

      {/* Banner Penugasan PBB */}
      {(pbbApplications.length + pbbMutations.length) > 0 && activeTab !== 'pbb_survey' && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-4 sm:p-5 shadow-xl shadow-blue-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-400/30">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                  Perlu Ditindaklanjuti
                </span>
                <span className="text-xs font-semibold text-blue-100">PBB Bapenda</span>
              </div>
              <h3 className="text-base font-black tracking-tight mt-0.5">
                Ada {pbbApplications.length + pbbMutations.length} Penugasan Survei Lapangan PBB
                {pbbMutations.length > 0 && ` (${pbbMutations.length} Mutasi)`}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Admin/Kasubid telah mendisposisikan verifikasi fisik objek baru &amp; mutasi PBB.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pbb_survey')}
            className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 rounded-2xl text-xs font-black shrink-0 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Buka Penugasan PBB ({pbbApplications.length + pbbMutations.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-fit backdrop-blur-xl border border-slate-200 dark:border-slate-700 gap-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Tugas Aktif
        </button>
        <button
          onClick={() => setActiveTab('pbb_survey')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
            activeTab === 'pbb_survey'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Penugasan PBB</span>
          {(pbbApplications.length + pbbMutations.length) > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[11px] font-black rounded-full bg-rose-500 text-white animate-pulse">
              {pbbApplications.length + pbbMutations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Riwayat Kunjungan</span>
        </button>
        <button
          onClick={() => setActiveTab('asset_survey')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'asset_survey'
              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Survey Alat Berat PUPR
        </button>
      </div>

      {/* Sub-filter Penugasan PBB (NOP Baru vs Mutasi) */}
      {activeTab === 'pbb_survey' && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-200">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Kategori PBB:</span>
          </span>
          <button
            onClick={() => setPbbSubFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              pbbSubFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Semua PBB</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {pbbApplications.length + pbbMutations.length}
            </span>
          </button>
          <button
            onClick={() => setPbbSubFilter('nop_baru')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              pbbSubFilter === 'nop_baru'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>NOP Baru</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {pbbApplications.length}
            </span>
          </button>
          <button
            onClick={() => setPbbSubFilter('mutasi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              pbbSubFilter === 'mutasi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mutasi PBB</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
              {pbbMutations.length}
            </span>
          </button>
        </div>
      )}

      {/* Sub-filter Riwayat Kunjungan Petugas */}
      {activeTab === 'completed' && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-200">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Status Verifikasi:</span>
          </span>
          <button
            onClick={() => setVerificationFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              verificationFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Semua Riwayat</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {tasks.length}
            </span>
          </button>
          <button
            onClick={() => setVerificationFilter('verified')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              verificationFilter === 'verified'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sudah Diverifikasi</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {verifiedCount}
            </span>
          </button>
          <button
            onClick={() => setVerificationFilter('unverified')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              verificationFilter === 'unverified'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Diverifikasi</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {unverifiedCount}
            </span>
          </button>
        </div>
      )}

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500" />
        <input
          type="text"
          placeholder={activeTab === 'asset_survey' ? "Cari kode, nama alat, lokasi, atau pemohon..." : activeTab === 'pbb_survey' ? "Cari tiket mutasi, NOP, NIK, catatan, atau pemohon..." : "Cari tugas berdasarkan catatan, zona, atau wp..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
        />
      </div>

      {activeTab === 'pbb_survey' ? (
        pbbLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Memuat berkas penugasan PBB...</p>
          </div>
        ) : (pbbApplications.length === 0 && pbbMutations.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Tidak Ada Penugasan PBB
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
              Semua permohonan pendaftaran NOP baru &amp; mutasi PBB telah selesai disurvei.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Kartu NOP Baru */}
            {(pbbSubFilter === 'all' || pbbSubFilter === 'nop_baru') &&
              pbbApplications
                .filter((app) => {
                  const s = searchTerm.toLowerCase();
                  return (
                    app.name?.toLowerCase().includes(s) ||
                    app.nik?.toLowerCase().includes(s) ||
                    app.address?.toLowerCase().includes(s) ||
                    app.survey_notes?.toLowerCase().includes(s)
                  );
                })
                .map((app) => {
                  const bgnArea = Number(app.building_area || 0);
                  const photoUrl = app.metadata?.building_photo_path ? getFileUrl(app.metadata.building_photo_path) : null;

                  return (
                    <div
                      key={`nop-${app.id}`}
                      className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none transition-all flex flex-col"
                    >
                      <div className="p-6 pb-5 border-b border-slate-50 dark:border-slate-700/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            NOP Baru #{app.id}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            Survei Lapangan
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {app.name}
                          </h4>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            NIK: {app.nik}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{app.address}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold pt-1">
                            <span>Luas Tanah: <strong className="text-slate-900 dark:text-white">{app.land_area} m²</strong></span>
                            <span>Luas Bgn: <strong className="text-slate-900 dark:text-white">{bgnArea > 0 ? `${bgnArea} m²` : 'Tanah Kosong'}</strong></span>
                          </div>
                        </div>

                        {photoUrl && (
                          <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
                            <img
                              src={photoUrl}
                              alt="Foto Fisik Bangunan"
                              className="w-16 h-16 object-cover rounded-xl border border-amber-300 shrink-0 bg-amber-100"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (app.metadata?.building_photo_path?.startsWith('http')) {
                                  target.src = app.metadata.building_photo_path;
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <span className="font-bold text-amber-950 dark:text-amber-200 block truncate">
                                Foto Fisik dari WP
                              </span>
                              <span className="text-[11px] text-amber-800 dark:text-amber-300 line-clamp-2 mt-0.5">
                                {app.metadata?.building_usage || 'Bangunan Eksisting'} • {app.metadata?.pbg_number ? `PBG: ${app.metadata.pbg_number}` : 'Tanpa PBG'}
                              </span>
                              <a
                                href={photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                              >
                                Lihat Penuh <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        )}

                        {app.survey_notes && (
                          <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs">
                            <span className="font-bold text-blue-900 dark:text-blue-300 block text-[11px] mb-0.5">
                              Instruksi dari Admin/Kasubid:
                            </span>
                            <p className="text-blue-950 dark:text-blue-200 italic font-medium">"{app.survey_notes}"</p>
                          </div>
                        )}

                        {app.latitude && app.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${app.latitude},${app.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Navigation size={13} className="text-indigo-600" />
                            <span>Navigasi Peta ({app.latitude}, {app.longitude})</span>
                          </a>
                        )}
                      </div>

                      <div className="p-4 mt-auto bg-slate-50 dark:bg-slate-900/50">
                        <button
                          onClick={() => handleOpenPbbSurveyModal(app)}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-blue-600/20 active:scale-98"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Input Hasil Survei / BASL</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

            {/* Kartu Mutasi PBB */}
            {(pbbSubFilter === 'all' || pbbSubFilter === 'mutasi') &&
              pbbMutations
                .filter((m) => {
                  const s = searchTerm.toLowerCase();
                  return (
                    m.ticket_no?.toLowerCase().includes(s) ||
                    m.parent_nop?.toLowerCase().includes(s) ||
                    m.applicant_name?.toLowerCase().includes(s) ||
                    m.applicant_nik?.toLowerCase().includes(s) ||
                    m.notes?.toLowerCase().includes(s) ||
                    m.survey_notes?.toLowerCase().includes(s)
                  );
                })
                .map((m) => (
                  <div
                    key={`mut-${m.id}`}
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 overflow-hidden hover:shadow-xl hover:shadow-indigo-200/20 dark:hover:shadow-none transition-all flex flex-col"
                  >
                    <div className="p-6 pb-5 border-b border-slate-50 dark:border-slate-700/50 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center gap-1">
                          <Layers size={12} />
                          {getMutationTypeLabel(m.mutation_type)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          Survei Mutasi
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {m.ticket_no}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {m.applicant_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                          <span>NIK: {m.applicant_nik}</span>
                          {m.applicant_phone && <span>• Telp: {m.applicant_phone}</span>}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold">
                          <span>NOP Induk / Objek:</span>
                          <span className="font-mono text-slate-900 dark:text-white">{m.parent_nop || '-'}</span>
                        </div>
                        {m.mutation_type === 'SPLIT_KAVLING' && (
                          <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] space-y-1">
                            <div className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
                              <span>Luas Induk: {m.parent_land_area || '-'} m²</span>
                              <span>{m.split_items?.length || 0} Kavling Pecahan</span>
                            </div>
                            {m.split_items && m.split_items.length > 0 && (
                              <div className="text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-indigo-100/60 dark:border-indigo-800/40">
                                {m.split_items.slice(0, 3).map((item, idx) => (
                                  <div key={item.id || idx} className="flex justify-between">
                                    <span>• {item.kavling_name || `Kavling ${idx + 1}`} ({item.owner_name || 'Pemohon'}):</span>
                                    <span className="font-semibold">{item.land_area} m²</span>
                                  </div>
                                ))}
                                {m.split_items.length > 3 && (
                                  <div className="text-indigo-600 dark:text-indigo-400 font-semibold italic text-[10px]">
                                    +{m.split_items.length - 3} kavling lainnya
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {m.mutation_type === 'TRANSFER_OWNERSHIP' && (
                          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-[11px] space-y-0.5">
                            <div className="text-slate-500">Peralihan Hak:</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {m.previous_taxpayer_name || 'WP Lama'} ➔ {m.new_taxpayer_name || 'WP Baru'}
                            </div>
                          </div>
                        )}
                        {m.applicant_address && (
                          <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{m.applicant_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Instruksi dari Admin/Kasubid */}
                      {(m.survey_notes || m.notes) && (
                        <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs">
                          <span className="font-bold text-blue-900 dark:text-blue-300 block text-[11px] mb-0.5">
                            Instruksi dari Admin / Kasubid:
                          </span>
                          <p className="text-blue-950 dark:text-blue-200 italic font-medium">"{m.survey_notes || m.notes}"</p>
                        </div>
                      )}

                      {/* Foto Survei Sebelumnya jika sudah ada */}
                      {m.survey_photo_path && (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">Sudah pernah disurvei</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 mt-auto bg-slate-50 dark:bg-slate-900/50">
                      <button
                        onClick={() => handleOpenMutationSurveyModal(m)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-indigo-600/20 active:scale-98"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Input Hasil Survei Mutasi / BASL</span>
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )
      ) : activeTab === 'asset_survey' ? (
        assetRentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Tidak Ada Pengajuan Sewa
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
              Belum ada permohonan sewa alat berat yang perlu diverifikasi lapangan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assetRentals
              .filter((r) => {
                const s = searchTerm.toLowerCase();
                return (
                  r.rental_code?.toLowerCase().includes(s) ||
                  r.asset_item?.name?.toLowerCase().includes(s) ||
                  r.taxpayer?.name?.toLowerCase().includes(s) ||
                  r.lokasi_penggunaan?.toLowerCase().includes(s)
                );
              })
              .map((rental) => (
                <div
                  key={rental.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none transition-all flex flex-col"
                >
                  <div className="p-6 pb-5 border-b border-slate-50 dark:border-slate-700/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        {rental.rental_code}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {rental.lama_sewa} {rental.satuan_sewa}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {rental.asset_item?.name || 'Unit Alat Berat'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        Keperluan: {rental.jenis_pekerjaan || 'Pengoperasian proyek'}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold">{rental.taxpayer?.name || 'Pemohon'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{rental.lokasi_penggunaan || 'Lokasi Baubau'}</span>
                      </div>
                    </div>

                    {/* Status Survey 4 Poin */}
                    <div className="pt-2">
                      {rental.survey_submitted_at ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          <span>Survey 4 Butir Telah Disimpan</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>Menunggu Survey Kelayakan Lapangan</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 mt-auto bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <button
                      onClick={() => setSelectedRentalForSurvey(rental)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-purple-600/20"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {rental.survey_submitted_at ? 'Tinjau Survey 4 Poin' : 'Isi Survey Kelayakan'}
                    </button>
                    <button
                      onClick={() => setSelectedRentalForInspection(rental)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-purple-950 dark:hover:bg-purple-900 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                    >
                      <Gauge className="w-4 h-4" />
                      Inspeksi Hour Meter Pra/Pasca
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Memuat daftar tugas...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Tidak Ada Tugas
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
            {activeTab === 'pending' 
              ? 'Kerja bagus! Anda sudah menyelesaikan semua tugas saat ini.' 
              : 'Belum ada tugas yang diselesaikan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none hover:-translate-y-1 transition-all group flex flex-col"
            >
              <div className="p-6 pb-5 border-b border-slate-50 dark:border-slate-700/50">
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold leading-none ${getStatusColor(task.status, task.due_date)}`}>
                    {getStatusIcon(task.status, task.due_date)}
                    {getStatusLabel(task.status, task.due_date)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-4 line-clamp-3">
                  {task.notes || 'Tidak ada deskripsi tugas.'}
                </p>

                <div className="space-y-3">
                  {task.taxpayer && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Wajib Pajak</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{task.taxpayer.name}</p>
                      </div>
                    </div>
                  )}

                  {task.zone && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Wilayah</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{task.zone.name}</p>
                      </div>
                    </div>
                  )}

                  {task.tax_object && (
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Objek Pajak / Reklame</p>
                          <p className="text-xs font-bold text-blue-950 dark:text-blue-200">{task.tax_object.name}</p>
                          {task.tax_object.classification && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {task.tax_object.classification.name}
                            </span>
                          )}
                        </div>
                        {task.task_type === 'field_survey' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                            Survei Lapangan
                          </span>
                        )}
                      </div>

                      {task.tax_object.address && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {task.tax_object.address}
                        </p>
                      )}

                      {/* Navigation Link if GPS Available */}
                      {task.tax_object.latitude && task.tax_object.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${task.tax_object.latitude},${task.tax_object.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800 shadow-sm"
                        >
                          <Navigation size={12} className="text-blue-600" />
                          <span>Navigasi Titik Objek ({Number(task.tax_object.latitude).toFixed(4)}, {Number(task.tax_object.longitude).toFixed(4)})</span>
                          <ExternalLink size={11} />
                        </a>
                      )}

                      {/* Materi Reklame Link if Available */}
                      {(task.tax_object.metadata?.materi_reklame || task.verification?.proof_file_url) && (
                        <a
                          href={task.tax_object.metadata?.materi_reklame || task.verification?.proof_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-amber-200 dark:border-amber-800"
                        >
                          <Camera size={12} className="text-amber-600" />
                          <span>Lihat Materi / Desain Reklame</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}
                  {/* Status Verifikasi Hasil Kunjungan Lapangan */}
                  {task.status === 'completed' && (
                    <div className="pt-2">
                      {isTaskVerified(task) ? (
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-bold text-xs">Sudah Diverifikasi Admin</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                              Disetujui
                            </span>
                          </div>
                          {task.verification?.verified_at && (
                            <p className="mt-1 text-[10px] opacity-75">
                              Diverifikasi: {new Date(task.verification.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      ) : isTaskRejected(task) ? (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span className="font-bold text-xs">Ditolak Verifikator</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-200/80 text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                              Ditolak
                            </span>
                          </div>
                          {task.verification?.notes && (
                            <p className="mt-1 text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                              Alasan: {task.verification.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="font-bold text-xs">Belum Diverifikasi</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                              Menunggu Review
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] opacity-75">
                            Hasil kunjungan telah tersimpan & dalam antrean review admin Bapenda.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Foto Bukti Kunjungan Lapangan Petugas */}
                  {(task.completion_photo_url || task.completion_photo_path) && (
                    <div className="mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                          <Camera size={13} className="text-blue-600 dark:text-blue-400" />
                          <span>Foto Bukti Kunjungan</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal({
                            url: getFileUrl(task.completion_photo_url || task.completion_photo_path),
                            title: task.tax_object?.name || task.taxpayer?.name || 'Bukti Kunjungan Lapangan'
                          })}
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Perbesar</span>
                          <ExternalLink size={10} />
                        </button>
                      </div>
                      <div 
                        onClick={() => setPreviewPhotoModal({
                          url: getFileUrl(task.completion_photo_url || task.completion_photo_path),
                          title: task.tax_object?.name || task.taxpayer?.name || 'Bukti Kunjungan Lapangan'
                        })}
                        className="relative h-40 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group bg-black/5"
                      >
                        <img
                          src={getFileUrl(task.completion_photo_url || task.completion_photo_path)}
                          alt="Foto Bukti Kunjungan"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ExternalLink size={14} />
                          <span>Klik untuk Detail</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 mt-auto bg-slate-50 dark:bg-slate-900/50">
                {task.status === 'pending' ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      id={`photo-${task.id}`}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) markAsCompleted(task.id, file);
                      }}
                    />
                    <button
                      onClick={() => document.getElementById(`photo-${task.id}`)?.click()}
                      disabled={uploadingId === task.id}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#0F2547] hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg shadow-blue-500/20"
                    >
                      {uploadingId === task.id ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Ambil Foto & Selesai
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-2">
                    <div className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Kunjungan Selesai</span>
                      </span>
                      <span className="text-[11px] opacity-80">
                        {new Date(task.completed_at || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Survey Kelayakan */}
      {selectedRentalForSurvey && (
        <AssetSurveyForm
          rental={selectedRentalForSurvey}
          onSuccess={() => {
            setSelectedRentalForSurvey(null);
            fetchAssetRentals();
          }}
          onClose={() => setSelectedRentalForSurvey(null)}
        />
      )}

      {/* Modal Inspeksi Hour Meter Pra/Pasca */}
      {selectedRentalForInspection && (
        <AssetInspectionModal
          rental={selectedRentalForInspection}
          onSuccess={() => {
            setSelectedRentalForInspection(null);
            fetchAssetRentals();
          }}
          onClose={() => setSelectedRentalForInspection(null)}
        />
      )}

      {/* Modal Input Hasil Survei Lapangan PBB */}
      {selectedPbbForSurvey && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <span>Tinjauan Lapangan NOP #{selectedPbbForSurvey.id}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pemohon: <strong>{selectedPbbForSurvey.name}</strong> • Alamat: {selectedPbbForSurvey.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedPbbForSurvey(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPbbSurvey} className="space-y-4 text-xs sm:text-sm overflow-y-auto pr-1 flex-1 py-1">
              {/* Komparasi Visual Foto Warga */}
              {selectedPbbForSurvey.metadata?.building_photo_path && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>Foto Bangunan dari Wajib Pajak:</span>
                    </span>
                    <a
                      href={getFileUrl(selectedPbbForSurvey.metadata.building_photo_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-700 dark:text-amber-300 underline font-bold"
                    >
                      Buka Asli ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={getFileUrl(selectedPbbForSurvey.metadata.building_photo_path)}
                      alt="Foto WP"
                      className="w-20 h-20 object-cover rounded-xl border border-amber-300 shrink-0 bg-amber-100"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (selectedPbbForSurvey.metadata?.building_photo_path?.startsWith('http')) {
                          target.src = selectedPbbForSurvey.metadata.building_photo_path;
                        }
                      }}
                    />
                    <div className="flex-1 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                      <p>Cocokkan foto ini dengan bangunan riil di depan Anda saat ini.</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        Luas Tanah: {selectedPbbForSurvey.land_area} m² • Luas Bgn: {selectedPbbForSurvey.building_area || 0} m²
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Titik GPS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                  <span>1. Kesesuaian Titik Lokasi GPS</span>
                  {selectedPbbForSurvey.latitude && selectedPbbForSurvey.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPbbForSurvey.latitude},${selectedPbbForSurvey.longitude}`}
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
                    <X size={14} className={!surveyLocationMatch ? 'text-rose-600' : 'text-gray-400'} />
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
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSurveyPhysicalCondition(cond.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        surveyPhysicalCondition === cond.id
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-gray-800 dark:text-gray-200">{cond.label}</div>
                      <div className="text-[10px] text-gray-400">{cond.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Kamera Lapangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  3. Foto Bukti Lapangan (Kamera Petugas)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3 text-center bg-gray-50/50 dark:bg-gray-700/30">
                  {surveyPhotoPreview ? (
                    <div className="space-y-2">
                      <img
                        src={surveyPhotoPreview}
                        alt="Preview Survei"
                        className="w-full max-h-48 object-cover rounded-lg mx-auto border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSurveyPhotoFile(null);
                          setSurveyPhotoPreview(null);
                        }}
                        className="text-[11px] text-rose-600 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <X size={12} /> Hapus &amp; Ambil Ulang
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-2">
                      <Camera className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                      <span className="text-xs font-bold text-blue-600 block">
                        Ambil Foto Langsung dari Kamera HP
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Format JPG, PNG (Maks 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSurveyPhotoFile(file);
                            setSurveyPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Step 4: Rekomendasi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  4. Rekomendasi Hasil Survei untuk Admin Bapenda
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSurveyRecommendation('RECOMMENDED')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      surveyRecommendation === 'RECOMMENDED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30 font-bold'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">✓ LAYAK TERBIT NOP</div>
                    <div className="text-[10px] opacity-90 font-normal">Sesuai Faktual Lapangan</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyRecommendation('NEEDS_REVISION')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      surveyRecommendation === 'NEEDS_REVISION'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30 font-bold'
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tombol Simpan (Sticky / Pinned Footer) */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 shrink-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedPbbForSurvey(null)}
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

      {/* Modal Survei Lapangan Mutasi PBB */}
      {selectedMutationForSurvey && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 bg-white dark:bg-gray-800 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {getMutationTypeLabel(selectedMutationForSurvey.mutation_type)}
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-500">
                    {selectedMutationForSurvey.ticket_no}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  Survei Lapangan Mutasi PBB
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMutationForSurvey(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmitMutationSurvey} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Ringkasan Data */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl text-xs space-y-1.5 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pemohon:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedMutationForSurvey.applicant_name} ({selectedMutationForSurvey.applicant_nik})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">NOP Induk:</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {selectedMutationForSurvey.parent_nop || '-'}
                  </span>
                </div>
                {selectedMutationForSurvey.mutation_type === 'SPLIT_KAVLING' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Luas Induk / Rincian:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {selectedMutationForSurvey.parent_land_area || '-'} m² • {selectedMutationForSurvey.split_items?.length || 0} Kavling
                    </span>
                  </div>
                )}
                {selectedMutationForSurvey.survey_notes && (
                  <div className="pt-1.5 border-t border-gray-200 dark:border-gray-600 text-amber-700 dark:text-amber-300">
                    <span className="font-bold">Instruksi Admin: </span>
                    <span>{selectedMutationForSurvey.survey_notes}</span>
                  </div>
                )}
              </div>

              {/* Upload Foto Survei Lapangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  1. Foto Hasil Survei / Patok / Fisik Lapangan
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3 text-center bg-gray-50 dark:bg-gray-700/30">
                  {mutationSurveyPhotoPreview ? (
                    <div className="space-y-2">
                      <img
                        src={mutationSurveyPhotoPreview}
                        alt="Preview Survei Mutasi"
                        className="w-full max-h-48 object-cover rounded-lg mx-auto border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMutationSurveyPhotoFile(null);
                          setMutationSurveyPhotoPreview(null);
                        }}
                        className="text-[11px] text-rose-600 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <X size={12} /> Hapus &amp; Ambil Ulang
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-2">
                      <Camera className="w-8 h-8 text-indigo-500 mx-auto mb-1" />
                      <span className="text-xs font-bold text-indigo-600 block">
                        Ambil Foto Lapangan (Kamera HP)
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Foto batas kavling / fisik objek (JPG/PNG maks 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMutationSurveyPhotoFile(file);
                            setMutationSurveyPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Rekomendasi Hasil Survei */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  2. Rekomendasi Petugas Lapangan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMutationRecommendation('RECOMMENDED')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      mutationRecommendation === 'RECOMMENDED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30 font-bold'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">✓ SESUAI &amp; LAYAK</div>
                    <div className="text-[10px] opacity-90 font-normal">Kondisi Lapangan Sesuai Berkas</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMutationRecommendation('NEEDS_REVISION')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      mutationRecommendation === 'NEEDS_REVISION'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30 font-bold'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">✕ PERLU KOREKSI</div>
                    <div className="text-[10px] opacity-90 font-normal">Batas/Luas Berbeda di Lapangan</div>
                  </button>
                </div>
              </div>

              {/* Catatan Survei */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 block">
                  Catatan / Berita Acara Survei Lapangan (BASL):
                </label>
                <textarea
                  rows={3}
                  value={mutationSurveyNotes}
                  onChange={(e) => setMutationSurveyNotes(e.target.value)}
                  placeholder={
                    mutationRecommendation === 'RECOMMENDED'
                      ? 'Catatan hasil survei mutasi...'
                      : 'Contoh: Patok batas kavling A overlap 2 meter dengan tetangga timur, luas riil induk 850 m².'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 shrink-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedMutationForSurvey(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingMutationSurvey}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md ${
                    mutationRecommendation === 'RECOMMENDED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  } disabled:opacity-50`}
                >
                  {submittingMutationSurvey ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Kirim Hasil Survei ke Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Foto Bukti Kunjungan */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {previewPhotoModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-hidden rounded-2xl bg-black/5 flex items-center justify-center min-h-[250px] max-h-[65vh]">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>
            <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 font-medium">Foto bukti fisik hasil kunjungan survei lapangan</span>
              <a
                href={previewPhotoModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <span>Buka Ukuran Asli</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
