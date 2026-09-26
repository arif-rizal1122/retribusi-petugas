import React, { useState } from 'react';
import {
  X,
  Gauge,
  Loader2,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { AssetRentalSurveyItem } from './AssetSurveyForm';
import { FieldCameraCapture } from './FieldCameraCapture';
import { OfficerLocation } from '../utils/geoValidation';

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

  // GPS Coordinates & Status
  const [inspectionLocation, setInspectionLocation] = useState<OfficerLocation | null>(null);

  // Foto alat murni via live camera
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

      // Upload foto alat jika ada via live camera
      let photoUrl: string | undefined;
      if (photoFile) {
        const formData = new FormData();
        formData.append('image', photoFile);
        formData.append('folder', 'retribusi/inspeksi-alat');
        const uploadRes = await api.post('/api/upload', formData);
        photoUrl = uploadRes?.url || uploadRes?.data?.url;
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
        inspector_gps_lat: inspectionLocation?.lat || undefined,
        inspector_gps_lng: inspectionLocation?.lng || undefined,
        inspector_gps_status: inspectionLocation?.gps_status || 'active',
        inspector_gps_notes: inspectionLocation?.gps_notes || undefined,
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-auto max-h-[88vh] overflow-y-auto">
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

          {/* Foto Kondisi Alat & Hour Meter (Wajib Live Camera) */}
          <div className="pt-2">
            <FieldCameraCapture
              label="Foto Kondisi Fisik Alat & Hour Meter (Wajib Kamera Langsung)"
              targetLat={rental.latitude ? Number(rental.latitude) : null}
              targetLng={rental.longitude ? Number(rental.longitude) : null}
              targetLabel={rental.asset_item?.name || 'Unit Alat Berat PUPR'}
              currentPhotoPreview={photoPreview}
              onPhotoCaptured={(file, loc) => {
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
                setInspectionLocation(loc);
              }}
              onClearPhoto={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                setInspectionLocation(null);
              }}
              required={false}
            />
          </div>

          {/* ACTIONS (Sticky Bottom) */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-3 pb-3 -mx-5 sm:-mx-6 px-5 sm:px-6 -mb-5 sm:-mb-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 z-20">
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
