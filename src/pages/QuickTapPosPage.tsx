/**
 * Kasir cepat tiket objek wisata (Quick-Tap POS) — Dinas Pariwisata Kota Baubau.
 *
 * Sasaran: transaksi walk-in selesai dalam < 15 detik.
 * Alur: tap preset kategori -> pilih add-on (opsional) -> BAYAR -> cetak struk.
 *
 * Tiket rombongan (>= 25 pax) otomatis dapat diskon 10% dan menerbitkan
 * SATU Master QR Code untuk seluruh rombongan (menghemat kertas struk).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Printer,
  RefreshCw,
  ShoppingCart,
  Trash2,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTourismCatalog,
  createTourismOrder,
  type TourismCatalog,
  type TourismDestination,
  type TourismOrderResult,
} from '../services/tourismService';
import { thermalPrintService } from '../services/ThermalPrintService';
import {
  buildLocalTicketNumber,
  isOnline,
  savePendingTicket,
  syncPendingTickets,
} from '../lib/offlineTicketStore';

interface CartLine {
  key: string;
  classification_id?: number;
  asset_item_id?: number;
  label: string;
  unit_amount: number;
  pax: number;
}

const SESSIONS = [
  { value: 'all', label: 'Sepanjang Hari' },
  { value: 'pagi', label: 'Pagi (07:00-11:00)' },
  { value: 'siang', label: 'Siang (11:00-15:00)' },
  { value: 'sore', label: 'Sore (15:00-18:00)' },
];

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function rupiah(value: number): string {
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export default function QuickTapPosPage() {
  const [catalog, setCatalog] = useState<TourismCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [visitDate, setVisitDate] = useState<string>(todayIso());
  const [sessionTime, setSessionTime] = useState<string>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TourismOrderResult | null>(null);
  const [offline, setOffline] = useState<boolean>(!isOnline());
  const [printing, setPrinting] = useState(false);
  const syncTimer = useRef<number | null>(null);

  const destination: TourismDestination | null = useMemo(() => {
    if (!catalog || destinationId === null) return null;
    return catalog.destinations.find((d) => d.id === destinationId) ?? null;
  }, [catalog, destinationId]);

  const groupRules = catalog?.group_rules ?? { min_pax: 25, discount_percent: 10 };

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTourismCatalog(visitDate);
      setCatalog(data);
      if (data.destinations.length > 0) {
        setDestinationId((prev) => prev ?? data.destinations[0].id);
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Gagal memuat katalog destinasi.');
    } finally {
      setLoading(false);
    }
  }, [visitDate]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Pantau status jaringan + sinkronkan tiket offline saat kembali online.
  useEffect(() => {
    const goOnline = async () => {
      setOffline(false);
      const report = await syncPendingTickets();
      if (report.succeeded > 0) {
        toast.success(`${report.succeeded} tiket offline berhasil disinkronkan.`);
      }
      if (report.failed > 0) {
        toast.error(`${report.failed} tiket offline masih gagal terkirim.`);
      }
    };
    const goOffline = () => {
      setOffline(true);
      toast.error('Jaringan terputus. Tiket akan disimpan offline.');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Percobaan sinkronisasi berkala bila masih ada sisa tiket offline.
    syncTimer.current = window.setInterval(() => {
      if (isOnline()) void syncPendingTickets();
    }, 60000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (syncTimer.current) window.clearInterval(syncTimer.current);
    };
  }, []);

  const totalPax = useMemo(() => cart.reduce((sum, line) => sum + line.pax, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.unit_amount * line.pax, 0), [cart]);
  const isGroup = totalPax >= groupRules.min_pax;
  const discountAmount = isGroup ? Math.round((subtotal * groupRules.discount_percent) / 100) : 0;
  const total = subtotal - discountAmount;

  const addRateToCart = (rateId: number, label: string, amount: number) => {
    setResult(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.classification_id === rateId);
      if (existing) {
        return prev.map((l) => (l.classification_id === rateId ? { ...l, pax: l.pax + 1 } : l));
      }
      return [
        ...prev,
        { key: `r-${rateId}`, classification_id: rateId, label, unit_amount: amount, pax: 1 },
      ];
    });
  };

  const addAddonToCart = (assetId: number, label: string, amount: number) => {
    setResult(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.asset_item_id === assetId);
      if (existing) {
        return prev.map((l) => (l.asset_item_id === assetId ? { ...l, pax: l.pax + 1 } : l));
      }
      return [
        ...prev,
        { key: `a-${assetId}`, asset_item_id: assetId, label, unit_amount: amount, pax: 1 },
      ];
    });
  };

  const decreaseLine = (key: string) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, pax: l.pax - 1 } : l))
        .filter((l) => l.pax > 0)
    );
  };

  const resetCart = () => {
    setCart([]);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!destination || cart.length === 0) {
      toast.error('Belum ada tiket di keranjang.');
      return;
    }

    setSubmitting(true);
    const payload = {
      destination_id: destination.id,
      visit_date: visitDate,
      session_time: sessionTime,
      items: cart
        .filter((l) => l.classification_id !== undefined)
        .map((l) => ({ classification_id: l.classification_id as number, pax: l.pax })),
      addons: cart
        .filter((l) => l.asset_item_id !== undefined)
        .map((l) => ({ asset_item_id: l.asset_item_id as number, qty: l.pax })),
    };

    try {
      const res = await createTourismOrder(payload);
      setResult(res);
      toast.success('Pembayaran tercatat. Silakan cetak struk.');
      void loadCatalog();
    } catch (err: any) {
      const message = err?.message ?? 'Gagal mengirim pesanan.';

      // Jaringan bermasalah -> simpan offline, struk tetap bisa dicetak.
      if (!isOnline() || /failed to fetch|network|load failed/i.test(message)) {
        const localNumber = buildLocalTicketNumber();
        await savePendingTicket({
          client_id: localNumber,
          payload,
          local_receipt: {
            bill_number: localNumber,
            destination_name: destination.name,
            visit_date: visitDate,
            session_time: sessionTime,
            pax_count: totalPax,
            total,
            discount_amount: discountAmount,
            lines: cart.map((l) => ({ label: l.label, pax: l.pax, line_total: l.unit_amount * l.pax })),
          },
          created_at: new Date().toISOString(),
          synced: false,
        });
        toast('Jaringan bermasalah. Tiket disimpan offline dan akan tersinkron otomatis.', {
          icon: '📴',
          duration: 6000,
        });
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!result || !destination) return;
    setPrinting(true);
    try {
      await thermalPrintService.print({
        header: 'DINAS PARIWISATA BAUBAU',
        sub_header: result.ticket_type === 'group' ? 'TIKET ROMBONGAN' : 'TIKET MASUK',
        location_name: destination.name,
        receipt_no: result.bill_number,
        datetime: new Date().toLocaleString('id-ID'),
        vehicle_type: result.ticket_type === 'group' ? `${result.pax_count} ORANG` : 'TIKET',
        plate_hint: '',
        amount_total: result.total,
        qr_verification_url: result.master_qr_token ?? result.bill_number,
        footer_notice: 'Simpan struk ini sebagai bukti masuk.',
        legal_notice: 'Perda Kota Baubau No. 1 Tahun 2024',
      });
      toast.success('Struk terkirim ke printer.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Gagal mencetak struk.');
    } finally {
      setPrinting(false);
    }
  };

  if (loading && !catalog) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3 text-lg">
          <RefreshCw className="h-6 w-6 animate-spin" />
          Memuat katalog destinasi...
        </div>
      </div>
    );
  }

  if (loadError && !catalog) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
        <div className="max-w-md space-y-4 rounded-2xl bg-slate-800 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <p className="text-lg">{loadError}</p>
          <button
            onClick={() => void loadCatalog()}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-lg font-semibold active:scale-95"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-40 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kasir Tiket Wisata</h1>
            <p className="text-sm text-slate-400">Dinas Pariwisata Kota Baubau</p>
          </div>
          <div className="flex items-center gap-2">
            {offline && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-300">
                <WifiOff className="h-4 w-4" />
                Offline
              </span>
            )}
            <button
              onClick={() => void loadCatalog()}
              className="rounded-lg bg-slate-700 p-2 active:scale-95"
              title="Muat ulang"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-4">
        {/* Pilih destinasi */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">1. Pilih Destinasi</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {catalog?.destinations.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDestinationId(d.id);
                  setResult(null);
                }}
                className={`rounded-xl border-2 p-4 text-left transition active:scale-95 ${
                  destinationId === d.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div className="text-base font-semibold leading-tight">{d.name}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Kuota tersisa</span>
                  <span className={d.quota.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {d.quota.remaining} / {d.quota.capacity}
                  </span>
                </div>
                {d.requires_offline_mode && (
                  <div className="mt-2 text-xs text-amber-300">Sinyal terbatas — mendukung mode offline</div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Tanggal & sesi */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-400">
              2. Tanggal Kunjungan
            </label>
            <input
              type="date"
              value={visitDate}
              min={todayIso()}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-400">
              Sesi Kunjungan
            </label>
            <select
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-base"
            >
              {SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Preset tarif */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            3. Tap Kategori Pengunjung
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {destination?.rates.map((r) => {
              const inCart = cart.find((l) => l.classification_id === r.classification_id);
              return (
                <button
                  key={r.classification_id}
                  onClick={() => addRateToCart(r.classification_id, r.label, r.amount)}
                  className="relative rounded-xl border-2 border-slate-700 bg-slate-800 p-4 text-left active:scale-95"
                >
                  {inCart && (
                    <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">
                      {inCart.pax}
                    </span>
                  )}
                  <div className="text-sm font-semibold leading-tight">{r.label}</div>
                  <div className="mt-1 text-xl font-bold text-emerald-400">{rupiah(r.amount)}</div>
                  <div className="text-xs text-slate-400">{r.unit}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Add-on sewa alat */}
        {catalog && catalog.addons.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              4. Sewa Alat (Opsional)
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {catalog.addons.map((a) => {
                const inCart = cart.find((l) => l.asset_item_id === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => addAddonToCart(a.id, `${a.name} (${a.satuan})`, a.tarif)}
                    className="relative rounded-xl border-2 border-slate-700 bg-slate-800 p-4 text-left active:scale-95"
                  >
                    {inCart && (
                      <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-bold">
                        {inCart.pax}
                      </span>
                    )}
                    <div className="text-sm font-semibold leading-tight">{a.name}</div>
                    <div className="mt-1 text-lg font-bold text-sky-400">{rupiah(a.tarif)}</div>
                    <div className="text-xs text-slate-400">{a.satuan}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Keranjang */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <ShoppingCart className="h-4 w-4" />
              5. Rincian
            </h2>
            {cart.length > 0 && (
              <button onClick={resetCart} className="flex items-center gap-1 text-sm text-red-400 active:scale-95">
                <Trash2 className="h-4 w-4" />
                Kosongkan
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-slate-700 p-6 text-center text-slate-500">
              Belum ada tiket. Tap kategori di atas untuk mulai.
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.key} className="flex items-center justify-between rounded-xl bg-slate-800 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.label}</div>
                    <div className="text-xs text-slate-400">
                      {rupiah(l.unit_amount)} × {l.pax}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold">{rupiah(l.unit_amount * l.pax)}</span>
                    <button
                      onClick={() => decreaseLine(l.key)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 active:scale-90"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isGroup && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Diskon Rombongan {groupRules.discount_percent}% otomatis (≥ {groupRules.min_pax} orang)
            </div>
          )}

          {destination && totalPax > destination.quota.remaining && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Jumlah melebihi kuota tersisa ({destination.quota.remaining} orang).
            </div>
          )}
        </section>

        {/* Hasil transaksi */}
        {result && (
          <section className="space-y-3 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-lg font-bold text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
              Transaksi Berhasil
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Tiket</span>
                <span className="font-mono">{result.bill_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis</span>
                <span>{result.ticket_type === 'group' ? `Rombongan (${result.pax_count} orang)` : 'Perorangan'}</span>
              </div>
              {result.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Diskon {result.discount_percent}%</span>
                  <span>- {rupiah(result.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-emerald-500/30 pt-1 text-base font-bold">
                <span>Total</span>
                <span>{rupiah(result.total)}</span>
              </div>
            </div>

            {result.master_qr_token && (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4">
                <QRCodeSVG value={result.master_qr_token} size={160} />
                <p className="text-center text-xs font-semibold text-slate-700">
                  {result.ticket_type === 'group'
                    ? 'MASTER QR ROMBONGAN — satu QR untuk seluruh anggota'
                    : 'QR TIKET'}
                </p>
              </div>
            )}

            <button
              onClick={() => void handlePrint()}
              disabled={printing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold active:scale-95 disabled:opacity-50"
            >
              <Printer className="h-5 w-5" />
              {printing ? 'Mencetak...' : 'Cetak Struk'}
            </button>
          </section>
        )}
      </div>

      {/* Bar pembayaran tetap */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-400">
              {totalPax} orang {isGroup && `· diskon ${groupRules.discount_percent}%`}
            </div>
            <div className="text-2xl font-bold">{rupiah(total)}</div>
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || cart.length === 0 || !!result}
            className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-bold active:scale-95 disabled:opacity-40"
          >
            {submitting ? 'Memproses...' : 'BAYAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
