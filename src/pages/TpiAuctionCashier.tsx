import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  Ship, 
  Fish, 
  Scale, 
  CheckCircle2, 
  Printer, 
  QrCode, 
  Banknote, 
  Clock, 
  MapPin, 
  Zap, 
  RotateCcw, 
  Calendar 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { thermalPrintService, TpiReceiptData } from '../services/ThermalPrintService';
import api from '../lib/api';

interface FacilityItem {
  id: string;
  name: string;
  checked: boolean;
  qty: number;
  unit: string;
  rate: number;
  multiplier?: number; // e.g., days for mooring
  multiplierUnit?: string;
}

export default function TpiAuctionCashier() {
  // Seksi 1: Header Transaksi
  const [kodeTpi, setKodeTpi] = useState('TPI-WM-NEW');
  const [shipName, setShipName] = useState('');
  const [shipGt, setShipGt] = useState<number>(0);
  const [nomorKusuka, setNomorKusuka] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerNikNib, setBuyerNikNib] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));

  // Seksi 2: Fasilitas Terpakai
  const [facilities, setFacilities] = useState<FacilityItem[]>([
    { id: 'TAMBAT_LABUH', name: 'Jasa Tambat Labuh Dermaga', checked: false, qty: 1, unit: 'GT', rate: 1000, multiplier: 1, multiplierUnit: 'Hari' },
    { id: 'SEWA_MEJA', name: 'Sewa Meja Lelang Higienis', checked: true, qty: 1, unit: 'Unit', rate: 15000 },
    { id: 'SEWA_TIMBANGAN', name: 'Sewa Timbangan Tertera', checked: true, qty: 1, unit: 'Unit', rate: 10000 },
    { id: 'ES_CURAH', name: 'Pasokan Es Curah / Balok', checked: false, qty: 1, unit: 'Ton', rate: 50000 },
    { id: 'PARKIR_TRUK', name: 'Parkir Truk Pendingin / Pick-up', checked: false, qty: 1, unit: 'Unit', rate: 20000 },
  ]);

  // Seksi 3: Output Lelang & Pembayaran
  const [volumeKg, setVolumeKg] = useState<number>(0);
  const [auctionValueRp, setAuctionValueRp] = useState<number>(0);
  const [metodeBayar, setMetodeBayar] = useState<'QRIS' | 'TUNAI_OFFICER' | 'VA_BANK'>('QRIS');
  const [submitting, setSubmitting] = useState(false);

  // Hasil Transaksi
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update kapal GT ke fasilitas tambat labuh
  useEffect(() => {
    if (shipGt > 0) {
      setFacilities(prev => prev.map(f => f.id === 'TAMBAT_LABUH' ? { ...f, qty: shipGt } : f));
    }
  }, [shipGt]);

  // Kalkulasi Biaya Fasilitas
  const calculateFacilitySubtotal = (f: FacilityItem) => {
    if (!f.checked) return 0;
    const mult = f.multiplier && f.multiplier > 0 ? f.multiplier : 1;
    return f.qty * mult * f.rate;
  };

  const totalFacilityCost = facilities.reduce((sum, f) => sum + calculateFacilitySubtotal(f), 0);
  const auctionFee1Percent = Math.round(auctionValueRp * 0.01);
  const grandTotal = totalFacilityCost + auctionFee1Percent;

  // Toggle Checkbox Fasilitas
  const toggleFacility = (id: string) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, checked: !f.checked } : f));
  };

  // Update Nilai Fasilitas
  const updateFacilityField = (id: string, field: 'qty' | 'multiplier' | 'rate', val: number) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  // Skenario 1: Transaksi Skala Besar (KM Sinar Laut 15 GT & H. Aris)
  const applyScenario1 = () => {
    setKodeTpi('TPI-WM-NEW');
    setShipName('KM Sinar Laut');
    setShipGt(15);
    setNomorKusuka('KKP-SULTRA-882910');
    setBuyerName('H. Aris (PT Laut Murni)');
    setBuyerNikNib('7472010892010002');
    setVolumeKg(2500);
    setAuctionValueRp(50000000);
    setMetodeBayar('QRIS');
    setFacilities([
      { id: 'TAMBAT_LABUH', name: 'Jasa Tambat Labuh Dermaga', checked: true, qty: 15, unit: 'GT', rate: 1000, multiplier: 2, multiplierUnit: 'Hari' },
      { id: 'SEWA_MEJA', name: 'Sewa Meja Lelang Higienis', checked: true, qty: 4, unit: 'Unit', rate: 15000 },
      { id: 'SEWA_TIMBANGAN', name: 'Sewa Timbangan Tertera', checked: true, qty: 2, unit: 'Unit', rate: 10000 },
      { id: 'ES_CURAH', name: 'Pasokan Es Curah / Balok', checked: true, qty: 1.5, unit: 'Ton', rate: 50000 },
      { id: 'PARKIR_TRUK', name: 'Parkir Truk Pendingin / Pick-up', checked: true, qty: 1, unit: 'Unit', rate: 20000 },
    ]);
    toast.success('Skenario 1 dimuat: Kapal Motor 15 GT (Total Rp 705.000)');
  };

  // Skenario 2: Nelayan Tradisional (Katinting Pak La Ode 1 GT & Mama Wa Ode)
  const applyScenario2 = () => {
    setKodeTpi('TPI-WM-OLD');
    setShipName('Perahu Katinting Pak La Ode');
    setShipGt(1);
    setNomorKusuka('NEL-TRAD-0012');
    setBuyerName('Mama Wa Ode (Papalele)');
    setBuyerNikNib('7472014902830001');
    setVolumeKg(80);
    setAuctionValueRp(1600000);
    setMetodeBayar('TUNAI_OFFICER');
    setFacilities([
      { id: 'TAMBAT_LABUH', name: 'Jasa Tambat Labuh Dermaga', checked: false, qty: 1, unit: 'GT', rate: 1000, multiplier: 1, multiplierUnit: 'Hari' },
      { id: 'SEWA_MEJA', name: 'Sewa Meja Lelang Higienis', checked: true, qty: 1, unit: 'Unit', rate: 15000 },
      { id: 'SEWA_TIMBANGAN', name: 'Sewa Timbangan Tertera', checked: true, qty: 1, unit: 'Unit', rate: 10000 },
      { id: 'ES_CURAH', name: 'Pasokan Es Curah / Balok', checked: false, qty: 0, unit: 'Ton', rate: 50000 },
      { id: 'PARKIR_TRUK', name: 'Parkir Truk Pendingin / Pick-up', checked: false, qty: 0, unit: 'Unit', rate: 20000 },
    ]);
    toast.success('Skenario 2 dimuat: Nelayan Tradisional 1 GT (Total Rp 41.000)');
  };

  // Reset Form
  const resetForm = () => {
    setShipName('');
    setShipGt(0);
    setNomorKusuka('');
    setBuyerName('');
    setBuyerNikNib('');
    setVolumeKg(0);
    setAuctionValueRp(0);
    setFacilities(prev => prev.map(f => ({ ...f, checked: f.id === 'SEWA_MEJA' || f.id === 'SEWA_TIMBANGAN', qty: 1 })));
  };

  // Submit Transaksi ke Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipName.trim()) {
      toast.error('Nama Kapal / Perahu wajib diisi');
      return;
    }
    if (!buyerName.trim()) {
      toast.error('Nama Pembeli / Bakul wajib diisi');
      return;
    }
    if (volumeKg <= 0) {
      toast.error('Total volume lelang (Kg) wajib diisi');
      return;
    }
    if (auctionValueRp <= 0) {
      toast.error('Nilai transaksi lelang (Rp) wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const payloadFacilities = facilities.filter(f => f.checked).map(f => ({
        jenis_fasilitas: f.id,
        qty: f.qty * (f.multiplier || 1),
        satuan: f.unit,
        tarif_satuan: f.rate,
        subtotal: calculateFacilitySubtotal(f),
      }));

      const res = await api.post('/api/tpi/transactions', {
        kode_tpi: kodeTpi,
        kapal_nama: shipName,
        kapal_gt: shipGt,
        nomor_kusuka: nomorKusuka,
        bakul_nama: buyerName,
        bakul_nik_nib: buyerNikNib,
        volume_lelang_kg: volumeKg,
        nilai_transaksi_lelang: auctionValueRp,
        metode_bayar: metodeBayar,
        fasilitas: payloadFacilities,
      });

      if (res.data.success) {
        setCompletedTransaction(res.data.data.transaksi);
        setIsModalOpen(true);
        toast.success(res.data.message || 'Transaksi TPI berhasil dicatat!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi TPI.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cetak Struk Bluetooth Thermal 58mm
  const handlePrintReceipt = async () => {
    if (!completedTransaction) return;
    setIsPrinting(true);
    try {
      const receiptData: TpiReceiptData = {
        transactionCode: completedTransaction.kode_transaksi || 'TPI-WM/2026/0001',
        ntpd: completedTransaction.ntpd || '882026090809301501',
        date: new Date(completedTransaction.waktu_transaksi).toLocaleString('id-ID'),
        location: kodeTpi === 'TPI-WM-NEW' ? 'TPI Wameo Baru (PPI)' : kodeTpi === 'TPI-WM-OLD' ? 'TPI Wameo Tradisional' : 'TPI Bima',
        officerName: 'Petugas Pos TPI',
        shipName: completedTransaction.kapal_nama,
        shipGt: Number(completedTransaction.kapal_gt),
        buyerName: completedTransaction.bakul_nama,
        volumeKg: Number(completedTransaction.volume_lelang_kg),
        auctionValueRp: Number(completedTransaction.nilai_transaksi_lelang),
        facilities: (completedTransaction.rincian_fasilitas || []).map((rf: any) => ({
          name: rf.jenis_fasilitas.replace('_', ' '),
          qtyDetail: `${rf.qty} ${rf.satuan}`,
          rateText: `@ Rp ${Number(rf.tarif_satuan).toLocaleString('id-ID')}`,
          subtotal: Number(rf.subtotal),
        })),
        auctionFeeRp: Number(completedTransaction.retribusi_lelang_persen),
        total: Number(completedTransaction.total_retribusi),
        paymentMethod: completedTransaction.metode_bayar,
        bankRef: completedTransaction.bank_ref,
      };

      await thermalPrintService.print(receiptData);
      toast.success('Struk resmi TPI berhasil dicetak ke thermal printer!');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mencetak struk: ' + (err.message || 'Printer tidak merespon.'));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Fish className="w-8 h-8 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest bg-sky-400/20 px-2.5 py-0.5 rounded-full font-semibold border border-sky-300/30">
                  Dinas Perikanan
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                  Perda 1/2024
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">Smart Cashier Pelelangan Ikan (TPI)</h1>
              <p className="text-xs sm:text-sm text-sky-100/80">
                Pencatatan lelang terpadu, sewa fasilitas fisik, struk thermal ber-NTPD, & uji silang PBJT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 self-stretch md:self-auto justify-between md:justify-start">
            <Clock className="w-4 h-4 text-sky-300" />
            <span className="text-sm font-mono font-bold tracking-wider">{currentTime} WITA</span>
          </div>
        </div>

        {/* Action Preset Skenario */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-sky-200 flex items-center gap-1.5 mr-1">
            <Zap className="w-3.5 h-3.5 text-yellow-300" /> Simulasi Cepat:
          </span>
          <button
            type="button"
            onClick={applyScenario1}
            className="text-xs bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white px-3 py-1.5 rounded-xl font-medium border border-white/20 flex items-center gap-1.5"
          >
            <Ship className="w-3.5 h-3.5" /> Skenario 1 (KM Sinar Laut 15 GT)
          </button>
          <button
            type="button"
            onClick={applyScenario2}
            className="text-xs bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white px-3 py-1.5 rounded-xl font-medium border border-white/20 flex items-center gap-1.5"
          >
            <Anchor className="w-3.5 h-3.5" /> Skenario 2 (Katinting Tradisional 1 GT)
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs text-sky-200 hover:text-white px-2 py-1.5 ml-auto flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEKSI 1: HEADER & IDENTITAS TRANSAKSI */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-black text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Header & Identitas Transaksi
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Dokumen 172 Seksi 1</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Lokasi TPI (Geofenced GPS)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <select
                  value={kodeTpi}
                  onChange={(e) => setKodeTpi(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="TPI-WM-NEW">TPI Wameo Baru (PPI Higienis / Dermaga Modern)</option>
                  <option value="TPI-WM-OLD">TPI Wameo Lama (Pesisir Tradisional Katinting)</option>
                  <option value="TPI-BIMA">TPI Bima (Pendaratan Ikan Timur)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Waktu Transaksi (Server Datetime)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={`${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} - ${currentTime}`}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Subjek 1: Kapal / Nelayan */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ship className="w-4 h-4" /> Identitas Kapal & Nelayan
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  Wajib
                </span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Kapal / Perahu</label>
                <input
                  type="text"
                  placeholder="Contoh: KM Sinar Laut / Perahu Katinting"
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Ukuran Kapal (GT)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Contoh: 15"
                    value={shipGt || ''}
                    onChange={(e) => setShipGt(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">No. KUSUKA / Lambung</label>
                  <input
                    type="text"
                    placeholder="Nomor KUSUKA KKP"
                    value={nomorKusuka}
                    onChange={(e) => setNomorKusuka(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Subjek 2: Pembeli / Bakul */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Fish className="w-4 h-4" /> Identitas Bakul / Pembeli
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  Wajib
                </span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama Pembeli / Bakul / PT</label>
                <input
                  type="text"
                  placeholder="Contoh: H. Aris / Mama Wa Ode"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">NIK / NIB Pedagang (Bapenda Sync)</label>
                <input
                  type="text"
                  placeholder="NIK 16 Digit atau NIB OSS"
                  value={buyerNikNib}
                  onChange={(e) => setBuyerNikNib(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEKSI 2: MATRIKS RINCIAN FASILITAS FISIK TPI */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-black text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fasilitas Fisik Terpakai (Perda 1/2024 Lampiran II b)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Interlock Validasi</span>
          </div>

          <div className="space-y-3">
            {facilities.map((f) => (
              <div 
                key={f.id}
                className={`p-4 rounded-2xl border transition-all ${
                  f.checked 
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-700/50 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`chk-${f.id}`}
                      checked={f.checked}
                      onChange={() => toggleFacility(f.id)}
                      className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor={`chk-${f.id}`} className="font-bold text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
                      {f.name}
                    </label>
                  </div>

                  {/* Input Angka Qty & Subtotal */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step={f.id === 'ES_CURAH' ? '0.1' : '1'}
                        disabled={!f.checked}
                        value={f.checked ? f.qty : ''}
                        onChange={(e) => updateFacilityField(f.id, 'qty', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-center text-slate-900 dark:text-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-slate-500 font-medium w-12">{f.unit}</span>
                    </div>

                    {f.multiplierUnit && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">×</span>
                        <input
                          type="number"
                          min="1"
                          disabled={!f.checked}
                          value={f.checked ? (f.multiplier || 1) : ''}
                          onChange={(e) => updateFacilityField(f.id, 'multiplier', parseInt(e.target.value) || 1)}
                          className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-center text-slate-900 dark:text-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-slate-500 font-medium">{f.multiplierUnit}</span>
                      </div>
                    )}

                    <div className="min-w-[120px] text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                      Rp {calculateFacilitySubtotal(f).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">
            <span>Subtotal Fasilitas Fisik:</span>
            <span className="font-mono text-base text-blue-600 dark:text-blue-400">
              Rp {totalFacilityCost.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* SEKSI 3: HASIL TRANSAKSI LELANG & PAYMENT */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 font-black text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Hasil Transaksi Lelang & Kanal Pembayaran
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Dokumen 172 Seksi 3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Total Volume Ikan Lelang (Kg)
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Contoh: 2500"
                  value={volumeKg || ''}
                  onChange={(e) => setVolumeKg(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk statistik perikanan & cross-PBJT Bapenda</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nilai Total Transaksi Lelang (Rp)
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Contoh: 50000000"
                  value={auctionValueRp || ''}
                  onChange={(e) => setAuctionValueRp(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                Jasa Lelang 1%: Rp {auctionFee1Percent.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Rangkuman Total Terutang */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                Total Retribusi TPI Terutang
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1">
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-indigo-200/70">
                Fasilitas Rp {totalFacilityCost.toLocaleString('id-ID')} + Lelang 1% Rp {auctionFee1Percent.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Kanal Pembayaran Selection */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMetodeBayar('QRIS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  metodeBayar === 'QRIS'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> QRIS Dinamis
              </button>
              <button
                type="button"
                onClick={() => setMetodeBayar('TUNAI_OFFICER')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  metodeBayar === 'TUNAI_OFFICER'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" /> Kasir Tunai T+0
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || grandTotal <= 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>Memproses Transaksi & NTPD...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> Proses Pembayaran & Terbitkan Bukti Sah (NTPD)
              </>
            )}
          </button>
        </div>
      </form>

      {/* MODAL BUKTI PEMBAYARAN SAH (DOKUMEN 173) */}
      {isModalOpen && completedTransaction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 my-auto max-h-[88vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-black">Transaksi TPI Berhasil!</h3>
              <p className="text-xs text-emerald-100">
                Nomor NTPD resmi Kasda telah diterbitkan secara sah
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Transaksi</span>
                  <span className="font-bold text-slate-900 dark:text-white">{completedTransaction.kode_transaksi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nomor NTPD</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{completedTransaction.ntpd || 'MENUNGGU-BAYAR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kapal / GT</span>
                  <span>{completedTransaction.kapal_nama} ({completedTransaction.kapal_gt} GT)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bakul / Pembeli</span>
                  <span>{completedTransaction.bakul_nama}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
                  <span>TOTAL RETRIBUSI</span>
                  <span className="text-blue-600 dark:text-blue-400 text-sm">
                    Rp {Number(completedTransaction.total_retribusi).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Metode Bayar</span>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-sans font-bold">
                    {completedTransaction.metode_bayar}
                  </span>
                </div>
              </div>

              {/* QR Verification Link */}
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700">
                <QrCode className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 block">Validasi Keabsahan Kasda Online:</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 break-all font-sans font-semibold">
                  validasi.mpad.baubaukota.go.id/tpi/{completedTransaction.ntpd}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                disabled={isPrinting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> {isPrinting ? 'Mencetak...' : 'Cetak Struk Thermal (58mm)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-xs hover:bg-slate-300"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
