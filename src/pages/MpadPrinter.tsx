import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Bluetooth, 
  Loader2, 
  ArrowLeft, 
  Zap, 
  Info 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { thermalPrintService } from '../services/ThermalPrintService';

export default function MpadPrinter() {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [printingTest, setPrintingTest] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [new Date().toLocaleTimeString('id-ID') + ' - ' + msg, ...prev.slice(0, 10)]);
  };

  const handleConnect = async () => {
    setConnecting(true);
    addLog('Mencari perangkat Bluetooth Thermal Printer...');

    try {
      const isOk = await thermalPrintService.connect();
      if (isOk) {
        setConnected(true);
        addLog('Printer berhasil terhubung via BLE Characteristic.');
        toast.success('Printer terhubung!');
      } else {
        addLog('Koneksi dibatalkan atau tidak ada characteristic writable.');
        toast.error('Gagal menghubungkan printer.');
      }
    } catch (err: any) {
      console.error(err);
      addLog('Error: ' + (err.message || 'Koneksi gagal'));
      toast.error(err.message || 'Gagal menghubungkan printer');
    } finally {
      setConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    setPrintingTest(true);
    addLog('Mengirim format cetak uji coba (58mm ESC/POS)...');

    try {
      await thermalPrintService.print({
        billNumber: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
        name: 'Wajib Pajak Uji Coba',
        objectName: 'Retribusi Pelayanan Kebersihan',
        amount: 25000,
        penalty: 0,
        total: 25000,
        date: new Date().toLocaleDateString('id-ID'),
        period: 'Agustus 2026'
      });
      addLog('Struk uji coba berhasil dikirim ke printer!');
      toast.success('Struk uji coba berhasil dicetak!');
    } catch (err: any) {
      console.error(err);
      addLog('Gagal cetak: ' + (err.message || 'Printer tidak merespon'));
      toast.error('Gagal mencetak. Hubungkan printer terlebih dahulu.');
    } finally {
      setPrintingTest(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Printer Thermal Lapangan</h1>
          <p className="text-xs text-slate-500">Konfigurasi dan pairing printer Bluetooth 58mm untuk cetak SSPD</p>
        </div>
      </div>

      {/* Main Connection Status Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center space-y-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all ${
          connected 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
            : 'bg-blue-50 dark:bg-blue-900/30 text-baubau-blue'
        }`}>
          <Printer className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {connected ? 'Printer Terhubung' : 'Printer Belum Terhubung'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mendukung semua printer thermal Bluetooth mini 58mm (ESC/POS)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-5 py-2.5 bg-baubau-blue hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
            {connected ? 'Hubungkan Ulang' : 'Cari & Hubungkan Printer'}
          </button>

          <button
            onClick={handleTestPrint}
            disabled={printingTest}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {printingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Cetak Struk Uji Coba
          </button>
        </div>
      </div>

      {/* Guide Info */}
      <div className="bg-blue-50/70 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 space-y-2">
        <div className="flex items-center gap-2 text-baubau-blue dark:text-blue-400">
          <Info className="w-4 h-4" />
          <h3 className="text-xs font-bold">Panduan Penggunaan Printer di Lapangan</h3>
        </div>
        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
          <li>Nyalakan Bluetooth pada smartphone atau tablet Anda.</li>
          <li>Nyalakan printer thermal dan pastikan lampu indikator biru/hijau menyala.</li>
          <li>Gunakan browser Google Chrome / Edge pada perangkat Android untuk mendukung Web Bluetooth API.</li>
          <li>Setelah pembayaran tunai dikonfirmasi di halaman tagihan, resi akan dicetak secara otomatis.</li>
        </ul>
      </div>

      {/* Connection Logs */}
      {log.length > 0 && (
        <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl text-[11px] font-mono space-y-1">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">Log Aktivitas Printer:</p>
          {log.map((item, idx) => (
            <p key={idx} className="line-clamp-1">{item}</p>
          ))}
        </div>
      )}
    </div>
  );
}
