import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, RefreshCw, Info, ChevronLeft, Loader2 } from 'lucide-react';

/**
 * QR Saya Petugas (merchant-presented) — M18 F3
 * Petugas menunjukkan QR ini ke wajib pajak; WP scan untuk membayar layanan petugas.
 */
export default function MyQrPetugas() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = 'https://apimpad.baubaukota.go.id';

  const loadQr = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/officer/my-qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || 'Gagal memuat QR');
        return;
      }
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat QR');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQr();
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F2547]" />
          <span className="text-xs font-bold uppercase tracking-widest">Menyiapkan QR...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-1 text-slate-600">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-sm font-black text-slate-900">QR Saya</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Petugas M-PAD</p>
        </div>
      </header>

      <main className="flex-1 px-5 pt-5 pb-8">
        {error && !data ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-sm font-bold text-rose-600 mb-2">Gagal Memuat QR</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              onClick={loadQr}
              className="px-4 py-2 bg-[#0F2547] text-white text-xs font-black uppercase rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        ) : data ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0F2547] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#0F2547]/20">
              <QrCode size={26} />
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
              {data.qr_image ? (
                <img src={data.qr_image} alt={`QR ${data.name || 'Petugas'}`} className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">QR tidak tersedia</div>
              )}
            </div>

            <h2 className="text-base font-black text-slate-900 mb-1">{data.name || 'Petugas'}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
              ID: {data.officer_id || '-'} · {data.role || '-'}
            </p>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2547] text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Perbarui QR
            </button>
          </div>
        ) : null}

        <div className="mt-4 bg-sky-50 border border-sky-100 rounded-2xl p-4 flex gap-3">
          <Info size={18} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-xs font-black text-sky-800 mb-1">Cara Pakai</p>
            <p className="text-[11px] text-sky-700 leading-relaxed">
              Tunjukkan QR ini kepada wajib pajak. Mereka scan dengan aplikasi M-PAD untuk membayar layanan yang Anda tangani — transaksi otomatis tercatat atas nama Anda.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
