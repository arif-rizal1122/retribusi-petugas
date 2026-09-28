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
  X,
  MapPin,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useGps } from '../contexts/GpsContext';
import {
  marketOfficerService,
  MarketBuildingItem,
  MarketStallItem,
  MarketOfficerAssignmentItem,
} from '../services/marketOfficerService';
import { thermalPrintService, MarketReceiptData } from '../services/ThermalPrintService';
import SearchableSelect, { Option } from '../components/SearchableSelect';

export default function PasarDisperindagPage() {
  const { user } = useAuth();
  const { location: gpsLoc, gpsStatus, requestGpsPermission } = useGps();
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

  // SK Petugas Modal & Filter State
  const [showOfficersModal, setShowOfficersModal] = useState<boolean>(false);
  const [officerSearchQuery, setOfficerSearchQuery] = useState<string>('');
  const [officerMarketFilter, setOfficerMarketFilter] = useState<string>('ALL');

  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      const matchMarket =
        officerMarketFilter === 'ALL' ||
        off.market_name.toUpperCase().includes(officerMarketFilter);
      if (!matchMarket) return false;
      if (!officerSearchQuery.trim()) return true;
      const q = officerSearchQuery.toLowerCase();
      const matchName = off.officer_name.toLowerCase().includes(q);
      const matchAreas =
        Array.isArray(off.assigned_areas) &&
        off.assigned_areas.some((a) => a.toLowerCase().includes(q));
      return matchName || matchAreas;
    });
  }, [officers, officerMarketFilter, officerSearchQuery]);

  // TAB 1: Hitungan Ukuran Lapak Pelataran (Perda 1/2024: Rp 1.000 / 3 m²)
  const STALL_SIZE_OPTIONS: Option[] = useMemo(() => [
    {
      id: '1',
      label: '1 Petak Standar',
      subLabel: 'Hamparan / Meja Portabel (1,5 m × 2,0 m)',
      badge: '3 m²',
      rightText: 'Rp 1.000 / hari',
    },
    {
      id: '2',
      label: '2 Petak',
      subLabel: 'Hamparan / Meja Ganda (3,0 m × 2,0 m)',
      badge: '6 m²',
      rightText: 'Rp 2.000 / hari',
    },
    {
      id: '3',
      label: '3 Petak',
      subLabel: 'Area Lapak Sedang (4,5 m × 2,0 m)',
      badge: '9 m²',
      rightText: 'Rp 3.000 / hari',
    },
    {
      id: '4',
      label: '4 Petak',
      subLabel: 'Area Lapak Luas (6,0 m × 2,0 m)',
      badge: '12 m²',
      rightText: 'Rp 4.000 / hari',
    },
    {
      id: '5',
      label: '5 Petak',
      subLabel: 'Area Lapak Ekstra Luas (7,5 m × 2,0 m)',
      badge: '15 m²',
      rightText: 'Rp 5.000 / hari',
    },
    {
      id: 'custom',
      label: 'Ukuran Lainnya (Ketik Petak / Luas)',
      subLabel: 'Hitung otomatis kelipatan 3 m² sesuai Perda 1/2024',
      badge: 'Kustom',
      rightText: 'Atur Petak...',
    },
  ], []);

  const [stallSizeOption, setStallSizeOption] = useState<string>('1');
  const [customUnits, setCustomUnits] = useState<number>(5);

  const unitsCount = useMemo(() => {
    if (stallSizeOption === 'custom') {
      return Math.max(1, customUnits);
    }
    return Math.max(1, parseInt(stallSizeOption) || 1);
  }, [stallSizeOption, customUnits]);

  const calculatedAreaM2 = unitsCount * 3;
  const calculatedDimensions = useMemo(() => {
    if (unitsCount === 1) return '1,5 m × 2,0 m (3 m²)';
    if (unitsCount === 2) return '3,0 m × 2,0 m (6 m²)';
    if (unitsCount === 3) return '4,5 m × 2,0 m (9 m²)';
    if (unitsCount === 4) return '6,0 m × 2,0 m (12 m²)';
    if (unitsCount === 5) return '7,5 m × 2,0 m (15 m²)';
    return `${unitsCount} petak — ${(unitsCount * 1.5).toLocaleString('id-ID', { maximumFractionDigits: 1 })} m × 2,0 m (${calculatedAreaM2} m²)`;
  }, [unitsCount, calculatedAreaM2]);

  const calculatedTotalAmount = unitsCount * 1000;
  const [ticketMerchant, setTicketMerchant] = useState<string>('');
  const [ticketBuilding, setTicketBuilding] = useState<string>('Pelataran PKL Subuh');
  const [ticketPaymentMethod, setTicketPaymentMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [issuingTicket, setIssuingTicket] = useState<boolean>(false);
  const [latestTicket, setLatestTicket] = useState<any>(null);
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);

  // Dynamic Pelataran Quick Chips (Zero-Friction < 5 Detik)
  const dynamicPelataranChips = useMemo(() => {
    const list = ['Pelataran PKL Subuh', 'Depan Los A', 'Depan Los B', 'Depan Los C', 'Pelataran Ikan', 'Pelataran Sayur'];
    if (stats.assignment?.assigned_areas) {
      stats.assignment.assigned_areas.forEach((area) => {
        const cleaned = area.replace(/^\d+\.\s*/, '').trim();
        if (cleaned && !list.includes(cleaned) && !cleaned.toLowerCase().includes('petugas')) {
          list.push(cleaned);
        }
      });
    }
    return list;
  }, [stats.assignment]);

  const pelataranOptions: Option[] = useMemo(() => {
    return [
      ...dynamicPelataranChips.map((opt) => ({
        id: opt,
        label: opt,
        subLabel: selectedMarket,
        badge: 'Blok Titik',
      })),
      {
        id: '__custom__',
        label: '+ Ketik Lokasi Pelataran Lainnya...',
        subLabel: 'Input titik pasar manual',
        badge: 'Manual',
      },
    ];
  }, [dynamicPelataranChips, selectedMarket]);

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

  const buildingOptions: Option[] = useMemo(() => {
    return currentBuildings.map((b) => ({
      id: b.building_name,
      label: b.building_name,
      subLabel: `${b.active_units}/${b.total_units} Unit Aktif`,
      badge: b.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan',
      rightText: `Rp ${Number(b.sample_tariff).toLocaleString('id-ID')} / ${b.billing_cycle === 'yearly' ? 'thn' : 'bln'}`,
    }));
  }, [currentBuildings]);

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
    if (!gpsLoc || gpsStatus !== 'active') {
      toast.error('Lokasi GPS belum terkunci. Petugas wajib mengaktifkan GPS sebelum menerbitkan karcis.');
      await requestGpsPermission();
      return;
    }

    try {
      setIssuingTicket(true);
      const buildingDetail = `${ticketBuilding} [${calculatedDimensions}]`;
      const res = await marketOfficerService.issueDailyTicket({
        market_name: selectedMarket,
        building_name: buildingDetail,
        merchant_name: ticketMerchant || 'Pedagang Harian',
        quantity: unitsCount,
        area_sqm: calculatedAreaM2,
        dimensions: calculatedDimensions,
        unit_amount: 1000,
        payment_method: ticketPaymentMethod,
        latitude: gpsLoc.lat,
        longitude: gpsLoc.lng,
        accuracy: gpsLoc.accuracy,
      });

      setLatestTicket(res);
      toast.success(`Karcis ${res.ticket_code} berhasil diterbitkan!`);

      // If QRIS was selected, open QRIS modal for merchant to scan
      if (ticketPaymentMethod === 'QRIS') {
        setShowQrisModal(true);
      } else if (isPrinterConnected) {
        // Auto print if printer connected for cash
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
        latitude: gpsLoc?.lat,
        longitude: gpsLoc?.lng,
        accuracy: gpsLoc?.accuracy,
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

  // Render Officers List (Shared for Tab and Header Modal)
  const renderOfficersList = (isInsideModal = false) => (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            value={officerSearchQuery}
            onChange={(e) => setOfficerSearchQuery(e.target.value)}
            placeholder="Cari nama petugas atau area/blok..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {officerSearchQuery && (
            <button
              onClick={() => setOfficerSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          {['ALL', 'WAMEO', 'KARYA BARU'].map((filter) => (
            <button
              key={filter}
              onClick={() => setOfficerMarketFilter(filter)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                officerMarketFilter === filter
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {filter === 'ALL' ? 'Semua Pasar' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Officers List */}
      <div className={`divide-y divide-slate-100 dark:divide-slate-700 ${isInsideModal ? 'max-h-[55vh]' : 'max-h-[500px]'} overflow-y-auto pr-1`}>
        {filteredOfficers.length > 0 ? (
          filteredOfficers.map((off) => (
            <div key={off.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors">
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{off.officer_name}</span>
                  {off.collects_daily_pkl && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Pungut PKL
                    </span>
                  )}
                  {Boolean(user?.name && off.officer_name.toLowerCase().includes(user.name.toLowerCase())) && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Profil Anda
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
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-medium"
                      >
                        {area}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            Tidak ada petugas yang cocok dengan filter pencarian.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Header - Compact & Clean */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white px-4 pt-3 pb-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Row 1: Profile & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                <Store size={18} className="text-emerald-200" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black tracking-tight leading-none truncate">Pos Pasar</h1>
                <p className="text-[11px] text-emerald-200 font-medium truncate mt-0.5">
                  Petugas: <span className="font-bold text-white">{user?.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowOfficersModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 text-emerald-100 hover:bg-white/25 border border-white/20 active:scale-95 cursor-pointer"
                title="Daftar 8 Petugas Resmi SK Disperindag"
              >
                <UserCheck size={14} className="text-emerald-300" />
                <span className="hidden xs:inline text-[11px]">SK</span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {officers.length || 8}
                </span>
              </button>

              <button
                onClick={handleConnectPrinter}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isPrinterConnected
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/15 text-emerald-100 hover:bg-white/25 border border-white/20'
                }`}
                title={isPrinterConnected ? 'Printer Aktif' : 'Sambungkan Printer Bluetooth'}
              >
                <Printer size={14} />
                <span className="text-[11px]">{isPrinterConnected ? 'Aktif' : 'Printer'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Pasar Selector + Quick Metric */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg shrink-0">
              {['PASAR WAMEO', 'PASAR KARYA BARU'].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMarket(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                    selectedMarket === m
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  {m.replace('PASAR ', '')}
                </button>
              ))}
            </div>

            <div className="text-right truncate">
              <span className="text-[11px] font-black text-white bg-white/15 px-2.5 py-1 rounded-lg border border-white/15 whitespace-nowrap">
                {stats.today_tickets_count} lbr • Rp {Number(stats.today_tickets_amount).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - 3 Main Transaction Tabs (Clean & No Truncation) */}
      <div className="max-w-4xl mx-auto px-4 -mt-2">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('karcis')}
            className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'karcis'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Receipt size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Karcis PKL</span>
          </button>
          <button
            onClick={() => setActiveTab('los')}
            className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'los'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <ShoppingBag size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Los Bulanan</span>
          </button>
          <button
            onClick={() => setActiveTab('kios')}
            className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'kios'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Kios Sewa</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-4xl mx-auto px-4 mt-3">
        {/* TAB 1: KARCIS CEPAT PKL */}
        {activeTab === 'karcis' && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
                  <Receipt className="text-emerald-600" size={17} />
                  <span>Karcis Harian Pedagang Subuh / PKL</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Rp 1.000 / 3 m²
                </span>
              </div>

              {/* Form Input Sederhana & Responsif */}
              <div className="space-y-3">
                {/* Ukuran Lapak Pelataran (Perda No. 1/2024: Rp 1.000 / 3 m²) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Ukuran Lapak Pelataran
                  </label>

                  <SearchableSelect
                    options={STALL_SIZE_OPTIONS}
                    value={stallSizeOption}
                    onSelect={(val) => setStallSizeOption(val.toString())}
                    placeholder="Pilih Ukuran Lapak Pelataran"
                    themeColor="emerald"
                    size="sm"
                    showSearch={false}
                  />

                  {/* Input khusus bila ukuran lainnya / custom */}
                  {stallSizeOption === 'custom' && (
                    <div className="mt-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3 animate-fadeIn">
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-white">
                          Jumlah Petak: {customUnits} Petak
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                          {(customUnits * 1.5).toLocaleString('id-ID', { maximumFractionDigits: 1 })} m × 2,0 m (± {customUnits * 3} m²)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomUnits(Math.max(1, customUnits - 1))}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-xs active:scale-95 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={customUnits}
                          onChange={(e) => setCustomUnits(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-center font-black text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomUnits(customUnits + 1)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-xs active:scale-95 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Titik Pelataran / Blok Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Titik Pelataran / Blok Pasar
                  </label>
                  <SearchableSelect
                    options={pelataranOptions}
                    value={dynamicPelataranChips.includes(ticketBuilding) ? ticketBuilding : '__custom__'}
                    onSelect={(val) => {
                      if (val === '__custom__') {
                        setTicketBuilding('');
                      } else {
                        setTicketBuilding(val.toString());
                      }
                    }}
                    placeholder="Pilih Titik Pelataran / Blok"
                    themeColor="emerald"
                    size="sm"
                    showSearch={dynamicPelataranChips.length > 5}
                    searchPlaceholder="Cari lokasi pelataran..."
                  />

                  {(!dynamicPelataranChips.includes(ticketBuilding) || ticketBuilding === '') && (
                    <input
                      type="text"
                      value={ticketBuilding}
                      onChange={(e) => setTicketBuilding(e.target.value)}
                      placeholder="Tuliskan nama pelataran..."
                      className="mt-2 w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Kategori / Nama Pedagang */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Kategori / Nama Pedagang <span className="text-[10px] font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={ticketMerchant}
                    onChange={(e) => setTicketMerchant(e.target.value)}
                    placeholder="Pedagang Harian / Jenis jualan (opsional)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Metode Pembayaran Segmented */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketPaymentMethod('TUNAI')}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        ticketPaymentMethod === 'TUNAI'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>💵 Tunai Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketPaymentMethod('QRIS')}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        ticketPaymentMethod === 'QRIS'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <QrCode size={14} />
                      <span>QRIS Dinamis</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button & Strict GPS Enforcement */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                {!gpsLoc || gpsStatus !== 'active' ? (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={requestGpsPermission}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 animate-pulse"
                    >
                      <MapPin size={16} />
                      <span>Aktifkan GPS HP untuk Cetak Karcis</span>
                    </button>
                    <p className="text-[10px] text-rose-500 dark:text-rose-400 text-center font-bold">
                      ⚠️ Wajib GPS aktif: Koordinat satelit resmi dibutuhkan untuk validasi penugasan lapangan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={issuingTicket}
                      onClick={handleIssueTicket}
                      className={`w-full py-3.5 text-white rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98 ${
                        ticketPaymentMethod === 'QRIS'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      }`}
                    >
                      {ticketPaymentMethod === 'QRIS' ? <QrCode size={18} /> : <Printer size={18} />}
                      <span>
                        {issuingTicket
                          ? 'Menerbitkan Karcis...'
                          : ticketPaymentMethod === 'QRIS'
                          ? `Tampilkan QRIS SSRD (Rp ${calculatedTotalAmount.toLocaleString('id-ID')})`
                          : `Cetak Karcis SSRD (Rp ${calculatedTotalAmount.toLocaleString('id-ID')})`}
                      </span>
                    </button>
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>GPS Terkunci (±{gpsLoc.accuracy}m) • Siap Cetak</span>
                    </div>
                  </div>
                )}
              </div>
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
                <div className="flex items-center gap-1.5">
                  {latestTicket.payment_method === 'QRIS' && (
                    <button
                      type="button"
                      onClick={() => setShowQrisModal(true)}
                      className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-blue-700 cursor-pointer"
                    >
                      <QrCode size={13} />
                      <span>Lihat QR</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrintDailyTicket(latestTicket)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal QRIS Dinamis */}
            {showQrisModal && latestTicket && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 dark:border-slate-700 relative">
                  <button
                    onClick={() => setShowQrisModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      QRIS Standar Bank Indonesia
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pindai QRIS Pembayaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {latestTicket.market_name} • {latestTicket.building_name}
                  </p>

                  {/* QRIS SVG Render */}
                  <div className="my-4 p-3 bg-white rounded-2xl shadow-inner inline-block border-2 border-emerald-500/30">
                    <QRCodeSVG
                      value={latestTicket.qr_token || `https://sipanda.online/v/${latestTicket.ticket_code}`}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl mb-4 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-500">Nominal Retribusi</span>
                      <span className="text-lg font-black text-emerald-600">
                        Rp {(latestTicket.quantity * Number(latestTicket.unit_amount)).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Pedagang:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{latestTicket.merchant_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Kode: {latestTicket.ticket_code}</span>
                      <span>{latestTicket.quantity} Lembar Karcis</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handlePrintDailyTicket(latestTicket);
                        setShowQrisModal(false);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer size={16} />
                      <span>Konfirmasi Lunas & Cetak Struk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrisModal(false)}
                      className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
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

              <SearchableSelect
                options={buildingOptions}
                value={selectedBuilding}
                onSelect={(val) => setSelectedBuilding(val.toString())}
                placeholder="Pilih Blok / Bangunan Pasar"
                themeColor="emerald"
                size="sm"
                showSearch={currentBuildings.length > 5}
                searchPlaceholder="Cari bangunan pasar..."
              />

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
                  Total: {officers.length || 43} Petugas
                </span>
              </div>

              {renderOfficersList(false)}
            </div>
          </div>
        )}
      </div>

      {/* MODAL SK PENUGASAN 43 PETUGAS */}
      {showOfficersModal && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto pb-8 sm:pb-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    SK Penugasan Petugas Pasar
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Disperindag Kota Baubau • Total: {officers.length || 43} Petugas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficersModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {renderOfficersList(true)}
          </div>
        </div>
      )}

      {/* MODAL BAYAR LAPAK */}
      {selectedStallForPay && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto pb-8 sm:pb-5">
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
