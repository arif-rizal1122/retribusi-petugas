import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  QrCode, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { QRScannerService } from '../services/QRScannerService';

interface Taxpayer {
  id: number;
  name: string;
  nik?: string;
  npwpd?: string;
  phone?: string;
  address?: string;
}

interface TaxpayerBill {
  id: number;
  bill_number: string;
  amount: number;
  penalty_amount?: number;
  total_amount?: number;
  period?: string;
  due_date?: string;
  status: string;
  tax_object?: {
    name?: string;
    object_name?: string;
    classification?: { name?: string };
    retribution_type?: { name?: string };
  };
}

export default function OfficerPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<Taxpayer | null>(null);
  const [bills, setBills] = useState<TaxpayerBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      toast.error('Masukkan NIK, NPWPD, atau Nama');
      return;
    }

    setSearching(true);
    try {
      // Check if scanned token or URL
      const qrParsed = QRScannerService.parse(searchTerm);
      const cleanTerm = qrParsed.value;

      const res = await api.get('/api/taxpayers', {
        params: { search: cleanTerm }
      });
      const data = res.data?.data || res.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setTaxpayers(list);

      if (list.length === 1) {
        selectTaxpayer(list[0]);
      } else if (list.length === 0) {
        toast('Wajib Pajak tidak ditemukan', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencari data Wajib Pajak');
    } finally {
      setSearching(false);
    }
  };

  const selectTaxpayer = async (tp: Taxpayer) => {
    setSelectedTaxpayer(tp);
    setLoadingBills(true);
    setSelectedBillIds([]);

    try {
      const res = await api.get(`/api/taxpayers/${tp.id}`);
      const tpData = res.data?.data || res.data || res;
      const allBills: TaxpayerBill[] = tpData?.bills || [];
      
      // Filter unpaid
      const unpaid = allBills.filter(b => b.status === 'pending' || b.status === 'overdue' || b.status === 'unpaid');
      setBills(unpaid);
      
      // Auto select all unpaid bills
      setSelectedBillIds(unpaid.map(b => b.id));
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil tagihan Wajib Pajak');
    } finally {
      setLoadingBills(false);
    }
  };

  const toggleBill = (id: number) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBillIds.length === bills.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(bills.map(b => b.id));
    }
  };

  const selectedBills = bills.filter(b => selectedBillIds.includes(b.id));
  const totalAmount = selectedBills.reduce((sum, b) => sum + (b.total_amount || b.amount || 0), 0);

  const handleProceedToPayment = () => {
    if (selectedBillIds.length === 0) {
      toast.error('Pilih minimal 1 tagihan untuk dibayar');
      return;
    }
    navigate(`/payment-confirmation?ids=${selectedBillIds.join(',')}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Pembayaran Lapangan</h1>
          <p className="text-xs sm:text-sm text-slate-500">Pencarian cepat Wajib Pajak, pemilihan tagihan, dan cetak resi thermal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/scanner')}
            className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-transform"
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </button>
          <button
            onClick={() => navigate('/mpad-printer')}
            className="px-3.5 py-2 bg-baubau-blue/10 text-baubau-blue dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Printer className="w-4 h-4" />
            Printer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex gap-2"
        >
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari NIK, NPWPD, Nama WP, atau scan token..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-baubau-blue outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 bg-baubau-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:bg-slate-400 transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari WP
          </button>
        </form>

        {/* Results dropdown/list if multiple taxpayers */}
        {taxpayers.length > 1 && (
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700 pt-2 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Wajib Pajak ({taxpayers.length})</p>
            {taxpayers.map((tp) => (
              <button
                key={tp.id}
                onClick={() => selectTaxpayer(tp)}
                className={`w-full text-left py-2 px-2.5 rounded-lg flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                  selectedTaxpayer?.id === tp.id ? 'bg-blue-50/70 dark:bg-blue-900/30' : ''
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{tp.name}</p>
                  <p className="text-[10px] text-slate-500">{tp.nik ? `NIK: ${tp.nik}` : (tp.npwpd ? `NPWPD: ${tp.npwpd}` : tp.phone || '-')}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Taxpayer Info Card */}
      {selectedTaxpayer && (
        <div className="bg-gradient-to-br from-slate-900 to-[#0F2547] text-white p-5 rounded-2xl shadow-md space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm">
                {selectedTaxpayer.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold">{selectedTaxpayer.name}</h2>
                <p className="text-xs text-slate-300">
                  {selectedTaxpayer.nik ? `NIK: ${selectedTaxpayer.nik}` : (selectedTaxpayer.npwpd ? `NPWPD: ${selectedTaxpayer.npwpd}` : 'Wajib Pajak Terdaftar')}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Terverifikasi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block">No. Telepon:</span>
              <span className="font-medium text-white">{selectedTaxpayer.phone || '-'}</span>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-[10px] text-slate-400 block">Alamat:</span>
              <span className="font-medium text-white line-clamp-1">{selectedTaxpayer.address || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Bills Section */}
      {selectedTaxpayer && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Daftar Tagihan Belum Lunas</h3>
              <p className="text-xs text-slate-500">{bills.length} tagihan aktif ditemukan</p>
            </div>
            {bills.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs font-bold text-baubau-blue hover:underline"
              >
                {selectedBillIds.length === bills.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {loadingBills ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-baubau-blue" />
              <p className="text-xs text-slate-500">Mengambil tagihan...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Tidak Ada Tunggakan Tagihan</p>
              <p className="text-[11px] text-slate-500">Semua tagihan untuk Wajib Pajak ini telah lunas.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bills.map((bill) => {
                const isSelected = selectedBillIds.includes(bill.id);
                const objName = bill.tax_object?.name || bill.tax_object?.object_name || bill.tax_object?.classification?.name || bill.tax_object?.retribution_type?.name || 'Objek Retribusi';
                
                return (
                  <div
                    key={bill.id}
                    onClick={() => toggleBill(bill.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected 
                        ? 'border-baubau-blue bg-blue-50/30 dark:bg-blue-900/20' 
                        : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="mt-1 w-4 h-4 rounded text-baubau-blue focus:ring-baubau-blue cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{objName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{bill.bill_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded text-[9px] font-bold uppercase">
                            {bill.status}
                          </span>
                          {bill.period && (
                            <span className="text-[10px] text-slate-400">Periode: {bill.period}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-baubau-blue dark:text-blue-400">
                        {formatCurrency(bill.total_amount || bill.amount)}
                      </p>
                      {bill.penalty_amount ? (
                        <p className="text-[9px] text-rose-500">+Denda {formatCurrency(bill.penalty_amount)}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Summary Bar */}
      {selectedTaxpayer && bills.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Dipilih ({selectedBillIds.length} tagihan)
              </p>
              <p className="text-lg sm:text-xl font-black text-baubau-blue dark:text-blue-400">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <button
              onClick={handleProceedToPayment}
              disabled={selectedBillIds.length === 0}
              className="px-6 py-3 bg-baubau-blue hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Lanjut Pembayaran ({formatCurrency(totalAmount)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
