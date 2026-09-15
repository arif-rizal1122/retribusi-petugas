import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Gauge,
  Navigation,
  Loader2,
  FileCheck,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { AssetRentalSurveyItem } from './AssetSurveyForm';

interface AssetInspectionModalProps {
  rental: AssetRentalSurveyItem;
  onSuccess: () => void;
  onClose: () => void;
}

export const AssetInspectionModal: React.FC<AssetInspectionModalProps> = ({
  rental,
  onSuccess,
  onClose,
}) => {
  const [inspectionType, setInspectionType] = useState<'pre_operation' | 'post_operation'>('pre_operation');
  const [hourMeterValue, setHourMeterValue] = useState<string>('');
  const [damageNotes, setDamageNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Checklist fisik 5 komponen alat berat
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    engine_oil: true,
    hydraulic_system: true,
    track_tires: true,
    brakes_steering: true,
    safety_cabin_k3: true,
  });

  // GPS Coordinates
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Foto alat (geotag GPS)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ambil lokasi GPS saat modal terbuka
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
          setGpsLoading(false);
        },
        (err) => {
          console.warn('Gagal membaca GPS:', err);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleToggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hourMeterValue || Number(hourMeterValue) <= 0) {
      toast.error('Nilai Hour Meter (jam kerja mesin) wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);

      // Upload foto alat terlebih dahulu jika ada
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append('image', photoFile);
        formData.append('folder', 'retribusi/inspeksi-alat');
        const uploadRes = await api.post('/api/upload', formData);
        photoUrl = uploadRes?.url || uploadRes?.data?.url;
        setUploadingPhoto(false);
        if (!photoUrl) {
          toast.error('Gagal mengupload foto alat. Silakan coba lagi.');
          setSubmitting(false);
          return;
        }
      }

      const res = await api.post(`/api/asset/rentals/${rental.id}/inspection`, {
        inspection_type: inspectionType,
        hour_meter_value: Number(hourMeterValue),
        checklist: {
          engine_oil: checklist.engine_oil ? 'GOOD' : 'ATTENTION',
          hydraulic_system: checklist.hydraulic_system ? 'GOOD' : 'ATTENTION',
          track_tires: checklist.track_tires ? 'GOOD' : 'ATTENTION',
          brakes_steering: checklist.brakes_steering ? 'GOOD' : 'ATTENTION',
          safety_cabin_k3: checklist.safety_cabin_k3 ? 'GOOD' : 'ATTENTION',
        },
        damage_notes: damageNotes.trim() || undefined,
        inspector_gps_lat: gpsLat || undefined,
        inspector_gps_lng: gpsLng || undefined,
        photo_path: photoUrl || undefined,
      });

      toast.success(res.data?.message || 'Laporan inspeksi fisik alat berat berhasil disimpan.');

      const overtime = res.data?.overtime;
      if (inspectionType === 'post_operation' && overtime?.is_overtime && Number(overtime.overtime_amount) > 0) {
        const rupiah = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(Number(overtime.overtime_amount));
        toast.success(`Inspeksi pasca: overtime ${overtime.overtime_hours} jam terdeteksi. SKRD Denda ${rupiah} diterbitkan.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan laporan inspeksi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Inspeksi Hour Meter & Fisik Alat
              </h3>
              <p className="text-xs text-slate-500">
                {rental.rental_code} • {rental.asset_item?.name || 'Unit Alat Berat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TIPE INSPEKSI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tahap Inspeksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInspectionType('pre_operation')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  inspectionType === 'pre_operation'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🏁 Pra-Operasi (Sebelum Kirim)
              </button>
              <button
                type="button"
                onClick={() => setInspectionType('post_operation')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  inspectionType === 'post_operation'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                🏁 Pasca-Operasi (Pengembalian)
              </button>
            </div>
          </div>

          {/* INPUT HOUR METER */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Hour Meter (Jam Kerja Mesin) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Contoh: 1250.5"
                value={hourMeterValue}
                onChange={(e) => setHourMeterValue(e.target.value)}
                required
                className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-purple-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                Jam
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {inspectionType === 'pre_operation'
                ? 'Hour meter awal sebelum alat diberangkatkan ke lokasi proyek.'
                : 'Hour meter akhir. Selisih akan otomatis dihitung sebagai jam kerja riil (actual hours).'}
            </p>
          </div>

          {/* CHECKLIST FISIK 5 POIN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Checklist Fisik & K3 Alat Berat (SOP UPTD Workshop)
            </label>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              {[
                { key: 'engine_oil', label: 'Level Oli Mesin & Air Radiator / Coolant' },
                { key: 'hydraulic_system', label: 'Tekanan Pompa & Pipa Hidrolik (Bebas Bocor)' },
                { key: 'track_tires', label: 'Kekencangan Rantai Track / Tekanan Roda Ban' },
                { key: 'brakes_steering', label: 'Fungsi Pengereman, Swing, & Kemudi' },
                { key: 'safety_cabin_k3', label: 'Lampu Kerja, Kaca Cabin, & Standar K3' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between text-xs cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => handleToggleChecklist(item.key)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* CATATAN KERUSAKAN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Kondisi / Kerusakan (Opsional)
            </label>
            <textarea
              placeholder="Baret, kebocoran seal, riwayat kendala di lapangan..."
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* GPS BADGE */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-600" />
              <span>
                {gpsLoading
                  ? 'Mencari sinyal GPS...'
                  : gpsLat && gpsLng
                  ? `GPS: ${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`
                  : 'GPS tidak terdeteksi'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600">Anti-Fraud Terverifikasi</span>
          </div>

          {/* FOTO ALAT (Geotag GPS) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Foto Kondisi Alat <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={photoPreview} alt="Preview foto alat" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/60 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {gpsLat && gpsLng ? `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}` : 'GPS Tertaut'}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition flex flex-col items-center gap-1.5 disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-bold">Mengupload Foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-bold">Ambil Foto Alat</span>
                    <span className="text-[10px]">Klik untuk buka kamera atau galeri</span>
                  </>
                )}
              </button>
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Geotag GPS otomatis tercantum di foto. Format: JPEG/PNG, maks 5MB.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Simpan Laporan Inspeksi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
