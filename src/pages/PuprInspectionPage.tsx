import { useState, useEffect } from 'react';
import {
  Wrench,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Truck,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export default function PuprInspectionPage() {
  const [inspectionType, setInspectionType] = useState<'PRE_OPERATION' | 'POST_OPERATION'>('PRE_OPERATION');
  const [rentals, setRentals] = useState<any[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [selectedRentalId, setSelectedRentalId] = useState<number | ''>('');

  // Form Fields
  const [hourMeter, setHourMeter] = useState('');
  const [fuelLevel, setFuelLevel] = useState('100');
  const [conditionNotes, setConditionNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Checklist
  const [checklist, setChecklist] = useState({
    engine: 'Baik',
    hydraulic: 'Baik',
    tracks: 'Baik',
    cabin: 'Baik',
    electrical: 'Baik',
  });

  const [submitting, setSubmitting] = useState(false);
  const [latestInspectionResult, setLatestInspectionResult] = useState<any>(null);

  // Fetch Active Rentals
  useEffect(() => {
    const fetchRentals = async () => {
      try {
        setLoadingRentals(true);
        const res = await api.get('/api/asset/rentals');
        const items = res.data?.data || res.data || [];
        setRentals(items);
        if (items.length > 0) {
          setSelectedRentalId(items[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar sewa aset:', err);
      } finally {
        setLoadingRentals(false);
      }
    };
    fetchRentals();

    // Auto-detect GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.warn('Geolocation tidak aktif:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalId) {
      toast.error('Pilih armada atau kontrak sewa terlebih dahulu.');
      return;
    }
    if (!hourMeter || isNaN(Number(hourMeter))) {
      toast.error('Masukkan angka Hour Meter yang valid.');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = inspectionType === 'PRE_OPERATION'
        ? '/api/pupr/inspection/pre'
        : '/api/pupr/inspection/post';

      const payload = {
        asset_rental_id: Number(selectedRentalId),
        hour_meter: Number(hourMeter),
        fuel_level_percent: Number(fuelLevel),
        checklist,
        condition_notes: conditionNotes.trim() || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
      };

      const res = await api.post(endpoint, payload);
      setLatestInspectionResult(res.data?.data);

      if (res.data?.data?.is_overtime) {
        toast.error(
          `Perhatian: Overtime terdeteksi (${res.data.data.overtime_hours} jam)! SKRD Denda diterbitkan otomatis.`
        );
      } else {
        toast.success(res.data?.message || 'Inspeksi berhasil dicatat.');
      }

      // Reset form ringan
      setHourMeter('');
      setConditionNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal merekam inspeksi alat berat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
            <Wrench className="w-6 h-6 text-blue-200" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
              Dinas PUPR Kota Baubau
            </span>
            <h2 className="text-lg font-black leading-tight">
              Inspeksi Digital Armada Alat Berat
            </h2>
          </div>
        </div>
        <p className="text-xs text-blue-100/80">
          Pencatatan kondisi fisik dan validasi Hour Meter pra/pasca operasi untuk pencegahan fraud dan kalkulasi otomatis lembur (overtime).
        </p>
      </div>

      {/* TYPE TOGGLE */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            setInspectionType('PRE_OPERATION');
            setLatestInspectionResult(null);
          }}
          className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            inspectionType === 'PRE_OPERATION'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pra-Operasi (Kirim)
        </button>
        <button
          type="button"
          onClick={() => {
            setInspectionType('POST_OPERATION');
            setLatestInspectionResult(null);
          }}
          className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            inspectionType === 'POST_OPERATION'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Pasca-Operasi (Kembali)
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* PILIH KONTRAK SEWA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            Kontrak Sewa Armada Aktif
          </label>
          <select
            value={selectedRentalId}
            onChange={(e) => setSelectedRentalId(Number(e.target.value))}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
          >
            {rentals.length === 0 ? (
              <option value="">Tidak ada kontrak sewa aktif</option>
            ) : (
              rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rental_code || `SEWA-#${r.id}`} - {r.asset_item?.name || 'Alat Berat'} ({r.status})
                </option>
              ))
            )}
          </select>
        </div>

        {/* HOUR METER & FUEL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" />
              Angka Hour Meter (HM)
            </label>
            <input
              type="number"
              step="0.1"
              value={hourMeter}
              onChange={(e) => setHourMeter(e.target.value)}
              placeholder="Contoh: 1420.5"
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Level BBM (% Solar)
            </label>
            <select
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="100">100% (Penuh)</option>
              <option value="75">75% (3/4 Tangki)</option>
              <option value="50">50% (1/2 Tangki)</option>
              <option value="25">25% (1/4 Tangki)</option>
              <option value="10">Kritis / Kosong</option>
            </select>
          </div>
        </div>

        {/* CHECKLIST FISIK */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Checklist Kelayakan Komponen Fisik:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { key: 'engine', label: 'Mesin & Pelumas/Oli' },
              { key: 'hydraulic', label: 'Sistem Hidrolik & Seal' },
              { key: 'tracks', label: 'Track Shoe / Roda Ban' },
              { key: 'cabin', label: 'Kabin & Panel Kemudi' },
              { key: 'electrical', label: 'Sistem Kelistrikan & Lampu' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                <select
                  value={(checklist as any)[item.key]}
                  onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.value })}
                  className="bg-white dark:bg-slate-700 rounded-xl px-2 py-1 text-xs font-bold border border-slate-200 dark:border-slate-600"
                >
                  <option value="Baik">Baik</option>
                  <option value="Perlu Perhatian">Perlu Perhatian</option>
                  <option value="Rusak">Rusak</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* GPS LOCATION TAG */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>
              Koordinat Lokasi Geotag: {coords.lat ? `${coords.lat.toFixed(5)}, ${coords.lng?.toFixed(5)}` : 'Mendeteksi...'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded-md">
            GPS Valid
          </span>
        </div>

        {/* CATATAN */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Catatan Kondisi Khusus / Kerusakan / Kendala Lapangan
          </label>
          <textarea
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            rows={2}
            placeholder="Catatan inspeksi fisik jika ditemukan retakan, kebocoran, atau jam kerja istirahat..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting || loadingRentals}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
        >
          {submitting ? (
            <RotateCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Simpan Hasil Inspeksi {inspectionType === 'PRE_OPERATION' ? 'Pra-Operasi' : 'Pasca-Operasi'}
            </>
          )}
        </button>
      </form>

      {/* RESULT OVERVIEW */}
      {latestInspectionResult && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Inspeksi Berhasil Tercatat dalam Database Kasda
          </div>
          {latestInspectionResult.is_overtime && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-1 text-xs">
              <p className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Overtime Terdeteksi: {latestInspectionResult.overtime_hours} Jam
              </p>
              <p className="text-rose-600 dark:text-rose-300">
                SKRD Denda telah diterbitkan secara otomatis dengan nomor tagihan:{' '}
                <strong>{latestInspectionResult.denda_bill?.bill_number}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
