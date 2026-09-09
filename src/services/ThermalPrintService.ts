export interface ReceiptData {
    billNumber: string;
    name: string;
    objectName: string;
    amount: number;
    penalty: number;
    total: number;
    date: string;
    period: string;
}

export interface PbbReceiptData {
    nop: string;
    tahun: string;
    namaWp: string;
    alamatOp: string;
    amount: number;
    penalty: number;
    total: number;
    ntpd: string;
    date: string;
}

export interface TpiReceiptItem {
    name: string;
    qtyDetail?: string;
    rateText?: string;
    subtotal: number;
}

export interface TpiReceiptData {
    transactionCode: string;
    ntpd: string;
    date: string;
    location: string;
    officerName: string;
    shipName: string;
    shipGt: number;
    buyerName: string;
    volumeKg: number;
    auctionValueRp: number;
    facilities: TpiReceiptItem[];
    auctionFeeRp: number;
    total: number;
    paymentMethod: string;
    bankRef?: string;
}


class ThermalPrintService {
    private device: any = null;
    private characteristic: any = null;

    /**
     * Generates a text-based receipt compatible with most 58mm thermal printers.
     */
    generateReceiptText(data: ReceiptData): string {
        const separator = "--------------------------------\n";
        const header = "      BAPENDA KOTA BAUBAU      \n" +
            "      PENERIMAAN DAERAH        \n" +
            separator;

        const body = `BUKTI BAYAR : ${data.billNumber}\n` +
            `TANGGAL     : ${data.date}\n` +
            `NAMA        : ${data.name}\n` +
            `OBJEK       : ${data.objectName}\n` +
            `MASA/PERIODE: ${data.period}\n` +
            separator +
            `POKOK       : Rp ${data.amount.toLocaleString('id-ID')}\n` +
            `DENDA       : Rp ${data.penalty.toLocaleString('id-ID')}\n` +
            separator +
            `TOTAL       : Rp ${data.total.toLocaleString('id-ID')}\n` +
            separator;

        const footer = "  Simpan bukti ini sebagai      \n" +
            "  tanda terima resmi (SSPD).    \n" +
            "      Terima Kasih              \n\n\n\n";

        return header + body + footer;
    }

    /**
     * Generates a PBB-specific receipt.
     */
    generatePbbReceiptText(data: PbbReceiptData): string {
        const separator = "--------------------------------\n";
        const header = "      BAPENDA KOTA BAUBAU      \n" +
            "      STRUK PEMBAYARAN PBB     \n" +
            separator;

        const body = `NTPD        : ${data.ntpd}\n` +
            `TANGGAL     : ${data.date}\n` +
            `NOP         : ${data.nop}\n` +
            `TAHUN       : ${data.tahun}\n` +
            `NAMA WP     : ${data.namaWp}\n` +
            `ALAMAT OP   : ${data.alamatOp}\n` +
            separator +
            `POKOK       : Rp ${data.amount.toLocaleString('id-ID')}\n` +
            `DENDA       : Rp ${data.penalty.toLocaleString('id-ID')}\n` +
            separator +
            `TOTAL       : Rp ${data.total.toLocaleString('id-ID')}\n` +
            separator;

        const footer = "  Simpan bukti ini sebagai      \n" +
            "  tanda terima resmi (SSPD).    \n" +
            "      Terima Kasih              \n\n\n\n";

        return header + body + footer;
    }

