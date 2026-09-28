/**
 * geoValidation.ts — Utilitas Penghitungan Jarak & Validasi Radius Geofencing Petugas
 * Digunakan untuk memastikan petugas benar-benar berada di lokasi fisik objek pajak/retribusi
 * sebelum diizinkan mengambil foto dan menyelesaikan survei lapangan.
 */

export const DEFAULT_MAX_RADIUS_METERS = 100; // Maksimal radius toleransi default (100 meter)

/**
 * Menghitung jarak garis lurus antara dua titik koordinat (dalam satuan meter)
 * Menggunakan rumus Haversine.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 0;
  }

  const R = 6371e3; // Radius bumi dalam meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Pembulatan ke meter terdekat
}

/**
 * Memformat jarak dalam meter atau kilometer untuk tampilan UI
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export interface OfficerLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  gps_status?: 'active' | 'disabled' | 'signal_lost' | 'manual';
  gps_notes?: string;
}

/**
 * Mengambil koordinat GPS petugas saat ini via HTML5 Geolocation API
 * Mendukung graceful degradation: mencoba akurasi tinggi lebih dulu,
 * jika timeout atau sinyal lemah otomatis fallback ke akurasi jaringan (wifi/cell tower)
 * agar tidak gagal timeout.
 */
export function getOfficerCurrentPosition(
  options?: PositionOptions
): Promise<OfficerLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung sensor lokasi / GPS.'));
      return;
    }

    const highAccuracyOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 10000,
      ...options,
    };

    const tryLowAccuracyFallback = (initialError?: GeolocationPositionError) => {
      // Jika izin ditolak oleh pengguna, langsung kembalikan pesan
      if (initialError?.code === initialError?.PERMISSION_DENIED) {
        reject(new Error('Izin akses lokasi (GPS) ditolak. Mohon aktifkan izin lokasi di browser/perangkat Anda.'));
        return;
      }

      // Coba akurasi jaringan/wifi/cell tower yang cepat dan tidak mudah timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            gps_status: 'active',
          });
        },
        (fallbackError) => {
          let msg = 'Gagal mendeteksi lokasi GPS.';
          if (fallbackError.code === fallbackError.PERMISSION_DENIED) {
            msg = 'Izin akses lokasi (GPS) ditolak. Mohon aktifkan izin lokasi di browser/perangkat Anda.';
          } else if (fallbackError.code === fallbackError.POSITION_UNAVAILABLE) {
            msg = 'Sinyal lokasi / GPS tidak tersedia saat ini.';
          } else if (fallbackError.code === fallbackError.TIMEOUT) {
            msg = 'Waktu permintaan lokasi GPS habis (timeout). Silakan periksa koneksi atau aktifkan GPS perangkat.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    };

    // Percobaan pertama: Akurasi Tinggi
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          gps_status: 'active',
        });
      },
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          tryLowAccuracyFallback(error);
        } else {
          let msg = 'Gagal mendeteksi lokasi GPS.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Izin akses lokasi (GPS) ditolak. Mohon aktifkan izin lokasi di browser/perangkat Anda.';
          }
          reject(new Error(msg));
        }
      },
      highAccuracyOptions
    );
  });
}
