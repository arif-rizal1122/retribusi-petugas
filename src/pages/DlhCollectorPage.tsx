import { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Store,
  Home,
  Receipt,
  Printer,
  Send,
  Building2,
  CheckCircle2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  dlhCollectorService,
  DlhHoldingBalance,
  DlhMarketTicket,
  DlhTrashCalculationResult,
} from '../services/dlhCollectorService';
import { thermalPrintService, DlhReceiptData } from '../services/ThermalPrintService';

const MARKET_LIST = [
  'Pasar Karya Nugraha',
  'Pasar Wameo',
  'Pasar Laelangi',
  'Pasar Baruga',
  'Kawasan Sentra Kuliner Kotamara',
  'Pasar Tradisional Lainnya',
];

const BUILDING_CATEGORIES = [
  { key: 'SOSIAL_IBADAH', label: 'Sosial / Rumah Ibadah / Panti', desc: 'Tarif Rp 0 (Pembebasan)', badge: 'Gratis' },
  { key: 'RUMAH_SEDERHANA', label: 'Rumah Tinggal Sederhana (< Tipe 36)', desc: 'Tarif bersubsidi Pemkot', badge: 'Subsidi' },
  { key: 'RUMAH_MENENGAH', label: 'Rumah Tinggal Menengah / Mewah', desc: 'Tarif standar permukiman', badge: 'Standar' },
  { key: 'RUKO_NIAGA', label: 'Ruko / Usaha Dagang / Jasa', desc: 'Tarif kawasan niaga kota', badge: 'Komersial' },
  { key: 'RESTORAN', label: 'Restoran / Rumah Makan / Kafe', desc: 'Volume sampah menengah-tinggi', badge: 'Khusus' },
  { key: 'PASAR', label: 'Kios / Los di Lingkungan Pasar', desc: 'Tarif retribusi komersial pasar', badge: 'Pasar' },
  { key: 'INDUSTRI', label: 'Pergudangan / Industri / Hotel', desc: 'Volume sampah besar', badge: 'Tinggi' },
];

