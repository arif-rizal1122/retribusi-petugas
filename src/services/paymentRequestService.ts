import { api } from "../lib/api";

export type GatewayPaymentMethod = 'bri_va' | 'qris' | 'cash' | 'transfer';

export type PaymentRequestStatus =
  | "draft"
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled"
  | "processing_receipt";

export type PaymentRequestReceipt = {
  bill_id: number;
  bill_number?: string;
  reference_number?: string;
  receipt_number: string;
  download_path: string;
  file_name: string;
};

export type PaymentRequestBillDetail = {
  bill_id: number;
  bill_number?: string;
  label?: string;
  tax_object_name?: string;
  address?: string;
  tax_type?: string;
  period_start?: string;
  period_end?: string;
  due_date?: string;
  amount: number;
  penalty?: number;
  admin_fee?: number;
  billing_cycle?: string;
  unit_name?: string;
};

export type PaymentRequest = {
  id: string;
  external_id: string;
  method: GatewayPaymentMethod;
  provider: "BRI" | "QRIS" | "CASH" | "TRANSFER";
  status: PaymentRequestStatus;
  status_label: string;
  bill_ids: number[];
  bill_numbers: string[];
  bills: PaymentRequestBillDetail[];
  amount: number;
  admin_fee: number;
  total_amount: number;
  va_number?: string;
  qris_url?: string;
  expired_at: string;
  paid_at?: string;
  instructions: string[];
  receipt_url?: string;
  receipt_number?: string;
  receipts: PaymentRequestReceipt[];
  reference_number?: string;
  can_refresh: boolean;
  can_cancel: boolean;
};

export type PaymentRequestBill = {
  id: number | string;
  bill_number?: string | null;
  amount?: number | string | null;
  total_amount?: number | string | null;
  period?: string | null;
  tax_object_id?: number | string | null;
};

export type CreatePaymentRequestInput = {
  billIds: Array<number | string>;
  method: GatewayPaymentMethod;
  bills?: PaymentRequestBill[];
  proof_url?: string;
  taxpayer_id?: number | string;
};

export async function createOfficerPayment(input: {
  billIds: Array<number | string>;
  paymentMethod: 'cash' | 'qris' | 'va' | 'transfer';
  proofUrl?: string | null;
  bills?: PaymentRequestBill[];
}) {
  const { billIds, paymentMethod, proofUrl, bills } = input;
  
  // For cash / direct officer recording, call standard bill pay or bulk pay
  const results = await Promise.all(
    billIds.map(async (billId) => {
      const billData = bills?.find(b => String(b.id) === String(billId));
      return api.post(`/api/bills/${billId}/pay`, {
        payment_method: paymentMethod,
        amount: billData?.amount || billData?.total_amount,
        proof_url: proofUrl || null,
        tax_object_id: billData?.tax_object_id,
        billing_period: billData?.period
      });
    })
  );

  return results;
}

export const isPaymentRequestPaid = (status?: PaymentRequestStatus | null) =>
  status === "paid" || status === "processing_receipt";

export const isPaymentRequestTerminal = (status?: PaymentRequestStatus | null) =>
  status === "paid" ||
  status === "expired" ||
  status === "failed" ||
  status === "cancelled";
