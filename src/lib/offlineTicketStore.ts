/**
 * Penyimpanan lokal tiket offline (IndexedDB).
 *
 * Dipakai saat jaringan seluler hilang di area pesisir (mis. Pantai Batu Sori):
 * tiket yang gagal terkirim ke server disimpan lokal, struk tetap dicetak,
 * lalu disinkronkan otomatis ketika jaringan kembali.
 *
 * Aturan M-PAD: respons API dibungkus {success, data} — lihat lib/api.ts.
 */

import { createTourismOrder, type OrderPayload, type TourismOrderResult } from '../services/tourismService';

const DB_NAME = 'mpad_tourism_offline';
const DB_VERSION = 1;
const STORE = 'pending_tickets';

export interface PendingTourismTicket {
  /** Kunci klien, dibuat di perangkat — dipakai untuk mencegah kiriman ganda. */
  client_id: string;
  payload: OrderPayload;
  /** Snapshot hasil lokal supaya struk bisa dicetak walau server belum menjawab. */
  local_receipt: {
    bill_number: string;
    destination_name: string;
    visit_date: string;
    session_time: string;
    pax_count: number;
    total: number;
    discount_amount: number;
    lines: Array<{ label: string; pax: number; line_total: number }>;
  };
  created_at: string;
  synced: boolean;
  synced_at?: string;
  server_bill_number?: string;
  last_error?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di perangkat ini.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'client_id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Gagal membuka IndexedDB.'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = fn(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Operasi IndexedDB gagal.'));
        transaction.oncomplete = () => db.close();
      })
  );
}

/** Buat nomor tiket lokal sementara (dipakai sampai server mengembalikan nomor resmi). */
export function buildLocalTicketNumber(): string {
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAR-OFF-${stamp}-${suffix}`;
}

/** Simpan tiket yang gagal terkirim agar tidak hilang. */
export async function savePendingTicket(ticket: PendingTourismTicket): Promise<void> {
  await tx('readwrite', (store) => store.put(ticket) as IDBRequest<IDBValidKey>);
}

/** Ambil semua tiket yang belum tersinkron, terlama dulu. */
export async function getPendingTickets(): Promise<PendingTourismTicket[]> {
  const all = await tx<PendingTourismTicket[]>('readonly', (store) => store.getAll() as IDBRequest<PendingTourismTicket[]>);
  return (all ?? []).filter((t) => !t.synced).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Tandai tiket sudah tersinkron. */
export async function markSynced(clientId: string, serverBillNumber?: string): Promise<void> {
  const ticket = await tx<PendingTourismTicket | undefined>('readonly', (store) => store.get(clientId) as IDBRequest<PendingTourismTicket | undefined>);
  if (!ticket) return;
  ticket.synced = true;
  ticket.synced_at = new Date().toISOString();
  ticket.server_bill_number = serverBillNumber;
  await tx('readwrite', (store) => store.put(ticket) as IDBRequest<IDBValidKey>);
}

/** Catat kegagalan terakhir supaya petugas bisa melihat penyebabnya. */
export async function noteSyncError(clientId: string, message: string): Promise<void> {
  const ticket = await tx<PendingTourismTicket | undefined>('readonly', (store) => store.get(clientId) as IDBRequest<PendingTourismTicket | undefined>);
  if (!ticket) return;
  ticket.last_error = message;
  await tx('readwrite', (store) => store.put(ticket) as IDBRequest<IDBValidKey>);
}

export interface SyncReport {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Kirim ulang semua tiket offline ke server.
 * Kalau satu tiket gagal (mis. kuota penuh), tiket lain tetap dicoba.
 */
export async function syncPendingTickets(): Promise<SyncReport> {
  const pending = await getPendingTickets();
  const report: SyncReport = { attempted: pending.length, succeeded: 0, failed: 0, errors: [] };

  for (const ticket of pending) {
    try {
      const result: TourismOrderResult = await createTourismOrder(ticket.payload);
      await markSynced(ticket.client_id, result.bill_number);
      report.succeeded += 1;
    } catch (err: any) {
      const message = err?.message ?? 'Gagal sinkronisasi.';
      await noteSyncError(ticket.client_id, message);
      report.failed += 1;
      report.errors.push(`${ticket.local_receipt.bill_number}: ${message}`);
    }
  }

  return report;
}

/** Status koneksi perangkat. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
