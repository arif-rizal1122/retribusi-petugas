import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calculator, ChevronDown, Loader2, Sparkles, AlertCircle, RefreshCw, Info, Receipt } from 'lucide-react';
import { api } from '../lib/api';

interface TaxClassification {
  id: number;
  name: string;
  code: string;
  calculation_formula: string;
  retribution_type_id: number;
  retribution_type?: { id: number; name: string };
  form_schema?: { key: string; label: string; type: string; defaultValue?: string | number }[];
}

interface SimulationResult {
  classification: string;
  formula: string;
  variables: Record<string, number>;
  result: number;
  formatted: string;
}

export default function TaxCalculator() {
  const location = useLocation();
  const [classifications, setClassifications] = useState<TaxClassification[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const prefilledState = location.state as { 
    classificationId?: string | number, 
    defaultVars?: Record<string, any>
  } | null;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/api/tax-formulas');
      const clsList = resp.data || [];
      setClassifications(clsList);

      if (prefilledState?.classificationId) {
        const clsId = prefilledState.classificationId.toString();
        const cls = clsList.find((c: any) => c.id.toString() === clsId);
        if (cls) {
          setSelectedId(clsId);
          handleSelectClassification(clsId, clsList);
        }
      }
    } catch (err) {
      setError('Gagal memuat data kalkulator.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClassification = (id: string, list: TaxClassification[] = classifications) => {
    const cls = list.find(c => c.id.toString() === id);
    setSelectedId(id);
    setResult(null);
    setError('');
    
    if (cls) {
      const newVars: Record<string, string> = {};
      const formulaVars = cls.calculation_formula.replace(/[+\-*/().0-9\s]/g, ' ').split(/\s+/).filter(v => v && isNaN(Number(v)));
      
      formulaVars.forEach(v => {
        newVars[v] = prefilledState?.defaultVars?.[v]?.toString() || '';
      });
      setVariables(newVars);
    }
  };

  const handleCalculate = async () => {
    if (!selectedId) return;
    setCalculating(true);
    setError('');
    
    try {
      const vars: Record<string, any> = {};
      Object.entries(variables).forEach(([key, val]) => {
        // Keep as number if numeric, else keep as string
        vars[key] = !isNaN(Number(val)) && val !== '' ? parseFloat(val) : val;
      });

      const resp = await api.post('/api/simulate-tax', {
        classification_id: selectedId,
        variables: vars,
      });
      
      setResult(resp.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal melakukan perhitungan.');
    } finally {
      setCalculating(false);
    }
  };

  const handleReset = () => {
    setSelectedId('');
    setVariables({});
    setResult(null);
    setError('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getVariableLabel = (key: string): string => {
    const selected = classifications.find(c => c.id.toString() === selectedId);
    if (selected?.form_schema) {
      const field = selected.form_schema.find(f => f.key === key);
      if (field) return field.label;
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Memuat Kalkulator...</p>
      </div>
    );
  }

  const selected = classifications.find(c => c.id.toString() === selectedId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            Kalkulator <span className="text-[#0F2547]">Pajak</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Hitung perkiraan tagihan retribusi sesuai regulasi Perwali Nomor 58 Tahun 2024
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-[#0F2547]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Sparkles size={20} />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Parameter Kalkulator</h2>
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Jenis Pajak / Retribusi
                </label>
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={e => handleSelectClassification(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-blue-500/50 transition-all text-base"
                  >
                    <option value="">Pilih Klasifikasi Pajak...</option>
                    {classifications.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.retribution_type?.name ? `${cls.retribution_type.name} — ` : ''}{cls.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {selected && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-blue-500" />
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Rumus Perhitungan</p>
                    </div>
                    <code className="text-sm text-blue-900 dark:text-blue-300 font-mono font-bold break-all">
                      {selected.calculation_formula}
                    </code>
                  </div>

                  {Object.keys(variables).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(() => {
                        const schemaFields = selected.form_schema || [];
                        const keysToShow = schemaFields.length > 0 
                          ? schemaFields.map(f => f.key) 
                          : Object.keys(variables);

                        return keysToShow.map(key => {
                          const field = schemaFields.find(f => f.key === key);
                          const isDuration = key.toLowerCase().includes('bulan') || key.toLowerCase().includes('hari') || key.toLowerCase().includes('tahun') || key.toLowerCase().includes('durasi');
                          const type = field?.type || 'number';
                          
                          return (
                            <div key={key} className="group">
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                {field?.label || getVariableLabel(key)}
                              </label>
                              <div className="relative">
                                {type === 'select' ? (
                                  <div className="relative">
                                    <select
                                      value={variables[key]}
                                      onChange={e => setVariables({ ...variables, [key]: e.target.value })}
                                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-blue-500/50 transition-all text-base"
                                    >
                                      <option value="">Pilih...</option>
                                      {(field.options || []).map((opt: any, idx: number) => (
                                        <option key={idx} value={typeof opt === 'object' ? opt.value : opt}>
                                          {typeof opt === 'object' ? opt.label : opt}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                  </div>
                                ) : (
                                  <>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={variables[key]}
                                      onChange={e => setVariables({ ...variables, [key]: e.target.value })}
                                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:border-blue-500/50 transition-all pr-20"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                      {isDuration ? 'Durasi' : 'Nilai'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <div className="flex gap-4 mt-12">
                    <button
                      onClick={handleCalculate}
                      disabled={calculating || !selectedId}
                      className="flex-1 px-8 py-5 bg-[#0F2547] hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {calculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw size={18} />}
                      Hitung Simulasi
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="sticky top-8">
            <div className="bg-[#0F2547] dark:bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                     <Receipt size={20} className="text-blue-400" />
                   </div>
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Hasil Estimasi</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Total Tagihan</p>
                    <p className="text-4xl font-black tracking-tighter text-white">
                      {result ? formatCurrency(result.result) : 'Rp 0'}
                    </p>
                  </div>
                  
                  {result && (
                    <div className="pt-6 border-t border-white/5 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-center text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                        <span>Klasifikasi</span>
                        <span className="text-white">{result.classification}</span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Detail Perhitungan</p>
                        <div className="space-y-2">
                           {Object.entries(result.variables).map(([key, val]) => (
                             <div key={key} className="flex justify-between text-[11px]">
                               <span className="text-blue-200/60">{getVariableLabel(key)}</span>
                               <span className="font-bold text-slate-200">{Number(val).toLocaleString('id-ID')}</span>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!result && !calculating && (
                   <div className="mt-12 p-6 bg-white/5 border border-white/5 rounded-3xl text-center">
                      <Calculator size={32} className="mx-auto text-slate-600 mb-4 opacity-30" />
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                        Input parameter di samping untuk melihat estimasi tagihan retribusi.
                      </p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
