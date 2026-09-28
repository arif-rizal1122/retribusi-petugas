import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert,
  Loader2,
  SwitchCamera,
  Zap,
  ExternalLink,
  ImageOff,
} from 'lucide-react';
import { API_URL } from '../lib/api';
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

  // Fallback GPS Manual Reporting State (Kendala Sinyal / Sensor Lapangan)
  const [gpsStatus, setGpsStatus] = useState<'active' | 'disabled' | 'signal_lost' | 'manual'>('active');
  const [gpsNotes, setGpsNotes] = useState<string>('');
  const [isManualGpsOverride, setIsManualGpsOverride] = useState<boolean>(false);

  // In-App Camera Viewfinder State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  // Photo preview URL & fallback handling
  const [imgDisplaySrc, setImgDisplaySrc] = useState<string | null>(currentPhotoPreview || null);
  const [imgLoadFailed, setImgLoadFailed] = useState<boolean>(false);
  const [triedProxy, setTriedProxy] = useState<boolean>(false);

  useEffect(() => {
    setImgDisplaySrc(currentPhotoPreview || null);
    setImgLoadFailed(false);
    setTriedProxy(false);
  }, [currentPhotoPreview]);

  const handleImageError = () => {
    if (!triedProxy && currentPhotoPreview && (currentPhotoPreview.startsWith('http://') || currentPhotoPreview.startsWith('https://'))) {
      const baseUrl = (API_URL || '').replace(/\/+$/, '');
      const proxyUrl = `${baseUrl}/api/public/media/proxy?url=${encodeURIComponent(currentPhotoPreview)}`;
      setTriedProxy(true);
      setImgDisplaySrc(proxyUrl);
    } else {
      setImgLoadFailed(true);
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setGpsStatus('active');

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
      setGpsStatus('signal_lost');
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [targetLat, targetLng]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Evaluasi Radius & Izin Pengambilan Foto
  const isWithinRadius =
    !hasTargetCoords || (distance !== null && distance <= maxRadiusMeters);

  const isAllowedToCapture = isWithinRadius || isManualGpsOverride;

  // Start In-App Camera Viewfinder (Memprioritaskan Kamera Belakang jika tersedia)
  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    setCameraLoading(true);
    setIsCameraOpen(true);

    try {
      // Hentikan stream sebelumnya jika ada
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser atau perangkat ini tidak mendukung akses kamera langsung.');
      }

      let stream: MediaStream | null = null;

      // Urutan kandidat constraint dari yang paling ideal ke yang paling kompatibel
      const candidateConstraints: MediaStreamConstraints[] = [
        // 1. Ideal mode dengan target resolusi tinggi (tidak pakai exact agar kompatibel di semua hardware)
        {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        },
        // 2. Ideal mode dengan resolusi standar
        {
          video: {
            facingMode: { ideal: mode },
          },
          audio: false,
        },
        // 3. Fallback generic: kamera apapun yang tersedia di perangkat
        {
          video: true,
          audio: false,
        },
      ];

      let lastError: any = null;
      for (const constraints of candidateConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) {
        throw lastError || new Error('Tidak dapat menginisialisasi kamera pada perangkat ini.');
      }

      streamRef.current = stream;

      // Cek apakah ada fitur torch/flashlight
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = (videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
      setHasTorch(Boolean(capabilities?.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      alert('Gagal membuka kamera: ' + (err.message || 'Izin kamera ditolak oleh browser/sistem.'));
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsTorchOn(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Jepret Foto dari Live Video
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw raw camera frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark Geotag Burn-in
    const bannerH = Math.max(90, Math.round(canvas.height * 0.12));
    const gradient = ctx.createLinearGradient(0, canvas.height - bannerH, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.3, 'rgba(0,0,0,0.75)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - bannerH, canvas.width, bannerH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(canvas.width * 0.024)}px sans-serif`;
    ctx.fillText('M-PAD KOTA BAUBAU • VERIFIKASI SURVEI LAPANGAN', 24, canvas.height - bannerH * 0.55);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = `500 ${Math.round(canvas.width * 0.018)}px monospace`;
    const timeStr = new Date().toLocaleString('id-ID');
    
    const isManual = isManualGpsOverride || gpsStatus !== 'active';
    let locStr = '';
    if (isManual) {
      const statusLabel =
        gpsStatus === 'signal_lost' ? 'SINYAL HILANG/BLANK SPOT' :
        gpsStatus === 'disabled' ? 'GPS NONAKTIF/OFFLINE' : 'LAPORAN MANUAL';
      locStr = `KONDISI: ${statusLabel}${gpsNotes ? ` (${gpsNotes.substring(0, 30)})` : ''}`;
    } else if (officerLocation) {
      locStr = `GPS: ${officerLocation.lat.toFixed(6)}, ${officerLocation.lng.toFixed(6)} (±${Math.round(
        officerLocation.accuracy || 0
      )}m)`;
    } else {
      locStr = 'GPS: Terkunci di Objek';
    }

    const distStr = !isManual && distance !== null ? ` | Jarak: ${formatDistance(distance)}` : '';
    ctx.fillText(`${timeStr} | ${locStr}${distStr}`, 24, canvas.height - bannerH * 0.2);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `survei_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();

        const coords: OfficerLocation = {
          lat: officerLocation?.lat ?? validTargetLat ?? 0,
          lng: officerLocation?.lng ?? validTargetLng ?? 0,
          accuracy: officerLocation?.accuracy,
          timestamp: Date.now(),
          gps_status: isManual ? gpsStatus : 'active',
          gps_notes: isManual ? (gpsNotes.trim() || 'Pelaporan GPS manual oleh petugas') : undefined,
        };

        onPhotoCaptured(file, coords);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleOpenKamera = () => {
    if (!isAllowedToCapture) {
      alert(
        `Pengambilan foto ditolak! Anda berada di luar radius lokasi objek (${
          distance !== null ? formatDistance(distance) : '-'
        }). Maksimal radius yang diizinkan adalah ${formatDistance(
          maxRadiusMeters
        )}. Silakan mendekat ke lokasi objek fisik atau aktifkan formulir 'Kendala Sinyal / Laporan GPS Manual' jika berada di area blank spot satelit.`
      );
      return;
    }
    startCamera('environment');
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
      <div className="p-3 rounded-xl border text-xs transition-all space-y-2.5">
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
              <span className="font-bold block">Sensor Lokasi Bermasalah / Sinyal Hilang:</span>
              <p>{gpsError}</p>
              <p className="text-[10px] text-slate-500 pt-1">
                Petugas tetap dapat mengambil foto dengan mengisi formulir fallback kondisi GPS di bawah.
              </p>
            </div>
          </div>
        ) : hasTargetCoords && distance !== null ? (
          <div
            className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
              isWithinRadius
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : isManualGpsOverride
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                {isWithinRadius ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isManualGpsOverride ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {isWithinRadius
                    ? `Lokasi Terverifikasi (Radius Valid)`
                    : isManualGpsOverride
                    ? `Mode Pelaporan Manual Aktif`
                    : `Di Luar Radius Objek`}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isWithinRadius
                    ? 'bg-emerald-600 text-white'
                    : isManualGpsOverride
                    ? 'bg-amber-600 text-white'
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

            {!isWithinRadius && !isManualGpsOverride && (
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 pt-1 border-t border-rose-200/60 dark:border-rose-800/60">
                ⚠️ Di luar batas geofence. Dekati lokasi objek atau aktifkan mode pelaporan sinyal GPS di bawah jika berada di lokasi fisik sebenarnya.
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

        {/* Fallback Option: Kendala Sinyal GPS / Pelaporan Lapangan Manual */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isManualGpsOverride}
              onChange={(e) => {
                setIsManualGpsOverride(e.target.checked);
                if (e.target.checked && gpsStatus === 'active') {
                  setGpsStatus(gpsError ? 'signal_lost' : 'manual');
                }
              }}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Laporkan Kendala GPS / Mode Sinyal Lemah di Lapangan
            </span>
          </label>

          {isManualGpsOverride && (
            <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2 text-[11px]">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kondisi Sinyal / GPS Perangkat:
                </label>
                <select
                  value={gpsStatus}
                  onChange={(e) => setGpsStatus(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="signal_lost">Sinyal Satelit Hilang / Blank Spot (Gedung Tertutup/Pegunungan)</option>
                  <option value="disabled">Sensor GPS Mati / Izin Lokasi Sistem Terkendala</option>
                  <option value="manual">Verifikasi Fisik Langsung (Koordinat Manual)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Kendala Lapangan (Tercatat di Audit Admin):
                </label>
                <input
                  type="text"
                  value={gpsNotes}
                  onChange={(e) => setGpsNotes(e.target.value)}
                  placeholder="Contoh: Survei di area basement / blind spot lereng bukit"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                *Kamera aktif tanpa pembatasan radius. Status kondisi GPS ini akan tercatat transparan di sistem dan wajib diverifikasi oleh Supervisor/Admin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview or Open Camera Trigger */}
      {currentPhotoPreview ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-slate-900 group">
          {imgLoadFailed ? (
            <div className="w-full h-48 flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center space-y-2">
              <ImageOff className="w-8 h-8 text-amber-500 animate-pulse" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pratinjau foto terhalang koneksi / browser
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={currentPhotoPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Foto Asli</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setImgLoadFailed(false);
                    setTriedProxy(false);
                    setImgDisplaySrc(`${currentPhotoPreview}?t=${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            </div>
          ) : (
            <img
              src={imgDisplaySrc || currentPhotoPreview}
              alt="Bukti Foto Lapangan"
              className="w-full h-48 object-cover"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={handleImageError}
            />
          )}

          {/* Watermark Tag Info */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2.5 text-white text-[10px] pointer-events-none">
            <div className="flex items-center justify-between font-mono font-bold">
              <span>KAMERA LAPANGAN AKTIF</span>
              <span>{new Date().toLocaleTimeString('id-ID')}</span>
            </div>
            {isManualGpsOverride ? (
              <div className="font-mono text-[9px] text-amber-300 font-bold">
                STATUS GPS: {gpsStatus.toUpperCase()} {gpsNotes ? `• ${gpsNotes}` : ''}
              </div>
            ) : officerLocation ? (
              <div className="font-mono text-[9px] opacity-90">
                GPS: {officerLocation.lat.toFixed(6)}, {officerLocation.lng.toFixed(6)} |{' '}
                {distance !== null ? `Jarak: ${formatDistance(distance)}` : 'Titik Baru'}
              </div>
            ) : (
              <div className="font-mono text-[9px] opacity-90">GPS: Terkunci di Objek</div>
            )}
          </div>

          {/* Tombol Aksi: Buka Foto Penuh, Ambil Ulang & Hapus */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            <a
              href={currentPhotoPreview}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-white rounded-lg text-[11px] font-bold shadow-md transition-all flex items-center gap-1 backdrop-blur-xs"
              title="Buka foto asli di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </a>
            <button
              type="button"
              onClick={handleOpenKamera}
              disabled={disabled || !isAllowedToCapture}
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
            disabled={disabled || !isAllowedToCapture || (gpsLoading && !isManualGpsOverride)}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 ${
              !isAllowedToCapture || disabled || (gpsLoading && !isManualGpsOverride)
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 border border-blue-500'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>
              {gpsLoading && !isManualGpsOverride
                ? 'Mendeteksi Lokasi...'
                : !isAllowedToCapture
                ? `Di Luar Radius Objek (${distance !== null ? formatDistance(distance) : '-'})`
                : isManualGpsOverride
                ? 'Buka Kamera (Mode Pelaporan Lapangan)'
                : 'Buka Kamera Lapangan'}
            </span>
          </button>
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
            Wajib foto langsung via kamera perangkat di lokasi objek (Upload file/galeri tidak diizinkan).
          </p>
        </div>
      )}

      {/* FULLSCREEN IN-APP LIVE CAMERA VIEWFINDER MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between animate-in fade-in duration-200 select-none">
          {/* Top Bar Overlay */}
          <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <div className="leading-tight">
                <span className="text-xs font-bold block">KAMERA SURVEI LAPANGAN</span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {officerLocation
                    ? `GPS: ${officerLocation.lat.toFixed(5)}, ${officerLocation.lng.toFixed(5)}`
                    : 'GPS Aktif'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-full transition-colors ${
                    isTorchOn ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white'
                  }`}
                  title="Lampu Kilat / Senter"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Ganti Kamera Depan / Belakang"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Tutup Kamera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Viewfinder with Grid */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            {cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-xs font-bold">Mengaktifkan Sensor Kamera...</span>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Rule-of-Thirds Grid */}
            <div className="absolute inset-8 border border-white/25 pointer-events-none rounded-xl">
              <div className="absolute inset-x-0 top-1/3 border-t border-white/15" />
              <div className="absolute inset-x-0 top-2/3 border-t border-white/15" />
              <div className="absolute inset-y-0 left-1/3 border-l border-white/15" />
              <div className="absolute inset-y-0 left-2/3 border-l border-white/15" />
            </div>

            {/* In-Viewfinder Target & Distance HUD */}
            <div className="absolute top-4 inset-x-6 flex justify-center pointer-events-none z-10">
              <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{targetLabel}</span>
                {distance !== null && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px]">
                    {formatDistance(distance)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Shutter Controls */}
          <div className="p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center z-20">
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={cameraLoading}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-2xl focus:outline-none"
              title="Ambil Foto"
            >
              <div className="w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-900" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
