/**
 * Layanan modul tiket objek wisata Dinas Pariwisata (OPD 16).
 * Endpoint backend: /api/tourism (lihat retribusi-api routes/api.php).
 */

import { api } from '../lib/api';

export interface TourismRate {
  classification_id: number;
  visitor_category: 'domestic_adult' | 'student' | 'foreign';
  label: string;
  amount: number;
  unit: string;
}

export interface TourismQuota {
  date: string;
  capacity: number;
  booked: number;
  remaining: number;
}

export interface TourismDestination {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  open_time: string | null;
  close_time: string | null;
  requires_offline_mode: boolean;
  is_open: boolean;
  quota: TourismQuota;
  rates: TourismRate[];
}

export interface TourismAddon {
  id: number;
  code: string;
  name: string;
  tarif: number;
  satuan: string;
  lokasi: string | null;
}

export interface TourismCatalog {
  destinations: TourismDestination[];
  addons: TourismAddon[];
  group_rules: { min_pax: number; discount_percent: number };
}

export interface OrderLine {
  classification_id?: number;
  asset_item_id?: number;
  label: string;
  pax: number;
  unit_amount: number;
  line_total: number;
}

export interface TourismOrderResult {
  bill_id: number;
  bill_number: string;
  ticket_type: 'individual' | 'group';
  pax_count: number;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  master_qr_token: string | null;
  lines: OrderLine[];
}

export interface CheckInResult {
  bill_number: string;
  pax_count: number;
  pax_checked_in: number;
  remaining: number;
  complete: boolean;
}

export interface OrderPayload {
  destination_id: number;
  visit_date: string;
  session_time?: string;
  items: Array<{ classification_id: number; pax: number }>;
  addons?: Array<{ asset_item_id: number; qty: number }>;
}

/** Ambil katalog destinasi, tarif, kuota, dan add-on sewa alat. */
export async function getTourismCatalog(date?: string): Promise<TourismCatalog> {
  const res: any = await api.get('/tourism/catalog', date ? { params: { date } } : {});
  return res?.data?.data ?? res?.data ?? res;
}

/** Kirim pesanan tiket. Melempar Error berisi pesan dari server kalau gagal. */
export async function createTourismOrder(payload: OrderPayload): Promise<TourismOrderResult> {
  const res: any = await api.post('/tourism/order', payload);
  return res?.data?.data ?? res?.data ?? res;
}

/** Catat sejumlah orang masuk di gerbang (check-in bertahap). */
export async function checkInTourismTicket(params: {
  bill_number?: string;
  master_qr_token?: string;
  headcount: number;
}): Promise<CheckInResult> {
  const res: any = await api.post('/tourism/check-in', params);
  return res?.data?.data ?? res?.data ?? res;
}