export default function DlhCollectorPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pasar' | 'kelurahan'>('pasar');

  // ---------- TAB 1: PASAR HARIAN STATE ----------
  const [selectedMarket, setSelectedMarket] = useState(MARKET_LIST[0]);
  const [stallNumber, setStallNumber] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [ticketAmount, setTicketAmount] = useState<3000 | 6000>(3000);
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS_INSTANT'>('TUNAI');
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [latestTicket, setLatestTicket] = useState<DlhMarketTicket | null>(null);

  // Holding Balance State
  const [holdingData, setHoldingData] = useState<DlhHoldingBalance | null>(null);
  const [loadingHolding, setLoadingHolding] = useState(false);

  // Remittance Modal
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [remitAmount, setRemitAmount] = useState<number>(0);
  const [remitBankRef, setRemitBankRef] = useState('');
  const [remitNotes, setRemitNotes] = useState('');
  const [submittingRemit, setSubmittingRemit] = useState(false);

  // ---------- TAB 2: DOOR-TO-DOOR KELURAHAN STATE ----------
  const [selectedCategory, setSelectedCategory] = useState('RUMAH_SEDERHANA');
  const [statusHunian, setStatusHunian] = useState<'BERPENGHUNI' | 'KOSONG'>('BERPENGHUNI');
  const [calcResult, setCalcResult] = useState<DlhTrashCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Transfer Penghuni State
  const [transferObjectId, setTransferObjectId] = useState('');
  const [transferType, setTransferType] = useState<'PEMILIK' | 'PENYEWA'>('PENYEWA');
  const [transferName, setTransferName] = useState('');
  const [transferContact, setTransferContact] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Fetch Holding Balance
  const fetchHoldingBalance = useCallback(async () => {
    try {
      setLoadingHolding(true);
      const data = await dlhCollectorService.getHoldingBalance();
      setHoldingData(data);
      setRemitAmount(data.holding_balance || 0);
    } catch (err: any) {
      console.error('Gagal mengambil holding balance:', err);
    } finally {
      setLoadingHolding(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pasar') {
      fetchHoldingBalance();
    }
  }, [activeTab, fetchHoldingBalance]);

  // Issue Ticket
  const handleIssueTicket = async () => {
    try {
      setIssuingTicket(true);
      const ticket = await dlhCollectorService.issueMarketTicket({
        market_name: selectedMarket,
        stall_name_or_number: stallNumber.trim() || undefined,
        merchant_name: merchantName.trim() || undefined,
        amount: ticketAmount,
        payment_method: paymentMethod,
      });

      setLatestTicket(ticket);
      toast.success(`Karcis ${ticket.ticket_code} berhasil diterbitkan!`);
      // Reset form ringan
      setStallNumber('');
      setMerchantName('');
      fetchHoldingBalance();

      // Cetak otomatis jika metode TUNAI
      if (paymentMethod === 'TUNAI') {
        handlePrintReceipt(ticket);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan karcis pasar');
    } finally {
      setIssuingTicket(false);
    }
  };

  // Cetak struk via thermal Bluetooth
  const handlePrintReceipt = async (ticket: DlhMarketTicket) => {
    try {
      const receiptData: DlhReceiptData = {
        ticket_code: ticket.ticket_code,
        market_name: ticket.market_name,
        merchant_name: ticket.merchant_name || undefined,
        stall_number: ticket.stall_name_or_number || undefined,
        amount: ticket.amount,
        payment_method: ticket.payment_method,
        qr_token: ticket.qr_token,
        datetime: new Date(ticket.issued_at).toLocaleString('id-ID'),
        collector_name: user?.name || 'Juru Pungut Pasar DLH',
      };
      await thermalPrintService.print(receiptData);
      toast.success('Struk berhasil dicetak ke printer Bluetooth!');
    } catch (err: any) {
      console.warn('Printer tidak terhubung atau gagal cetak:', err);
      toast.error('Printer belum terhubung. Silakan hubungkan via menu Printer Thermal.');
    }
  };

  // Submit Remittance ke Kasda
  const handleSubmitRemittance = async () => {
    if (!remitAmount || remitAmount <= 0) {
      toast.error('Nominal setoran tidak valid.');
      return;
    }

    try {
      setSubmittingRemit(true);
      const now = new Date();
      await dlhCollectorService.submitRemittance({
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        remitted_amount: remitAmount,
        bank_reference_number: remitBankRef.trim() || undefined,
        notes: remitNotes.trim() || undefined,
      });

      toast.success('Setoran karcis pasar berhasil diserahkan ke Kasda!');
      setShowRemitModal(false);
      setRemitBankRef('');
      setRemitNotes('');
      fetchHoldingBalance();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyerahkan setoran');
    } finally {
      setSubmittingRemit(false);
    }
  };

  // Simulasi Tarif Door-to-Door
  const handleCalculateTariff = async () => {
    try {
      setCalculating(true);
      const res = await dlhCollectorService.calculateTariff({
        building_category: selectedCategory as any,
        status_hunian: statusHunian,
      });
      setCalcResult(res);
      toast.success('Tarif retribusi berhasil disimulasikan.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghitung tarif retribusi.');
    } finally {
      setCalculating(false);
    }
  };

  // Transfer Penghuni Persil
  const handleTransferOccupant = async () => {
    if (!transferObjectId.trim() || !transferName.trim()) {
      toast.error('ID Objek/Persil dan Nama Penanggung Jawab wajib diisi.');
      return;
    }

    try {
      setSubmittingTransfer(true);
      await dlhCollectorService.transferOccupant(transferObjectId.trim(), {
        tipe_penghuni: transferType,
        status_hunian: 'BERPENGHUNI',
        penanggung_jawab_nama: transferName.trim(),
        penanggung_jawab_kontak: transferContact.trim() || undefined,
      });

      toast.success('Data penghuni persil fisik berhasil diperbarui!');
      setTransferObjectId('');
      setTransferName('');
      setTransferContact('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui data persil.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                <Trash2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Pungutan Retribusi Persampahan DLH
                </h1>
                <p className="text-xs text-emerald-200">
                  Dinas Lingkungan Hidup Kota Baubau • Perda No. 1 Tahun 2024
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-300/30 rounded-full text-[11px] font-black uppercase tracking-wider text-emerald-100">
              Satu Pintu M-PAD
            </span>
          </div>

          {/* DUAL-MODE TABS */}
          <div className="mt-5 grid grid-cols-2 gap-2 p-1.5 bg-black/25 backdrop-blur-md rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('pasar')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'pasar'
                  ? 'bg-white text-emerald-950 shadow-md scale-[1.01]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Store className="w-4 h-4" />
              Mode Pasar Harian (Karcis)
            </button>
            <button
              onClick={() => setActiveTab('kelurahan')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'kelurahan'
                  ? 'bg-white text-emerald-950 shadow-md scale-[1.01]'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              Mode Kelurahan (Door-to-Door)
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE A: PASAR HARIAN (KARCIS & KLIRING SETORAN AKHIR BULAN) */}
      {/* ========================================================================= */}
      {activeTab === 'pasar' && (
        <div className="space-y-6">
          {/* HOLDING BALANCE SUMMARY CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
                  Temporary Holding Ledger (Buku Penampungan Juru Pungut)
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  Saldo Karcis Belum Disetor ke Kasda
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchHoldingBalance}
                  disabled={loadingHolding}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Muat Ulang Saldo"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHolding ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowRemitModal(true)}
                  disabled={(holdingData?.holding_balance || 0) <= 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Setor ke Kasda (Bank Sultra)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Total Saldo Pegang</p>
                <p className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  Rp {(holdingData?.holding_balance || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Karcis Beredar</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {holdingData?.unremitted_ticket_count || 0} Lembar
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Karcis Rp 3.000</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {holdingData?.tickets_summary?.karcis_3000 || 0} unit
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Karcis Rp 6.000</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {holdingData?.tickets_summary?.karcis_6000 || 0} unit
                </p>
              </div>
            </div>
          </div>

          {/* QUICK ISSUE TICKET FORM */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Penerbitan Karcis Sampah Pasar (Quick-Tap)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Lokasi Pasar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lokasi Pasar
                </label>
                <select
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {MARKET_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lapak & Pedagang */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    No. Lapak / Kios (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: B-12"
                    value={stallNumber}
                    onChange={(e) => setStallNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Pedagang (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ibu Rahma"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* PILIH NOMINAL TARIF KARCIS */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Jenis & Tarif Karcis (Perda 1/2024)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTicketAmount(3000)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    ticketAmount === 3000
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    Kategori Lapak Standar
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    Rp 3.000
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lapak meja, emperan kering, pedagang sayur/buah kecil
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketAmount(6000)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    ticketAmount === 6000
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    Kategori Kios / Los Basah
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    Rp 6.000
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kios permanen, los ikan/daging basah, warung makan pasar
                  </p>
                </button>
              </div>
            </div>

            {/* METODE BAYAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TUNAI')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    paymentMethod === 'TUNAI'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  💵 Pembayaran Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS_INSTANT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    paymentMethod === 'QRIS_INSTANT'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  📱 QRIS Instan
                </button>
              </div>

              <button
                onClick={handleIssueTicket}
                disabled={issuingTicket}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/30 transition scale-[1.02] active:scale-[0.98]"
              >
                {issuingTicket ? (
                  <>Menerbitkan Karcis...</>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Terbitkan Karcis (Rp {ticketAmount.toLocaleString('id-ID')})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LATEST TICKET PREVIEW CARD */}
          {latestTicket && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Karcis Terakhir Berhasil Terbit
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {latestTicket.ticket_code} — Rp {latestTicket.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {latestTicket.market_name} • {new Date(latestTicket.issued_at).toLocaleTimeString('id-ID')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handlePrintReceipt(latestTicket)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                Cetak Ulang Struk
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: DOOR-TO-DOOR KELURAHAN (PROPERTY-CENTRIC TAGIHAN PERSAMPAHAN) */}
      {/* ========================================================================= */}
      {activeTab === 'kelurahan' && (
        <div className="space-y-6">
          {/* SIMULATOR TARIF BULANAN BERDASARKAN KATEGORI */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
                  Kalkulator Tarif Baku Sesuai Perda 1/2024
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Simulasi Retribusi Sampah Persil Bangunan
                </h3>
              </div>
              <span className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kategori Bangunan Fisik
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {BUILDING_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({c.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Status Hunian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusHunian('BERPENGHUNI')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      statusHunian === 'BERPENGHUNI'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Berpenghuni (Aktif)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusHunian('KOSONG')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      statusHunian === 'KOSONG'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Rumah Kosong (Rp 0)
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCalculateTariff}
              disabled={calculating}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {calculating ? 'Menghitung...' : 'Hitung Tarif Baku Persil'}
            </button>

            {calcResult && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Hasil Tarif Bulanan (e-SKRD)
                  </span>
                  <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                    Rp {calcResult.monthly_amount.toLocaleString('id-ID')} / bulan
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jatuh tempo setiap tanggal {calcResult.due_day_of_month} • Denda {calcResult.penalty_rate}
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                  Terkunci Perda 1/2024
                </span>
              </div>
            )}
          </div>

          {/* FORM TRANSFER PENANGGUNG JAWAB PERSIL (GANTI PENYEWA / PEMILIK) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Transfer Penanggung Jawab Persil Bangunan
                </h3>
                <p className="text-xs text-slate-500">
                  Update penghuni ruko/rumah saat penyewa berganti tanpa menghilangkan riwayat piutang fisik persil
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ID Objek Pajak / Kode Persil Fisik
                </label>
                <input
                  type="text"
                  placeholder="Contoh ID: 104 atau Kode Persil Bangunan"
                  value={transferObjectId}
                  onChange={(e) => setTransferObjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Hubungan
                  </label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PENYEWA">Penyewa / Pengontrak Baru</option>
                    <option value="PEMILIK">Pemilik Baru</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Kontak/WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812xxxx"
                    value={transferContact}
                    onChange={(e) => setTransferContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Penanggung Jawab Baru
                </label>
                <input
                  type="text"
                  placeholder="Nama individu atau pengelola usaha baru"
                  value={transferName}
                  onChange={(e) => setTransferName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleTransferOccupant}
                disabled={submittingTransfer}
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                {submittingTransfer ? 'Memproses...' : 'Simpan Pembaruan Penghuni'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SETOR KE RKUD KASDA (BANK SULTRA) */}
      {/* ========================================================================= */}
      {showRemitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600">
                <Send className="w-5 h-5" />
                <h3 className="font-black text-slate-900 dark:text-white">
                  Setor Kasda (Bank Sultra)
                </h3>
              </div>
              <button
                onClick={() => setShowRemitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Tutup
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Menyerahkan akumulasi saldo karcis harian yang dipegang juru pungut ke Rekening Kas Umum Daerah (RKUD).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nominal Setoran (Rp)
              </label>
              <input
                type="number"
                value={remitAmount}
                onChange={(e) => setRemitAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Bukti / Referensi Slip Bank Sultra
              </label>
              <input
                type="text"
                placeholder="Contoh: BPD-SLT-992102"
                value={remitBankRef}
                onChange={(e) => setRemitBankRef(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Setoran (Opsional)
              </label>
              <textarea
                placeholder="Catatan penyerahan..."
                value={remitNotes}
                onChange={(e) => setRemitNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRemitModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitRemittance}
                disabled={submittingRemit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition"
              >
                {submittingRemit ? 'Memproses Setoran...' : 'Konfirmasi Setor Kasda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
