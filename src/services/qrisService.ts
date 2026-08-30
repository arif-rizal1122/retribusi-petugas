/**
 * qrisService — Offline Dynamic QRIS (Arahan Pak Massad, 9 Agu 2026)
 * ==================================================================
 * Standar EMVCo Merchant Presented Mode + QRIS Indonesia (Bank Indonesia).
 *
 * Prinsip:
 *  - Base QRIS statis (Merchant ID + rekening Bank Persepsi + NMID) diunduh
 *    SEKALI saat registrasi, disimpan lokal (bukan request server tiap transaksi).
 *  - Saat transaksi: aplikasi OFFLINE menginjeksi nominal (Tag 54) + referensi
 *    4 digit (Tag 62/01 Bill Number), set Point of Initiation = 11 (dinamis),
 *    hitung ulang checksum CRC16 (Tag 63), tampilkan QR final.
 *  - AFT TIDAK ditanam di barcode — dieksekusi di sisi Bank Persepsi
 *    (acquirer-side auto-split). Barcode hanya berisi perintah "bayar Rp X".
 */

/** Hasil parse payload QRIS menjadi TLVs (preserve urutan). */
export type QrisTlv = { tag: string; value: string };

/** Input untuk membangun QRIS dari nol (fallback jika base QRIS belum ada). */
export type QrisBuildInput = {
  nmid: string;              // National Merchant ID (15 digit, dari Bank Persepsi)
  merchantName: string;      // nama unit usaha (max 25 char)
  merchantCity: string;      // kota (max 15 char, uppercase)
  merchantAccount?: string;  // nomor rekening Bank Persepsi (sub-TLV 02, opsional)
  mcc: string;               // Merchant Category Code 4 digit (misal "5812" restoran)
  amount: number;            // total transaksi (harga + pajak)
  reference: string;         // referensi 4 digit / MM-XXXX
  postalCode?: string;
};

export type QrisInjectInput = {
  amount: number;
  reference: string;         // misal "08-0001"
  merchantName?: string;     // opsional, override jika ingin label beda
};

// ---------- Konstanta ----------
const PAYLOAD_FORMAT = "01";              // Tag 00
const PI_DYNAMIC = "11";                  // Tag 01: dinamis (amount tetap)
const PI_STATIC = "12";                   // Tag 01: statis
const CURRENCY_IDR = "360";               // Tag 53
const COUNTRY_ID = "ID";                  // Tag 58
const QRIS_GUI = "ID.CO.QRIS.WWW";        // sub-TLV 00 pada Tag 26
const DEFAULT_MCC = "0000";

// ---------- Helper TLV ----------
const tlv = (tag: string, value: string): string =>
  tag + String(value.length).padStart(2, "0") + value;

/** Parse payload QRIS -> array TLV (flat, hanya 2 digit tag). */
export function parseQris(payload: string): QrisTlv[] {
  const out: QrisTlv[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const value = payload.slice(i + 4, i + 4 + len);
    out.push({ tag, value });
    i += 4 + len;
  }
  return out;
}

/** Cari TLV berdasarkan tag. */
export function findTlv(tlvs: QrisTlv[], tag: string): string | undefined {
  return tlvs.find((t) => t.tag === tag)?.value;
}

/** Parse sub-TLV (untuk Tag 26 dan Tag 62). */
export function parseSubTlvs(value: string): QrisTlv[] {
  return parseQris(value);
}

/** CRC16-CCITT (init 0xFFFF, poly 0x1021) — checksum QRIS Tag 63. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Format amount QRIS: 2 desimal tanpa pemisah ("55000.00"). */
export function formatQrisAmount(amount: number): string {
  const fixed = Math.round(amount * 100) / 100;
  return fixed.toFixed(2);
}

/** Bangun Tag 26 Merchant Account Information (QRIS). */
function buildMerchantAccount(input: QrisBuildInput): string {
  const sub: string[] = [];
  sub.push(tlv("00", QRIS_GUI));                        // GUI wajib
  sub.push(tlv("01", input.nmid));                      // NMID
  if (input.merchantAccount) sub.push(tlv("02", input.merchantAccount));
  return tlv("26", sub.join(""));
}

/** Bangun Tag 62 Additional Data — referensi (Bill Number, sub-TLV 01). */
function buildAdditionalData(reference: string): string {
  const sub: string[] = [];
  sub.push(tlv("01", reference));                       // Bill Number
  return tlv("62", sub.join(""));
}

