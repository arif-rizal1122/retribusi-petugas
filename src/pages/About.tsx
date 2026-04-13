import React from 'react';
import { Shield, Activity, Info, Building2, CheckCircle2 } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tentang Aplikasi</h1>
          <p className="text-gray-600 dark:text-gray-400">Informasi sistem dan build M-PAD Kota Baubau (Petugas)</p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Versi 1.0.0-PROD</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Info className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deskripsi Sistem</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            M-PAD (Modern Payment & Administration for Districts) Petugas adalah alat bantu lapangan 
            BAPENDA Kota Baubau untuk melakukan pendataan, verifikasi objek retribusi, dan 
            pemantauan kepatuhan wajib pajak secara real-time di titik lokasi.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Build Information</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400" >Environment</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">Production Mode</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Last Commit ID</span>
              <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                {__APP_COMMIT_ID__}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status Gateway</span>
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold">Terhubung</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">BAPENDA KOTA BAUBAU</h3>
            <p className="text-indigo-100 text-sm max-w-xl">
              Unit pengawasan lapangan ini bertugas memastikan akurasi data fiskal daerah 
              melalui validasi posisi GPS dan verifikasi visual objek retribusi.
            </p>
          </div>
        </div>
        
        {/* Background micro-decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-32 h-32 text-white" />
        </div>
      </div>

      <div className="text-center pt-8">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          &copy; {new Date().getFullYear()} BAPENDA Kota Baubau. Seluruh hak cipta dilindungi undang-undang.
        </p>
      </div>
    </div>
  );
};

export default About;
