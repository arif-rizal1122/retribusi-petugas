import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, MapPin, CheckCircle, ArrowLeft, Loader2, AlertCircle, Search } from 'lucide-react';
import { api } from '../lib/api';

export default function FieldInspection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noticeId = searchParams.get('noticeId');
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [notices, setNotices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredNotices = notices.filter((n: any) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const nameMatch = n.tax_object?.name?.toLowerCase().includes(term);
    const addressMatch = n.tax_object?.address?.toLowerCase().includes(term);
    const numberMatch = n.number?.toLowerCase().includes(term);
    return nameMatch || addressMatch || numberMatch;
  });

  useEffect(() => {
    fetchNotices();
    // Get current location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Retry without high accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (retryErr) => {
              console.warn("Geolocation unavailable:", retryErr.message);
              setError("GPS tidak tersedia. Pastikan lokasi/GPS aktif di perangkat Anda.");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, [noticeId]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      // Fetch all enforcements (first page)
      const res = await api.get(`/api/pengawas/enforcements`);
      const items = res.data || []; // Laravel pagination puts items in 'data'
      setNotices(items);
      
      if (noticeId) {
        const found = items.find((n: any) => n.id.toString() === noticeId);
        setNotice(found);
      }
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat data surat perintah.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  const [distance, setDistance] = useState<number | null>(null);
  const MAX_DISTANCE = 100; // 100 meters

  useEffect(() => {
    if (location && notice?.tax_object?.latitude && notice?.tax_object?.longitude) {
      const d = calculateDistance(
        location.lat, 
        location.lng, 
        parseFloat(notice.tax_object.latitude), 
        parseFloat(notice.tax_object.longitude)
      );
      setDistance(d);
    }
  }, [location, notice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !photo) {
      toast.error("Lokasi dan Foto wajib diisi!");
      return;
    }

    if (distance !== null && distance > MAX_DISTANCE) {
       toast.error(`Anda terlalu jauh dari objek pajak (${Math.round(distance)}m). Maksimal jarak adalh ${MAX_DISTANCE}m.`);
       return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('lat', location.lat.toString());
      formData.append('lng', location.lng.toString());
      formData.append('photo', photo);

      await api.post(`/api/pengawas/enforcements/${noticeId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Laporan kunjungan lapangan berhasil dikirim!");
      navigate('/dashboard');
    } catch (err: any) {
      toast.error("Gagal mengirim laporan: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Memuat Data...</p>
    </div>
  );

  if (!notice && noticeId) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Data Tidak Ditemukan</h2>
        <p className="text-slate-500 text-sm">Surat perintah dengan ID {noticeId} tidak ditemukan atau Anda tidak memiliki akses.</p>
        <button 
          onClick={() => navigate('/field-check')}
          className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg"
        >
          LIHAT SEMUA TUGAS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-3 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Inspeksi Lapangan</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manajemen Kepatuhan</p>
        </div>
      </div>

      {!notice ? (
        <div className="space-y-4">
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h2 className="text-lg font-black mb-1 capitalize">Tugas Inspeksi</h2>
            <p className="text-blue-100 text-xs font-medium opacity-80">Pilih surat perintah untuk memulai inspeksi lapangan</p>
          </div>

          <div className="relative z-20">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari WP, nomor surat, atau alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            
            {searchQuery && isDropdownOpen && (
              <div className="absolute z-30 w-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 max-h-80 overflow-y-auto">
                {filteredNotices.length > 0 ? (
                  filteredNotices.map((n: any) => (
                    <div 
                      key={n.id}
                      onClick={() => {
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                        navigate(`/field-check?noticeId=${n.id}`);
                      }}
                      className="p-4 border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors last:border-0"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg uppercase tracking-wider">{n.number}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${n.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {n.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{n.tax_object?.name || 'Objek Pajak Tanpa Nama'}</h3>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">{n.tax_object?.address || 'Alamat tidak tersedia'}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Tidak ada hasil ditemukan
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredNotices.length > 0 ? (
              filteredNotices.map((n: any) => (
                <div 
                  key={n.id}
                  onClick={() => navigate(`/field-check?noticeId=${n.id}`)}
                  className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-wider">{n.number}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${n.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {n.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{n.tax_object?.name || 'Objek Pajak Tanpa Nama'}</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} className="text-blue-500" />
                    {n.tax_object?.address || 'Alamat tidak tersedia'}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 bg-slate-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-1">Pencarian Kosong</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tidak ada tugas yang sesuai</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">{notice.number}</span>
                <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">{notice.type.replace('_', ' ')}</span>
              </div>
              <h2 className="text-xl font-black mb-1">{notice.tax_object?.name}</h2>
              <p className="text-blue-100 text-xs font-medium opacity-80 flex items-center gap-2">
                <MapPin size={12} />
                {notice.tax_object?.address}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">1. Verifikasi Lokasi (GPS)</label>
              {location ? (
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-in zoom-in-95 ${
                    distance !== null && distance <= MAX_DISTANCE 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' 
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
                       distance !== null && distance <= MAX_DISTANCE ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                    }`}>
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                          {distance !== null && distance <= MAX_DISTANCE ? 'Lokasi Valid' : 'Lokasi Terlalu Jauh'}
                        </p>
                        {distance !== null && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            distance <= MAX_DISTANCE ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {Math.round(distance)}m
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-bold leading-none">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                    </div>
                    {distance !== null && distance <= MAX_DISTANCE ? (
                      <CheckCircle className="w-5 h-5 ml-auto text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 ml-auto text-rose-500" />
                    )}
                  </div>

                  {distance !== null && distance > MAX_DISTANCE && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800/30">
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-relaxed uppercase tracking-tight">
                        <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                        Anda harus berada dalam radius **{MAX_DISTANCE} meter** dari objek pajak untuk dapat mengirim laporan.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-800/50 animate-pulse">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Mencari GPS</p>
                    <p className="text-xs font-bold">Pastikan izin lokasi aktif...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">2. Ambil Foto Bukti Lapangan</label>
              <div 
                onClick={() => document.getElementById('camera-input')?.click()}
                className={`aspect-video border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group relative ${
                  previewUrl ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/30'
                }`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Klik untuk Ganti Foto</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Camera size={28} className="text-slate-300 group-hover:text-inherit" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ambil Foto (Kamera)</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                id="camera-input" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePhotoChange}
                className="hidden" 
              />
            </div>

            <button
              type="submit"
              disabled={!location || !photo || submitting || (distance !== null && distance > MAX_DISTANCE)}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  MENYIMPAN...
                </>
              ) : (
                <>
                  {distance !== null && distance > MAX_DISTANCE ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  {distance !== null && distance > MAX_DISTANCE ? "JARAK TERLALU JAUH" : "KIRIM LAPORAN INSPEKSI"}
                </>
              )}
            </button>
          </form>
        </>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}
    </div>
  );
}
