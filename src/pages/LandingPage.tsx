import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  MapPin, 
  QrCode,
  Wallet,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Download,
  Smartphone,
  LogIn,
  UserCheck,
  Gauge
} from 'lucide-react';

const mobileScreenshots = [
  { alt: 'Form Pendataan', subtitle: 'Pencatatan WP & Objek Pajak' },
  { alt: 'Dashboard Petugas', subtitle: 'Pantau Target & Pencapaian' },
  { alt: 'GPS Tracking', subtitle: 'Pemetaan Lokasi Presisi' },
  { alt: 'Scan QR Code', subtitle: 'Verifikasi Pembayaran Instan' },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mobileScreenshots.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo using existing official logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0F2547] rounded-xl shadow-sm border border-slate-700 flex items-center justify-center p-1.5">
                <img 
                  src="/mitra-logo.png" 
                  alt="Logo Petugas" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <span className="font-black text-[#0F2547] text-lg leading-none block">MITRA PAD (M-PAD)</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Petugas Lapangan</span>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-bold text-slate-600 hover:text-[#0F2547] transition-colors">Fitur</a>
              <a href="#benefits" className="text-sm font-bold text-slate-600 hover:text-[#0F2547] transition-colors">Keunggulan</a>
              <Link to="/download" className="text-sm font-bold text-slate-600 hover:text-[#0F2547] transition-colors">Pasang App</Link>
              <Link to="/user-guide" className="text-sm font-bold text-slate-600 hover:text-[#0F2547] transition-colors">Panduan</Link>
            </div>

            {/* Login Button */}
            <Link 
              to="/login"
              className="px-6 py-2.5 bg-[#0F2547] hover:bg-[#0B1E36] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-950/20 flex items-center gap-2 active:scale-95"
            >
              <LogIn size={16} />
              <span>Masuk</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/40 via-slate-50 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-sky-50 text-sky-600 border border-sky-100 shadow-sm">
                <Smartphone className="w-4 h-4 text-sky-500" />
                <span>Aplikasi Petugas Lapangan</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.15] tracking-tight">
                Data Potensi <br />
                <span className="text-[#0F2547]">Langsung dari</span> <br />
                <span className="text-amber-500">Lapangan</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg font-medium">
                Catat data wajib pajak & retribusi secara digital dengan GPS tracking. Scan QR untuk konfirmasi pembayaran instan.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link 
                  to="/login"
                  className="px-7 py-4 bg-[#0F2547] hover:bg-[#0B1E36] text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-950/20 flex items-center gap-2.5 text-sm active:scale-95"
                >
                  <span>Mulai Pendataan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/download"
                  className="px-7 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2.5 text-sm shadow-sm active:scale-95"
                >
                  <Download className="w-5 h-5 text-amber-500" />
                  <span>Pasang Aplikasi</span>
                </Link>

                <Link 
                  to="/user-guide"
                  className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm shadow-sm active:scale-95"
                >
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span>Panduan</span>
                </Link>
              </div>
            </div>

            {/* Right Mobile Phone Device Mockup */}
            <div className="relative hidden lg:flex justify-center items-center">
              <div className="absolute w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
              <div className="absolute w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

              <div className="relative w-[300px] bg-slate-900 rounded-[3rem] p-3.5 shadow-2xl shadow-blue-950/30 border-4 border-slate-800 transform hover:rotate-1 transition-transform duration-500">
                {/* Dynamic Island / Notch */}
                <div className="w-24 h-5 bg-slate-950 rounded-b-2xl mx-auto mb-2 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800" />
                </div>

                {/* Mobile App Screen Content */}
                <div className="bg-[#0F2547] rounded-[2.2rem] p-4 text-white min-h-[500px] flex flex-col justify-between overflow-hidden relative shadow-inner">
                  
                  {/* Status & Header */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-white/60 font-semibold mb-4 px-1">
                      <span>09:41</span>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>5G</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 mb-4">
                      <div className="w-8 h-8 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center">
                        <img src="/mitra-logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="font-bold text-xs leading-none">MITRA PAD (M-PAD)</p>
                        <p className="text-[9px] text-amber-400 font-semibold mt-0.5">Petugas Lapangan</p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Slide Content */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3 flex-1 flex flex-col justify-between my-2">
                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Form Pendataan</p>

                    <div className="space-y-2 text-left">
                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                        <p className="text-[9px] text-slate-300 font-semibold">Nama WP</p>
                        <p className="text-xs font-bold text-white">CV. Maju Jaya</p>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                        <p className="text-[9px] text-slate-300 font-semibold">Jenis Usaha</p>
                        <p className="text-xs font-bold text-white">Restoran</p>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                        <p className="text-[9px] text-slate-300 font-semibold">Alamat</p>
                        <p className="text-xs font-bold text-white truncate">Jl. Sudirman No. 45</p>
                      </div>
                    </div>

                    <button className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md mt-2">
                      Simpan Data
                    </button>
                  </div>

                  {/* Indicator dots */}
                  <div className="flex justify-center items-center gap-1.5 pt-2">
                    {mobileScreenshots.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentSlide === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Pill Badge */}
                <div className="mt-3 text-center">
                  <span className="px-4 py-1 bg-[#0F2547] text-white rounded-full text-xs font-bold border border-white/10 inline-block shadow-md">
                    {mobileScreenshots[currentSlide].alt}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase tracking-widest">
              FITUR UTAMA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">
              Semua yang Anda Butuhkan di <span className="text-[#0F2547]">Lapangan</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: MapPin,
                title: 'GPS Tracking',
                desc: 'Catat lokasi objek pajak secara akurat dengan peta digital real-time.',
                color: 'bg-sky-50 text-sky-600',
              },
              {
                icon: UserCheck,
                title: 'Input Cepat',
                desc: 'Form multi-tahap yang mudah diisi langsung dari HP.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: QrCode,
                title: 'Scan QR',
                desc: 'Konfirmasi pembayaran instan dengan scan kode billing.',
                color: 'bg-cyan-50 text-cyan-600',
              },
              {
                icon: Wallet,
                title: 'Laporan Harian',
                desc: 'Pantau target dan pencapaian pendataan harian Anda.',
                color: 'bg-purple-50 text-purple-600',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                    <feature.icon size={26} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">{feature.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#0F2547] group-hover:text-white transition-colors flex items-center justify-center text-slate-400">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section (Dark Navy Banner) */}
      <section id="benefits" className="py-24 bg-[#0F2547] text-white relative overflow-hidden">
        {/* Background Line Art Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 Q50,100 100,0" stroke="white" strokeWidth="0.5" fill="none" />
            <path d="M0,50 Q50,150 100,50" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                KEUNGGULAN
              </span>
              <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-8 text-white leading-tight">
                Bekerja Lebih Efisien di Lapangan
              </h2>

              <div className="space-y-4">
                {[
                  'Input data tanpa perlu kembali ke kantor',
                  'Sinkronisasi otomatis ke server pusat',
                  'Notifikasi target dan pengingat tugas',
                  'Akses riwayat pendataan kapan saja',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                    <div className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="font-bold text-sm text-slate-100">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Speedometer Gauge Efficiency Card */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 border border-white/15 shadow-2xl flex flex-col items-center text-center">
              
              {/* Speedometer Gauge Graphic */}
              <div className="relative w-48 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full" viewBox="0 0 100 60">
                  <path
                    d="M10,50 A40,40 0 0,1 90,50"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10,50 A40,40 0 0,1 90,50"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeDasharray="125.6"
                    strokeDashoffset="25"
                    strokeLinecap="round"
                  />
                  {/* Needle */}
                  <line x1="50" y1="50" x2="72" y2="24" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="5" fill="#F59E0B" />
                </svg>
                <div className="absolute bottom-0 text-center">
                  <span className="text-4xl font-black text-white">3x</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-2">Lebih Cepat</h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-xs">
                Dibanding pencatatan manual menggunakan kertas.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#0B1E36] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            
            {/* Logo using existing official logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl p-1.5 flex items-center justify-center border border-white/10">
                <img 
                  src="/mitra-logo.png" 
                  alt="Logo Kota Baubau" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <span className="font-black text-base leading-none block">MITRA PAD (M-PAD)</span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block mt-0.5">Petugas Lapangan</span>
              </div>
            </div>

            {/* User Guide & Download Buttons */}
            <div className="text-center flex items-center justify-center gap-3">
              <Link 
                to="/user-guide" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                <BookOpen size={16} />
                <span>Baca Panduan Pengguna</span>
              </Link>
              
              <Link 
                to="/download" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-[#0F2547] rounded-xl font-bold text-xs transition-colors shadow-md"
              >
                <Download size={16} />
                <span>Pasang Aplikasi</span>
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-right text-xs text-slate-400 font-medium">
              © 2026 BAPPENDA Kota Baubau. All rights reserved.
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
