import { api } from '../lib/api';

export interface MarketItem {
  id: number;
  code: string;
  name: string;
  type: string;
  address?: string;
  district?: string;
  stalls_count?: number;
}

export interface MarketBuildingItem {
  market_id: number;
  market_name: string;
  building_name: string;
  total_units: number;
  active_units: number;
  sealed_units: number;
  vacant_units: number;
  sample_tariff: number;
  billing_cycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
  stall_type: 'kios' | 'los' | 'pelataran';
}

export interface MarketStallItem {
  id: number;
  market_id: number;
  market_name: string;
  building_name: string;
  stall_type: 'kios' | 'los' | 'pelataran';
  stall_number: string;
  full_code: string;
  merchant_name?: string | null;
  tariff_amount: number;
  billing_cycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'aktif' | 'tersegel' | 'kosong';
  notes?: string | null;
}

export interface MarketOfficerAssignmentItem {
  id: number;
  market_name: string;
  officer_name: string;
  assigned_areas: string[];
  collects_daily_pkl: boolean;
  signed_by?: string;
  decree_date?: string;
  notes?: string;
}

export interface IssueDailyTicketPayload {
  market_name: string;
  building_name?: string;
  merchant_name?: string;
  quantity: number;
  area_sqm?: number;
  dimensions?: string;
  unit_amount: number;
  payment_method: 'TUNAI' | 'QRIS';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export const marketOfficerService = {
  async getMarkets(): Promise<MarketItem[]> {
    const res: any = await api.get('/api/v1/disperindag/markets');
    return res.data?.data || res.data || [];
  },

  async getBuildings(marketName?: string): Promise<MarketBuildingItem[]> {
    const params = marketName ? { market_name: marketName } : {};
    const res: any = await api.get('/api/v1/disperindag/buildings', { params });
    return res.data?.data || res.data || [];
  },

  async getStalls(params: {
    market_name?: string;
    building_name?: string;
    stall_type?: string;
    status?: string;
    search?: string;
    all?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<{ items: MarketStallItem[]; total: number }> {
    const res: any = await api.get('/api/v1/disperindag/stalls', { params });
    const payload = res.data?.data ?? res.data ?? [];
    const items = Array.isArray(payload) ? payload : (payload.data ?? []);
    const total = res.data?.meta?.total ?? items.length;
    return { items, total };
  },

  async getOfficers(): Promise<MarketOfficerAssignmentItem[]> {
    const res: any = await api.get('/api/v1/disperindag/officers');
    return res.data?.data || res.data || [];
  },

  async getOfficerStats(): Promise<{
    today_tickets_count: number;
    today_tickets_amount: number;
    assignment: MarketOfficerAssignmentItem | null;
  }> {
    const res: any = await api.get('/api/v1/disperindag/officer-stats');
    return res.data?.data || res.data || { today_tickets_count: 0, today_tickets_amount: 0, assignment: null };
  },

  async issueDailyTicket(payload: IssueDailyTicketPayload) {
    const res: any = await api.post('/api/v1/disperindag/tickets/daily', payload);
    return res.data?.data || res.data;
  },

  async payStall(
    stallId: number,
    payload: {
      amount: number;
      payment_method: 'TUNAI' | 'QRIS' | 'TRANSFER';
      period?: string;
      notes?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    }
  ) {
    const res: any = await api.post(`/api/v1/disperindag/stalls/${stallId}/pay`, payload);
    return res.data?.data || res.data;
  },

  async updateStallStatus(stallId: number, status: 'aktif' | 'tersegel' | 'kosong', notes?: string) {
    const res: any = await api.put(`/api/v1/disperindag/stalls/${stallId}/status`, {
      status,
      notes,
    });
    return res.data?.data || res.data;
  },
};
