import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home,
  BookOpen,
  LogIn,
  LayoutDashboard,
  Users,
  ScanLine,
  Database,
  FileText,
  BarChart3,
  User,
  Play,
  Pause,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    id: 'intro',
    title: 'MITRA PAD (M-PAD) PETUGAS',
    subtitle: 'Sistem Informasi Pendapatan Daerah',
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">MITRA PAD (M-PAD) PETUGAS</h1>
          <p className="text-lg text-blue-200 font-bold">Panduan Pengguna Aplikasi Petugas Lapangan</p>
          <p className="text-blue-300/60 text-sm">Pemerintah Kota Baubau</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-4">
          {['Pendataan WP', 'Penagihan', 'GPS Tracking', 'Pelaporan'].map((f, i) => (
            <span key={i} className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold text-white">
              ✓ {f}
            </span>
          ))}
        </div>
      </div>
    ),
    bg: 'from-[#0F2547] via-blue-600 to-indigo-700'
  },
  {
    id: 'login',
    title: '1. Modul Login',
    subtitle: 'Gerbang masuk aplikasi',
    icon: <LogIn className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Cara Masuk</h2>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Masukkan Email resmi petugas' },
              { step: '2', text: 'Masukkan Password' },
              { step: '3', text: 'Tekan tombol SIGN IN' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {item.step}
                </div>
                <p className="text-sm font-bold text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-amber-800 font-bold text-xs">💡 Gunakan ikon 👁️ untuk melihat password</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 h-full flex items-center justify-center bg-white/50">
          <img src="/user-guide/login.png" alt="Login" className="max-h-[55vh] w-auto object-contain" />
        </div>
      </div>
    ),
    bg: 'from-emerald-50 to-white'
  },
  {
    id: 'dashboard',
    title: '2. Dashboard',
    subtitle: 'Pantau kinerja harian',
    icon: <LayoutDashboard className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/dashboard.png" alt="Dashboard" className="max-h-[55vh] w-auto object-contain" />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Informasi Dashboard</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Penerimaan', desc: 'Uang hari ini', color: 'bg-blue-50 border-blue-100 text-blue-600' },
              { label: 'Billing Aktif', desc: 'Belum lunas', color: 'bg-amber-50 border-amber-100 text-amber-600' },
              { label: 'WP Aktif', desc: 'WP terdaftar', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
              { label: 'Peta Potensi', desc: 'Lokasi objek', color: 'bg-rose-50 border-rose-100 text-rose-600' },
            ].map((item) => (
              <div key={item.label} className={`p-3 ${item.color} rounded-xl border`}>
                <p className="text-[10px] font-black uppercase tracking-wide mb-0.5">{item.label}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    bg: 'from-blue-50 to-white'
  },
  {
    id: 'wp-list',
    title: '3. Daftar Wajib Pajak',
    subtitle: 'Kelola data WP',
    icon: <Users className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Fitur Utama</h2>
          <div className="space-y-2">
            {[
              { icon: '🔍', text: 'Cari WP berdasarkan nama/NIK' },
              { icon: '➕', text: 'Tambah WP baru' },
              { icon: '✏️', text: 'Edit data WP' },
              { icon: '🗑️', text: 'Hapus WP (hati-hati!)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                <span className="text-lg">{item.icon}</span>
                <p className="text-sm font-bold text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/wp_list.png" alt="WP List" className="max-h-[55vh] w-auto object-contain" />
        </div>
      </div>
    ),
    bg: 'from-orange-50 to-white'
  },
  {
    id: 'wp-form',
    title: '4. Form Pendaftaran',
    subtitle: '5 langkah mudah',
    icon: <FileText className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/wp_form.png" alt="WP Form" className="max-h-[55vh] w-auto object-contain" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">5 Langkah Daftar</h2>
          <div className="space-y-2">
            {[
              { step: '1', title: 'Identitas', desc: 'NIK, Nama, WA' },
              { step: '2', title: 'Kategori', desc: 'Jenis & Klasifikasi' },
              { step: '3', title: 'Persyaratan', desc: 'Upload dokumen' },
              { step: '4', title: 'Lokasi', desc: 'Titik GPS' },
              { step: '5', title: 'Review', desc: 'Cek & Kirim' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    bg: 'from-indigo-50 to-white'
  },
  {
    id: 'scanner',
    title: '5. Scanner QR',
    subtitle: 'Cari data cepat',
    icon: <ScanLine className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Kegunaan Scanner</h2>
          <div className="space-y-2">
            {[
              { icon: '📱', title: 'Scan QR Kartu WP', desc: 'Buka profil langsung' },
              { icon: '📄', title: 'Scan QR Invoice', desc: 'Lihat detail tagihan' },
              { icon: '⌨️', title: 'Input Manual', desc: 'Jika kamera error' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-black text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/scanner.png" alt="Scanner" className="max-h-[55vh] w-auto object-contain" />
        </div>
      </div>
    ),
    bg: 'from-violet-50 to-white'
  },
  {
    id: 'master-data',
    title: '6. Master Data',
    subtitle: 'Data referensi resmi',
    icon: <Database className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/master_data.png" alt="Master Data" className="max-h-[55vh] w-auto object-contain" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Data Referensi</h2>
          <p className="text-gray-600 text-sm">Tab-tab yang tersedia (Read-Only):</p>
          <div className="grid grid-cols-2 gap-2">
            {['Jenis', 'Klasifikasi', 'Zona', 'Tarif'].map((tab) => (
              <div key={tab} className="p-3 bg-slate-100 rounded-xl text-center">
                <p className="font-black text-slate-700 text-sm">{tab}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-blue-800 font-bold text-xs">ℹ️ Data dikonfigurasi oleh Admin pusat</p>
          </div>
        </div>
      </div>
    ),
    bg: 'from-slate-50 to-white'
  },
  {
    id: 'billing',
    title: '7. Billing',
    subtitle: 'Terima setoran',
    icon: <FileText className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Alur Terima Setoran</h2>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Cari invoice Pending 🟡' },
              { step: '2', text: 'Tekan tombol Bayar' },
              { step: '3', text: 'Pastikan uang diterima' },
              { step: '4', text: 'KONFIRMASI BAYAR' },
              { step: '5', text: 'Status → Lunas ✅' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {item.step}
                </div>
                <p className="text-sm font-bold text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/billing.png" alt="Billing" className="max-h-[55vh] w-auto object-contain" />
        </div>
      </div>
    ),
    bg: 'from-teal-50 to-white'
  },
  {
    id: 'reporting',
    title: '8. Laporan',
    subtitle: 'Export & analisa',
    icon: <BarChart3 className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/reporting.png" alt="Reporting" className="max-h-[55vh] w-auto object-contain" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Fitur Laporan</h2>
          <div className="space-y-2">
            {[
              { icon: '📅', text: 'Filter berdasarkan tanggal' },
              { icon: '📊', text: 'Grafik penerimaan harian' },
              { icon: '📥', text: 'Export ke CSV/Excel' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm font-bold text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    bg: 'from-purple-50 to-white'
  },
  {
    id: 'profile',
    title: '9. Profil',
    subtitle: 'Akun & logout',
    icon: <User className="w-6 h-6" />,
    content: (
      <div className="grid grid-cols-2 gap-6 items-center h-full">
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Menu Profil</h2>
          <div className="space-y-2">
            {[
              { icon: '👁️', text: 'Lihat info akun' },
              { icon: '🔐', text: 'Ubah password' },
              { icon: '🌙', text: 'Toggle dark mode' },
              { icon: '🚪', text: 'Keluar dari Akun' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm font-bold text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 max-h-[55vh]">
          <img src="/user-guide/profile.png" alt="Profile" className="max-h-[55vh] w-auto object-contain" />
        </div>
      </div>
    ),
    bg: 'from-gray-50 to-white'
  },
  {
    id: 'closing',
    title: 'Terima Kasih',
    subtitle: 'MITRA PAD (M-PAD) Petugas',
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-xl">
          <img src="/mitra-logo.png" alt="Logo" className="w-14 h-14 object-contain" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Terima Kasih</h1>
          <p className="text-lg text-blue-200 font-bold">MITRA PAD (M-PAD) PETUGAS</p>
          <p className="text-blue-300/60 text-sm">Pemerintah Kota Baubau</p>
        </div>
        <p className="text-white/60 text-sm pt-2">
          "Bersama Mewujudkan Pendapatan Daerah yang Optimal"
        </p>
        <p className="text-blue-300/40 text-xs">Versi 2.0 | Februari 2026</p>
      </div>
    ),
    bg: 'from-[#0F2547] via-blue-600 to-indigo-700'
  },
];

export default function Presentation() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreenMode(true);
    } else {
      document.exitFullscreen();
      setIsFullscreenMode(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const slide = slides[currentSlide];
  const isFullscreen = slide.id === 'intro' || slide.id === 'closing';

  return (
    <div className={`h-screen w-screen overflow-hidden bg-gradient-to-br ${slide.bg} transition-all duration-700 flex flex-col`}>
      {/* Top Navigation */}
      <div className="shrink-0 p-3 flex items-center justify-between z-50">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white transition-all"
        >
          <Home className="w-4 h-4 text-gray-700" />
        </button>
        
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
          <span className="text-xs font-black text-gray-900">{currentSlide + 1}</span>
          <span className="text-gray-400 text-xs">/</span>
          <span className="text-xs font-bold text-gray-500">{slides.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white transition-all"
            title={isFullscreenMode ? 'Keluar Fullscreen' : 'Fullscreen'}
          >
            {isFullscreenMode ? <Minimize2 className="w-4 h-4 text-gray-700" /> : <Maximize2 className="w-4 h-4 text-gray-700" />}
          </button>
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              isAutoPlay ? 'bg-blue-600 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
            }`}
          >
            {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 h-1 bg-black/10">
        <div 
          className="h-full bg-[#00C8E5] transition-all duration-500"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Slide Content - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center px-8 py-4 overflow-hidden">
        <div className={`w-full h-full flex flex-col ${isFullscreen ? 'max-w-2xl justify-center' : 'max-w-5xl'}`}>
          {!isFullscreen && (
            <div className="shrink-0 mb-4 flex items-center gap-3">
              {slide.icon && (
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-blue-600">
                  {slide.icon}
                </div>
              )}
              <div>
                <h3 className="text-2xl font-black text-gray-900">{slide.title}</h3>
                <p className="text-gray-500 font-bold text-sm">{slide.subtitle}</p>
              </div>
            </div>
          )}
          <div className={`${isFullscreen ? '' : 'flex-1 overflow-hidden'}`}>
            {slide.content}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 p-3 flex items-center justify-center gap-3 z-50">
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg disabled:opacity-30 hover:bg-white transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? 'w-6 bg-[#0F2547]' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg disabled:opacity-30 hover:bg-white transition-all"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 hidden md:block">
        ← → Navigasi | Space Lanjut | Esc Keluar
      </div>
    </div>
  );
}