    /**
     * Connects to a Bluetooth Thermal Printer using Web Bluetooth API.
     */
    async connect() {
        if (!(navigator as any).bluetooth) {
            throw new Error("Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge di Android.");
        }

        try {
            // Standard GATT service for many thermal printers
            // const serviceId = 0xFF00; // Common for many ESC/POS printers, or 0x18F0

            this.device = await (navigator as any).bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
            }).catch(() => {
                // Fallback for generic printers
                return (navigator as any).bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
                });
            });

            if (!this.device || !this.device.gatt) return false;

            const server = await this.device.gatt.connect();
            const services = await server.getPrimaryServices();

            // Try to find a writable characteristic
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        this.characteristic = char;
                        break;
                    }
                }
                if (this.characteristic) break;
            }

            return !!this.characteristic;
        } catch (error) {
            console.error("Bluetooth connection failed:", error);
            throw error;
        }
    }

    /**
     * Sends receipt data to the connected printer.
    /**
     * Generates a TPI (Tempat Pelelangan Ikan) specific receipt according to Dokumen (173).
     */
    generateTpiReceiptText(data: TpiReceiptData): string {
        const separator = "--------------------------------\n";
        const doubleSep = "================================\n";

        const header = doubleSep +
            "     PEMERINTAH KOTA BAUBAU     \n" +
            "    BADAN PENDAPATAN DAERAH     \n" +
            "        DINAS PERIKANAN         \n" +
            doubleSep +
            " BUKTI PEMBAYARAN RETRIBUSI TPI \n" +
            "      (SISTEM M-PAD BAUBAU)     \n" +
            doubleSep;

        const info = `No. Trans : ${data.transactionCode}\n` +
            `No. NTPD  : ${data.ntpd}\n` +
            `Tgl/Waktu : ${data.date}\n` +
            `Lokasi    : ${data.location}\n` +
            `Petugas   : ${data.officerName}\n` +
            separator +
            "DATA SUBJEK & OBJEK RETRIBUSI:\n" +
            `Kapal/GT  : ${data.shipName} / ${data.shipGt} GT\n` +
            `Bakul/Plg : ${data.buyerName}\n` +
            `Vol Lelang: ${data.volumeKg.toLocaleString('id-ID')} Kg\n` +
            `Nilai Trx : Rp ${data.auctionValueRp.toLocaleString('id-ID')}\n` +
            separator +
            "RINCIAN RETRIBUSI DAERAH:\n";

        let itemsText = "";
        for (const f of data.facilities) {
            itemsText += `- ${f.name}${f.qtyDetail ? ` (${f.qtyDetail})` : ""}\n`;
            if (f.rateText) {
                itemsText += `  ${f.rateText}\n`;
            }
            itemsText += `  Subtotal: Rp ${f.subtotal.toLocaleString('id-ID')}\n`;
        }

        if (data.auctionFeeRp > 0) {
            itemsText += `- Jasa Lelang TPI (1%)\n` +
                `  1% x Rp ${data.auctionValueRp.toLocaleString('id-ID')}\n` +
                `  Subtotal: Rp ${data.auctionFeeRp.toLocaleString('id-ID')}\n`;
        }

        const totalSection = separator +
            `TOTAL RETRIBUSI: Rp ${data.total.toLocaleString('id-ID')}\n` +
            separator +
            `Metode Bayar   : ${data.paymentMethod}\n` +
            `Bank/Kanal     : Bank Sultra / RKUD\n` +
            `No. Ref        : ${data.bankRef || "-"}\n` +
            `STATUS         : LUNAS / SAH\n` +
            separator +
            "     [ QR CODE VERIFIKASI ]     \n" +
            " (Scan Cek Keabsahan NTPD Kasda)\n" +
            ` validasi.mpad.baubaukota.go.id \n` +
            separator +
            " Pembayaran sah berdasarkan PERDA\n" +
            " Pajak & Retribusi Daerah (PDRD)\n" +
            "          Kota Baubau           \n" +
            " -- Simpan Struk Sebagai Bukti --\n" +
            doubleSep + "\n\n\n";

        return header + info + itemsText + totalSection;
    }

    /**
     * Sends receipt data to the connected printer.
     */
    async print(data: ReceiptData | PbbReceiptData | TpiReceiptData) {
        try {
            if (!this.characteristic) {
                const connected = await this.connect();
                if (!connected) throw new Error("Could not find a writable Bluetooth characteristic.");
            }

            let text = "";
            if ('transactionCode' in data) {
                text = this.generateTpiReceiptText(data as TpiReceiptData);
            } else if ('nop' in data) {
                text = this.generatePbbReceiptText(data as PbbReceiptData);
            } else {
                text = this.generateReceiptText(data as ReceiptData);
            }

            const encoder = new TextEncoder();
            const bytes = encoder.encode(text);

            // Send in chunks to avoid buffer overflow on small printers (standard 20 bytes for BLE)
            const chunkSize = 20;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.slice(i, i + chunkSize);
                await this.characteristic.writeValue(chunk);
            }

            return true;
        } catch (error) {
            console.error("Print failed:", error);
            this.characteristic = null; // Reset for retry
            throw error;
        }
    }
}

export const thermalPrintService = new ThermalPrintService();
