import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Car,
  Bike,
  Banknote,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  Lock,
  ArrowRight,
  RefreshCw,
  X,
  History,
  AlertCircle,
  Wallet,
  Printer,
  ShieldCheck,
  PlusCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import {
  parkingService,
  ParkingLocation,
  ShiftSummaryData,
  JukirProfileData,
  ThermalPrintPayload,
  SpotCheckData,
} from '../services/parkingService';
import { injectQrisTransaction, buildQrisDynamic } from '../services/qrisService';
import { nextReference } from '../services/referralCounterService';

export default function ParkingQuickCashier() {
  // Tabs: 'cashier' | 'inspector'
  const [activeTab, setActiveTab] = useState<'cashier' | 'inspector'>('cashier');

  // State
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [shiftData, setShiftData] = useState<ShiftSummaryData | null>(null);
  const [jukirProfile, setJukirProfile] = useState<JukirProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [vehicleType, setVehicleType] = useState<'r2' | 'r4'>('r2');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [plateHint, setPlateHint] = useState('');

  // Top-Up Modal State
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [topupMethod, setTopupMethod] = useState<string>('qris');
  const [topupLoading, setTopupLoading] = useState(false);

  // Receipt Modal State (Thermal Bluetooth ESC/POS)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPayload, setReceiptPayload] = useState<ThermalPrintPayload | null>(null);

  // QRIS Modal State
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisPayload, setQrisPayload] = useState('');
  const [qrisRef, setQrisRef] = useState('');
  const [qrisAmount, setQrisAmount] = useState(0);

  // Shift Close Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingShift, setClosingShift] = useState(false);

  // Inspector Patrol State
  const [spotCheckLocId, setSpotCheckLocId] = useState<number | null>(null);
  const [physicalR2, setPhysicalR2] = useState<number>(15);
  const [physicalR4, setPhysicalR4] = useState<number>(5);
  const [spotCheckData, setSpotCheckData] = useState<SpotCheckData | null>(null);
  const [spotCheckLoading, setSpotCheckLoading] = useState(false);
  const [sanctionLoading, setSanctionLoading] = useState(false);

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [locs, summary, profile] = await Promise.all([
        parkingService.getLocations().catch(() => []),
        parkingService.getShiftSummary().catch(() => null),
        parkingService.getJukirProfile().catch(() => null),
      ]);
      setLocations(locs);
      setShiftData(summary);
      setJukirProfile(profile);

      const walletLocId = summary?.wallet?.parking_location_id;
      if (walletLocId) {
        setSelectedLocationId(walletLocId);
        const loc = locs.find((l) => l.id === walletLocId);
        if (loc) setSelectedLocation(loc);
      } else if (locs.length > 0) {
        setSelectedLocationId(locs[0].id);
        setSelectedLocation(locs[0]);
      }

      if (locs.length > 0 && !spotCheckLocId) {
        setSpotCheckLocId(locs[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data parkir');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Location Change
  const handleLocationSelect = (locId: number) => {
    setSelectedLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) setSelectedLocation(loc);
  };

  // Open Shift
  const handleOpenShift = async () => {
    if (!selectedLocationId) {
      toast.error('Pilih titik lokasi parkir terlebih dahulu');
      return;
    }
    try {
      setSubmitting(true);
      await parkingService.openShift(selectedLocationId);
      toast.success('Shift berhasil dibuka! Selamat bertugas.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuka shift');
    } finally {
      setSubmitting(false);
    }
  };

  // Close Shift
  const handleCloseShift = async () => {
    try {
      setClosingShift(true);
      await parkingService.closeShift();
      toast.success('Shift berhasil ditutup.');
      setShowCloseModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menutup shift');
    } finally {
      setClosingShift(false);
    }
  };

  // Handle Top-Up Deposit
  const handleTopup = async () => {
    try {
      setTopupLoading(true);
      await parkingService.topupDeposit(topupAmount, topupMethod);
      toast.success(`Top-up deposit Rp ${topupAmount.toLocaleString('id-ID')} berhasil!`, {
        icon: '💳',
      });
      setShowTopupModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal top-up deposit');
    } finally {
      setTopupLoading(false);
    }
  };

  // Record Transaction (Cash Pre-Paid vs QRIS)
  const handleRecordTransaction = async () => {
    if (!selectedLocation || !shiftData?.wallet || shiftData.wallet.shift_status !== 'open') {
      toast.error('Shift belum aktif');
      return;
    }

    const amount = vehicleType === 'r4' ? selectedLocation.rate_r4 : selectedLocation.rate_r2;

    if (paymentMethod === 'qris') {
      // Dynamic QRIS Generation
      const ref = nextReference();
      const basePayload = selectedLocation.base_qris_payload;

      let payload = '';
      if (basePayload) {
        payload = injectQrisTransaction(basePayload, {
          amount,
          reference: ref,
          merchantName: selectedLocation.name,
        });
      } else {
        payload = buildQrisDynamic({
          nmid: selectedLocation.nmid || 'ID1020021123456',
          merchantName: (selectedLocation.name || 'DISHUB BAUBAU').slice(0, 25),
          merchantCity: 'BAUBAU',
          mcc: '7523',
          amount,
          reference: ref,
        });
      }

      setQrisPayload(payload);
      setQrisRef(ref);
      setQrisAmount(amount);
      setShowQrisModal(true);
      return;
    }

    // Cash Payment — Quadruple-Lock Pre-paid Deposit Deduction (70% RKUD)
    try {
      setSubmitting(true);
      const res = await parkingService.recordPrepaidCash({
        parking_location_id: selectedLocation.id,
        vehicle_type: vehicleType,
        plate_hint: plateHint.trim() || undefined,
      });

      toast.success(
        `Tunai Rp ${amount.toLocaleString('id-ID')} dicatat! Deposit dipotong Rp ${res.data.deposit_deducted_rkud.toLocaleString('id-ID')}`,
        { icon: '🧾', duration: 3500 }
      );

      // Buka modal cetak struk thermal
      if (res.data.thermal_print_payload) {
        setReceiptPayload(res.data.thermal_print_payload);
        setShowReceiptModal(true);
      }

      setPlateHint('');
      await loadData();
    } catch (err: any) {
      if (err.response?.data?.code === 'INSUFFICIENT_DEPOSIT') {
        toast.error('Saldo deposit Anda tidak cukup! Silakan Top-Up kuota parkir.', {
          icon: '⚠️',
          duration: 4000,
        });
        setShowTopupModal(true);
      } else {
        toast.error(err.response?.data?.message || err.message || 'Gagal mencatat transaksi tunai');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm QRIS Transaction
  const handleConfirmQrisPayment = async () => {
    if (!selectedLocation) return;
    try {
      setSubmitting(true);
      await parkingService.recordSession({
        parking_location_id: selectedLocation.id,
        vehicle_type: vehicleType,
        payment_method: 'qris',
        plate_hint: plateHint.trim() || undefined,
        qris_reference: qrisRef,
      });

      toast.success(`QRIS Rp ${qrisAmount.toLocaleString('id-ID')} (${qrisRef}) berhasil!`, {
        icon: '📱',
        duration: 2500,
      });
      setShowQrisModal(false);
      setPlateHint('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan transaksi QRIS');
    } finally {
      setSubmitting(false);
    }
  };

  // Inspector: Run Spot Check
  const handleRunSpotCheck = async () => {
    if (!spotCheckLocId) return;
    try {
      setSpotCheckLoading(true);
      const res = await parkingService.getSpotCheck(spotCheckLocId, physicalR2, physicalR4);
      setSpotCheckData(res);
      toast.success('Audit rekonsiliasi fisik vs digital berhasil dihitung!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menjalankan spot-check');
    } finally {
      setSpotCheckLoading(false);
    }
  };

  // Inspector: Submit Sanction
  const handleSanction = async (type: string, reason: string) => {
    if (!spotCheckData?.active_jukir?.id) {
      toast.error('Tidak ada jukir aktif di titik ini');
      return;
    }
    try {
      setSanctionLoading(true);
      const res = await parkingService.submitSanction(spotCheckData.active_jukir.id, type, reason);
      toast.success(res.message || 'Sanksi berhasil diterapkan');
      await handleRunSpotCheck();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerapkan sanksi');
    } finally {
      setSanctionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0F2547]" />
        <p className="text-sm font-semibold">Memuat Kasir Parkir Quadruple-Lock...</p>
      </div>
    );
  }

  const isShiftOpen = shiftData?.wallet?.shift_status === 'open';
  const currentRateR2 = selectedLocation?.rate_r2 || 2000;
  const currentRateR4 = selectedLocation?.rate_r4 || 3000;
  const depositBalance = jukirProfile?.deposit_balance ?? 120000;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-28">
      {/* Tab Switcher: Kasir Jukir vs Mode Inspektur Patroli (Responsive & Modern) */}
      <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 sm:p-1.5 rounded-2xl gap-1 border border-slate-200/70 dark:border-slate-700/60 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('cashier')}
          className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 select-none ${
            activeTab === 'cashier'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Car className="w-4 h-4 shrink-0" />
          <span className="truncate sm:hidden">Kasir Jukir</span>
          <span className="hidden sm:inline truncate">Kasir Jukir (Pre-Paid)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('inspector');
            if (!spotCheckData) handleRunSpotCheck();
          }}
          className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 select-none ${
            activeTab === 'inspector'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="truncate sm:hidden">Patroli Sidak</span>
          <span className="hidden sm:inline truncate">Inspektur Patroli (Sidak)</span>
        </button>
      </div>

      {activeTab === 'cashier' ? (
        <>
          {/* Top Header Card */}
          <div className="bg-gradient-to-br from-[#0F2547] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
              <Car size={160} />
            </div>

            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-400 border border-white/10 shadow-inner">
                  <Car size={26} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                    Dishub Kota Baubau • Quadruple-Lock
                  </span>
                  <h1 className="text-xl font-black tracking-tight text-white">
                    Kasir Parkir Cepat
                  </h1>
                </div>
              </div>

              {isShiftOpen && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Lock size={13} />
                  Tutup Shift
                </button>
              )}
            </div>

            {/* Saldo Kuota Pre-Paid Jukir Card */}
            <div className="bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400/30 rounded-2xl p-3.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-200 block">
                    Saldo Kuota Tunai (Pre-paid)
                  </span>
                  <span className="text-lg font-black text-white">
                    Rp {depositBalance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <PlusCircle size={14} />
                Top-Up
              </button>
            </div>

            {/* Surat Tugas (ST) Info Badge */}
            <div className="flex items-center justify-between text-[11px] bg-white/5 rounded-xl px-3 py-2 border border-white/10 mb-3">
              <span className="text-slate-300 font-mono">
                {jukirProfile?.surat_tugas_no || 'ST.DISHUB/PKR/2026/014'}
              </span>
              <span className="text-emerald-300 font-bold">
                Masa Berlaku: {jukirProfile?.days_remaining ?? 120} Hari Lagi
              </span>
            </div>

            {/* Location & Status Bar */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <MapPin size={14} className="text-amber-400 shrink-0" />
                  <span className="font-bold truncate">
                    {selectedLocation?.name || 'Pilih Lokasi'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      isShiftOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-black uppercase tracking-wider text-[10px] text-white">
                    {isShiftOpen ? 'Shift Aktif' : 'Shift Tutup'}
                  </span>
                </div>
              </div>

              {isShiftOpen && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="bg-white/5 rounded-xl p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      Tunai (Disimpan)
                    </span>
                    <span className="text-sm font-black text-amber-300">
                      Rp {(shiftData?.summary.total_cash || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      QRIS (Kasda)
                    </span>
                    <span className="text-sm font-black text-sky-300">
                      Rp {(shiftData?.summary.total_qris || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      Kendaraan
                    </span>
                    <span className="text-sm font-black text-emerald-300">
                      {shiftData?.summary.total_sessions || 0} unit
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mode 1: Shift Belum Buka */}
          {!isShiftOpen ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Clock size={32} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Buka Shift Tugas Hari Ini
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Pilih ruas/titik parkir yang Anda jaga untuk memulai pencatatan transaksi retribusi kendaraan.
                </p>
              </div>

              <div className="text-left space-y-2 max-w-sm mx-auto pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Titik Lokasi Parkir:
                </label>
                <select
                  value={selectedLocationId || ''}
                  onChange={(e) => handleLocationSelect(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F2547] outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleOpenShift}
                disabled={submitting || !selectedLocationId}
                className="w-full max-w-sm mx-auto py-3.5 px-6 rounded-2xl bg-[#0F2547] hover:bg-[#1E3A8A] text-white font-black text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-[#0F2547]/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Mulai Buka Shift</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Mode 2: Shift Sedang Aktif (Quick Tap UI) */
            <div className="space-y-5">
              {/* Quick-Tap Cards: R2 vs R4 */}
              <div className="grid grid-cols-2 gap-4">
                {/* R2 - Motor */}
                <button
                  type="button"
                  onClick={() => setVehicleType('r2')}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    vehicleType === 'r2'
                      ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 shadow-lg shadow-amber-500/10 scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                      vehicleType === 'r2'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Bike size={30} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Roda 2 (Motor)
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Rp {currentRateR2.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Potong Kuota: Rp 1.400 (70%)
                  </span>
                  {vehicleType === 'r2' && (
                    <div className="absolute top-3 right-3 text-amber-500">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </button>

                {/* R4 - Mobil */}
                <button
                  type="button"
                  onClick={() => setVehicleType('r4')}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    vehicleType === 'r4'
                      ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/20 shadow-lg shadow-sky-500/10 scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                      vehicleType === 'r4'
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Car size={30} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Roda 4 (Mobil)
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    Rp {currentRateR4.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold mt-1">
                    Potong Kuota: Rp 2.100 (70%)
                  </span>
                  {vehicleType === 'r4' && (
                    <div className="absolute top-3 right-3 text-sky-500">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </button>
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                  Metode Pembayaran
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3.5 px-4 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Banknote size={18} />
                    <span>Tunai (Pre-paid)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`py-3.5 px-4 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <QrCode size={18} />
                    <span>QRIS Dinamis</span>
                  </button>
                </div>

                {/* Optional Plate Hint */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Plat Nomor (Opsional):
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Contoh: DT 1234 XX"
                    value={plateHint}
                    onChange={(e) => setPlateHint(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-[#0F2547] outline-none"
                  />
                </div>

                {/* Action Button */}
                <button
                  onClick={handleRecordTransaction}
                  disabled={submitting}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2.5 ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                  }`}
                >
                  {submitting ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : paymentMethod === 'cash' ? (
                    <>
                      <Printer size={20} />
                      <span>
                        Bayar Tunai & Cetak Struk (Rp{' '}
                        {(vehicleType === 'r4' ? currentRateR4 : currentRateR2).toLocaleString(
                          'id-ID'
                        )}
                        )
                      </span>
                    </>
                  ) : (
                    <>
                      <QrCode size={20} />
                      <span>
                        Tampilkan QRIS Rp{' '}
                        {(vehicleType === 'r4' ? currentRateR4 : currentRateR2).toLocaleString(
                          'id-ID'
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Shift Transaction History */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <History size={18} className="text-[#0F2547] dark:text-sky-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Riwayat Shift Ini ({shiftData?.sessions.length || 0})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Terakhir dicatat
                  </span>
                </div>

                {shiftData?.sessions && shiftData.sessions.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
                    {shiftData.sessions.slice(0, 10).map((sess) => (
                      <div
                        key={sess.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              sess.vehicle_type === 'r4'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {sess.vehicle_type === 'r4' ? <Car size={16} /> : <Bike size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <span>{sess.vehicle_type.toUpperCase()}</span>
                              {sess.plate_hint && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                  {sess.plate_hint}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(sess.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {sess.payment_method.toUpperCase()}
                              {sess.qris_reference ? ` (${sess.qris_reference})` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 dark:text-white">
                          Rp {Number(sess.amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-slate-400">
                    Belum ada transaksi di shift ini.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Mode Inspektur Patroli Lapangan (Sidak Fisik vs Digital) */
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  Dishub & Satpol PP Baubau
                </span>
                <h2 className="text-xl font-black">Patroli Sidak Lapangan</h2>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Modul inspeksi untuk membandingkan jumlah fisik kendaraan yang terparkir di lapangan dengan rekaman transaksi digital jukir. Mencegah kebocoran penerimaan tunai.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Search size={16} className="text-indigo-600" />
              <span>Input Hasil Hitung Fisik Lapangan</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Titik Parkir:
                </label>
                <select
                  value={spotCheckLocId || ''}
                  onChange={(e) => setSpotCheckLocId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Fisik Motor (R2):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={physicalR2}
                    onChange={(e) => setPhysicalR2(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Fisik Mobil (R4):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={physicalR4}
                    onChange={(e) => setPhysicalR4(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSpotCheck}
                disabled={spotCheckLoading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {spotCheckLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Rekonsiliasi Fisik vs Digital</span>
                  </>
                )}
              </button>
            </div>

            {spotCheckData && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Fisik Lapangan
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {spotCheckData.physical_observed_count.total} unit
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Record Digital
                    </span>
                    <span className="text-base font-black text-sky-600 dark:text-sky-400">
                      {spotCheckData.digital_active_count.total} unit
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl ${
                      spotCheckData.audit_result.risk_level === 'critical'
                        ? 'bg-rose-500/10 text-rose-600'
                        : spotCheckData.audit_result.risk_level === 'warning'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase block">Selisih</span>
                    <span className="text-base font-black">
                      +{spotCheckData.audit_result.discrepancy_units} (
                      {spotCheckData.audit_result.discrepancy_percent}%)
                    </span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
                    spotCheckData.audit_result.risk_level === 'critical'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                      : 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                  }`}
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase block mb-1">
                      Status: {spotCheckData.audit_result.risk_level.toUpperCase()}
                    </span>
                    <p>{spotCheckData.audit_result.recommendation}</p>
                    {spotCheckData.active_jukir && (
                      <p className="mt-1 font-bold">
                        Jukir Bertugas: {spotCheckData.active_jukir.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tombol Tindakan Sanksi */}
                {spotCheckData.audit_result.risk_level !== 'normal' && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black uppercase text-slate-500 block">
                      Tindakan Penegakan Sanksi:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          handleSanction('sp1_warning', 'Selisih fisik vs digital lapangan > 20%')
                        }
                        disabled={sanctionLoading}
                        className="py-2.5 px-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-xl uppercase"
                      >
                        SP1 Peringatan
                      </button>
                      <button
                        onClick={() =>
                          handleSanction('sp2_freeze_7days', 'Terindikasi terima tunai tanpa struk M-PAD')
                        }
                        disabled={sanctionLoading}
                        className="py-2.5 px-2 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black rounded-xl uppercase"
                      >
                        SP2 Bekukan 7 Hari
                      </button>
                      <button
                        onClick={() =>
                          handleSanction('sp3_revoke_st', 'Pelanggaran berat kebocoran tunai berulang')
                        }
                        disabled={sanctionLoading}
                        className="py-2.5 px-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl uppercase"
                      >
                        SP3 Cabut Izin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top-Up Deposit Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowTopupModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Top-Up Saldo Kuota Jukir
              </h3>
              <p className="text-xs text-slate-500">
                Isi saldo deposit untuk menerbitkan struk parkir tunai tanpa kebocoran.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[20000, 50000, 100000, 200000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => setTopupAmount(nominal)}
                    className={`py-3 px-3 rounded-2xl border-2 text-xs font-black transition-all ${
                      topupAmount === nominal
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Rp {nominal.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Metode Pembayaran:
                </label>
                <select
                  value={topupMethod}
                  onChange={(e) => setTopupMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="qris">QRIS Universal (BCA, Mandiri, Gopay, Dana)</option>
                  <option value="bank_sultra">Virtual Account Bank Sultra</option>
                  <option value="cash_dishub">Setor Tunai di Kantor Dishub</option>
                </select>
              </div>

              <button
                onClick={handleTopup}
                disabled={topupLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {topupLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Konfirmasi Isi Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Struk Thermal Mini Bluetooth Modal (ESC/POS 58mm) */}
      {showReceiptModal && receiptPayload && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative font-mono text-center border-4 border-slate-900">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900"
            >
              <X size={20} />
            </button>

            {/* Thermal Print Preview Container */}
            <div className="bg-slate-50 border border-dashed border-slate-400 p-4 rounded-xl space-y-2 text-left text-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <p className="font-black text-sm">{receiptPayload.header}</p>
                <p className="text-[10px] text-slate-600">{receiptPayload.sub_header}</p>
                <p className="text-[10px] font-bold mt-1">{receiptPayload.location_name}</p>
              </div>

              <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>No. Struk:</span>
                  <span className="font-bold">{receiptPayload.receipt_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{receiptPayload.datetime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kendaraan:</span>
                  <span className="font-bold">{receiptPayload.vehicle_type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plat:</span>
                  <span className="font-bold">{receiptPayload.plate_hint}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1">
                  <span>TARIF:</span>
                  <span>Rp {receiptPayload.amount_total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* QR Code Unique Struk untuk Klaim Hadiah Warga */}
              <div className="py-2 text-center">
                <div className="inline-block bg-white p-2 border border-slate-300 rounded-lg">
                  <QRCodeSVG value={receiptPayload.qr_verification_url} size={110} level="M" />
                </div>
                <p className="text-[9px] text-slate-500 mt-1 font-bold">
                  Token: {receiptPayload.receipt_no}
                </p>
              </div>

              <div className="text-center pt-1 border-t border-dashed border-slate-300 space-y-1">
                <p className="font-black text-[10px] text-rose-600">
                  {receiptPayload.footer_notice}
                </p>
                <p className="text-[9px] text-slate-500 leading-tight">
                  {receiptPayload.reward_notice}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="py-3 px-3 rounded-xl border border-slate-300 text-slate-700 font-sans font-bold text-xs uppercase"
              >
                Selesai
              </button>
              <button
                onClick={() => {
                  toast.success('Mencetak ke Bluetooth Thermal Printer (58mm)...', {
                    icon: '🖨️',
                  });
                  setTimeout(() => setShowReceiptModal(false), 1200);
                }}
                className="py-3 px-3 rounded-xl bg-slate-950 text-white font-sans font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
              >
                <Printer size={16} />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Modal */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrisModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                QRIS Dinamis Offline
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Rp {qrisAmount.toLocaleString('id-ID')}
              </h3>
              <p className="text-xs text-slate-500 font-mono font-bold">
                Ref: {qrisRef} • {vehicleType.toUpperCase()}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-inner inline-block mx-auto">
              <QRCodeSVG value={qrisPayload} size={220} level="M" includeMargin={true} />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-left space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-900 dark:text-slate-200">Arahkan Pengendara:</p>
              <p>1. Buka aplikasi m-Banking / E-Wallet (BCA, Mandiri, GoPay, Dana, dll).</p>
              <p>2. Scan QR di atas dan pastikan nominal tepat Rp {qrisAmount.toLocaleString('id-ID')}.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowQrisModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmQrisPayment}
                disabled={submitting}
                className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Sudah Bayar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Close Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle size={28} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Tutup Shift Tugas?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Saldo shift akan dikunci. Pembagian bagi hasil 70% RKUD & 30% Jukir sudah otomatis tercatat di sistem.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Total Tunai Disimpan Jukir:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  Rp {(shiftData?.summary.total_cash || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Total QRIS Masuk Kasda:</span>
                <span className="text-sky-600 dark:text-sky-400 font-black">
                  Rp {(shiftData?.summary.total_qris || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-900 dark:text-white font-black">Total Kendaraan:</span>
                <span className="text-slate-900 dark:text-white font-black">
                  {shiftData?.summary.total_sessions || 0} unit
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase"
              >
                Kembali
              </button>
              <button
                onClick={handleCloseShift}
                disabled={closingShift}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {closingShift ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Tutup Shift</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
