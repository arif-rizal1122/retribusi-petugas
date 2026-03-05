import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Download, 
  Search, 
  FileText, 
  Loader2, 
  QrCode, 
  Plus, 
  ImagePlus
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { Billing as BillingType } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { thermalPrintService } from '../services/ThermalPrintService';

export default function Billing() {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [billings, setBillings] = useState<BillingType[]>([]);
  const [taxObjects, setTaxObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  
  const [selectedBill, setSelectedBill] = useState<BillingType | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'lunas' | 'pending' | 'overdue'>('all');

  const [formData, setFormData] = useState({
    tax_object_id: '',
    period: '',
  });

  const [pendingPeriods, setPendingPeriods] = useState<any[]>([]);
  const [fetchingPeriods, setFetchingPeriods] = useState(false);

  // Bukti Pembayaran State (Cloudinary)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [billsRes, objectsRes] = await Promise.all([
          api.get('/api/bills'),
          api.get('/api/tax-objects'),
        ]);

        const mappedBills: BillingType[] = (billsRes.data || billsRes).map((b: any) => ({
          id: b.id.toString(),
          invoiceNumber: b.bill_number,
          taxpayerName: b.taxpayer?.name || b.user?.name || 'Unknown',
          taxpayerId: b.taxpayer?.npwpd || 'N/A',
          type: b.classification?.name || b.retribution_type?.name || 'N/A',
          amount: Number(b.total_amount || b.amount),
          bank_accounts: b.classification?.bank_accounts || [],
          penalty_amount: Number(b.penalty_amount || 0),
          dueDate: b.due_date,
          status: b.status as any,
          createdAt: b.created_at,
          taxObjectId: b.tax_object_id,
          period: b.period,
        }));

        setBillings(mappedBills);
        setTaxObjects(objectsRes.data || objectsRes);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const fetchPendingPeriods = async (taxObjectId: string) => {
    setFetchingPeriods(true);
    try {
      const res = await api.get(`/api/tax-objects/${taxObjectId}/pending-periods`);
      setPendingPeriods(res.data || res);
    } catch (error) {
      console.error('Error fetching periods:', error);
    } finally {
      setFetchingPeriods(false);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'retribusi/bukti_bayar');

    const res = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // API returns either { url: '...' } or { data: { url: '...' } }
    return res.data?.url || res.url;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    let uploadedProofUrl = null;

    try {
      if (proofFile) {
        setUploadingProof(true);
        uploadedProofUrl = await uploadToCloudinary(proofFile);
        setUploadingProof(false);
      }

      // Traditional bill payment
      if (selectedBill) {
        await api.post(`/api/bills/${selectedBill.id}/pay`, {
          tax_object_id: Number(selectedBill.taxObjectId),
          billing_period: selectedBill.period,
          payment_method: paymentMethod,
          amount: selectedBill.amount,
          proof_url: uploadedProofUrl // Optional attachment
        });
        alert('Pembayaran berhasil dicatat');
        setShowPaymentModal(false);
        setSelectedBill(null);
        setProofFile(null);
        setBillings(prev => prev.map(b => b.id === selectedBill.id ? { ...b, status: 'lunas' } : b));
        setPaymentSubmitting(false);
        return;
      }

      // New dynamic period payment
      if (!formData.tax_object_id || !formData.period) {
        setPaymentSubmitting(false);
        return;
      }
      
      const selectedPeriod = pendingPeriods.find(p => p.period === formData.period);

      await api.post('/api/payments', {
        tax_object_id: Number(formData.tax_object_id),
        billing_period: formData.period,
        payment_method: paymentMethod,
        amount: selectedPeriod?.total_amount || selectedPeriod?.amount || 0,
        proof_url: uploadedProofUrl
      });

      alert(`Pembayaran periode ${formData.period} berhasil dicatat`);
      setShowModal(false);
      setFormData({ tax_object_id: '', period: '' });
      setPendingPeriods([]);
      setProofFile(null);
      
      // Refresh list
      const billsRes = await api.get('/api/bills');
      setBillings((billsRes.data || billsRes).map((b: any) => ({
        id: b.id.toString(),
        invoiceNumber: b.bill_number,
        taxpayerName: b.taxpayer?.name || b.user?.name || 'Unknown',
        taxpayerId: b.taxpayer?.taxpayer_id || b.taxpayer?.npwpd || 'N/A',
        type: b.classification?.name || b.retribution_type?.name || 'N/A',
        bank_accounts: b.classification?.bank_accounts || [],
        amount: Number(b.total_amount || b.amount),
        dueDate: b.due_date,
        status: b.status as any,
        createdAt: b.created_at,
        taxObjectId: b.tax_object_id,
        period: b.period,
      })));
    } catch (error) {
      console.error(error);
      alert('Gagal memproses pembayaran atau mengunggah gambar');
      setUploadingProof(false);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePrint = async (billing: BillingType) => {
    try {
      await thermalPrintService.print({
        billNumber: billing.invoiceNumber,
        name: billing.taxpayerName,
        objectName: billing.type, // Using type as name for now
        amount: billing.amount - (billing.penalty_amount || 0),
        penalty: billing.penalty_amount || 0,
        total: billing.amount,
        date: new Date().toLocaleDateString('id-ID'),
        period: billing.dueDate ? new Date(billing.dueDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'
      });
      alert('Resi sedang dicetak...');
    } catch (error) {
      alert('Gagal mencetak resi');
    }
  };

  const billIdsParam = searchParams.get('ids');
  const idsToFilter = billIdsParam ? billIdsParam.split(',') : [];

  const filteredBillings = billings
    .filter((billing) => {
      // If ids parameter exists, filter by those IDs first
      if (idsToFilter.length > 0) {
        return idsToFilter.includes(String(billing.id));
      }

      const matchesSearch =
        billing.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billing.taxpayerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billing.taxpayerId.toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || billing.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const summary = {
    total: billings.length,
    lunas: billings.filter((b) => b.status === 'lunas').length,
    pending: billings.filter((b) => b.status === 'pending').length,
    overdue: billings.filter((b) => b.status === 'overdue').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-baubau-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Billing & Tagihan</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentUser?.role === 'petugas' ? 'Monitor dan catat pembayaran tagihan' : 'Generate dan kelola tagihan operasional petugas'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentUser?.role !== 'petugas' && (
            <>
              <button
                onClick={() => {
                  setShowModal(true);
                  setFormData({ tax_object_id: '', period: '' });
                  setPendingPeriods([]);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-baubau-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95 shadow-blue-500/10"
              >
                <Plus size={18} />
                Catat Bayar
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/scanner')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
          >
            <QrCode size={18} />
            SCAN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tagihan</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lunas</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.lunas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending</p>
          <p className="text-2xl font-black text-amber-500">{summary.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Overdue</p>
          <p className="text-2xl font-black text-rose-500">{summary.overdue}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari invoice, nama, atau NPWPD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm appearance-none font-bold"
              >
                <option value="all">Semua Status</option>
                <option value="lunas">Lunas</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Wajib Pajak</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Jumlah</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredBillings.length > 0 ? (
                filteredBillings.map((billing) => (
                  <tr key={billing.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400">{billing.invoiceNumber}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{new Date(billing.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-gray-900 dark:text-white">{billing.taxpayerName}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{billing.type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(billing.amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-[9px] font-black uppercase tracking-tighter rounded-md ${
                        billing.status === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 
                        billing.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {billing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {billing.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedBill(billing);
                            setShowPaymentModal(true);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg transition-all active:scale-95"
                        >
                          Bayar
                        </button>
                      )}
                      {billing.status === 'lunas' && (
                        <button
                          onClick={() => handlePrint(billing)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg transition-all active:scale-95 flex items-center gap-2 ml-auto"
                        >
                          <Download size={12} />
                          Print
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic font-medium">Data tidak ditemukan</td>
                </tr>
              )}
            </tbody>
        </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4 px-4 pb-4">
          {filteredBillings.length > 0 ? (
            filteredBillings.map((billing) => (
              <div key={billing.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">{billing.invoiceNumber}</p>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{billing.taxpayerName}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    billing.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : 
                    billing.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {billing.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Jumlah</p>
                    <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(billing.amount)}</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tanggal</p>
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{new Date(billing.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50">
                  <p className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]">{billing.type}</p>
                  {billing.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedBill(billing);
                        setShowPaymentModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Bayar
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-400 italic font-medium">Data tidak ditemukan</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl max-w-md w-full overflow-y-auto max-h-[90vh] border border-gray-100 relative">
            <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Pembayaran Baru</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sistem Otomatis (Virtual Ledger)</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handlePayment} className="p-6 md:p-8 space-y-5">
              <SearchableSelect
                label="Cari Objek Pajak"
                options={taxObjects.map(obj => ({
                  id: obj.id,
                  label: `${obj.nop || 'TANPA NOP'} - ${obj.taxpayer?.name || 'N/A'}`,
                  subLabel: obj.name
                }))}
                value={formData.tax_object_id}
                onSelect={(val) => {
                  setFormData({ ...formData, tax_object_id: val.toString(), period: '' });
                  fetchPendingPeriods(val.toString());
                }}
                placeholder="Pilih Objek / NOP"
                searchPlaceholder="Cari NOP atau Nama WP..."
              />

              {fetchingPeriods ? (
                <div className="flex items-center justify-center py-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-xs text-gray-500 font-bold uppercase tracking-widest">Mengecek...</span>
                </div>
              ) : formData.tax_object_id && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Pilih Periode</label>
                  {pendingPeriods.length > 0 ? (
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      required
                    >
                      <option value="">Pilih Bulan Tunggakan</option>
                      {pendingPeriods.map((p) => (
                        <option key={p.period} value={p.period}>
                          {p.label} - {formatCurrency(p.total_amount || p.amount)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-widest">Semua Lunas!</p>
                      <p className="text-[10px] text-emerald-600/70 mt-1 font-medium">Tidak ada tunggakan untuk objek ini.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Bukti Pembayaran */}
              {formData.period && (
                <div className="animate-in fade-in duration-300 border-t border-slate-100 pt-4 mt-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Bukti Pembayaran (Opsional)</label>
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${proofFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900'}`}>
                    {proofFile ? (
                      <>
                        <img src={URL.createObjectURL(proofFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="z-10 flex flex-col items-center bg-white/80 dark:bg-black/60 px-4 py-2 rounded-xl text-center">
                           <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">{proofFile.name}</span>
                           <span className="text-[9px] font-bold text-emerald-500 uppercase mt-1">Ganti Foto</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-500">Ketuk untuk Ambil Foto</span>
                        <span className="text-[9px] font-medium text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setProofFile(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>
                </div>
              )}

              <button 
                type="submit" 
                disabled={!formData.period || pendingPeriods.length === 0 || paymentSubmitting}
                className="w-full py-4 bg-emerald-600 disabled:bg-gray-300 flex items-center justify-center gap-2 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-6"
              >
                {uploadingProof ? (
                  <><Loader2 className="w-4 h-4 animate-spin"/> MENGUNGGAH BUKTI...</>
                ) : paymentSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin"/> MEMPROSES...</>
                ) : (
                  'KONFIRMASI BAYAR'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300 relative border border-gray-100">
            {/* Header Sticky */}
            <div className="shrink-0 p-6 md:p-8 pb-0 text-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Konfirmasi Pembayaran</h2>
              <p className="text-slate-400 text-xs md:text-sm font-medium px-4">Verifikasi detail tagihan sebelum mencatat pembayaran</p>
            </div>
            
            {/* Scrollable Content */}
            <div className="p-6 md:p-8 overflow-y-auto w-full custom-scrollbar flex-1">
              {/* Invoice Details */}
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Invoice</p>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400 truncate">{selectedBill.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jatuh Tempo</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {new Date(selectedBill.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Wajib Pajak</p>
                  <p className="text-base font-black text-slate-900 dark:text-white truncate">{selectedBill.taxpayerName}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">{selectedBill.taxpayerId}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jenis Retribusi</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide truncate">{selectedBill.type}</p>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="mt-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800">
                <div className="text-center mb-4">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(selectedBill.amount)}</p>
                  {Number((selectedBill as any).penalty_amount) > 0 && (
                    <p className="text-[10px] text-amber-600 font-black mt-1 uppercase">Termasuk Denda: {formatCurrency((selectedBill as any).penalty_amount)}</p>
                  )}
                </div>

                <div className="border-t border-emerald-200/50 dark:border-emerald-800/50 pt-4 mt-4">
                  <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 text-center">Metode Pembayaran</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        paymentMethod === 'cash' 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                          : 'bg-white dark:bg-gray-800 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800'
                      }`}
                    >
                      Tunai (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        paymentMethod === 'transfer' 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                          : 'bg-white dark:bg-gray-800 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800'
                      }`}
                    >
                      Transfer / QRIS
                    </button>
                  </div>
                </div>

                {/* Bank Accounts Section if Transfer selected */}
                {paymentMethod === 'transfer' && (
                  <div className="mt-4 border-t border-emerald-200/50 dark:border-emerald-800/50 pt-4 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">Rekening Tujuan</p>
                    
                    {selectedBill.bank_accounts && selectedBill.bank_accounts.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedBill.bank_accounts.map((bank, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-black text-slate-800 dark:text-white">{bank.bank_name}</p>
                              <span 
                                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded cursor-pointer"
                                onClick={() => navigator.clipboard.writeText(bank.account_number)}
                              >
                                Salin
                              </span>
                            </div>
                            
                            {bank.qr_image_url && (
                              <div className="flex justify-center my-3 bg-white p-2 border border-slate-100 dark:border-slate-700 rounded-lg">
                                <img src={bank.qr_image_url} alt="QR Code" className="w-24 h-24 object-contain rounded" />
                              </div>
                            )}

                            <p className="text-sm font-mono text-slate-600 dark:text-slate-300 tracking-wider mb-1">
                              {bank.account_number}
                            </p>
                            {bank.account_name && (
                              <p className="text-[10px] text-slate-400 uppercase font-bold">
                                a.n {bank.account_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-500">
                          Tidak ada rekening tersedia untuk klasifikasi ini.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Bukti Pembayaran */}
              <div className="border-t border-slate-100 pt-5 mt-5">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-center md:text-left">Bukti Pembayaran (Opsional)</label>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${proofFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900'}`}>
                  {proofFile ? (
                    <>
                      <img src={URL.createObjectURL(proofFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="z-10 flex flex-col items-center bg-white/80 dark:bg-black/60 px-4 py-2 rounded-xl text-center">
                         <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">{proofFile.name}</span>
                         <span className="text-[9px] font-bold text-emerald-500 uppercase mt-1">Ganti Foto</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-500">Ketuk untuk Ambil Foto</span>
                      <span className="text-[9px] font-medium text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setProofFile(e.target.files[0]);
                      }
                    }} 
                  />
                </label>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="shrink-0 p-6 md:p-8 pt-4 border-t border-slate-50 dark:border-slate-700/50 bg-white dark:bg-gray-800 z-10">
              <div className="flex gap-3 md:gap-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentSubmitting}
                  className="flex-1 py-3.5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                >
                  BATAL
                </button>
                <button
                  onClick={handlePayment}
                  disabled={paymentSubmitting}
                  className="flex-[2] px-4 md:px-8 py-3.5 bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-500 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {uploadingProof ? (
                    <><Loader2 className="w-4 h-4 animate-spin"/> MENGUNGGAH BUKTI...</>
                  ) : paymentSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin"/> MEMPROSES...</>
                  ) : (
                    'KONFIRMASI BAYAR'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
