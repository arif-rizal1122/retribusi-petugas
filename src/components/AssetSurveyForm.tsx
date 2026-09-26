import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { FieldCameraCapture } from './FieldCameraCapture';
import { OfficerLocation } from '../utils/geoValidation';

export interface AssetRentalSurveyItem {
  id: number;
  rental_code: string;
  nomor_kontrak?: string | null;
  status?: string | null;
  metadata?: any;
  latitude?: number | string | null;
  longitude?: number | string | null;
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

  const [submitting, setSubmitting] = useState(false);

  // Foto lokasi survey murni via live camera
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(rental.survey_foto_path || null);
  const [surveyGpsCoords, setSurveyGpsCoords] = useState<OfficerLocation | null>(null);

  const isAllEligible = aksesJalan && dekatJalanRaya && keamanan && lahanLuas;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoFile && !rental.survey_foto_path) {
      toast.error('Wajib mengambil foto bukti survei lapangan menggunakan kamera!');
      return;
    }

    setSubmitting(true);
    try {
      // Upload foto lokasi via kamera
      let fotoUrl: string | null = rental.survey_foto_path || null;
      if (fotoFile) {
        const formData = new FormData();
        formData.append('image', fotoFile);
        formData.append('folder', 'retribusi/survey-kelayakan');
        const uploadRes = await api.post('/api/upload', formData);
        fotoUrl = uploadRes?.url || uploadRes?.data?.url || null;
        if (!fotoUrl) {
          toast.error('Gagal mengupload foto. Silakan coba lagi.');
          setSubmitting(false);
          return;
        }
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
        survey_gps_lat: surveyGpsCoords?.lat,
        survey_gps_lng: surveyGpsCoords?.lng,
        survey_gps_status: surveyGpsCoords?.gps_status || 'active',
        survey_gps_notes: surveyGpsCoords?.gps_notes || undefined,
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[88vh] overflow-y-auto space-y-5 my-auto">
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

          {/* Foto Bukti Survei Lapangan (Wajib Kamera Langsung) */}
          <div className="pt-2">
            <FieldCameraCapture
              label="Foto Bukti Survei Lapangan & Akses Unit (Wajib Kamera Langsung)"
              targetLat={rental.latitude ? Number(rental.latitude) : null}
              targetLng={rental.longitude ? Number(rental.longitude) : null}
              targetLabel={rental.lokasi_penggunaan || 'Lokasi Pekerjaan Sewa'}
              currentPhotoPreview={fotoPreview}
              onPhotoCaptured={(file, loc) => {
                setFotoFile(file);
                setFotoPreview(URL.createObjectURL(file));
                setSurveyGpsCoords(loc);
              }}
              onClearPhoto={() => {
                setFotoFile(null);
                setFotoPreview(null);
                setSurveyGpsCoords(null);
              }}
              required={true}
            />
          </div>

          {/* Actions (Sticky Bottom) */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md pt-3 pb-3 -mx-5 sm:-mx-6 px-5 sm:px-6 -mb-5 sm:-mb-6 border-t border-slate-100 dark:border-slate-700/60 flex gap-2.5 z-20">
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
