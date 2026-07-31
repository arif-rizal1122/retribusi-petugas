import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ArrowLeft, Edit, Loader2, User, CreditCard, MapPin, Phone,
  Briefcase, FileText, Calendar, Hash, ExternalLink, MapPinned,
  FileCheck, Image, Download, XCircle, Building2,
  Globe, Copy, Check
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import TaxpayerEditModal from '../components/TaxpayerEditModal';
import 'leaflet/dist/leaflet.css';
import { Calculator } from 'lucide-react';
import { getAccountStatus, getObjectVerificationStatus } from '../lib/taxpayerStatus';

export default function TaxpayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [taxpayer, setTaxpayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [relatedAssets, setRelatedAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchTaxpayer();
  }, [id]);

  const fetchTaxpayer = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/taxpayers/${id}`);
      setTaxpayer(res.data);
      setRelatedAssets(res.related_assets || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data wajib pajak');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 opacity-20 animate-ping absolute inset-0" />
          <Loader2 className="w-16 h-16 animate-spin text-emerald-600 relative z-10" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-6">Memuat data wajib pajak...</p>
      </div>
    );
  }

  if (error || !taxpayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-3 sm:px-4">
        <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl sm:rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6">
          <XCircle className="w-6 h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10 sm:w-12 sm:h-12 text-red-400" />
        </div>
        <h2 className="text-base sm:text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2">Data Tidak Ditemukan</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">{error || 'Wajib pajak dengan ID tersebut tidak ditemukan'}</p>
        <button onClick={() => navigate('/taxpayers')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95">
          ← Kembali ke Daftar
        </button>
      </div>
    );
  }

  const lat = taxpayer.latitude || taxpayer.tax_objects?.[0]?.latitude;
  const lng = taxpayer.longitude || taxpayer.tax_objects?.[0]?.longitude;
  const hasLocation = lat && lng;
  const accountStatus = getAccountStatus(taxpayer);
  const objectStatus = getObjectVerificationStatus(taxpayer);
  const taxObjects = taxpayer.tax_objects || [];
  const activeTaxObject = taxObjects.find((object: any) => object.status === 'active');

  // Separate metadata into files and fields
  const uploadedFiles: { key: string; label: string; url: string }[] = [];
  const metadataFields: { key: string; label: string; value: any }[] = [];

  if (taxpayer.metadata && typeof taxpayer.metadata === 'object') {
    Object.entries(taxpayer.metadata).forEach(([key, value]: [string, any]) => {
      if (key.startsWith('_')) return;
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
      if (isUrl) {
        uploadedFiles.push({ key, label, url: value as string });
      } else {
        metadataFields.push({ key, label, value });
      }
    });
  }

  const InfoCard = ({ icon: Icon, label, value, color = 'gray', copyable = false }: any) => (
    <div className="group relative bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon size={12} className={`text-${color}-500`} />
        </div>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{label}</span>
        {copyable && value && (
          <button
            onClick={() => copyToClipboard(String(value), label)}
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {copiedField === label ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
          </button>
        )}
      </div>
      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-relaxed">{value || <span className="text-gray-300 dark:text-gray-600 italic">Tidak diisi</span>}</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Floating Back + Edit Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-3 sm:px-4 pt-2 pb-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/taxpayers')}
          className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-xs sm:text-sm font-bold active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Kembali</span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
            taxpayer.is_active
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
          }`}>
            {accountStatus.label}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${objectStatus.className}`}>
            {objectStatus.label}
          </span>
          <button
            onClick={() => {
              if (!activeTaxObject) return;
              const taxObject = activeTaxObject;
              navigate('/skpd/create', {
                state: {
                  taxObjectId: taxObject.id,
                  classificationId: taxObject.retribution_classification_id || '',
                  defaultVars: taxObject.metadata || {},
                  
                }
              });
            }}
            disabled={!activeTaxObject}
            className={`flex items-center gap-2 px-3 py-2 sm:px-3 sm:px-4 sm:py-2 text-white rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 ${
              activeTaxObject
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
          >
            <Calculator size={13} />
            <span className="hidden sm:inline">Buat SKPD</span>
            <span className="sm:hidden">SKPD</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Edit size={13} />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* HERO SECTION - Identity */}
      {/* ========================================== */}
      <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-blue-600 rounded-[2rem] p-4 sm:p-6 md:p-8 text-white overflow-hidden shadow-2xl shadow-emerald-500/25 mb-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.04] rounded-full -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/[0.04] rounded-full -ml-20 -mb-20" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/[0.03] rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
            <div className="w-20 h-20 bg-white/15 backdrop-blur-md rounded-[1.2rem] flex items-center justify-center text-base sm:text-lg sm:text-xl sm:text-2xl sm:text-3xl font-black border-2 border-white/20 shadow-lg">
              {taxpayer.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg sm:text-xl sm:text-2xl md:text-base sm:text-lg sm:text-xl sm:text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-1">{taxpayer.name}</h1>
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-3">Wajib Pajak Retribusi Daerah</p>
              <div className="flex flex-wrap gap-2">
                {taxpayer.opd && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    <Building2 size={10} />
                    {taxpayer.opd.name}
                  </span>
                )}
                {taxpayer.npwpd && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    <CreditCard size={10} />
                    NPWPD: {taxpayer.npwpd}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { icon: Hash, label: 'NIK', value: taxpayer.nik },
              { icon: Phone, label: 'Telepon', value: taxpayer.phone },
              { icon: MapPin, label: 'Kecamatan', value: taxpayer.district },
              { icon: Calendar, label: 'Terdaftar', value: taxpayer.created_at ? new Date(taxpayer.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={10} className="text-white/50" />
                  <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">{label}</span>
                </div>
                <p className="text-[13px] font-bold truncate">{value || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 1 - Alamat */}
      {/* ========================================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <MapPin size={14} className="text-blue-500" />
          <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Alamat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          <InfoCard icon={MapPin} label="Alamat Domisili" value={taxpayer.address} color="blue" />
          <InfoCard icon={Globe} label="Kelurahan" value={taxpayer.sub_district} color="blue" />
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 2 - Objek Retribusi */}
      {/* ========================================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Briefcase size={14} className="text-indigo-500" />
          <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Objek Retribusi</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3">
          <InfoCard icon={Briefcase} label="Nama Objek" value={taxpayer.object_name} color="indigo" />
          <InfoCard icon={MapPin} label="Alamat Objek" value={taxpayer.object_address || taxpayer.address} color="indigo" />
        </div>

        <div className="bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between">
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-1">Status Objek</span>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{objectStatus.description}</p>
            </div>
            <span className={`inline-flex self-start px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${objectStatus.className}`}>
              {objectStatus.label}
            </span>
          </div>

          {taxObjects.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {taxObjects.map((object: any) => (
                <div key={object.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/70 dark:bg-gray-900/30">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">{object.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 truncate">{object.classification?.name || object.retribution_type?.name || '-'}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                      object.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : object.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : object.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {object.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Klasifikasi Badges */}
        {taxpayer.retribution_classifications?.length > 0 && (
          <div className="bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50 mb-3">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-3">Klasifikasi Terdaftar</span>
            <div className="flex flex-wrap gap-2">
              {taxpayer.retribution_classifications.map((cls: any) => (
                <span key={cls.id} className="relative overflow-hidden px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider shadow-md shadow-blue-500/20">
                  <span className="relative z-10">{cls.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {taxpayer.retribution_types?.length > 0 && (
          <div className="bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700/50">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-3">Jenis Retribusi</span>
            <div className="flex flex-wrap gap-2">
              {taxpayer.retribution_types.map((type: any) => (
                <span key={type.id} className="px-3 sm:px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider shadow-md shadow-violet-500/20">
                  {type.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* SECTION 3 - Data Teknis / Metadata */}
      {/* ========================================== */}
      {metadataFields.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <FileText size={14} className="text-amber-500" />
            <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Data Teknis</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {metadataFields.map(({ key, label, value }) => (
              <InfoCard key={key} icon={FileText} label={label} value={String(value)} color="amber" copyable />
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SECTION 4 - Dokumen Upload */}
      {/* ========================================== */}
      {uploadedFiles.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <FileCheck size={14} className="text-violet-500" />
            <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Dokumen Terupload</h2>
            <span className="ml-auto px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[9px] font-black rounded-full uppercase tracking-widest">
              {uploadedFiles.length} File
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 sm:gap-4">
            {uploadedFiles.map(({ key, label, url }) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
              const isPdf = /\.pdf/i.test(url);

              return (
                <div key={key} className="bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 group">
                  {/* File Label */}
                  <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border-b border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isImage ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {isImage ? <Image size={12} className="text-green-600" /> : <FileText size={12} className="text-red-500" />}
                      </div>
                      <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-[0.1em]">{label}</span>
                    </div>
                  </div>

                  {/* Preview Area */}
                  {isImage ? (
                    <div
                      className="relative cursor-pointer overflow-hidden"
                      onClick={() => setLightboxUrl(url)}
                    >
                      <img
                        src={url}
                        alt={label}
                        className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <span className="px-3 sm:px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black text-gray-900 uppercase tracking-widest shadow-lg">
                          Klik untuk perbesar
                        </span>
                      </div>
                    </div>
                  ) : isPdf ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-red-500/10">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                      </div>
                      <span className="text-xs font-black text-red-600/80 uppercase tracking-widest">Dokumen PDF</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3">
                        <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">File</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="p-3 border-t border-gray-100 dark:border-gray-700/50 flex gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                    >
                      <ExternalLink size={12} />
                      Buka
                    </a>
                    <a
                      href={url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Download size={12} />
                      Unduh
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SECTION 5 - Location Map */}
      {/* ========================================== */}
      {hasLocation && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <MapPinned size={14} className="text-teal-500" />
            <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Lokasi Objek</h2>
          </div>
          <div className="bg-white dark:bg-gray-800/60 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="h-64 md:h-80 relative z-0">
              <MapContainer
                center={[lat, lng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]}>
                  <Popup>
                    <div className="p-3 min-w-[180px] font-sans">
                      <h3 className="font-black text-slate-900 text-xs sm:text-sm mb-1">{taxpayer.object_name || taxpayer.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                          {taxpayer.retribution_classifications?.[0]?.name || 'N/A'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="grid grid-cols-2 gap-0 border-t border-gray-100 dark:border-gray-700/50">
              <div className="p-3 border-r border-gray-100 dark:border-gray-700/50">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Latitude</span>
                <p className="text-xs font-bold text-gray-900 dark:text-white font-mono mt-0.5">{Number(lat).toFixed(6)}</p>
              </div>
              <div className="p-3">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Longitude</span>
                <p className="text-xs font-bold text-gray-900 dark:text-white font-mono mt-0.5">{Number(lng).toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SECTION 6 - Related Assets (NIK Based) */}
      {/* ========================================== */}
      {relatedAssets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1">
            <User size={14} className="text-emerald-500" />
            <h2 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em]">Aset & Potensi Lainnya (NIK Terkait)</h2>
            <span className="ml-auto px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded-full uppercase tracking-widest">
              {relatedAssets.length} Aset Terdeteksi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 sm:gap-4">
            {relatedAssets.map((asset) => {
              const targetTaxpayerId = asset.taxpayer_id || asset.taxpayer?.id;
              const assetClassification = asset.classification || asset.retribution_classifications?.[0];
              const assetType = asset.retribution_type || asset.retributionType;
              const isAssetActive = asset.status === 'active';

              return (
              <div 
                key={asset.id}
                onClick={() => targetTaxpayerId && navigate(`/taxpayers/${targetTaxpayerId}`)}
                className="group bg-white dark:bg-gray-800/60 rounded-[1.5rem] p-5 border border-gray-100 dark:border-gray-700/50 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                      <Briefcase size={16} className="text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Detail <ArrowLeft size={10} className="rotate-180" />
                    </div>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 transition-colors">{asset.name || asset.object_name || '-'}</h3>
                  <div className="flex items-center gap-1.5 mb-4">
                    <MapPin size={10} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 truncate max-w-[200px]">{asset.address || asset.object_address || asset.taxpayer?.district || 'Alamat tidak tersedia'}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {assetClassification && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[8px] font-black rounded-md uppercase tracking-wider">
                        {assetClassification.name}
                      </span>
                    )}
                    {assetType && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[8px] font-black rounded-md uppercase tracking-wider">
                        {assetType.name}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                      isAssetActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : asset.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : asset.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {asset.status || 'unknown'}
                    </span>
                  </div>
                  
                  {/* Shortcut Buat SKPD */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAssetActive) return;
                        navigate('/skpd/create', {
                          state: {
                            taxObjectId: asset.id,
                            classificationId: asset.retribution_classification_id || assetClassification?.id || '',
                            defaultVars: asset.metadata || {},
                            
                          }
                        });
                      }}
                      disabled={!isAssetActive}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors border ${
                        isAssetActive
                          ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Calculator size={11} /> Buat SKPD
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* FOOTER - Timestamps & Creator */}
      {/* ========================================== */}
      <div className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 dark:from-gray-800/40 dark:via-gray-800/20 dark:to-gray-800/40 rounded-xl sm:rounded-2xl p-5 border border-gray-100 dark:border-gray-700/30">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-gray-300" />
            Dibuat: {taxpayer.created_at ? new Date(taxpayer.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
          </div>
          {taxpayer.updated_at && taxpayer.updated_at !== taxpayer.created_at && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-gray-300" />
              Diperbarui: {new Date(taxpayer.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {taxpayer.creator && (
            <div className="flex items-center gap-1.5">
              <User size={11} className="text-gray-300" />
              Didaftarkan oleh: <span className="text-gray-600 dark:text-gray-300">{taxpayer.creator.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* IMAGE LIGHTBOX */}
      {/* ========================================== */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 transition-all border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} /> Tab Baru
              </a>
              <button
                onClick={() => setLightboxUrl(null)}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all border border-white/10"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <TaxpayerEditModal
        isOpen={showEditModal}
        taxpayer={taxpayer}
        onClose={() => setShowEditModal(false)}
        onSaved={() => { setShowEditModal(false); fetchTaxpayer(); }}
      />
    </div>
  );
}
