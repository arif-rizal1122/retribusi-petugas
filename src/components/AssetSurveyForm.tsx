import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  FileCheck,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export interface AssetRentalSurveyItem {
  id: number;
  rental_code: string;
  nomor_kontrak?: string | null;
  taxpayer?: {
    id: number;
    name: string;
    nik?: string;
    phone?: string;
  };
  asset_item?: {
    id: number;
    name: string;
    code?: string | null;
  };
  lokasi_penggunaan?: string | null;
  jenis_pekerjaan?: string | null;
  lama_sewa?: number | string;
  satuan_sewa?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  survey_akses_jalan?: boolean | null;
  survey_dekat_jalan_raya?: boolean | null;
  survey_keamanan?: boolean | null;
  survey_lahan_luas?: boolean | null;
  survey_kesimpulan?: string | null;
  survey_foto_path?: string | null;
  survey_submitted_at?: string | null;
}

interface AssetSurveyFormProps {
  rental: AssetRentalSurveyItem;
  onSuccess: () => void;
  onClose: () => void;
}

export const AssetSurveyForm: React.FC<AssetSurveyFormProps> = ({
  rental,
  onSuccess,
  onClose,
}) => {
  const [aksesJalan, setAksesJalan] = useState<boolean>(
    rental.survey_akses_jalan ?? true
  );
  const [dekatJalanRaya, setDekatJalanRaya] = useState<boolean>(
    rental.survey_dekat_jalan_raya ?? true
  );
  const [keamanan, setKeamanan] = useState<boolean>(
    rental.survey_keamanan ?? true
  );
  const [lahanLuas, setLahanLuas] = useState<boolean>(
    rental.survey_lahan_luas ?? true
  );
  const [kesimpulan, setKesimpulan] = useState<string>(
    rental.survey_kesimpulan || ''
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Auto-detect current GPS location
    if ('geolocation' in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGettingLocation(false);
        },
        () => setGettingLocation(false),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const isAllEligible = aksesJalan && dekatJalanRaya && keamanan && lahanLuas;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/asset/rentals/${rental.id}/survey`, {
        survey_akses_jalan: aksesJalan,
        survey_dekat_jalan_raya: dekatJalanRaya,
        survey_keamanan: keamanan,
        survey_lahan_luas: lahanLuas,
        survey_kesimpulan:
          kesimpulan ||
          (isAllEligible
            ? 'Lokasi layak & memenuhi standar operasional olah gerak alat berat.'
            : 'Perlu penyesuaian lokasi/akses jalan sebelum unit dimobilisasi.'),
        survey_foto_path: coords
          ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
          : null,
      });

      toast.success('Laporan 4 butir survey kelayakan berhasil disimpan!');
      onSuccess();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Gagal menyimpan laporan survey.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Survey Kelayakan Alat Berat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                UPTD Workshop PUPR Kota Baubau
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Ringkas Permohonan */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-600/60 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Kode / Unit:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {rental.rental_code} — {rental.asset_item?.name || 'Alat Berat'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Pemohon (WP):</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {rental.taxpayer?.name || 'Warga'} ({rental.taxpayer?.phone || '-'})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Lokasi Proyek:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate max-w-[220px]">
              {rental.lokasi_penggunaan || 'Baubau'}
            </span>
          </div>
        </div>

        {/* Form 4 Checklist Kelayakan PUPR */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              4 Parameter Standar Kelayakan Lapangan:
            </label>

            {/* Checklist 1 */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={aksesJalan}
                onChange={(e) => setAksesJalan(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  1. Akses Keluar Masuk Lebar
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Alat berat (Loader/Excavator/Tronton) dapat masuk ke titik lokasi tanpa hambatan sempit.
                </p>
              </div>
            </label>

            {/* Checklist 2 */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={dekatJalanRaya}
                onChange={(e) => setDekatJalanRaya(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  2. Dekat dengan Jalan Raya
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Kemudahan mobilisasi dan pengangkutan bahan bakar/logistik unit.
                </p>
              </div>
            </label>

            {/* Checklist 3 */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={keamanan}
                onChange={(e) => setKeamanan(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  3. Keamanan Terjamin
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Area kerja dan tempat parkir unit aman, dekat pengawasan warga/pos jaga.
                </p>
              </div>
            </label>

            {/* Checklist 4 */}
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={lahanLuas}
                onChange={(e) => setLahanLuas(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  4. Lahan Cukup Luas & Terbuka
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Memungkinkan olah gerak dan manuver alat berat saat operasi berlangsung.
                </p>
              </div>
            </label>
          </div>

          {/* Indikator Kesimpulan Ringkas */}
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 font-bold ${
              isAllEligible
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
            }`}
          >
            {isAllEligible ? (
              <>
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Rekomendasi: LOKASI LAYAK OPERASI</span>
              </>
            ) : (
              <>
                <AlertTriangle size={18} className="shrink-0" />
                <span>Rekomendasi: PERLU PENYESUAIAN LOKASI</span>
              </>
            )}
          </div>

          {/* Input Kesimpulan / Catatan Tambahan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kesimpulan Hasil Survey / Catatan Khusus:
            </label>
            <textarea
              rows={3}
              value={kesimpulan}
              onChange={(e) => setKesimpulan(e.target.value)}
              placeholder="Contoh: Akses keluar masuk alat berat aman, lebar jalan 6 meter, unit Komatsu WA200 dapat beroperasi maksimal."
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Geolocation Stamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Navigation size={13} className="text-emerald-600" />
              {coords
                ? `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : gettingLocation
                ? 'Mendeteksi GPS...'
                : 'GPS Terdeteksi Otomatis'}
            </span>
            <span className="text-slate-400">Standar PUPR Baubau</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FileCheck size={15} />
                  Simpan Laporan Survey
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
