import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Receipt, FileText, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, API_URL } from '../lib/api';

interface SimulationResult {
  classification: string;
  formula: string;
  variables: Record<string, number>;
  result: number;
  formatted: string;
}

export default function CreateSKPD() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { 
    taxObjectId: string | number, 
    classificationId?: string | number,
    defaultVars?: Record<string, any>
  } | null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createdBill, setCreatedBill] = useState<any>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!state?.taxObjectId) {
      setError('Data Objek Pajak tidak ditemukan. Silakan kembali dan pilih objek pajak.');
      setLoading(false);
      return;
    }
    generateSKPD();
  }, []);

  const generateSKPD = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch Tax Object
      const toRes = await api.get(`/api/tax-objects/${state!.taxObjectId}`);
      const taxObject = toRes.data || toRes;
      
      if (!taxObject || (!taxObject.id && !taxObject.data)) {
        throw new Error("Data Objek Pajak tidak valid atau tidak ditemukan.");
      }
      
      const classificationId = state?.classificationId || taxObject.retribution_classification_id;
      
      if (!classificationId) throw new Error("Klasifikasi retribusi belum ditentukan untuk objek ini.");

      // 2. Determine Classification and Formula
      let cls = null;
      
      // Try to use classification already loaded with taxObject
      if (taxObject.classification && taxObject.classification.id?.toString() === classificationId.toString()) {
        cls = taxObject.classification;
      }

      // Fallback: Fetch from tax-formulas list if needed
      if (!cls) {
        const formulasRes = await api.get('/api/tax-formulas');
        const clsList = Array.isArray(formulasRes) ? formulasRes : (formulasRes.data || []);
        cls = clsList.find((c: any) => c.id.toString() === classificationId.toString());
      }

      // If still not found, we might need to fetch classification details directly?
      // For now, if we have cls from taxObject but it has no formula, it might be PBB
      if (!cls) {
        throw new Error(`Data klasifikasi (ID: ${classificationId}) tidak ditemukan di sistem.`);
      }

      // 3. Prepare Variables
      const sourceData = {
        ...(taxObject.metadata || {}),
        ...(state?.defaultVars || {})
      };

      // Extract variables from formula or from schema if formula is missing
      let formulaVars: string[] = [];
      if (cls.calculation_formula) {
        formulaVars = cls.calculation_formula
          .replace(/[+\-*/().0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((v: string) => v && isNaN(Number(v)));
      } else if (cls.form_schema && Array.isArray(cls.form_schema)) {
        formulaVars = cls.form_schema.map((f: any) => f.key);
      }

      // Special handling for PBB if no variables found yet
      if (formulaVars.length === 0) {
        const name = (cls.name || '').toLowerCase();
        if (name.includes('pbb') || name.includes('bumi')) {
           formulaVars = ['luas_bumi', 'luas_bangunan', 'njoptkp', 'tarif'];
        }
      }

      const getAliasValue = (key: string, data: Record<string, any>) => {
        if (data[key] !== undefined && data[key] !== null) return data[key];
        const aliases: Record<string, string[]> = {
          'omzet': ['omset_penjualan', 'omset', 'pendapatan', 'total_charge', 'omset_bulanan'],
          'njop': ['nilai_jual', 'njop_pbb'],
          'tarif': ['tarif_pajak']
        };
        for (const [canonical, variants] of Object.entries(aliases)) {
          if (canonical === key || variants.includes(key)) {
            for (const v of [canonical, ...variants]) {
              if (data[v] !== undefined && data[v] !== null) return data[v];
            }
          }
        }
        return undefined;
      };

      const finalVars: Record<string, number> = {};
      formulaVars.forEach((v: string) => { 
        const matchedVal = getAliasValue(v, sourceData);
        if (matchedVal !== undefined) {
          finalVars[v] = parseFloat(matchedVal) || 0;
        } else {
          const field = cls.form_schema?.find((f: any) => f.key === v);
          finalVars[v] = parseFloat(field?.defaultValue?.toString() || '0');
        }
      });

      // 4. Calculate
      const calcRes = await api.post('/api/simulate-tax', {
        classification_id: cls.id,
        variables: finalVars
      });
      
      const simulationResult = calcRes.data || calcRes;
      if (!simulationResult || simulationResult.result === undefined) {
        throw new Error("Gagal menghitung nilai retribusi.");
      }
      setResult(simulationResult);

      // 5. Create Bill (SKPD)
      const date = new Date();
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dueDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const billRes = await api.post('/api/bills', {
        tax_object_id: taxObject.id,
        amount: simulationResult.result,
        period: period,
        due_date: dueDate,
        metadata: finalVars
      });
      
      setCreatedBill(billRes.data || billRes);
      setLoading(false);
    } catch (err: any) {
      console.error("SKPD Generation Error:", err);
      setError(err.response?.data?.message || err.message || 'Gagal membuat dokumen SKPD otomatis.');
      setLoading(false);
    }
  };

  const handleDownloadSkpd = async () => {
    if (!createdBill) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/documents/skrd/${createdBill.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Gagal mengunduh dokumen SKPD');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SKPD-${createdBill.bill_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      alert('Gagal membuka dokumen PDF SKPD.');
    } finally {
      setDownloadingPdf(false);
    }
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-slate-950 px-6 text-center">
        <div className="relative mb-10">
          <div className="w-24 h-24 rounded-full bg-blue-500/10 animate-ping absolute inset-0" />
          <div className="w-24 h-24 rounded-full bg-blue-500/20 animate-pulse absolute inset-0" />
          <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-center relative z-10">
            <Loader2 className="w-10 h-10 animate-spin text-[#2d5cd5]" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Menyiapkan Dokumen SKPD</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
          Sistem sedang menarik data objek pajak dan menghitung nilai retribusi secara otomatis sesuai regulasi...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-red-100 dark:border-red-900/30">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Proses Terhenti</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mb-8">
          {error}
        </p>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
        >
          Kembali ke Sebelumnya
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="bg-gradient-to-br from-[#2d5cd5] to-blue-700 rounded-[3rem] p-1 shadow-2xl shadow-blue-500/20 mb-12">
        <div className="bg-white dark:bg-slate-900 rounded-[2.8rem] p-8 md:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SKPD Terbit!</h2>
                  <p className="text-slate-500 font-bold text-sm">Dokumen tagihan resmi telah berhasil dibuat.</p>
                </div>
             </div>
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Dokumen</p>
                <span className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Telah Disinkronisasi
                </span>
             </div>
          </div>

          {/* Document Content View */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 p-8 md:p-12 relative overflow-hidden group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-blue-100 dark:hover:border-slate-700">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <Receipt size={200} className="text-slate-900 dark:text-white" />
             </div>

             <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 pb-8 border-b-2 border-slate-200 dark:border-slate-700 border-dashed">
                  <div className="mb-6 md:mb-0">
                    <h3 className="text-[11px] font-black text-[#2d5cd5] uppercase tracking-[0.4em] mb-4">Pemerintah Kota Baubau</h3>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
                      SURAT KETETAPAN<br/>PAJAK DAERAH (SKPD)
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Bayar / Virtual Account</p>
                    <p className="text-2xl font-mono font-black text-[#2d5cd5] tracking-widest">{createdBill?.bill_number}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-12">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Klasifikasi Retribusi</p>
                      <p className="text-base font-black text-slate-800 dark:text-slate-200">{result?.classification}</p>
                   </div>
                   <div className="md:text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Masa Retribusi</p>
                      <p className="text-base font-black text-slate-800 dark:text-slate-200">{createdBill?.period}</p>
                   </div>

                   {result && Object.entries(result.variables).map(([key, val]) => (
                     <div key={key}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-base font-black text-slate-800 dark:text-slate-200">{Number(val).toLocaleString('id-ID')}</p>
                     </div>
                   ))}
                </div>

                <div className="pt-10 border-t-2 border-slate-200 dark:border-slate-700 border-dashed flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center md:text-left">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Pajak / Retribusi Terhutang</p>
                    <p className="text-4xl md:text-5xl font-black text-[#2d5cd5] tracking-tighter">
                       {result ? formatCurrency(result.result) : 'Rp 0'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center border-2 border-slate-200 dark:border-slate-600 grayscale opacity-40">
                        <Sparkles size={32} className="text-slate-400" />
                     </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
            <button
              onClick={handleDownloadSkpd}
              disabled={downloadingPdf}
              className="w-full sm:w-auto px-10 py-5 bg-[#2d5cd5] hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Mengunduh PDF...</>
              ) : (
                <><FileText size={18} /> Cetak / Download PDF</>
              )}
            </button>
            <button
              onClick={() => navigate(`/billing?search=${createdBill?.bill_number}`)}
              className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              Lanjut Pembayaran <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#2d5cd5] transition-colors"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
