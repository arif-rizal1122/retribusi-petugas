import { useState, useEffect } from 'react';
import api from '../lib/api';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AssetSurveyForm, type AssetRentalSurveyItem } from '../components/AssetSurveyForm';
import { AssetInspectionModal } from '../components/AssetInspectionModal';

interface Task {
  id: number;
  user_id: number;
  zone_id: number | null;
  taxpayer_id: number | null;
  due_date: string;
  notes: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
  created_at: string;
  taxpayer?: {
    name: string;
    npwpd: string;
  };
  zone?: {
    name: string;
  };
}

export default function DaftarTugas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assetRentals, setAssetRentals] = useState<AssetRentalSurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'asset_survey'>('pending');
  const [selectedRentalForSurvey, setSelectedRentalForSurvey] = useState<AssetRentalSurveyItem | null>(null);
  const [selectedRentalForInspection, setSelectedRentalForInspection] = useState<AssetRentalSurveyItem | null>(null);

  useEffect(() => {
    if (activeTab === 'asset_survey') {
      fetchAssetRentals();
    } else {
      fetchTasks();
    }
  }, [activeTab]);

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
      if (res.data?.data) {
        setTasks(res.data.data);
      }
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

  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return (
      task.notes?.toLowerCase().includes(searchLower) ||
      task.taxpayer?.name?.toLowerCase().includes(searchLower) ||
      task.zone?.name?.toLowerCase().includes(searchLower)
    );
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
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Selesai
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

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500" />
        <input
          type="text"
          placeholder={activeTab === 'asset_survey' ? "Cari kode, nama alat, lokasi, atau pemohon..." : "Cari tugas berdasarkan catatan, zona, atau wp..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
          ))}
        </div>
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
                    <div className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold uppercase tracking-wider text-xs cursor-default border border-slate-200 dark:border-slate-700">
                      Selesai {new Date(task.completed_at || '').toLocaleDateString('id-ID')}
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
    </div>
  );
}
