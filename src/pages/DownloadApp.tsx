import { Download, Monitor, Smartphone, Apple, Info, ArrowLeft, Share, PlusSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function DownloadApp() {
  const navigate = useNavigate();
  const { isInstallable, installPWA } = usePWAInstall();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-slate-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Unduh App</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instalasi Aplikasi Petugas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 space-y-8">
        {/* Main Hero Card */}
        <div className="bg-gradient-to-br from-[#2d5cd5] to-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Download size={32} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">Akses Lebih Cepat <br/>dengan Aplikasi.</h2>
            <p className="text-blue-50/70 font-bold leading-relaxed text-sm mb-8">
              Instal aplikasi MITRA PAD di perangkat Anda untuk pengalaman kerja yang lebih lancar dan akses instan dari home screen.
            </p>

            <button 
              onClick={() => {
                if (isInstallable) {
                  installPWA();
                } else {
                  document.getElementById('install-guide')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full py-5 bg-white text-[#2d5cd5] rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 active:scale-[0.98] transition-all hover:brightness-105 mb-4"
            >
              {isInstallable ? 'Pasang Aplikasi Sekarang' : 'Lihat Panduan Pasang'}
            </button>

            {!isInstallable && (
              <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-bold flex items-center gap-3">
                <Info size={18} className="shrink-0" />
                <p>Klik tombol di atas untuk langkah-langkah pemasangan manual.</p>
              </div>
            )}
          </div>
          <Download className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
        </div>

        {/* Platform Guides */}
        <div id="install-guide" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isIOS && (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Android / Chrome</h3>
              <ul className="text-xs text-slate-500 dark:text-slate-400 font-bold space-y-3">
                <li className="flex gap-2">
                  <span className="text-blue-500">1.</span> Buka browser Chrome
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">2.</span> Klik tombol "Unduh Sekarang" di atas
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">3.</span> Atau klik menu <span className="text-slate-900 dark:text-white">⋮</span> dan pilih <span className="text-slate-900 dark:text-white">"Install App"</span>
                </li>
              </ul>
            </div>
          )}

          <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Apple size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">iOS / Safari</h3>
            <ul className="text-xs text-slate-500 dark:text-slate-400 font-bold space-y-3">
              <li className="flex gap-2 items-center">
                <span className="text-blue-500">1.</span> Tekan ikon share <Share size={14} className="text-blue-500" /> di Safari
              </li>
              <li className="flex gap-2 items-center">
                <span className="text-blue-500">2.</span> Cari & pilih <span className="text-slate-900 dark:text-white">"Add to Home Screen"</span> <PlusSquare size={14} className="text-slate-900 dark:text-white" />
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">3.</span> Klik "Add" di pojok kanan atas
              </li>
            </ul>
          </div>
        </div>

        {/* Benefits Card */}
        <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Keuntungan Aplikasi PWA</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#2d5cd5]/10 text-[#2d5cd5] rounded-xl flex items-center justify-center shrink-0">
                <Monitor size={20} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Tampilan Full screen tanpa toolbar browser yang mengganggu.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Akses instan dari Home Screen ponsel layaknya aplikasi Play Store.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
