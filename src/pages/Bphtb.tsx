import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import {
  Search, RefreshCw, ChevronDown, ChevronUp, ShieldCheck, CheckCircle2,
  FileText, CreditCard, Clock, MapPin, User as UserIcon
} from 'lucide-react';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Terverifikasi', cls: 'bg-teal-100 text-teal-700' },
  paid: { label: 'Lunas', cls: 'bg-green-100 text-green-700' },
  skb_issued: { label: 'SKB Terbit', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
};

const rupiah = (v: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v || 0));

export default function Bphtb() {
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const fetchList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page };
      if (status) params.status = status;
      if (search) params.search = search;
      const data = await api.get('/api/h2h/bphtb', { params });
      setItems(data.data || []);
      setPagination(data);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data BPHTB');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { void fetchList(); }, [fetchList]);

  const handleVerify = async (id: number, currentNop?: string) => {
    const nop = window.prompt(
      'Verifikasi dokumen & terbitkan NOP (Bapenda).\nMasukkan NOP 18 digit — kosongkan jika NOP sudah ada:',
      currentNop || ''
    );
    if (nop === null) return;
    setActing(id);
    try {
      const data = await api.post(`/api/h2h/bphtb/${id}/verify`, { nop: nop.trim() });
      toast.success(data.message || 'Berkas terverifikasi');
      void fetchList();
    } catch (e: any) {
      toast.error(e.message || 'Gagal verifikasi');
    } finally {
      setActing(null);
    }
  };

  const handleIssueSkb = async (id: number) => {
    if (!window.confirm('Terbitkan SKB digital untuk berkas ini?')) return;
    setActing(id);
    try {
      const data = await api.post(`/api/h2h/bphtb/${id}/skb`, {});
      toast.success(data.message || 'SKB diterbitkan');
      void fetchList();
    } catch (e: any) {
      toast.error(e.message || 'Gagal terbitkan SKB');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
        <h1 className="text-lg font-black text-slate-900 dark:text-white">BPHTB (Pajak)</h1>
        <p className="text-[11px] text-slate-500">Bea Perolehan Hak atas Tanah dan Bangunan — verifikasi & SKB</p>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void fetchList()}
              placeholder="Cari NIB / NOP / WP..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
          <button onClick={() => void fetchList()} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {[{ key: '', label: 'Semua' }, ...Object.entries(STATUS_META).map(([key, m]) => ({ key, label: m.label }))].map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${status === t.key ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2.5">
        {loading && items.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-10">Memuat data...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-10">Belum ada berkas BPHTB</div>
        ) : items.map((s) => {
          const meta = STATUS_META[s.status] || { label: s.status, cls: 'bg-slate-100 text-slate-600' };
          const open = expandedId === s.id;
          return (
            <div key={s.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedId(open ? null : s.id)} className="w-full text-left px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-slate-500">{s.billing_code}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.nama_wp}</div>
                    <div className="text-[11px] text-slate-500 truncate">NIB {s.nib}{s.nop ? ` · NOP ${s.nop}` : ''}</div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.cls}`}>
                    {s.status === 'paid' || s.status === 'skb_issued' ? <CreditCard className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pajak</span>
                  <span className="font-bold text-slate-900 dark:text-white">{rupiah(s.bill?.amount)}</span>
                </div>
                {open && <ChevronUp className="w-4 h-4 text-slate-400 mt-1" />}
                {!open && <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />}
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-slate-500">NOP (Bapenda)</dt>
                    <dd className="text-right font-mono">{s.nop || '—'}</dd>
                    <dt className="text-slate-500">NIK WP</dt>
                    <dd className="text-right font-mono">{s.nik_wp || '—'}</dd>
                    <dt className="text-slate-500">NPOP final</dt>
                    <dd className="text-right">{rupiah(s.final_npop)}</dd>
                    <dt className="text-slate-500">NTPD</dt>
                    <dd className="text-right font-mono">{s.ntpd || '—'}</dd>
                    <dt className="text-slate-500">Dokumen</dt>
                    <dd className="text-right">{s.documents?.length || 0} file</dd>
                  </dl>

                  {s.verified_at && (
                    <div className="flex items-center gap-1.5 text-[11px] text-teal-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi Bapenda: {new Date(s.verified_at).toLocaleString('id-ID')}
                    </div>
                  )}
                  {s.skb_number && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span className="font-mono font-bold">{s.skb_number}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {s.status === 'submitted' && (
                      <button
                        onClick={() => void handleVerify(s.id, s.nop)}
                        disabled={acting === s.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Verifikasi & NOP
                      </button>
                    )}
                    {s.status === 'paid' && (
                      <button
                        onClick={() => void handleIssueSkb(s.id)}
                        disabled={acting === s.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                      >
                        <ShieldCheck className="w-4 h-4" /> Terbitkan SKB
                      </button>
                    )}
                    {!['submitted', 'paid'].includes(s.status) && (
                      <div className="flex-1 text-center text-[11px] text-slate-400 py-2">Tidak ada aksi untuk status ini</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pagination && pagination.last_page > 1 && (
        <div className="px-4 mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Hal {pagination.current_page}/{pagination.last_page}</span>
          <div className="flex gap-2">
            <button disabled={pagination.current_page <= 1} onClick={() => void fetchList(pagination.current_page - 1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-40">←</button>
            <button disabled={pagination.current_page >= pagination.last_page} onClick={() => void fetchList(pagination.current_page + 1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
