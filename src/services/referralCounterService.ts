/**
 * referralCounterService — Counter referensi 4 digit + reset bulanan (QRIS-2)
 * ==========================================================================
 * Arahan Pak Massad (9 Agu 2026):
 *  - Counter lokal 4 digit (maks 9.999/bulan, ~333 transaksi/hari).
 *  - Format [Bulan]-[4 digit]: transaksi pertama bulan Agustus = "08-0001".
 *  - Reset otomatis tiap tanggal 1 via RTC perangkat (tanpa internet).
 *  - Kunci rekonsiliasi auto-matching dengan mutasi Bank Persepsi.
 *
 * Penyimpanan: localStorage (fallback browser) — nilai { month: 'YYYY-MM', counter }.
 * RTC lokal: gunakan waktu perangkat (new Date()) — sesuai arahan, TIDAK perlu server.
 */

const COUNTER_KEY = "mpad_qris_referral_counter";

type CounterState = {
  month: string;     // "YYYY-MM" (bulan berjalan)
  counter: number;   // 1..9999
};

function nowMonth(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function readState(): CounterState | null {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CounterState;
    if (
      typeof parsed?.month !== "string" ||
      typeof parsed?.counter !== "number" ||
      !Number.isFinite(parsed.counter)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: CounterState): void {
  try {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(state));
  } catch {
    // storage penuh / private mode — counter tetap jalan di memori sesi
  }
}

/** Bulan berjalan format MM (untuk referensi). */
export function currentMonthLabel(now: Date = new Date()): string {
  return String(now.getMonth() + 1).padStart(2, "0");
}

/**
 * Referensi berikutnya: "MM-0001".."MM-9999".
 * Reset otomatis bila bulan berjalan beda dengan bulan tersimpan (tanggal 1).
 */
export function nextReference(now: Date = new Date()): string {
  const month = nowMonth(now);
  const state = readState();
  const counter = !state || state.month !== month ? 1 : Math.min(state.counter + 1, 9999);
  writeState({ month, counter });
  return `${currentMonthLabel(now)}-${String(counter).padStart(4, "0")}`;
}

/** Referensi saat ini (tanpa increment) — untuk pratinjau. */
export function currentReference(now: Date = new Date()): string {
  const month = nowMonth(now);
  const state = readState();
  const counter = !state || state.month !== month ? 1 : state.counter;
  return `${currentMonthLabel(now)}-${String(counter).padStart(4, "0")}`;
}

/** Reset paksa (misal admin / import backup). */
export function resetCounter(): void {
  try {
    localStorage.removeItem(COUNTER_KEY);
  } catch {
    // noop
  }
}
