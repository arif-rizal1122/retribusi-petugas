import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Store,
  Printer,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Search,
  Receipt,
  UserCheck,
  Building2,
  ShoppingBag,
  Lock,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  marketOfficerService,
  MarketBuildingItem,
  MarketStallItem,
  MarketOfficerAssignmentItem,
} from '../services/marketOfficerService';
import { thermalPrintService, MarketReceiptData } from '../services/ThermalPrintService';

export default function PasarDisperindagPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'karcis' | 'los' | 'kios' | 'petugas'>('karcis');

  // Master Data State
  const [selectedMarket, setSelectedMarket] = useState<string>('PASAR WAMEO');
  const [buildings, setBuildings] = useState<MarketBuildingItem[]>([]);
  const [officers, setOfficers] = useState<MarketOfficerAssignmentItem[]>([]);
  const [stats, setStats] = useState<{
    today_tickets_count: number;
    today_tickets_amount: number;
    assignment: MarketOfficerAssignmentItem | null;
  }>({ today_tickets_count: 0, today_tickets_amount: 0, assignment: null });

  // TAB 1: Karcis Cepat PKL State
  const [ticketQty, setTicketQty] = useState<number>(1);
  const ticketUnitAmount = 1000;
  const [ticketMerchant, setTicketMerchant] = useState<string>('');
  const [ticketBuilding, setTicketBuilding] = useState<string>('Pelataran PKL Subuh');
  const [ticketPaymentMethod, setTicketPaymentMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [issuingTicket, setIssuingTicket] = useState<boolean>(false);
  const [latestTicket, setLatestTicket] = useState<any>(null);

  // TAB 2 & 3: Stalls State
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [stalls, setStalls] = useState<MarketStallItem[]>([]);
  const [loadingStalls, setLoadingStalls] = useState<boolean>(false);
  const [stallSearch, setStallSearch] = useState<string>('');

  // Payment Modal State
  const [selectedStallForPay, setSelectedStallForPay] = useState<MarketStallItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [payPeriod, setPayPeriod] = useState<string>('');
  const [processingPay, setProcessingPay] = useState<boolean>(false);

  // Bluetooth Printer Connection State
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);

  // Load initial metadata
  const loadInitialData = useCallback(async () => {
    try {
      const [bList, oList, sData] = await Promise.all([
        marketOfficerService.getBuildings(selectedMarket),
        marketOfficerService.getOfficers(),
        marketOfficerService.getOfficerStats(),
      ]);
      setBuildings(bList);
      setOfficers(oList);
      setStats(sData);

      // Default selected building if any
      if (bList.length > 0 && !selectedBuilding) {
        setSelectedBuilding(bList[0].building_name);
      }
    } catch (err) {
      console.error('Failed loading market officer data', err);
      toast.error('Gagal memuat data gedung & penugasan');
    }
  }, [selectedMarket]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filter buildings by tab stall_type
  const currentBuildings = useMemo(() => {
    if (activeTab === 'los') {
      return buildings.filter((b) => b.stall_type === 'los');
    }
    if (activeTab === 'kios') {
      return buildings.filter((b) => b.stall_type === 'kios');
    }
    return buildings;
  }, [buildings, activeTab]);

  // Sync selected building when switching tabs
  useEffect(() => {
    if (currentBuildings.length > 0) {
      if (!currentBuildings.some((b) => b.building_name === selectedBuilding)) {
        setSelectedBuilding(currentBuildings[0].building_name);
      }
    }
  }, [currentBuildings, selectedBuilding]);

  // Load Stalls when selected building or tab changes
  const loadStalls = useCallback(async () => {
    if (!selectedBuilding && activeTab !== 'karcis' && activeTab !== 'petugas') return;
    try {
      setLoadingStalls(true);
      const stallType = activeTab === 'los' ? 'los' : activeTab === 'kios' ? 'kios' : undefined;
      const res = await marketOfficerService.getStalls({
        market_name: selectedMarket,
        building_name: selectedBuilding || undefined,
        stall_type: stallType,
        search: stallSearch || undefined,
        all: true,
      });
      setStalls(res.items);
    } catch (err) {
      console.error('Failed loading stalls', err);
      toast.error('Gagal memuat unit lapak');
    } finally {
      setLoadingStalls(false);
    }
  }, [selectedMarket, selectedBuilding, activeTab, stallSearch]);

  useEffect(() => {
    if (activeTab === 'los' || activeTab === 'kios') {
      loadStalls();
    }
  }, [loadStalls, activeTab]);

  // Connect Bluetooth Printer
  const handleConnectPrinter = async () => {
    try {
      const ok = await thermalPrintService.connect();
      if (ok) {
        setIsPrinterConnected(true);
        toast.success('Printer Bluetooth terhubung!');
      }
    } catch (err: any) {
      console.error('Printer connection failed', err);
      toast.error('Gagal menghubungkan printer bluetooth');
    }
  };

  // Cetak Struk Karcis Harian
  const handlePrintDailyTicket = async (ticket: any) => {
    try {
      const receiptData: MarketReceiptData = {
        ticket_code: ticket.ticket_code,
        market_name: ticket.market_name,
        building_name: ticket.building_name,
        stall_type: 'pelataran',
        merchant_name: ticket.merchant_name,
        amount: Number(ticket.total_amount),
        payment_method: ticket.payment_method,
        datetime: new Date(ticket.issued_at || ticket.created_at).toLocaleString('id-ID'),
        officer_name: user?.name || 'Petugas Pasar Disperindag',
      };
      await thermalPrintService.print(receiptData);
      toast.success('Struk berhasil dicetak!');
    } catch (err) {
      console.warn('Cetak gagal, buka dialog cetak browser jika mobile native belum pairing', err);
      toast.error('Printer belum terhubung via Bluetooth.');
    }
  };

  // Submit Karcis Harian PKL
  const handleIssueTicket = async () => {
    try {
      setIssuingTicket(true);
      const res = await marketOfficerService.issueDailyTicket({
        market_name: selectedMarket,
        building_name: ticketBuilding,
        merchant_name: ticketMerchant || 'Pedagang PKL',
        quantity: ticketQty,
        unit_amount: ticketUnitAmount,
        payment_method: ticketPaymentMethod,
      });

      setLatestTicket(res);
      toast.success(`Karcis ${res.ticket_code} berhasil diterbitkan!`);

      // Auto print if printer connected
      if (isPrinterConnected) {
        await handlePrintDailyTicket(res);
      }

      // Refresh stats
      const newStats = await marketOfficerService.getOfficerStats();
      setStats(newStats);

      // Reset merchant field
      setTicketMerchant('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan karcis');
    } finally {
      setIssuingTicket(false);
    }
  };

  // Open Pay Stall Modal
  const handleOpenPayModal = (stall: MarketStallItem) => {
    setSelectedStallForPay(stall);
    setPayAmount(Number(stall.tariff_amount) || (stall.stall_type === 'kios' ? 3000000 : 40000));
    setPayPeriod(stall.billing_cycle === 'yearly' ? `${new Date().getFullYear()}` : `${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`);
  };

  // Submit Pay Stall
  const handleSubmitPayStall = async () => {
    if (!selectedStallForPay) return;
    try {
      setProcessingPay(true);
      const res = await marketOfficerService.payStall(selectedStallForPay.id, {
        amount: payAmount,
        payment_method: payMethod,
        period: payPeriod,
      });

      toast.success(`Setoran lapak ${selectedStallForPay.full_code} berhasil dicatat!`);

      // Auto print receipt
      try {
        const receiptData: MarketReceiptData = {
          ticket_code: res.ntpd || `SSRD-${selectedStallForPay.full_code}`,
          ntpd: res.ntpd,
          market_name: selectedStallForPay.market_name,
          building_name: selectedStallForPay.building_name,
          stall_number: selectedStallForPay.stall_number,
          stall_type: selectedStallForPay.stall_type,
          merchant_name: selectedStallForPay.merchant_name || 'Wajib Retribusi',
          amount: payAmount,
          payment_method: payMethod,
          period: payPeriod,
          datetime: new Date().toLocaleString('id-ID'),
          officer_name: user?.name || 'Petugas Pasar Disperindag',
        };
        await thermalPrintService.print(receiptData);
      } catch (printErr) {
        console.warn('Printer tidak siap:', printErr);
      }

      setSelectedStallForPay(null);
      loadStalls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setProcessingPay(false);
    }
  };

  // Toggle Seal Stall
  const handleToggleSeal = async (stall: MarketStallItem) => {
    const nextStatus = stall.status === 'tersegel' ? 'aktif' : 'tersegel';
    const confirmMsg =
      nextStatus === 'tersegel'
        ? `Apakah Anda yakin ingin MENYEGEL unit ${stall.full_code} karena tunggakan?`
        : `Buka segel unit ${stall.full_code}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await marketOfficerService.updateStallStatus(stall.id, nextStatus, nextStatus === 'tersegel' ? 'Disegel Petugas Lapangan' : 'Segel Dibuka');
      toast.success(`Status unit ${stall.full_code} berhasil diubah menjadi ${nextStatus.toUpperCase()}`);
      loadStalls();
    } catch (err) {
      toast.error('Gagal memperbarui status segel');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white px-4 pt-5 pb-6 shadow-md">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Store size={22} className="text-emerald-200" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight">Pos Pasar Disperindag</h1>
                <p className="text-[11px] text-emerald-200 font-medium">
                  Petugas: <span className="font-bold text-white">{user?.name}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectPrinter}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isPrinterConnected
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/15 text-emerald-100 hover:bg-white/25 border border-white/20'
              }`}
            >
              <Printer size={14} />
              <span>{isPrinterConnected ? 'Printer Aktif' : 'Sambung Printer'}</span>
            </button>
          </div>

          {/* Pasar Selector Pills */}
          <div className="mt-4 flex items-center gap-2">
            {['PASAR WAMEO', 'PASAR KARYA BARU'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMarket(m)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedMarket === m
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20 border border-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Quick Metrics KPI */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <div className="text-[10px] uppercase font-black text-emerald-200 tracking-wider">
                Karcis Hari Ini
              </div>
              <div className="text-lg font-black text-white mt-0.5">
                {stats.today_tickets_count} <span className="text-xs font-normal text-emerald-200">lbr</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
              <div className="text-[10px] uppercase font-black text-emerald-200 tracking-wider">
                Total Setoran Hari Ini
              </div>
              <div className="text-lg font-black text-white mt-0.5">
                Rp {Number(stats.today_tickets_amount).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-4 -mt-2">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700 flex gap-1">
          <button
            onClick={() => setActiveTab('karcis')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'karcis'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Receipt size={14} />
            <span>Karcis PKL</span>
          </button>
          <button
            onClick={() => setActiveTab('los')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'los'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Los Bulanan</span>
          </button>
          <button
            onClick={() => setActiveTab('kios')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'kios'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 size={14} />
            <span>Kios Sewa</span>
          </button>
          <button
            onClick={() => setActiveTab('petugas')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'petugas'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck size={14} />
            <span>SK Petugas</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        {/* TAB 1: KARCIS CEPAT PKL */}
        {activeTab === 'karcis' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
                  <Receipt className="text-emerald-600" size={18} />
                  <span>Karcis Harian Pedagang Subuh / PKL</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Perda No. 1/2024
                </span>
              </div>

              {/* Preset Quantities */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Jumlah Lembar Karcis
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setTicketQty(qty)}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        ticketQty === qty
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {qty} Karcis
                      <div className="text-[10px] font-medium opacity-80">
                        Rp {(qty * ticketUnitAmount).toLocaleString('id-ID')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lokasi PKL & Nama Pedagang (Opsional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Titik Pelataran / Blok
                  </label>
                  <input
                    type="text"
                    value={ticketBuilding}
                    onChange={(e) => setTicketBuilding(e.target.value)}
                    placeholder="Contoh: Pelataran Subuh, Depan Los A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Pedagang (Opsional)
                  </label>
                  <input
                    type="text"
                    value={ticketMerchant}
                    onChange={(e) => setTicketMerchant(e.target.value)}
                    placeholder="Nama pedagang / jenis jualan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTicketPaymentMethod('TUNAI')}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      ticketPaymentMethod === 'TUNAI'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>💵 Tunai Langsung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketPaymentMethod('QRIS')}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      ticketPaymentMethod === 'QRIS'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>QRIS Dinamis</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={issuingTicket}
                onClick={handleIssueTicket}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Printer size={16} />
                <span>
                  {issuingTicket
                    ? 'Menerbitkan Karcis...'
                    : `Cetak Karcis SSRD (Rp ${(ticketQty * ticketUnitAmount).toLocaleString('id-ID')})`}
                </span>
              </button>
            </div>

            {/* Latest Issued Ticket Preview */}
            {latestTicket && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      Karcis Terbit: {latestTicket.ticket_code}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {latestTicket.quantity} lembar • Rp {Number(latestTicket.total_amount).toLocaleString('id-ID')} • {latestTicket.payment_method}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Lokasi: {latestTicket.market_name} ({latestTicket.building_name})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintDailyTicket(latestTicket)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Cetak Ulang</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2 & 3: LOS BULANAN & KIOS TAHUNAN */}
        {(activeTab === 'los' || activeTab === 'kios') && (
          <div className="space-y-4">
            {/* Building Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Building2 size={15} className="text-emerald-600" />
                  <span>Pilih Gedung / Blok {activeTab === 'los' ? 'Los' : 'Kios'}</span>
                </label>
                <button
                  type="button"
                  onClick={loadStalls}
                  className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingStalls ? 'animate-spin' : ''} />
                  <span>Segarkan</span>
                </button>
              </div>

              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
              >
                {currentBuildings.map((b, idx) => (
                  <option key={idx} value={b.building_name}>
                    {b.building_name} ({b.active_units}/{b.total_units} Unit Aktif) • Rp {Number(b.sample_tariff).toLocaleString('id-ID')} / {b.billing_cycle === 'yearly' ? 'thn' : 'bln'}
                  </option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari nomor unit / nama pedagang di ${selectedBuilding}...`}
                  value={stallSearch}
                  onChange={(e) => setStallSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Stalls Grid / List */}
            {loadingStalls ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-emerald-600" />
                <span>Memuat daftar unit lapak...</span>
              </div>
            ) : stalls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stalls.map((stall) => (
                  <div
                    key={stall.id}
                    className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Unit {stall.stall_number}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            stall.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : stall.status === 'tersegel'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {stall.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        {stall.merchant_name || <span className="text-slate-400 italic">Belum terdata</span>}
                      </div>

                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        Rp {Number(stall.tariff_amount).toLocaleString('id-ID')} / {stall.billing_cycle === 'yearly' ? 'tahun' : 'bulan'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleOpenPayModal(stall)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Receipt size={12} />
                        <span>Terima Setoran</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSeal(stall)}
                        title={stall.status === 'tersegel' ? 'Buka Segel' : 'Segel Unit'}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          stall.status === 'tersegel'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {stall.status === 'tersegel' ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                Tidak ada unit lapak ditemukan pada filter ini.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SK PENUGASAN 43 PETUGAS */}
        {activeTab === 'petugas' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
                  <UserCheck className="text-emerald-600" size={18} />
                  <span>Daftar 43 Petugas Penagih Pasar (SK Disperindag)</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">
                  Total: {officers.length} Petugas
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                {officers.map((off) => (
                  <div key={off.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{off.officer_name}</span>
                        {off.collects_daily_pkl && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Pungut PKL
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Pasar: <strong className="text-slate-700 dark:text-slate-300">{off.market_name}</strong>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex flex-wrap gap-1">
                        {Array.isArray(off.assigned_areas) &&
                          off.assigned_areas.map((area, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px]"
                            >
                              {area}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL BAYAR LAPAK */}
      {selectedStallForPay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Terima Setoran Lapak
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStallForPay.building_name} • Unit {selectedStallForPay.stall_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStallForPay(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nama Pedagang
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedStallForPay.merchant_name || 'Wajib Retribusi'}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Periode Tagihan
                </label>
                <input
                  type="text"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="Contoh: September 2026 / Tahun 2026"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Metode Bayar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['TUNAI', 'QRIS'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        payMethod === m
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStallForPay(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingPay}
                onClick={handleSubmitPayStall}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Printer size={14} />
                <span>{processingPay ? 'Menyimpan...' : 'Simpan & Cetak Struk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
