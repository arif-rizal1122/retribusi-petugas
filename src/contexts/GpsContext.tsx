import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { calculateDistanceMeters } from '../utils/geoValidation';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export type GpsStatus = 'checking' | 'active' | 'denied' | 'unavailable' | 'timeout';

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface GpsContextType {
  location: GpsLocation | null;
  gpsStatus: GpsStatus;
  gpsError: string | null;
  isGpsRequired: boolean;
  lastSyncTime: number | null;
  requestGpsPermission: () => Promise<boolean>;
}

const GpsContext = createContext<GpsContextType | undefined>(undefined);

// Standar Throttling Sistem M-PAD (SKILL: Backend Expert Tracking & Performance)
const MIN_TIME_INTERVAL_MS = 60 * 1000; // 60 Detik (1 Menit)
const MIN_DISPLACEMENT_METERS = 50;     // 50 Meter

export const GpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('checking');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const lastSentCoordRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Seluruh petugas lapangan wajib mengaktifkan GPS saat login
  const isGpsRequired = Boolean(
    isAuthenticated && 
    user && 
    (user.role === 'petugas' || user.role === 'opd' || (user as any).role_code)
  );

  // Sync koordinat ke backend API (PUT /api/user/location) dengan dual throttling
  const syncLocationToBackend = useCallback(async (loc: GpsLocation) => {
    if (!isAuthenticated) return;

    const now = Date.now();
    const last = lastSentCoordRef.current;

    // Evaluasi Throttling
    if (last) {
      const elapsed = now - last.time;
      const distance = calculateDistanceMeters(last.lat, last.lng, loc.lat, loc.lng);

      // Throttling 1: Waktu belum 60 detik & Jarak kurang dari 50 meter -> tahan (skip sync)
      if (elapsed < MIN_TIME_INTERVAL_MS && distance < MIN_DISPLACEMENT_METERS) {
        return;
      }
    }

    try {
      await api.put('/api/user/location', {
        latitude: loc.lat,
        longitude: loc.lng,
      });
      lastSentCoordRef.current = { lat: loc.lat, lng: loc.lng, time: now };
      setLastSyncTime(now);
    } catch (err) {
      console.warn('Gagal sync lokasi GPS ke backend:', err);
    }
  }, [isAuthenticated]);

  // Request & Watch Geolocation
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setGpsError('Perangkat Anda tidak mendukung sensor Geolocation / GPS.');
      return;
    }

    setGpsStatus('checking');
    setGpsError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc: GpsLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        };

        setLocation(newLoc);
        setGpsStatus('active');
        setGpsError(null);

        // Sync ke backend dengan throttling
        syncLocationToBackend(newLoc);
      },
      (err) => {
        let msg = 'Gagal mengakses sensor GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          msg = 'Izin lokasi (GPS) ditolak. Petugas wajib mengizinkan akses lokasi pada browser/perangkat.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsStatus('unavailable');
          msg = 'Sinyal sensor GPS tidak terdeteksi. Pastikan GPS HP Anda dalam keadaan aktif (High Accuracy).';
        } else if (err.code === err.TIMEOUT) {
          setGpsStatus('timeout');
          msg = 'Waktu pencarian sinyal GPS habis. Sedang mencoba menghubungkan kembali...';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
  }, [syncLocationToBackend]);

  const requestGpsPermission = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setGpsStatus('unavailable');
        setGpsError('Perangkat tidak mendukung sensor lokasi.');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: GpsLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
          };
          setLocation(newLoc);
          setGpsStatus('active');
          setGpsError(null);
          syncLocationToBackend(newLoc);
          startTracking();
          resolve(true);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('denied');
            setGpsError('Izin akses GPS ditolak. Silakan aktifkan izin lokasi di pengaturan browser.');
          } else {
            setGpsStatus('unavailable');
            setGpsError('Sensor GPS tidak aktif atau sinyal satelit lemah.');
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, [syncLocationToBackend, startTracking]);

  useEffect(() => {
    if (isGpsRequired) {
      startTracking();
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('active');
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isGpsRequired, startTracking]);

  return (
    <GpsContext.Provider
      value={{
        location,
        gpsStatus,
        gpsError,
        isGpsRequired,
        lastSyncTime,
        requestGpsPermission,
      }}
    >
      {children}

      {/* MODAL MANDATORY ENFORCEMENT: JIKA GPS NONAKTIF / DITOLAK */}
      {isGpsRequired && (gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-300 dark:border-rose-800 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider">
                SOP Pengawasan M-PAD
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                GPS Wajib Diaktifkan
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                Seluruh aktivitas juru pungut & petugas operasional lapangan Pemerintah Kota Baubau 
                <strong className="text-rose-600 dark:text-rose-400 font-bold"> wajib menyertakan koordinat GPS berakurasi tinggi</strong> untuk 
                validasi transaksi resmi serta pencegahan manipulasi data di luar lokasi penugasan.
              </p>
            </div>

            {gpsError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800/60 text-left text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{gpsError}</span>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-gray-800 p-3.5 rounded-2xl text-left text-xs text-slate-600 dark:text-gray-300 space-y-1.5 border border-slate-200/80 dark:border-gray-700">
              <span className="font-bold text-slate-800 dark:text-white block">Cara Mengaktifkan:</span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-gray-400">
                <li>Buka pengaturan HP, pastikan <strong>Lokasi / GPS</strong> aktif (Akurasi Tinggi).</li>
                <li>Pada Chrome/Safari, tekan ikon gembok/setelan di address bar.</li>
                <li>Ubah izin <strong>Lokasi (Location)</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={requestGpsPermission}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Aktifkan & Hubungkan GPS</span>
            </button>
          </div>
        </div>
      )}
    </GpsContext.Provider>
  );
};

export const useGps = () => {
  const context = useContext(GpsContext);
  if (!context) {
    throw new Error('useGps must be used within a GpsProvider');
  }
  return context;
};
