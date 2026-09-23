import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Navigation,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  calculateDistanceMeters,
  formatDistance,
  getOfficerCurrentPosition,
  DEFAULT_MAX_RADIUS_METERS,
  OfficerLocation,
} from '../utils/geoValidation';

interface FieldCameraCaptureProps {
  targetLat?: number | null;
  targetLng?: number | null;
  targetLabel?: string;
  maxRadiusMeters?: number;
  currentPhotoPreview?: string | null;
  onPhotoCaptured: (file: File, coords: OfficerLocation) => void;
  onClearPhoto?: () => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const FieldCameraCapture: React.FC<FieldCameraCaptureProps> = ({
  targetLat,
  targetLng,
  targetLabel = 'Objek Pajak / Permohonan',
  maxRadiusMeters = DEFAULT_MAX_RADIUS_METERS,
  currentPhotoPreview,
  onPhotoCaptured,
  onClearPhoto,
  label = 'Foto Bukti Survei Lapangan (Wajib Kamera)',
  required = true,
  disabled = false,
}) => {
  const [officerLocation, setOfficerLocation] = useState<OfficerLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasTargetCoords =
    targetLat !== undefined &&
    targetLat !== null &&
    !isNaN(Number(targetLat)) &&
    Number(targetLat) !== 0 &&
    targetLng !== undefined &&
    targetLng !== null &&
    !isNaN(Number(targetLng)) &&
    Number(targetLng) !== 0;

  const validTargetLat = hasTargetCoords ? Number(targetLat) : null;
  const validTargetLng = hasTargetCoords ? Number(targetLng) : null;

  // Deteksi GPS Petugas
  const fetchLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const loc = await getOfficerCurrentPosition();
      setOfficerLocation(loc);

      if (validTargetLat !== null && validTargetLng !== null) {
        const d = calculateDistanceMeters(loc.lat, loc.lng, validTargetLat, validTargetLng);
        setDistance(d);
      } else {
        setDistance(null);
      }
    } catch (err: any) {
      setGpsError(err.message || 'Gagal mengambil koordinat GPS perangkat.');
      setOfficerLocation(null);
      setDistance(null);
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [targetLat, targetLng]);

  // Evaluasi Radius
  const isWithinRadius =
    !hasTargetCoords || (distance !== null && distance <= maxRadiusMeters);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pastikan koordinat tersimpan
    const coords: OfficerLocation = officerLocation || {
      lat: validTargetLat || 0,
      lng: validTargetLng || 0,
      timestamp: Date.now(),
    };

    onPhotoCaptured(file, coords);

    // Reset input agar bisa ambil ulang jika diinginkan
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenKamera = () => {
    if (!isWithinRadius) {
      alert(
        `Pengambilan foto ditolak! Anda berada di luar radius lokasi objek (${
          distance !== null ? formatDistance(distance) : '-'
        }). Maksimal radius yang diizinkan adalah ${formatDistance(
          maxRadiusMeters
        )}. Silakan mendekat ke lokasi objek fisik.`
      );
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2.5">
      {/* Label Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        <button
          type="button"
          onClick={fetchLocation}
          disabled={gpsLoading}
          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          title="Perbarui GPS"
        >
          <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Mendeteksi GPS...' : 'Cek Ulang GPS'}</span>
        </button>
      </div>

      {/* Geofence / Radius Status Box */}
      <div className="p-3 rounded-xl border text-xs transition-all">
        {gpsLoading ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="font-medium text-[11px]">
              Mengunci sinyal satelit GPS petugas untuk validasi radius...
            </span>
          </div>
        ) : gpsError ? (
          <div className="flex items-start gap-2 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <span className="font-bold block">Sensor Lokasi Bermasalah:</span>
              <p>{gpsError}</p>
            </div>
          </div>
        ) : hasTargetCoords && distance !== null ? (
          <div
            className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
              isWithinRadius
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                {isWithinRadius ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {isWithinRadius
                    ? `Lokasi Terverifikasi (Radius Valid)`
                    : `Di Luar Radius Objek`}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isWithinRadius
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {formatDistance(distance)} / Maks {formatDistance(maxRadiusMeters)}
              </span>
            </div>

            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Titik Objek ({targetLabel}):</span>
                <span className="font-mono font-medium">
                  {validTargetLat?.toFixed(5)}, {validTargetLng?.toFixed(5)}
                </span>
              </div>
              {officerLocation && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Posisi GPS Petugas:</span>
                  <span className="font-mono font-medium">
                    {officerLocation.lat.toFixed(5)}, {officerLocation.lng.toFixed(5)} (±
                    {Math.round(officerLocation.accuracy || 0)}m)
                  </span>
                </div>
              )}
            </div>

            {!isWithinRadius && (
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 pt-1 border-t border-rose-200/60 dark:border-rose-800/60">
                ⚠️ Kamera dinonaktifkan: Anda harus berada di lokasi fisik objek (maks.{' '}
                {maxRadiusMeters} m) untuk mengambil foto bukti survei.
              </p>
            )}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Mengunci Titik Lokasi Baru Objek</span>
            </div>
            {officerLocation ? (
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                GPS Petugas Terkunci: <strong className="font-mono">{officerLocation.lat.toFixed(5)}, {officerLocation.lng.toFixed(5)}</strong> (Akurasi ±{Math.round(officerLocation.accuracy || 0)}m). Foto akan di-geotag ke koordinat ini.
              </p>
            ) : (
              <p className="text-[11px] text-blue-700 dark:text-blue-400">
                Titik target belum memiliki koordinat awal. Foto akan mengambil titik lokasi petugas saat ini.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hidden strictly camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Photo Preview or Camera Button */}
      {currentPhotoPreview ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-slate-900 group">
          <img
            src={currentPhotoPreview}
            alt="Bukti Foto Lapangan"
            className="w-full h-44 object-cover"
          />

          {/* Watermark Tag Info */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2.5 text-white text-[10px]">
            <div className="flex items-center justify-between font-mono font-bold">
              <span>KAMERA LAPANGAN AKTIF</span>
              <span>{new Date().toLocaleTimeString('id-ID')}</span>
            </div>
            {officerLocation && (
              <div className="font-mono text-[9px] opacity-90">
                GPS: {officerLocation.lat.toFixed(6)}, {officerLocation.lng.toFixed(6)} |{' '}
                {distance !== null ? `Jarak: ${formatDistance(distance)}` : 'Titik Baru'}
              </div>
            )}
          </div>

          {/* Tombol Hapus & Ambil Ulang */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenKamera}
              disabled={disabled || !isWithinRadius}
              className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-white rounded-lg text-[11px] font-bold shadow-md transition-all flex items-center gap-1 backdrop-blur-xs"
            >
              <Camera className="w-3 h-3 text-blue-600" />
              <span>Ambil Ulang</span>
            </button>
            {onClearPhoto && (
              <button
                type="button"
                onClick={onClearPhoto}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-all"
                title="Hapus foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleOpenKamera}
            disabled={disabled || !isWithinRadius || gpsLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 ${
              !isWithinRadius || disabled || gpsLoading
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 border border-blue-500'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>
              {gpsLoading
                ? 'Mendeteksi Lokasi...'
                : !isWithinRadius
                ? `Di Luar Radius Objek (${distance !== null ? formatDistance(distance) : '-'})`
                : 'Buka Kamera Lapangan'}
            </span>
          </button>
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
            Wajib menggunakan kamera langsung di lokasi objek. Upload galeri/berkas tidak diperkenankan.
          </p>
        </div>
      )}
    </div>
  );
};
