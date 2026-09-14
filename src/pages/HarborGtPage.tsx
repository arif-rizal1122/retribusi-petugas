import { useState, useEffect } from 'react';
import {
  Anchor,
  Ship,
  Printer,
  Calendar,
  RotateCw,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { thermalPrintService } from '../services/ThermalPrintService';
import { useAuth } from '../contexts/AuthContext';

const GT_CLASSES = [
  {
    code: 'proxy_gt_1',
    name: 'Golongan I (Katinting / Perahu Motor)',
    gt_range: '< 5 GT',
    rate: 1000,
    desc: 'Perahu nelayan tradisional / mesin tempel kecil',
    icon: '⛵',
    color: 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300',
  },
  {
    code: 'proxy_gt_2',
    name: 'Golongan II (Speedboat Penumpang)',
    gt_range: '5 - 10 GT',
    rate: 3000,
    desc: 'Speedboat komersial penumpang rute pendek',
    icon: '🚤',
    color: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300',
  },
  {
    code: 'proxy_gt_3',
    name: 'Golongan III (Kapal Kayu / KLM Sedang)',
    gt_range: '11 - 20 GT',
    rate: 5000,
    desc: 'Kapal layar motor barang & sembako antarpulau',
    icon: '🚢',
    color: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300',
  },
  {
    code: 'proxy_gt_4',
    name: 'Golongan IV (Kapal Besar / KM Niaga)',
    gt_range: '> 20 GT',
    rate: 10000,
    desc: 'Kapal motor besar pengangkut komoditas antarprovinsi',
    icon: '⛴️',
    color: 'border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300',
  },
];

const BERTH_LOCATIONS = [
  'Dermaga Jembatan Batu',
  'Dermaga Murhum Rakyat',
  'Dermaga Pasar Wameo',
  'Pelabuhan Rakyat Lakologou',
  'Dermaga Pangkalan Nelayan Batupoaro',
];

export default function HarborGtPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('proxy_gt_2');
  const [shipName, setShipName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [berthLocation, setBerthLocation] = useState(BERTH_LOCATIONS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS_INSTANT'>('TUNAI');

  const [submitting, setSubmitting] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState<any>(null);

  // Daily Manifest
  const [manifest, setManifest] = useState<any[]>([]);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const activeCategory = GT_CLASSES.find((c) => c.code === selectedCategory) || GT_CLASSES[0];
  const totalTariff = activeCategory.rate * durationDays;

  const fetchManifest = async () => {
    try {
      setLoadingManifest(true);
      const res = await api.get('/api/dishub/harbor/manifest');
      setManifest(res.data?.manifest || []);
    } catch (err) {
      console.error('Gagal memuat manifes tambat dermaga:', err);
    } finally {
      setLoadingManifest(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, []);

  const handlePrint = async (receipt: any) => {
    try {
      await thermalPrintService.print({
        ticket_code: receipt.ticket_code,
        market_name: receipt.berth_location,
        merchant_name: receipt.ship_name + (receipt.captain_or_owner_name ? ` (${receipt.captain_or_owner_name})` : ''),
        stall_number: receipt.category_name,
        amount: receipt.total_amount,
        payment_method: receipt.payment_method,
        qr_token: receipt.qr_token,
        datetime: new Date(receipt.issued_at).toLocaleString('id-ID'),
        collector_name: user?.name || 'Petugas Dermaga Dishub',
      });
      toast.success('Struk tambat labuh berhasil dicetak!');
    } catch (err) {
      toast.error('Printer belum terhubung via Bluetooth.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipName.trim()) {
      toast.error('Masukkan nama kapal / perahu.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ship_name: shipName.trim(),
        captain_or_owner_name: captainName.trim() || undefined,
        gt_category: selectedCategory,
        duration_days: Number(durationDays),
        berth_location: berthLocation,
        payment_method: paymentMethod,
      };

      const res = await api.post('/api/dishub/harbor/session', payload);
      const receipt = res.data?.data;
      setLatestReceipt(receipt);
      toast.success(`Karcis Tambat ${receipt.ticket_code} berhasil diterbitkan!`);

      if (paymentMethod === 'TUNAI') {
        handlePrint(receipt);
      }

      setShipName('');
      setCaptainName('');
      setDurationDays(1);
      fetchManifest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan retribusi tambat labuh');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-sky-700 via-blue-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
            <Anchor className="w-6 h-6 text-sky-200" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">
              Dinas Perhubungan Kota Baubau
            </span>
            <h2 className="text-lg font-black leading-tight">
              Retribusi Tambat Labuh Kapal Rakyat (Proxy GT)
            </h2>
          </div>
        </div>
        <p className="text-xs text-sky-100/80">
          Penarikan resmi retribusi pemanfaatan dermaga daerah Perda No. 1 Tahun 2024 Pasal 91 berbasis 4 klasifikasi tonase kotor (Gross Tonnage).
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* PILIH GOLONGAN KAPAL (PROXY GT) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-sky-600" />
            Pilih Klasifikasi / Golongan Kapal (Proxy GT Perda 1/2024):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GT_CLASSES.map((gt) => {
              const isSelected = selectedCategory === gt.code;
              return (
                <div
                  key={gt.code}
                  onClick={() => setSelectedCategory(gt.code)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1 relative ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 shadow-md scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{gt.icon}</span>
                    <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                      Rp {gt.rate.toLocaleString('id-ID')} / hari
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">
                    {gt.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{gt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* INPUT IDENTITAS KAPAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Kapal / Perahu
            </label>
            <input
              type="text"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              placeholder="Contoh: KM Berkah Bahari 02"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Nakhoda / Pemilik (Opsional)
            </label>
            <input
              type="text"
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="Contoh: Capt. La Ode Basri"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* LOKASI DERMAGA & DURASI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-600" />
              Lokasi Dermaga Tambat
            </label>
            <select
              value={berthLocation}
              onChange={(e) => setBerthLocation(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {BERTH_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" />
              Durasi Tambat (Hari)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">Hari</span>
            </div>
          </div>
        </div>

        {/* METODE PEMBAYARAN */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('TUNAI')}
              className={`py-3 rounded-2xl text-xs font-bold border transition-all ${
                paymentMethod === 'TUNAI'
                  ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              💵 Tunai Lapangan
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS_INSTANT')}
              className={`py-3 rounded-2xl text-xs font-bold border transition-all ${
                paymentMethod === 'QRIS_INSTANT'
                  ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              📱 QRIS Dinamis
            </button>
          </div>
        </div>

        {/* TOTAL & SUBMIT */}
        <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300">
              Total Retribusi Tambat:
            </span>
            <p className="text-xl font-black text-sky-900 dark:text-sky-100">
              Rp {totalTariff.toLocaleString('id-ID')}
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-lg shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {submitting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Terbitkan & Cetak Struk
          </button>
        </div>
      </form>

      {/* LATEST RECEIPT SUCCESS CARD */}
      {latestReceipt && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                Karcis Tambat Terbit
              </span>
              <h4 className="text-base font-black text-emerald-950 dark:text-white">
                {latestReceipt.ticket_code}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => handlePrint(latestReceipt)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" />
              Cetak Ulang Struk
            </button>
          </div>
          <div className="text-xs text-emerald-800 dark:text-emerald-200 grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
            <p><strong>Kapal:</strong> {latestReceipt.ship_name}</p>
            <p><strong>Dermaga:</strong> {latestReceipt.berth_location}</p>
            <p><strong>Golongan:</strong> {latestReceipt.category_name}</p>
            <p><strong>Total Bayar:</strong> Rp {(latestReceipt.total_amount || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}

      {/* RECENT MANIFEST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Manifes Harian Kapal Tambat Hari Ini
            </h3>
          </div>
          <button
            onClick={fetchManifest}
            disabled={loadingManifest}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingManifest ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>

        {manifest.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Belum ada data kapal tambat yang dicatat hari ini.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {manifest.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{item.ship_name}</p>
                  <span className="text-[10px] text-slate-400">{item.category} • {item.payment_method}</span>
                </div>
                <span className="font-bold text-emerald-600">
                  Rp {(item.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
