import { Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';

export function InstallPWA() {
  const { isInstallable, installPWA } = usePWA();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    // We show it if it's installable and not already installed
    if (isInstallable) {
      const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!isDismissed) {
        const timer = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    await installPWA();
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    // Dismiss for this session only to satisfy "frequently show"
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!show || !isInstallable) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-10 left-4 right-4 lg:left-auto lg:right-10 lg:w-96 z-[9999] animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2d5cd5] to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Download size={28} />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight">Pasang Aplikasi</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold leading-relaxed">Akses MITRA PAD lebih cepat & stabil langsung dari layar utama.</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <button
          onClick={handleInstall}
          className="w-full bg-[#2d5cd5] text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
        >
          Pasang Sekarang
        </button>
      </div>
    </div>
  );
}
