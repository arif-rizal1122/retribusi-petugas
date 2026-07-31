// @ts-nocheck
import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Taxpayer, Opd, RetributionType } from '../types';
import {
  Plus, Edit, User, CreditCard, MapPin,
  FileCheck, Camera, Info, CheckCircle2, XCircle, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import { MapPicker } from '../components/MapPicker';
import { formatNPWPD } from '../lib/formatUtils';
import 'leaflet/dist/leaflet.css';

const BAUBAU_DATA: Record<string, string[]> = {
  "Batupoaro": ["Bone-bone", "Tarafu", "Wameo", "Kaobula", "Lanto", "Ngananaumala"],
  "Betoambari": ["Sulaa", "Waborobo", "Labalawa", "Lipu", "Katobengke"],
  "Bungi": ["Bugi", "Gonda Baru", "Kaisabu Baru", "Karya Baru", "Ngkari-Ngkari"],
  "Kokalukuna": ["Kadolomoko", "Waruruma", "Lakologou", "Kadolo", "Liwuto", "Sukanaeyo"],
  "Lea-lea": ["Palabusa", "Kalia-Lia", "Kantalai", "Kolese", "Lowu-Lowu"],
  "Murhum": ["Baadia", "Melai", "Wajo", "Lamangga", "Tanganapada"],
  "Sorawolio": ["Gonda Baru", "Karya Baru", "Bugis", "Gonda"],
  "Wolio": ["Bataraguru", "Tomba", "Wangkanapi", "Wale", "Batulo", "Bukit Wolio Indah", "Kadolokatapi"]
};

interface TaxpayerEditModalProps {
  isOpen: boolean;
  taxpayer: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaxpayerEditModal({ isOpen, taxpayer, onClose, onSaved }: TaxpayerEditModalProps) {
  const { user } = useAuth();
  const [opds, setOpds] = useState<Opd[]>([]);
  const [retributionTypes, setRetributionTypes] = useState<RetributionType[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isCheckingNik, setIsCheckingNik] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState({
    nik: '', name: '', address: '', phone: '', npwpd: '',
    object_name: '', object_address: '', district: '', sub_district: '',
    latitude: -5.4632, longitude: 122.6075, is_active: true, opd_id: '',
    retribution_type_ids: [] as number[],
    retribution_classification_ids: [] as number[],
    metadata: {} as Record<string, any>,
  });

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (key: string, file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maksimal 5MB per file.`);
      return;
    }
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const removeFile = (key: string) => {
    setFiles(prev => ({ ...prev, [key]: null }));
  };

  // Fetch reference data
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [opdsRes, typesRes, classificationsRes] = await Promise.all([
          user?.role === 'super_admin' ? api.get('/api/opds') : Promise.resolve({ data: [] }),
          api.get('/api/retribution-types'),
          api.get('/api/retribution-classifications'),
        ]);
        if (user?.role === 'super_admin') setOpds(opdsRes.data || opdsRes);
        setRetributionTypes(((typesRes as any).data || typesRes).filter((t: any) => t.is_active));
        setClassifications((classificationsRes as any).data || classificationsRes);
        setLoaded(true);
      } catch {}
    })();
  }, [isOpen]);

  // Populate form when taxpayer changes
  useEffect(() => {
    if (!taxpayer || !isOpen) return;
    setForm({
      nik: taxpayer.nik ?? '',
      name: taxpayer.name ?? '',
      address: taxpayer.address || '',
      phone: taxpayer.phone || '',
      npwpd: taxpayer.npwpd || '',
      object_name: taxpayer.object_name || '',
      object_address: taxpayer.object_address || '',
      district: taxpayer.district || '',
      sub_district: taxpayer.sub_district || '',
      is_active: taxpayer.is_active ?? true,
      latitude: parseFloat(taxpayer.latitude) || -5.4632,
      longitude: parseFloat(taxpayer.longitude) || 122.6075,
      opd_id: taxpayer.opd_id?.toString() ?? '',
      retribution_type_ids: taxpayer.retribution_types?.map((t: any) => t.id) || [],
      retribution_classification_ids: taxpayer.retribution_classifications?.map((c: any) => c.id) || [],
      metadata: taxpayer.metadata || {},
    });
    setFiles({});
    setCurrentStep(1);
  }, [taxpayer, isOpen]);

  const checkNik = async () => {
    if (!form.nik || !/^\d{16}$/.test(form.nik)) {
      alert('NIK harus 16 digit angka.');
      return;
    }
    setIsCheckingNik(true);
    try {
      const res = await api.get(`/api/taxpayers/search/${form.nik}`);
      if (res.found && res.data) {
        setForm(prev => ({ ...prev, name: res.data.name, address: res.data.address || '', phone: res.data.phone || '' }));
        alert('Data ditemukan!');
      } else {
        alert('NIK belum terdaftar.');
      }
    } catch { alert('Gagal cek NIK.'); }
    finally { setIsCheckingNik(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'retribution_type_ids') form.retribution_type_ids.forEach(id => formData.append('retribution_type_ids[]', id.toString()));
        else if (key === 'retribution_classification_ids') form.retribution_classification_ids.forEach(id => formData.append('retribution_classification_ids[]', id.toString()));
        else if (key === 'latitude' || key === 'longitude') formData.append(key, (form as any)[key].toString());
        else if (key === 'metadata') formData.append('metadata', JSON.stringify(form.metadata));
        else formData.append(key, (form as any)[key]);
      });

      const selectedCls = classifications.filter(c => form.retribution_classification_ids.includes(c.id));
      const reqs = selectedCls.reduce((acc: any[], cur: any) => {
        cur.requirements?.forEach((r: any) => { if (!acc.find((a: any) => a.key === r.key)) acc.push(r); });
        return acc;
      }, []);
      reqs.forEach((req: any) => { if (files[req.key]) formData.append(req.key, files[req.key] as File); });

      formData.append('_method', 'PUT');
      await api.post(`/api/taxpayers/${taxpayer.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan data';
      const detail = error.response?.data?.errors ? '\n' + Object.values(error.response.data.errors).flat().join('\n') : '';
      alert(msg + detail);
    } finally { setSubmitting(false); }
  };

  const toggleClassification = (id: number, typeId: number) => {
    setForm(prev => {
      const isSelected = prev.retribution_classification_ids.includes(id);
      const newCids = isSelected ? prev.retribution_classification_ids.filter(c => c !== id) : [...prev.retribution_classification_ids, id];
      const newTids = !isSelected && !prev.retribution_type_ids.includes(typeId) ? [...prev.retribution_type_ids, typeId] : prev.retribution_type_ids;
      return { ...prev, retribution_type_ids: newTids, retribution_classification_ids: newCids };
    });
  };

  function MapEvents() {
    useMapEvents({ click(e) { setForm(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng })); } });
    return null;
  }

  const filteredRetributionTypes = useMemo(() => {
    const oid = parseInt(form.opd_id);
    if (!oid) return [];
    return retributionTypes.filter(t => t.opd_id === oid);
  }, [form.opd_id, retributionTypes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[200] p-0 sm:p-4 pb-24 sm:pb-4 transition-all duration-500 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 sm:rounded-[2rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] max-w-5xl w-full sm:max-h-[92vh] flex flex-col md:flex-row sm:overflow-hidden animate-in fade-in zoom-in duration-300 relative mb-20 sm:mb-0">
        
        {/* Left Sidebar: Stepper */}
        <div className="hidden md:flex w-80 bg-slate-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-800 p-10 flex-col shrink-0">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg"><User className="w-5 h-5 text-white" /></div>
              <span className="font-black text-xl tracking-tighter">RETRIBUSI</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Perbarui Data</h2>
          </div>
          <div className="flex-1 space-y-2 relative">
            <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            {[
              { id: 1, title: 'Identitas WP', icon: User },
              { id: 2, title: 'Objek & Kategori', icon: CreditCard },
              { id: 3, title: 'Data Dukung', icon: FileCheck },
              { id: 4, title: 'Lokasi', icon: MapPin },
              { id: 5, title: 'Review', icon: CheckCircle2 },
            ].map((step) => (
              <div key={step.id} className="relative z-10 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                  currentStep === step.id ? 'bg-blue-600 border-blue-100 dark:border-blue-900 text-white shadow-lg'
                  : currentStep > step.id ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-50 dark:border-gray-800 text-gray-400'
                }`}>
                  {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === step.id ? 'text-blue-600' : 'text-gray-400'}`}>Step 0{step.id}</span>
                  <span className={`text-sm font-bold ${currentStep === step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{step.title}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="mt-10 py-4 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
            Batalkan
          </button>
        </div>

        {/* Mobile Stepper */}
        <div className="md:hidden sticky top-0 z-[210] px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><User size={18} /></div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Step 0{currentStep}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {['Identitas WP', 'Objek & Kategori', 'Data Dukung', 'Lokasi', 'Review'][currentStep - 1]}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${currentStep === s ? 'w-6 bg-blue-600' : currentStep > s ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 pb-40 sm:pb-6 custom-scrollbar">
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-500 pb-6">
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Identitas Wajib Pajak</h3>
                  <p className="text-gray-500 text-sm font-medium">Gunakan NIK untuk mencari atau mendaftarkan subjek pajak</p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {user?.role === 'super_admin' ? (
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Dinas/OPD</label>
                      <select value={form.opd_id} onChange={e => setForm({...form, opd_id: e.target.value, retribution_type_ids: [], retribution_classification_ids: []})}
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold">
                        <option value="">Pilih Dinas</option>
                        {opds.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dinas Pengelola</label>
                      <div className="text-blue-900 dark:text-blue-200 font-bold">{user?.department || 'OPD Terkait'}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">NIK</label>
                      <div className="relative">
                        <input type="text" maxLength={16} placeholder="01010102302..." value={form.nik}
                          onChange={e => setForm({...form, nik: e.target.value.replace(/\D/g, '')})}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold pr-28" />
                        <button type="button" onClick={checkNik} disabled={isCheckingNik || !form.nik}
                          className="absolute right-2 top-2 bottom-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:bg-gray-300">
                          {isCheckingNik ? '...' : 'Cek NIK'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                      <input type="text" placeholder="Sesuai KTP" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">No. WhatsApp</label>
                      <input type="text" placeholder="0812..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">NPWPD</label>
                      <div className="relative">
                        <input type="text" readOnly placeholder="Otomatis (Berdasarkan NIK)" value={form.npwpd}
                          className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-500 cursor-not-allowed" />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded uppercase tracking-widest">Auto</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alamat Domisili</label>
                    <textarea rows={2} placeholder="Alamat penanggung jawab..." value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-10">
                <div>
                  <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Data Objek & Kategori</h3>
                  <p className="text-gray-500 text-sm font-medium">Tentukan nama objek dan klasifikasi retribusi</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Objek/Unit</label>
                    <input type="text" placeholder="Contoh: Kios Pasar B" value={form.object_name} onChange={e => setForm({...form, object_name: e.target.value})}
                      className="w-full px-6 py-4 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-emerald-900 rounded-2xl font-black text-lg shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kecamatan</label>
                    <select value={form.district} onChange={e => setForm({...form, district: e.target.value, sub_district: ''})}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold cursor-pointer">
                      <option value="">Pilih Kecamatan</option>
                      {Object.keys(BAUBAU_DATA).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Kelurahan</label>
                    <select value={form.sub_district} onChange={e => setForm({...form, sub_district: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold cursor-pointer" disabled={!form.district}>
                      <option value="">Pilih Kelurahan</option>
                      {form.district && BAUBAU_DATA[form.district]?.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Alamat Objek</label>
                    <textarea rows={2} placeholder="Alamat unit retribusi..." value={form.object_address} onChange={e => setForm({...form, object_address: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none" />
                  </div>
                </div>

                {/* Classification Picker */}
                <div className="bg-slate-50 dark:bg-gray-800/10 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600"><CreditCard size={20} /></div>
                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Pilih Klasifikasi</h4>
                  </div>
                  {!form.opd_id ? (
                    <div className="py-12 text-center bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Pilih Dinas pada langkah sebelumnya</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                      {filteredRetributionTypes.map(type => (
                        <div key={type.id} className="space-y-4">
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">{type.name}</h5>
                          <div className="space-y-2">
                            {classifications.filter(c => c.retribution_type_id === type.id).map(cls => (
                              <div key={cls.id} onClick={() => toggleClassification(cls.id, type.id)}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                  form.retribution_classification_ids.includes(cls.id) ? 'border-emerald-500 bg-white dark:bg-gray-800 shadow-md' : 'border-gray-50 dark:border-gray-800 bg-gray-50/50'
                                }`}>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  form.retribution_classification_ids.includes(cls.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                                }`}>
                                  {form.retribution_classification_ids.includes(cls.id) && <Plus className="w-4 h-4 text-white" />}
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-tight ${
                                  form.retribution_classification_ids.includes(cls.id) ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                                }`}>{cls.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 pb-10">
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Data Dukung</h3>
                  <p className="text-gray-500 text-sm font-medium">Lengkapi formulir teknis dan unggah dokumen</p>
                </div>

                {classifications.filter(c => form.retribution_classification_ids.includes(c.id)).map(cls => (
                  <div key={cls.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full border border-emerald-100">{cls.name}</span>
                      <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800" />
                    </div>

                    {cls.form_schema && cls.form_schema.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-gray-800/30 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                        {cls.form_schema.map((field: any) => (
                          <div key={field.key} className={`${field.type === 'google_map' ? 'col-span-1 md:col-span-2' : ''}`}>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{field.label}</label>
                            {field.type === 'select' ? (
                              <select value={form.metadata[field.key] || ''} onChange={e => setForm({...form, metadata: {...form.metadata, [field.key]: e.target.value}})}
                                className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm">
                                <option value="">Pilih {field.label}</option>
                                {field.options?.map((opt: any) => (
                                  <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
                                    {typeof opt === 'object' ? opt.label : opt}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'constant' ? (
                              <div className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-sm text-gray-500 cursor-not-allowed">
                                {(() => {
                                  if (!form.metadata[field.key] && field.default_value) {
                                    setTimeout(() => setForm(prev => ({...prev, metadata: {...prev.metadata, [field.key]: field.default_value}})), 0);
                                  }
                                  return form.metadata[field.key] || field.default_value || '-';
                                })()}
                              </div>
                            ) : field.type === 'textarea' ? (
                              <textarea rows={3} value={form.metadata[field.key] || ''} onChange={e => setForm({...form, metadata: {...form.metadata, [field.key]: e.target.value}})}
                                className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm resize-none" placeholder={field.label} />
                            ) : field.type === 'checkbox' ? (
                              <label className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-blue-300">
                                <input type="checkbox" checked={form.metadata[field.key] === 'Ya' || form.metadata[field.key] === true}
                                  onChange={e => setForm({...form, metadata: {...form.metadata, [field.key]: e.target.checked ? 'Ya' : 'Tidak'}})}
                                  className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{form.metadata[field.key] === 'Ya' ? 'Ya' : 'Tidak'}</span>
                              </label>
                            ) : field.type === 'google_map' ? (
                              <MapPicker 
                                label={field.label} 
                                value={form.metadata[field.key] || ''}
                                onChange={(val: string) => {
                                  const [lat, lng] = val.split(',').map(Number);
                                  setForm({
                                    ...form,
                                    latitude: lat || form.latitude,
                                    longitude: lng || form.longitude,
                                    metadata: { ...form.metadata, [field.key]: val }
                                  });
                                }} 
                              />
                            ) : (
                              <input type={field.type} value={form.metadata[field.key] || ''} onChange={e => setForm({...form, metadata: {...form.metadata, [field.key]: e.target.value}})}
                                className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm" placeholder={field.label} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {cls.requirements && cls.requirements.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cls.requirements.map((req: any, idx: number) => (
                          <div key={req.key} className="block">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{req.label}</div>
                            <label className="block cursor-pointer">
                              <div className={`p-8 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-4 transition-all relative ${
                                files[req.key] ? 'bg-emerald-50 border-emerald-500/50' : idx % 2 === 0 ? 'bg-orange-50/50 border-orange-100 hover:border-orange-500' : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-500'
                              }`}>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => handleFileChange(req.key, e.target.files?.[0] || null)} className="hidden" />
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${files[req.key] ? 'bg-emerald-500 text-white' : idx % 2 === 0 ? 'bg-white text-orange-400' : 'bg-white text-indigo-400'}`}>
                                  {idx % 2 === 0 ? <Camera className="w-7 h-7" /> : <FileCheck className="w-7 h-7" />}
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter text-center">
                                  {files[req.key] ? (files[req.key] as File).name : 'Klik untuk Upload'}
                                </span>
                                {files[req.key] && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeFile(req.key); }}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all active:scale-90"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {form.retribution_classification_ids.length === 0 && (
                  <div className="py-20 text-center text-gray-400 bg-slate-50 dark:bg-gray-800/10 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-center gap-4">
                      <Info className="w-8 h-8 text-gray-300" />
                      <p className="font-bold uppercase text-[11px] tracking-widest">Pilih klasifikasi untuk melihat formulir tambahan</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 flex flex-col h-full pb-10">
                <div>
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Lokasi Objek</h3>
                  <p className="text-gray-500 text-sm font-medium">Tentukan koordinat lokasi unit retribusi</p>
                </div>
                <div className="h-[300px] sm:flex-1 sm:min-h-[400px] rounded-[2rem] overflow-hidden border-2 border-gray-100 dark:border-gray-800 bg-gray-50 shadow-inner relative z-0">
                  <MapContainer center={[form.latitude, form.longitude]} zoom={15} style={{height:'100%',width:'100%'}} scrollWheelZoom={true}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents />
                    <Marker 
                      position={[form.latitude, form.longitude]}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const marker = e.target;
                          const position = marker.getLatLng();
                          const newLat = position.lat;
                          const newLng = position.lng;

                          // Sync back to metadata if google_map exists
                          const newMetadata = { ...form.metadata };
                          Object.keys(newMetadata).forEach(key => {
                            if (key.includes('map') || key.includes('lokasi')) {
                              newMetadata[key] = `${newLat},${newLng}`;
                            }
                          });

                          setForm(prev => ({ 
                            ...prev, 
                            latitude: newLat, 
                            longitude: newLng, 
                            metadata: newMetadata 
                          }));
                        }
                      }}
                    >
                      <Popup>Lokasi Utama Objek: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: parseFloat(e.target.value)})}
                      className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: parseFloat(e.target.value)})}
                      className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-10">
                <div>
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Review & Selesai</h3>
                  <p className="text-gray-500 text-sm font-medium">Tinjau kembali data</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800 sm:col-span-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nama Wajib Pajak</div>
                    <div className="text-gray-900 dark:text-white font-bold">{form.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1">NIK: {form.nik}</div>
                  </div>
                  <div className="col-span-1 sm:col-span-2 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Klasifikasi & Objek Terpilih</div>
                    {classifications
                      ?.filter(c => form.retribution_classification_ids.includes(c.id))
                      ?.map(c => {
                        const objName = form.metadata?.[`_object_name_${c.id}`] || form.object_name || '-';
                        return (
                          <div key={c.id} className="mb-2 last:mb-0 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[8px] font-black rounded-lg uppercase tracking-wider">{c.name}</span>
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{objName}</div>
                          </div>
                        );
                      })}
                    {(!classifications?.filter(c => form.retribution_classification_ids.includes(c.id))?.length) && (
                      <div className="text-gray-400 text-sm italic">Belum ada klasifikasi dipilih</div>
                    )}
                  </div>
                </div>
                <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-lg shadow-blue-500/20">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl"><CheckCircle2 className="w-6 h-6" /></div>
                    <h4 className="font-black text-lg">Konfirmasi</h4>
                  </div>
                  <p className="text-blue-100 text-sm font-medium leading-relaxed">
                    Pastikan seluruh data yang dimasukkan telah sesuai.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-4 sm:p-6 md:p-10 border-t border-gray-100 dark:border-gray-800 flex justify-between bg-white dark:bg-gray-900 sm:rounded-b-[2rem] sticky bottom-0 z-[205] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:shadow-none mb-20 sm:mb-0">
            <button type="button" onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)} disabled={currentStep === 1}
              className="px-10 py-4 border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-2xl hover:bg-gray-50 disabled:opacity-0 transition-all active:scale-95">
              Prev
            </button>
            {currentStep < 5 ? (
              <button type="button" onClick={() => {
                const nextStep = currentStep + 1;
                if (nextStep === 5 && !form.object_name) {
                  const classificationsWithObj = classifications?.filter(
                    (c: any) => form.retribution_classification_ids.includes(c.id) && form.metadata?.[`_object_name_${c.id}`]
                  ) || [];
                  if (classificationsWithObj.length === 1) {
                    setForm(prev => ({ ...prev, object_name: form.metadata[`_object_name_${classificationsWithObj[0].id}`] }));
                  } else if (classificationsWithObj.length > 1) {
                    setForm(prev => ({ ...prev, object_name: `${classificationsWithObj.length} Objek Terdaftar` }));
                  }
                }
                setCurrentStep(nextStep);
              }}
                className="px-12 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">
                Lanjut
              </button>
            ) : (
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-95">
                {submitting ? '...' : 'Simpan Perubahan'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
