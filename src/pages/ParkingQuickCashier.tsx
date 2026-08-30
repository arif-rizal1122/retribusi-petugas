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
} from 'lucide-react';
import {
  parkingService,
  ParkingLocation,
  ShiftSummaryData,
} from '../services/parkingService';
import { injectQrisTransaction, buildQrisDynamic } from '../services/qrisService';
import { nextReference } from '../services/referralCounterService';

export default function ParkingQuickCashier() {
  // State
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [shiftData, setShiftData] = useState<ShiftSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [vehicleType, setVehicleType] = useState<'r2' | 'r4'>('r2');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [plateHint, setPlateHint] = useState('');

  // QRIS Modal State
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisPayload, setQrisPayload] = useState('');
  const [qrisRef, setQrisRef] = useState('');
  const [qrisAmount, setQrisAmount] = useState(0);

  // Shift Close Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingShift, setClosingShift] = useState(false);

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [locs, summary] = await Promise.all([
        parkingService.getLocations(),
        parkingService.getShiftSummary(),
      ]);
      setLocations(locs);
      setShiftData(summary);

      const walletLocId = summary?.wallet?.parking_location_id;
      if (walletLocId) {
        setSelectedLocationId(walletLocId);
        const loc = locs.find((l) => l.id === walletLocId);
        if (loc) setSelectedLocation(loc);
      } else if (locs.length > 0) {
        setSelectedLocationId(locs[0].id);
        setSelectedLocation(locs[0]);
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

  // Record Transaction
  const handleRecordTransaction = async () => {
    if (!selectedLocation || !shiftData?.wallet || shiftData.wallet.shift_status !== 'open') {
      toast.error('Shift belum aktif');
      return;
    }

    const amount = vehicleType === 'r4' ? selectedLocation.rate_r4 : selectedLocation.rate_r2;

    if (paymentMethod === 'qris') {
      // Offline Dynamic QRIS Generation
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
        // Fallback build from scratch
        payload = buildQrisDynamic({
          nmid: selectedLocation.nmid || 'ID1020021123456',
          merchantName: (selectedLocation.name || 'DISHUB BAUBAU').slice(0, 25),
          merchantCity: 'BAUBAU',
          mcc: '7523', // Parking Lots & Garages
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

    // Cash Payment — Direct Record
    try {
      setSubmitting(true);
      await parkingService.recordSession({
        parking_location_id: selectedLocation.id,
        vehicle_type: vehicleType,
        payment_method: 'cash',
        plate_hint: plateHint.trim() || undefined,
      });

      toast.success(`Tunai Rp ${amount.toLocaleString('id-ID')} tercatat!`, {
        icon: '💵',
        duration: 2000,
      });
      setPlateHint('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mencatat transaksi');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0F2547]" />
        <p className="text-sm font-semibold">Memuat Kasir Parkir...</p>
      </div>
    );
  }

  const isShiftOpen = shiftData?.wallet?.shift_status === 'open';
  const currentRateR2 = selectedLocation?.rate_r2 || 2000;
  const currentRateR4 = selectedLocation?.rate_r4 || 3000;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-28">
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
                Dishub Kota Baubau
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
                  Tunai
                </span>
                <span className="text-sm font-black text-amber-300">
                  Rp {(shiftData?.summary.total_cash || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">
                  QRIS
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
                <span>Tunai (Cash)</span>
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
                  <Banknote size={20} />
                  <span>
                    Terima Tunai Rp{' '}
                    {(vehicleType === 'r4' ? currentRateR4 : currentRateR2).toLocaleString(
                      'id-ID'
                    )}
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
              <QRCodeSVG
                value={qrisPayload}
                size={220}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-left space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-900 dark:text-slate-200">
                Arahkan Pengendara:
              </p>
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
                Saldo shift akan dikunci. Siapkan uang tunai hasil pungutan untuk disetor ke bendahara Dishub.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Total Tunai Wajib Setor:</span>
                <span className="text-rose-600 dark:text-rose-400 font-black">
                  Rp {(shiftData?.summary.total_cash || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Total QRIS (Masuk Kasda):</span>
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
