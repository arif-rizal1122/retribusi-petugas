import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  FileCheck,
  ShieldCheck,
  Navigation,
  Camera,
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
  survey_rekomendasi_tronton?: string | null;
  survey_penjebolan_akses?: boolean | null;
  survey_penjebolan_catatan?: string | null;
  survey_rekomendasi_alat?: string | null;
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

  // Field tambahan SOP Tronton & Penjebolan Lokasi (Perda 1/2024 & Dokumen 05)
  const [rekomendasiTronton, setRekomendasiTronton] = useState<string>(
    rental.survey_rekomendasi_tronton || 'Wajib Tronton (Alat Bertapak Rantai Besi)'
  );
  const [penjebolanAkses, setPenjebolanAkses] = useState<boolean>(
    rental.survey_penjebolan_akses ?? false
  );
  const [penjebolanCatatan, setPenjebolanCatatan] = useState<string>(
    rental.survey_penjebolan_catatan || ''
  );
  const [rekomendasiAlat, setRekomendasiAlat] = useState<string>(
    rental.survey_rekomendasi_alat || ''
  );

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Foto lokasi survey (geotag GPS)
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

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
      // Upload foto lokasi jika ada
      let fotoUrl: string | null = null;
      if (fotoFile) {
        setUploadingFoto(true);
        const formData = new FormData();
        formData.append('image', fotoFile);
        formData.append('folder', 'retribusi/survey-kelayakan');
        const uploadRes = await api.post('/api/upload', formData);
        fotoUrl = uploadRes?.url || uploadRes?.data?.url || null;
        setUploadingFoto(false);
        if (!fotoUrl) {
          toast.error('Gagal mengupload foto. Silakan coba lagi.');
          setSubmitting(false);
          return;
        }
      } else if (coords) {
        fotoUrl = `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      }

      await api.post(`/api/asset/rentals/${rental.id}/survey`, {
        survey_akses_jalan: aksesJalan,
        survey_dekat_jalan_raya: dekatJalanRaya,
        survey_keamanan: keamanan,
        survey_lahan_luas: lahanLuas,
        survey_rekomendasi_tronton: rekomendasiTronton,
        survey_penjebolan_akses: penjebolanAkses,
        survey_penjebolan_catatan: penjebolanCatatan,
        survey_rekomendasi_alat: rekomendasiAlat,
        survey_kesimpulan:
          kesimpulan ||
          (isAllEligible
            ? 'Lokasi layak & memenuhi standar operasional olah gerak alat berat.'
            : 'Perlu penyesuaian lokasi/akses jalan sebelum unit dimobilisasi.'),
        survey_foto_path: fotoUrl,
      });

      toast.success('Laporan lengkap survey kelayakan & tronton berhasil disimpan!');
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

          {/* Section: Evaluasi Mobilisasi Tronton (SOP PUPR & Perda 1/2024) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
            <label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between">
              <span>Evaluasi Mobilisasi Tronton (Self-Loader):</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Min. Lebar 4.5m & Tinggi 4.8m</span>
            </label>
            <select
              value={rekomendasiTronton}
              onChange={(e) => setRekomendasiTronton(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
            >
              <option value="Wajib Tronton (Alat Bertapak Rantai Besi)">
                Wajib Tronton (Alat Rantai / Drum Besi — Zero Toliransi Aspal)
              </option>
              <option value="Rekomendasi Tronton (Jarak &gt; 10 Km / Jalan Protokol)">
                Rekomendasi Tronton (Roda Karet tapi Jarak &gt; 10 Km / Jalur Padat)
              </option>
              <option value="Bisa Jalan Mandiri (Roda Karet < 10 Km)">
                Bisa Jalan Mandiri (Roda Karet Jarak Dekat &lt; 10 Km)
              </option>
            </select>
          </div>

          {/* Section: Rekomendasi Penjebolan / Perintisan Akses Sementara */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={penjebolanAkses}
                onChange={(e) => setPenjebolanAkses(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Perlu Penjebolan / Perintisan Akses Sementara
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Jika akses terhalang trotoar, tebing tanah, atau saluran drainase kota.
                </p>
              </div>
            </label>

            {penjebolanAkses && (
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-600">
                <textarea
                  rows={2}
                  value={penjebolanCatatan}
                  onChange={(e) => setPenjebolanCatatan(e.target.value)}
                  placeholder="Metode teknis (cth: Pasang Plat Baja di atas drainase / Urukan Sirtu sementara) & Penyewa bersedia Reinstatement (pemulihan kembali)."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                  *Dengan mencentang, diterbitkan klausul izin akses darurat & kewajiban pengembalian ke kondisi semula (Reinstatement).
                </p>
              </div>
            )}
          </div>

          {/* Section: Rekomendasi Tambahan / Penggantian Alat */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rekomendasi Alat Tambahan / Penyesuaian Medan:
            </label>
            <input
              type="text"
              value={rekomendasiAlat}
              onChange={(e) => setRekomendasiAlat(e.target.value)}
              placeholder="Contoh: Disarankan ganti Excavator Breaker (batu cadas) atau tambah Dump Truck."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
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

          {/* Foto Lokasi Survey (Geotag GPS) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Foto Lokasi / Kondisi Lapangan:
            </label>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFotoFile(file);
                  setFotoPreview(URL.createObjectURL(file));
                }
              }}
            />
            {fotoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={fotoPreview} alt="Foto lokasi survey" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null); if (fotoInputRef.current) fotoInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/60 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'GPS Tertaut'}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                disabled={uploadingFoto}
                className="w-full py-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex flex-col items-center gap-1.5 disabled:opacity-50"
              >
                {uploadingFoto ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-bold">Mengupload Foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-xs font-bold">Ambil Foto Lokasi</span>
                    <span className="text-[10px]">Geotag GPS otomatis tercantum</span>
                  </>
                )}
              </button>
            )}
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
