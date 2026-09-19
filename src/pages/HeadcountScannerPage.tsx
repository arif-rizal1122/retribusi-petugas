/**
 * Pemindai headcount di pintu gerbang objek wisata — Dinas Pariwisata Kota Baubau.
 *
 * Rombongan masuk bertahap: satu Master QR dipindai berkali-kali, tiap pemindaian
 * mencatat sejumlah orang yang benar-benar masuk. Sisa pax dihitung live.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  QrCode,
  RotateCcw,
  UserCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkInTourismTicket, type CheckInResult } from '../services/tourismService';
import { isOnline } from '../lib/offlineTicketStore';

type Mode = 'scan' | 'manual';

const SCANNER_ELEMENT_ID = 'tourism-headcount-scanner';

export default function HeadcountScannerPage() {
  const [mode, setMode] = useState<Mode>('scan');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [headcount, setHeadcount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const remaining = useMemo(() => {
    if (!result) return null;
    return Math.max(0, result.pax_count - result.pax_checked_in);
  }, [result]);

  const progressPercent = useMemo(() => {
    if (!result || result.pax_count === 0) return 0;
    return Math.min(100, Math.round((result.pax_checked_in / result.pax_count) * 100));
  }, [result]);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Scanner mungkin sudah berhenti — abaikan.
    }
  };

  const startScanner = async () => {
    setScanError(null);
    if (scannerRef.current) return;
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Satu QR = satu tiket. Hentikan pemindaian supaya tidak terbaca ganda.
          await stopScanner();
          setLastToken(decodedText);
          setManualCode(decodedText);
          toast.success('QR tiket terbaca. Masukkan jumlah orang yang masuk.');
        },
        () => {
          // Kegagalan per-frame adalah hal normal saat belum ada QR di depan kamera.
        }
      );
    } catch (err: any) {
      setScanning(false);
      scannerRef.current = null;
      setScanError(
        err?.message ??
          'Kamera tidak dapat diakses. Periksa izin kamera, atau pakai input nomor tiket manual.'
      );
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const submitCheckIn = async () => {
    const code = (lastToken ?? manualCode).trim();
    if (!code) {
      toast.error('Pindai QR atau masukkan nomor tiket terlebih dahulu.');
      return;
    }
    if (headcount < 1) {
      toast.error('Jumlah orang minimal 1.');
      return;
    }
    if (!isOnline()) {
      toast.error('Check-in memerlukan jaringan. Catat manual dan input ulang saat sinyal kembali.');
      return;
    }

    setSubmitting(true);
    try {
      // Token QR berbentuk UUID; selain itu diperlakukan sebagai nomor tiket.
      const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(code);
      const res = await checkInTourismTicket({
        ...(isToken ? { master_qr_token: code } : { bill_number: code }),
        headcount,
      });
      setResult(res);
      setHeadcount(1);
      toast.success(`Check-in ${headcount} orang tercatat.`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Check-in gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = async () => {
    await stopScanner();
    setResult(null);
    setManualCode('');
    setLastToken(null);
    setHeadcount(1);
    setScanError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <header className="mb-5">
        <h1 className="text-xl font-bold">Pemindai Rombongan</h1>
        <p className="text-sm text-slate-400">Pintu masuk objek wisata — catat orang masuk bertahap</p>
      </header>

      {/* Pemilih mode */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
        <button
          onClick={() => setMode('scan')}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold active:scale-95 ${
            mode === 'scan' ? 'bg-emerald-600' : 'text-slate-400'
          }`}
        >
          <QrCode className="h-4 w-4" />
          Pindai QR
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold active:scale-95 ${
            mode === 'manual' ? 'bg-emerald-600' : 'text-slate-400'
          }`}
        >
          <Keyboard className="h-4 w-4" />
          Nomor Tiket
        </button>
      </div>

      {/* Area pemindaian */}
      {mode === 'scan' && (
        <section className="mb-4 space-y-3">
          <div
            id={SCANNER_ELEMENT_ID}
            className="overflow-hidden rounded-2xl border-2 border-slate-700 bg-black"
          />
          {!scanning ? (
            <button
              onClick={() => void startScanner()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold active:scale-95"
            >
              <QrCode className="h-5 w-5" />
              Mulai Pindai
            </button>
          ) : (
            <button
              onClick={() => void stopScanner()}
              className="w-full rounded-xl bg-slate-700 px-6 py-4 text-lg font-bold active:scale-95"
            >
              Hentikan Pemindaian
            </button>
          )}
          {scanError && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/15 p-3 text-sm text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
        </section>
      )}

      {/* Input manual */}
      {mode === 'manual' && (
        <section className="mb-4">
          <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-400">
            Nomor Tiket
          </label>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="PAR-20260918-XXXXXX"
            className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 font-mono text-base"
          />
        </section>
      )}

      {/* Kode terpilih */}
      {lastToken && (
        <div className="mb-4 rounded-xl bg-slate-800 p-3">
          <div className="text-xs text-slate-400">Kode tiket</div>
          <div className="truncate font-mono text-sm">{lastToken}</div>
        </div>
      )}

      {/* Input jumlah orang */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Jumlah Orang Masuk
        </h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[1, 5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setHeadcount(n)}
              className={`rounded-xl border-2 py-4 text-xl font-bold active:scale-95 ${
                headcount === n ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-700 bg-slate-800'
              }`}
            >
              +{n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={headcount}
            onChange={(e) => setHeadcount(Math.max(1, Number(e.target.value) || 1))}
            className="flex-1 rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 text-center text-2xl font-bold"
          />
          <button
            onClick={() => setHeadcount(1)}
            className="rounded-xl bg-slate-700 p-4 active:scale-95"
            title="Reset ke 1"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </section>

      <button
        onClick={() => void submitCheckIn()}
        disabled={submitting || !(lastToken ?? manualCode).trim()}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-5 text-xl font-bold active:scale-95 disabled:opacity-40"
      >
        <UserCheck className="h-6 w-6" />
        {submitting ? 'Mencatat...' : 'Catat Masuk'}
      </button>

      {/* Hasil check-in */}
      {result && (
        <section
          className={`space-y-4 rounded-2xl border-2 p-4 ${
            result.complete ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">{result.bill_number}</span>
            <button onClick={() => void resetForm()} className="text-sm text-slate-400 underline">
              Tiket Berikutnya
            </button>
          </div>

          {result.complete ? (
            <div className="flex items-center justify-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-300">
                SEMUA ROMBONGAN SUDAH MASUK
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-400">
                  <Users className="h-4 w-4" />
                  Sudah masuk
                </span>
                <span className="text-lg font-bold">
                  {result.pax_checked_in} dari {result.pax_count} orang
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-center text-sm text-slate-400">
                Sisa <span className="font-bold text-white">{remaining}</span> orang belum masuk
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
