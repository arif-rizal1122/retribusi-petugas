import { api } from '../lib/api';

export interface DlhMarketTicketInput {
  market_name: string;
  stall_name_or_number?: string;
  merchant_name?: string;
  amount: 3000 | 6000;
  payment_method: 'TUNAI' | 'QRIS_INSTANT';
}

export interface DlhMarketTicket {
  id: number;
  ticket_code: string;
  collector_user_id: number;
  market_name: string;
  stall_name_or_number?: string | null;
  merchant_name?: string | null;
  amount: number;
  payment_method: 'TUNAI' | 'QRIS_INSTANT';
  qr_token: string;
  issued_at: string;
}

export interface DlhHoldingBalance {
  collector_user_id: number;
  period_month: number;
  period_year: number;
  unremitted_ticket_count: number;
  holding_balance: number;
  tickets_summary: {
    karcis_3000: number;
    karcis_6000: number;
    total_cash: number;
    total_qris: number;
  };
}

export interface DlhRemittanceInput {
  period_month: number;
  period_year: number;
  remitted_amount: number;
  bank_reference_number?: string;
  notes?: string;
}

export interface DlhTrashCalculationInput {
  building_category:
    | 'SOSIAL_IBADAH'
    | 'RUMAH_SEDERHANA'
    | 'RUMAH_MENENGAH'
    | 'RUKO_NIAGA'
    | 'RESTORAN'
    | 'PASAR'
    | 'INDUSTRI';
  status_hunian: 'BERPENGHUNI' | 'KOSONG';
}

export interface DlhTrashCalculationResult {
  building_category: string;
  status_hunian: string;
  monthly_amount: number;
  due_day_of_month: number;
  penalty_rate: string;
}

export const dlhCollectorService = {
  /**
   * Terbitkan karcis sampah pasar harian
   */
  async issueMarketTicket(data: DlhMarketTicketInput): Promise<DlhMarketTicket> {
    const res = await api.post('/api/v1/dlh/market/tickets', data);
    return res.data?.data || res.data;
  },

  /**
   * Dapatkan saldo penampungan karcis yang belum disetor (Holding Balance)
   */
  async getHoldingBalance(month?: number, year?: number): Promise<DlhHoldingBalance> {
    const m = month ?? new Date().getMonth() + 1;
    const y = year ?? new Date().getFullYear();
    const res = await api.get(`/api/v1/dlh/market/holding-balance?month=${m}&year=${y}`);
    return res.data?.data || res.data;
  },

  /**
   * Serahkan setoran akhir bulan (Batch Remittance ke RKUD Bank Sultra)
   */
  async submitRemittance(data: DlhRemittanceInput) {
    const res = await api.post('/api/v1/dlh/market/remittance', data);
    return res.data;
  },

  /**
   * Hitung simulasi tarif retribusi persampahan door-to-door
   */
  async calculateTariff(data: DlhTrashCalculationInput): Promise<DlhTrashCalculationResult> {
    const res = await api.post('/api/v1/dlh/trash/calculate', data);
    return res.data?.data || res.data;
  },

  /**
   * Update data penghuni persil (Penyewa / Pemilik baru)
   */
  async transferOccupant(
    taxObjectId: number | string,
    data: {
      tipe_penghuni: 'PEMILIK' | 'PENYEWA';
      status_hunian: 'BERPENGHUNI' | 'KOSONG';
      penanggung_jawab_nama: string;
      penanggung_jawab_kontak?: string;
    }
  ) {
    const res = await api.post(`/api/v1/dlh/trash/transfer-occupant/${taxObjectId}`, data);
    return res.data;
  },

  /**
   * Cari data objek persil berdasarkan kode stiker QR atau ID
   */
  async inquireObjectByCode(code: string) {
    const res = await api.get(`/api/v1/public/objects/${encodeURIComponent(code)}/bill`);
    return res.data?.data || res.data;
  },

  /**
   * Lapor rumah/persil kosong dengan validasi GPS geofencing (<30m) & auto-WA notice
   */
  async reportEmptyHouse(
    taxObjectId: number | string,
    data: {
      latitude?: number;
      longitude?: number;
      notes?: string;
    }
  ) {
    const res = await api.post(`/api/v1/dlh/trash/empty-house-notice/${taxObjectId}`, data);
    return res.data?.data || res.data;
  },
};
