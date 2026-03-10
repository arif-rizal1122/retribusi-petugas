/**
 * QRScannerService
 * centralizes parsing logic for QR codes in m-PAD ecosystem
 */

export interface QRParseResult {
  type: 'url' | 'json' | 'string';
  value: string;
  metadata?: any;
  actionHint?: string;
}

export const QRScannerService = {
  /**
   * Parses string from QR scanner and identifies the data type
   */
  parse(data: string): QRParseResult {
    // 1. Check if it's a Bapenda/m-PAD verification URL
    if (data.includes('/api/verify/bill/') || data.includes('/api/verify/payment/')) {
      const parts = data.split('/');
      const billNumber = parts[parts.length - 1];
      
      const isPbbSppt = billNumber.startsWith('V-SPPT-');
      
      return {
        type: 'url',
        value: isPbbSppt ? billNumber.replace('V-SPPT-', '') : billNumber,
        actionHint: isPbbSppt ? 'SPPT PBB Terdeteksi' : 'SKRD/Bill Terdeteksi',
        metadata: {
          originalUrl: data,
          isVerification: true,
          billNumber: billNumber,
          isPbbSppt: isPbbSppt
        }
      };
    }

    // 2. Check if it's JSON (for bulk pay or internal data)
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object') {
        return {
          type: 'json',
          value: data,
          actionHint: parsed.type === 'bill_payment' ? 'Multi-Billing Terdeteksi' : 'Data Terdeteksi',
          metadata: parsed
        };
      }
    } catch (e) {
      // Not JSON
    }

    // 3. Just a regular search string (NTPD, Invoice, etc)
    return {
      type: 'string',
      value: data,
      actionHint: data.length > 10 ? 'ID Terdeteksi' : 'Pencarian'
    };
  }
};
