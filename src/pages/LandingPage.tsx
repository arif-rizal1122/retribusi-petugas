import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  MapPin, 
  QrCode,
  Wallet,
  Users,
  ArrowRight,
  CheckCircle,
  BookOpen,
  Download,
  Smartphone
} from 'lucide-react';

// Baubau Logo Colors
const BAUBAU_BLUE = '#074764';
const BAUBAU_GOLD = '#d9a742';

// Mobile app screenshots for the carousel
const mobileScreenshots = [
  {
    src: 'https://res.cloudinary.com/ddhgtgsed/image/upload/v1770160000/sipanda/petugas-dashboard.png',
    alt: 'Dashboard Petugas',
    fallback: true
  },
  {
    src: 'https://res.cloudinary.com/ddhgtgsed/image/upload/v1770160000/sipanda/petugas-pendataan.png', 
    alt: 'Form Pendataan',
    fallback: true
  },
  {
    src: 'https://res.cloudinary.com/ddhgtgsed/image/upload/v1770160000/sipanda/petugas-maps.png',
    alt: 'GPS Tracking',
    fallback: true
  },
  {
    src: 'https://res.cloudinary.com/ddhgtgsed/image/upload/v1770160000/sipanda/petugas-qr.png',
    alt: 'Scan QR Code',
    fallback: true
  }
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % mobileScreenshots.length);
        setIsTransitioning(false);
      }, 300);
    }, 2000); // Change slide every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/mitra-logo.png" 
                alt="Logo Kota Baubau" 
                className="w-10 h-10 object-contain" 
              />
              <div>
                <span className="font-black text-gray-900 text-lg tracking-tighter">MITRA PAD (M-PAD)</span>
                <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-widest leading-none -mt-1">Petugas Lapangan</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-gray-600 hover:text-[#074764] transition-colors">Fitur</a>
              <a href="#benefits" className="text-sm font-semibold text-gray-600 hover:text-[#074764] transition-colors">Keunggulan</a>
              <Link to="/download" className="text-sm font-semibold text-gray-600 hover:text-[#074764] transition-colors">Pasang App</Link>
              <Link to="/user-guide" className="text-sm font-semibold text-gray-600 hover:text-[#074764] transition-colors">Panduan</Link>
            </div>

            <Link 
              to="/login"
              className="px-6 py-2.5 text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
              style={{ backgroundColor: BAUBAU_BLUE }}
            >
              Masuk
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-[#074764]/5 to-[#d9a742]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                style={{ backgroundColor: `${BAUBAU_BLUE}15`, color: BAUBAU_BLUE }}
              >
                <Smartphone className="w-4 h-4" />
                Aplikasi Petugas Lapangan
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                Data Potensi <br/>
                <span 
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: `linear-gradient(to right, ${BAUBAU_BLUE}, ${BAUBAU_GOLD})` }}
                >
                  Langsung dari Lapangan
                </span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                Catat data wajib pajak & retribusi secara digital dengan GPS tracking. 
                Scan QR untuk konfirmasi pembayaran instan.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/login"
                  className="px-8 py-4 text-white rounded-2xl font-bold transition-all shadow-xl flex items-center gap-2"
                  style={{ backgroundColor: BAUBAU_BLUE, boxShadow: `0 20px 40px -12px ${BAUBAU_BLUE}40` }}
                >
                  Mulai Pendataan <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/download"
                  className="px-8 py-4 bg-white rounded-2xl font-bold border border-[#074764]/15 transition-all flex items-center gap-2 shadow-lg shadow-slate-200/50"
                  style={{ color: BAUBAU_BLUE }}
                >
                  <Download className="w-5 h-5" /> Pasang Aplikasi
                </Link>
                <Link 
                  to="/user-guide"
                  className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-bold border border-gray-200 hover:border-[#d9a742] hover:text-[#074764] transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" /> Panduan
                </Link>
              </div>
            </div>
            
            {/* Mobile App Preview with Auto-Sliding Carousel */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ backgroundColor: BAUBAU_BLUE }}></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ backgroundColor: BAUBAU_GOLD }}></div>
              
              {/* Phone Frame */}
              <div className="relative bg-white rounded-[2.5rem] shadow-2xl border-4 border-gray-800 p-2 max-w-[280px] mx-auto">
                {/* Phone Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-gray-800 rounded-b-xl z-20"></div>
                
                {/* Screen Container */}
                <div 
                  className="rounded-[2rem] overflow-hidden relative"
                  style={{ backgroundColor: BAUBAU_BLUE, aspectRatio: '9/19' }}
                >
                  {/* Slide Content with Transition */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out"
                    style={{
                      transform: isTransitioning ? 'translateY(100%)' : 'translateY(0)',
                      opacity: isTransitioning ? 0 : 1
                    }}
                  >
                    {/* Placeholder Screen Content */}
                    <div className="w-full h-full p-4 flex flex-col">
                      {/* Status Bar */}
                      <div className="flex items-center justify-between text-white/70 text-[10px] mb-3 pt-6">
                        <span>09:41</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-white/50 rounded-sm"></div>
                          <span>100%</span>
                        </div>
                      </div>
                      
                      {/* App Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <img 
                          src="/mitra-logo.png" 
                          alt="Logo" 
                          className="w-8 h-8 object-contain bg-white rounded-lg p-1" 
                        />
                        <div>
                          <div className="text-white text-sm font-bold">MITRA PAD (M-PAD)</div>
                          <div className="text-white/60 text-[10px]">Petugas</div>
                        </div>
                      </div>
                      
                      {/* Dynamic Content Based on Slide */}
                      <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur">
                        {currentSlide === 0 && (
                          <div className="space-y-3">
                            <div className="text-white text-xs font-bold">Dashboard</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/20 rounded-xl p-2 text-center">
                                <div className="text-lg font-black text-white">27</div>
                                <div className="text-[8px] text-white/70">Pendataan</div>
                              </div>
                              <div className="bg-white/20 rounded-xl p-2 text-center">
                                <div className="text-lg font-black" style={{ color: BAUBAU_GOLD }}>5</div>
                                <div className="text-[8px] text-white/70">Target Hari Ini</div>
                              </div>
                            </div>
                            <div className="bg-white/20 rounded-xl p-2">
                              <div className="text-[8px] text-white/70 mb-1">Progress Mingguan</div>
                              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: BAUBAU_GOLD }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        {currentSlide === 1 && (
                          <div className="space-y-3">
                            <div className="text-white text-xs font-bold">Form Pendataan</div>
                            <div className="space-y-2">
                              <div className="bg-white/20 rounded-lg p-2">
                                <div className="text-[8px] text-white/50">Nama WP</div>
                                <div className="text-[10px] text-white">CV. Maju Jaya</div>
                              </div>
                              <div className="bg-white/20 rounded-lg p-2">
                                <div className="text-[8px] text-white/50">Jenis Usaha</div>
                                <div className="text-[10px] text-white">Restoran</div>
                              </div>
                              <div className="bg-white/20 rounded-lg p-2">
                                <div className="text-[8px] text-white/50">Alamat</div>
                                <div className="text-[10px] text-white">Jl. Sudirman No. 45</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {currentSlide === 2 && (
                          <div className="space-y-3">
                            <div className="text-white text-xs font-bold">GPS Tracking</div>
                            <div className="bg-white/20 rounded-xl p-2 aspect-square relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-blue-400/30"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <MapPin className="w-6 h-6" style={{ color: BAUBAU_GOLD }} />
                              </div>
                              <div className="absolute bottom-1 right-1 text-[8px] text-white/70">
                                -5.4675, 122.6359
                              </div>
                            </div>
                          </div>
                        )}
                        {currentSlide === 3 && (
                          <div className="space-y-3">
                            <div className="text-white text-xs font-bold">Scan QR Code</div>
                            <div className="flex items-center justify-center aspect-square bg-white/20 rounded-xl">
                              <QrCode className="w-16 h-16 text-white/70" />
                            </div>
                            <div className="text-center text-[10px] text-white/70">
                              Arahkan kamera ke kode QR
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Slide Indicators */}
                      <div className="flex items-center justify-center gap-1.5 mt-3 mb-2">
                        {mobileScreenshots.map((_, idx) => (
                          <div 
                            key={idx}
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: currentSlide === idx ? '16px' : '6px',
                              backgroundColor: currentSlide === idx ? BAUBAU_GOLD : 'rgba(255,255,255,0.3)'
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-800 rounded-full"></div>
              </div>
              
              {/* Current Slide Label */}
              <div className="text-center mt-4">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: BAUBAU_BLUE }}
                >
                  {mobileScreenshots[currentSlide].alt}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: BAUBAU_GOLD }}>Fitur Utama</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">
              Semua yang Anda Butuhkan di <span style={{ color: BAUBAU_BLUE }}>Lapangan</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: MapPin, title: 'GPS Tracking', desc: 'Catat lokasi objek pajak secara akurat dengan peta digital.', color: BAUBAU_BLUE },
              { icon: Users, title: 'Input Cepat', desc: 'Form multi-tahap yang mudah diisi langsung dari HP.', color: BAUBAU_GOLD },
              { icon: QrCode, title: 'Scan QR', desc: 'Konfirmasi pembayaran instan dengan scan kode billing.', color: BAUBAU_BLUE },
              { icon: Wallet, title: 'Laporan Harian', desc: 'Pantau target dan pencapaian pendataan harian Anda.', color: BAUBAU_GOLD },
            ].map((feature, i) => (
              <div key={i} className="bg-gray-50 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 text-white" style={{ background: `linear-gradient(135deg, ${BAUBAU_BLUE}, ${BAUBAU_BLUE}dd)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: BAUBAU_GOLD }}>Keunggulan</span>
              <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-8">
                Bekerja Lebih Efisien di Lapangan
              </h2>
              <div className="space-y-6">
                {[
                  'Input data tanpa perlu kembali ke kantor',
                  'Sinkronisasi otomatis ke server pusat',
                  'Notifikasi target dan pengingat tugas',
                  'Akses riwayat pendataan kapan saja',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${BAUBAU_GOLD}30` }}>
                      <CheckCircle className="w-5 h-5" style={{ color: BAUBAU_GOLD }} />
                    </div>
                    <span className="font-semibold">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-6xl font-black mb-2" style={{ color: BAUBAU_GOLD }}>3x</div>
              <div className="text-xl font-bold opacity-90">Lebih Cepat</div>
              <p className="text-sm mt-4 opacity-70">
                Dibanding pencatatan manual menggunakan kertas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-3">
              <img 
                src="/mitra-logo.png" 
                alt="Logo Kota Baubau" 
                className="w-10 h-10 object-contain" 
              />
              <div>
                <span className="font-black text-lg">MITRA PAD (M-PAD)</span>
                <span className="text-xs text-gray-400 block tracking-widest uppercase font-bold text-[8px]">Petugas Lapangan</span>
              </div>
            </div>
            <div className="text-center flex flex-wrap justify-center gap-3">
              <Link 
                to="/user-guide" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                style={{ backgroundColor: BAUBAU_BLUE }}
              >
                <BookOpen className="w-5 h-5" /> Baca Panduan Pengguna
              </Link>
              <Link
                to="/download"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-gray-900 transition-colors"
                style={{ backgroundColor: BAUBAU_GOLD }}
              >
                <Download className="w-5 h-5" /> Pasang Aplikasi
              </Link>
            </div>
            <div className="text-right text-sm text-gray-400">
              © 2026 BAPPENDA Kota Baubau
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
