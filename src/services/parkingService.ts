import { api } from '../lib/api';

export interface ParkingLocation {
  id: number;
  code: string;
  name: string;
  category: 'retribusi_umum' | 'retribusi_khusus' | 'pajak_pbjt';
  opd_id: number;
  classification_id?: number;
  rate_r2: number;
  rate_r4: number;
  base_qris_payload?: string;
  nmid?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  opd?: { id: number; name: string };
  classification?: { id: number; name: string; code: string };
}

export interface ParkingSession {
  id: number;
  parking_location_id: number;
  jukir_user_id: number;
  shift_date: string;
  vehicle_type: 'r2' | 'r4';
  plate_hint?: string;
  amount: number;
  payment_method: 'cash' | 'qris';
  qris_reference?: string;
  bill_id?: number;
  status: 'completed' | 'voided';
  created_at: string;
  parking_location?: { id: number; name: string; code: string };
}

export interface JukirWallet {
  id: number;
  user_id: number;
  parking_location_id?: number;
  shift_date: string;
  shift_status: 'open' | 'closed';
  shift_opened_at?: string;
  shift_closed_at?: string;
  total_cash: number;
  total_qris: number;
  total_sessions: number;
  settled: boolean;
}

export interface ShiftSummaryData {
  wallet: JukirWallet | null;
  sessions: ParkingSession[];
  summary: {
    total_cash: number;
    total_qris: number;
    total_revenue: number;
    total_sessions: number;
    shift_status: 'open' | 'closed';
    shift_opened_at?: string;
  };
}

export interface RecordSessionInput {
  parking_location_id: number;
  vehicle_type: 'r2' | 'r4';
  payment_method: 'cash' | 'qris';
  plate_hint?: string;
  qris_reference?: string;
}

export const parkingService = {
  async getLocations(): Promise<ParkingLocation[]> {
    const res = await api.get('/parking/locations');
    return res.data || [];
  },

  async openShift(parkingLocationId: number): Promise<any> {
    const res = await api.post('/parking/shift/open', {
      parking_location_id: parkingLocationId,
    });
    return res.data;
  },

  async closeShift(): Promise<any> {
    const res = await api.post('/parking/shift/close', {});
    return res.data;
  },

  async getShiftSummary(): Promise<ShiftSummaryData | null> {
    const res = await api.get('/parking/shift-summary');
    return res.data || null;
  },

  async recordSession(input: RecordSessionInput): Promise<any> {
    const res = await api.post('/parking/sessions', input);
    return res;
  },

  async getDashboard(): Promise<any> {
    const res = await api.get('/parking/dashboard');
    return res.data;
  },
};
