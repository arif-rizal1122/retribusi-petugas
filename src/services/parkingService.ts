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

export interface JukirProfileData {
  user_id: number;
  name: string;
  nik: string;
  surat_tugas_no: string;
  surat_tugas_expired_at: string;
  days_remaining: number;
  is_expired: boolean;
  status: 'active' | 'suspended' | 'expired';
  deposit_balance: number;
  split_rkud_percent: number;
  split_jukir_percent: number;
  assigned_location?: ParkingLocation;
  shift_status: 'open' | 'closed';
}

export interface ThermalPrintPayload {
  header: string;
  sub_header: string;
  location_name: string;
  receipt_no: string;
  datetime: string;
  vehicle_type: string;
  plate_hint: string;
  amount_total: number;
  qr_verification_url: string;
  footer_notice: string;
  reward_notice: string;
}

export interface PrepaidCashResponse {
  status: string;
  message: string;
  data: {
    session: ParkingSession;
    receipt_token: string;
    tariff_total: number;
    deposit_deducted_rkud: number;
    cash_kept_by_jukir: number;
    jukir_net_earnings: number;
    remaining_deposit: number;
    thermal_print_payload: ThermalPrintPayload;
  };
  shift_summary: {
    total_cash: number;
    total_qris: number;
    total_sessions: number;
  };
}

export interface SpotCheckData {
  location: {
    id: number;
    name: string;
    code: string;
    latitude?: number;
    longitude?: number;
  };
  active_jukir?: {
    id: number;
    name: string;
    shift_opened_at?: string;
  };
  digital_active_count: {
    r2: number;
    r4: number;
    total: number;
  };
  physical_observed_count: {
    r2: number;
    r4: number;
    total: number;
  };
  audit_result: {
    discrepancy_units: number;
    discrepancy_percent: number;
    risk_level: 'normal' | 'warning' | 'critical';
    recommendation: string;
  };
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

  // === QUADRUPLE-LOCK METHODS ===
  async getJukirProfile(): Promise<JukirProfileData> {
    const res = await api.get('/parking/jukir/profile');
    return res.data?.data || res.data;
  },

  async topupDeposit(amount: number, paymentMethod: string = 'qris'): Promise<any> {
    const res = await api.post('/parking/jukir/topup', {
      amount,
      payment_method: paymentMethod,
    });
    return res.data;
  },

  async recordPrepaidCash(input: {
    parking_location_id: number;
    vehicle_type: 'r2' | 'r4';
    plate_hint?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<PrepaidCashResponse> {
    const res = await api.post('/parking/sessions/prepaid-cash', input);
    return res.data;
  },

  async getSpotCheck(locationId: number, physicalR2?: number, physicalR4?: number): Promise<SpotCheckData> {
    const res = await api.get('/parking/inspector/spot-check', {
      params: {
        parking_location_id: locationId,
        physical_r2: physicalR2 || 0,
        physical_r4: physicalR4 || 0,
      },
    });
    return res.data?.data || res.data;
  },

  async submitSanction(jukirUserId: number, sanctionType: string, reason: string): Promise<any> {
    const res = await api.post('/parking/inspector/sanction', {
      jukir_user_id: jukirUserId,
      sanction_type: sanctionType,
      reason,
    });
    return res.data;
  },
};