/** Siapkan payload tanpa CRC (dari "00" sampai sebelum "63"). */
function buildPayloadBody(input: QrisBuildInput, piMethod: string): string {
  const name = input.merchantName.slice(0, 25);
  const city = input.merchantCity.slice(0, 15).toUpperCase();
  const mcc = (input.mcc || DEFAULT_MCC).slice(0, 4);
  const parts: string[] = [];
  parts.push(tlv("00", PAYLOAD_FORMAT));
  parts.push(tlv("01", piMethod));
  parts.push(buildMerchantAccount(input));
  parts.push(tlv("52", mcc));
  parts.push(tlv("53", CURRENCY_IDR));
  parts.push(tlv("54", formatQrisAmount(input.amount)));
  parts.push(tlv("58", COUNTRY_ID));
  parts.push(tlv("59", name));
  parts.push(tlv("60", city));
  if (input.postalCode) parts.push(tlv("61", input.postalCode.slice(0, 10)));
  parts.push(buildAdditionalData(input.reference));
  return parts.join("");
}

/** Bangun QRIS dinamis lengkap (payload + CRC). */
export function buildQrisDynamic(input: QrisBuildInput): string {
  const body = buildPayloadBody(input, PI_DYNAMIC);
  return body + tlv("63", crc16(body));
}

/** Bangun QRIS statis (base) — tanpa amount & referensi spesifik. */
export function buildQrisStatic(
  input: Omit<QrisBuildInput, 'amount' | 'reference'>,
): string {
  const body = buildPayloadBody({ ...input, amount: 0, reference: "0000" }, PI_STATIC);
  return body + tlv("63", crc16(body));
}

/**
 * Inti Offline Dynamic QRIS:
 * Ambil BASE QRIS statis yang tersimpan lokal, injeksi nominal + referensi
 * transaksi (Tag 62/01), set Point of Initiation = 11 (dinamis),
 * hitung ulang CRC — SEMUA OFFLINE di HP.
 */
export function injectQrisTransaction(
  basePayload: string,
  input: QrisInjectInput,
): string {
  const tlvs = parseQris(basePayload);
  const out: string[] = [];
  let merchantAccount = findTlv(tlvs, "26") ?? "";
  let name = findTlv(tlvs, "59") ?? "";
  let city = findTlv(tlvs, "60") ?? "";

  for (const t of tlvs) {
    if (t.tag === "01") continue;                    // PI method — timpa jadi dinamis
    if (t.tag === "54") continue;                    // amount — timpa
    if (t.tag === "62") continue;                    // additional — timpa
    if (t.tag === "63") continue;                    // CRC — hitung ulang
    if (t.tag === "26") merchantAccount = t.value;
    if (t.tag === "59") name = t.value;
    if (t.tag === "60") city = t.value;
  }
  if (input.merchantName) name = input.merchantName.slice(0, 25);

  out.push(tlv("00", PAYLOAD_FORMAT));
  out.push(tlv("01", PI_DYNAMIC));
  if (merchantAccount) out.push(tlv("26", merchantAccount));
  const mcc = findTlv(tlvs, "52") ?? DEFAULT_MCC;
  out.push(tlv("52", mcc.slice(0, 4)));
  out.push(tlv("53", CURRENCY_IDR));
  out.push(tlv("54", formatQrisAmount(input.amount)));
  out.push(tlv("58", COUNTRY_ID));
  if (name) out.push(tlv("59", name));
  if (city) out.push(tlv("60", city));
  const postal = findTlv(tlvs, "61");
  if (postal) out.push(tlv("61", postal.slice(0, 10)));
  out.push(buildAdditionalData(input.reference));

  const body = out.join("");
  return body + tlv("63", crc16(body));
}

/** Validasi CRC payload QRIS — true jika checksum cocok. */
export function verifyQris(payload: string): boolean {
  if (payload.length < 8) return false;
  // Tag 63: "63" (2) + length (2) + CRC hex (4) = 8 karakter
  const crcTag = payload.slice(-8);
  if (crcTag.slice(0, 2) !== "63") return false;
  const body = payload.slice(0, -8);
  const given = crcTag.slice(4);
  return crc16(body) === given;
}
