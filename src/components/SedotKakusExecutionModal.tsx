import React, { useState } from 'react';
import {
  Droplets,
  CheckCircle2,
  X,
  Loader2,
  MapPin,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { FieldCameraCapture } from './FieldCameraCapture';
import { OfficerLocation } from '../utils/geoValidation';

export interface SedotKakusRentalItem {
  id: number;
  rental_code: string;
  taxpayer?: {
    id: number;
    name: string;
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
  status?: string;
  metadata?: any;
}

interface SedotKakusExecutionModalProps {
  rental: SedotKakusRentalItem;
  onSuccess: () => void;
  onClose: () => void;
}

export const SedotKakusExecutionModal: React.FC<SedotKakusExecutionModalProps> = ({
  rental,
  onSuccess,
  onClose,
}) => {
  const existingExecution = rental.metadata?.sedot_kakus_execution;
  const smartScreening = rental.metadata?.smart_screening;

  const [volumeRit, setVolumeRit] = useState<number>(1);
  const [statusTutup, setStatusTutup] = useState('Rapi dan tertutup kembali');
  const [pembuanganIplt, setPembuanganIplt] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [namaTtdPemohon, setNamaTtdPemohon] = useState(rental.taxpayer?.name || '');

  // Foto Sebelum Disedot (Camera Capture)
  const [fotoSebelumFile, setFotoSebelumFile] = useState<File | null>(null);
  const [fotoSebelumPreview, setFotoSebelumPreview] = useState<string | null>(
    existingExecution?.foto_sebelum || null
  );
  const [gpsSebelum, setGpsSebelum] = useState<OfficerLocation | null>(null);

  // Foto Sesudah Disedot (Camera Capture)
  const [fotoSesudahFile, setFotoSesudahFile] = useState<File | null>(null);
  const [fotoSesudahPreview, setFotoSesudahPreview] = useState<string | null>(
    existingExecution?.foto_sesudah || null
  );
  const [gpsSesudah, setGpsSesudah] = useState<OfficerLocation | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'retribusi/sedot-kakus-execution');
    const res = await api.post('/api/upload', formData);
    return res?.url || res?.data?.url || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fotoSebelumPreview && !fotoSebelumFile) {
      toast.error('Wajib mengambil Foto Lubang Tangki SEBELUM disedot!');
      return;
    }

    if (!fotoSesudahPreview && !fotoSesudahFile) {
      toast.error('Wajib mengambil Foto Lubang Tangki SESUDAH disedot!');
      return;
    }

    setSubmitting(true);
    try {
      let finalFotoSebelum = fotoSebelumPreview;
      if (fotoSebelumFile) {
        finalFotoSebelum = await uploadPhoto(fotoSebelumFile);
      }

      let finalFotoSesudah = fotoSesudahPreview;
      if (fotoSesudahFile) {
        finalFotoSesudah = await uploadPhoto(fotoSesudahFile);
      }

      const payload = {
        foto_sebelum: finalFotoSebelum,
        foto_sesudah: finalFotoSesudah,
        volume_rit_aktual: volumeRit,
        status_tutup_lubang: statusTutup,
        pembuangan_iplt: pembuanganIplt,
        catatan_lapangan: catatan,
        signature_pemohon: namaTtdPemohon ? `Dikonfirmasi oleh pemohon: ${namaTtdPemohon}` : null,
        gps_lat: gpsSesudah?.lat || gpsSebelum?.lat,
        gps_lng: gpsSesudah?.lng || gpsSebelum?.lng,
      };

      await api.post(`/api/asset/rentals/${rental.id}/sedot-kakus-execution`, payload);
      toast.success('Penyedotan tuntas! Layanan selesai & dicatat ke IPLT.');
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan eksekusi sedot kakus.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4 my-auto">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Droplets size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                  On-The-Spot Execution
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Bebas Survei Terpisah
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Eksekusi Sedot Kakus di Lokasi
              </h3>
              <p className="text-xs text-slate-500">
                {rental.rental_code} • {rental.asset_item?.name || 'Mobil Tinja UPTD'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ringkasan Permohonan & Smart Screening Pemohon */}
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/20 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
              <User size={13} className="text-teal-600" />
              {rental.taxpayer?.name || 'Pemohon Warga'} ({rental.taxpayer?.phone || '-'})
            </span>
            <span className="font-bold text-teal-700 dark:text-teal-300">
              {rental.lama_sewa || 1} {rental.satuan_sewa || 'Rit'}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
            <MapPin size={13} className="text-teal-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{rental.lokasi_penggunaan || 'Kota Baubau'}</span>
          </div>

          {smartScreening && (
            <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-teal-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Akses Jalan</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {smartScreening.screening_akses_jalan === 'lebar_truk' ? '≥ 3m (Truk Masuk)' : 'Gang Sempit'}
                </strong>
              </div>
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-teal-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Jarak Selang</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {smartScreening.screening_jarak_selang === 'kurang_20m' ? '< 20 Meter' : smartScreening.screening_jarak_selang === '20_sampai_40m' ? '20-40 Meter' : '> 50 Meter'}
                </strong>
              </div>
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-teal-100 dark:border-slate-800">
                <span className="text-slate-400 block font-medium">Tutup Tangki</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {smartScreening.screening_kondisi_lubang === 'sudah_terbuka' ? 'Terbuka' : smartScreening.screening_kondisi_lubang === 'tertimbun_semen' ? 'Tertimbun' : 'Bisa Dibuka'}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Form Eksekusi On-The-Spot */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* FOTO 1: Sebelum Disedot */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                Foto Lubang Tangki (Sebelum Disedot) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Live Camera GPS</span>
            </div>
            <FieldCameraCapture
              label="Ambil Foto Sebelum Disedot"
              currentPhotoPreview={fotoSebelumPreview}
              onPhotoCaptured={(file: File, coords: OfficerLocation) => {
                setFotoSebelumFile(file);
                setFotoSebelumPreview(URL.createObjectURL(file));
                setGpsSebelum(coords);
              }}
              onClearPhoto={() => {
                setFotoSebelumFile(null);
                setFotoSebelumPreview(null);
                setGpsSebelum(null);
              }}
              disabled={submitting}
            />
          </div>

          {/* FOTO 2: Sesudah Disedot */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                Foto Lubang Tangki (Sesudah Disedot) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Live Camera GPS</span>
            </div>
            <FieldCameraCapture
              label="Ambil Foto Sesudah Disedot"
              currentPhotoPreview={fotoSesudahPreview}
              onPhotoCaptured={(file: File, coords: OfficerLocation) => {
                setFotoSesudahFile(file);
                setFotoSesudahPreview(URL.createObjectURL(file));
                setGpsSesudah(coords);
              }}
              onClearPhoto={() => {
                setFotoSesudahFile(null);
                setFotoSesudahPreview(null);
                setGpsSesudah(null);
              }}
              disabled={submitting}
            />
          </div>

          {/* Parameter Pelaksanaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Volume Ritase Aktual:
              </label>
              <select
                value={volumeRit}
                onChange={(e) => setVolumeRit(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value={1}>1 Rit (Standar 3.000 L)</option>
                <option value={2}>2 Rit (6.000 L)</option>
                <option value={3}>3 Rit (9.000 L)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Kondisi Penutupan Lubang:
              </label>
              <select
                value={statusTutup}
                onChange={(e) => setStatusTutup(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="Rapi dan tertutup kembali">Rapi &amp; Tertutup Kembali</option>
                <option value="Ditutup plat besi/beton pemohon">Ditutup Plat Besi/Beton</option>
                <option value="Diberi pengaman sementara">Diberi Pengaman Sementara</option>
              </select>
            </div>
          </div>

          {/* Pembuangan ke IPLT */}
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="check-iplt"
              checked={pembuanganIplt}
              onChange={(e) => setPembuanganIplt(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="check-iplt" className="text-[11px] text-teal-950 dark:text-teal-200 font-semibold leading-relaxed">
              Konfirmasi Pengangkutan Limbah: Limbah cair langsung dibawa dan diolah di Instalasi Pengolahan Lumpur Tinja (IPLT) Resmi Kota Baubau (Bebas Pencemaran).
            </label>
          </div>

          {/* Catatan Lapangan */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan Khusus Lapangan (Opsional):
            </label>
            <input
              type="text"
              placeholder="mis. Selang ditarik 30 meter masuk lorong, kondisi lancar"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Konfirmasi / E-Signature Pemohon */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nama Terang Saksi / Pemohon di Lokasi:
            </label>
            <input
              type="text"
              value={namaTtdPemohon}
              onChange={(e) => setNamaTtdPemohon(e.target.value)}
              placeholder="Nama pemohon atau penerima layanan"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 text-xs shadow-md shadow-teal-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan Bukti...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Tuntaskan Layanan &amp; Kirim e-SSRD</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
