// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import {
  Loader2, Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Zona, RetributionType, RetributionClassification, RetributionRate } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function MasterData() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'jenis' | 'klasifikasi' | 'zona' | 'tarif'>('jenis');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [retributionTypes, setRetributionTypes] = useState<RetributionType[]>([]);
  const [classifications, setClassifications] = useState<RetributionClassification[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [rates, setRates] = useState<RetributionRate[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, classRes, zonesRes, ratesRes] = await Promise.all([
        api.get('/api/retribution-types'),
        api.get('/api/retribution-classifications'),
        api.get('/api/zones'),
        api.get('/api/retribution-rates'),
      ]);

      // Only show active retribution types as per user request
      setRetributionTypes((typesRes.data || typesRes).filter((t: any) => t.is_active));
      setClassifications(classRes.data || classRes);
      setZonas(zonesRes.data || zonesRes);
      setRates(ratesRes.data || ratesRes);
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRetributionTypes = useMemo(() => {
    if (!user) return [];
    let list = retributionTypes;
    if (user.role !== 'super_admin') {
      list = list.filter(t => t.opd_id === user.opd_id);
    }
    if (search) {
      list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [user, retributionTypes, search]);

  const filteredClassifications = useMemo(() => {
    if (!user) return [];
    let list = classifications;
    if (user.role !== 'super_admin') {
      list = list.filter(c => c.opd_id === user.opd_id);
    }
    if (search) {
      list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [user, classifications, search]);

  const filteredZonas = useMemo(() => {
    if (!user) return [];
    let list = zonas;
    if (user.role !== 'super_admin') {
      list = list.filter(z => z.opd_id === user.opd_id);
    }
    if (search) {
      list = list.filter(z => z.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [user, zonas, search]);

  const filteredRates = useMemo(() => {
    if (!user) return [];
    let list = rates;
    if (user.role !== 'super_admin') {
      list = list.filter(r => r.opd_id === user.opd_id);
    }
    if (search) {
      list = list.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [user, rates, search]);

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Master Data</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Informasi tarif, zona, dan klasifikasi yang berlaku
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              {(['jenis', 'klasifikasi', 'zona', 'tarif'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearch('');
                  }}
                  className={`py-6 px-2 border-b-2 font-bold text-xs uppercase tracking-[0.2em] transition-all ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-0">
          {activeTab === 'jenis' && (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Retribusi</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarif Dasar</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">OPD Pengelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredRetributionTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{type.name}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase">
                            Jasa Umum
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(type.base_amount))}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Per {type.unit}</div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-gray-600 dark:text-gray-400">{type.opd?.name}</td>
                      </tr>
                    ))}
                    {filteredRetributionTypes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                          Tidak ada data jenis retribusi aktif ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRetributionTypes.length > 0 ? (
                  filteredRetributionTypes.map((type) => (
                    <div key={type.id} className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">{type.name}</h4>
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[8px] font-black rounded uppercase tracking-widest">
                            Jasa Umum
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(Number(type.base_amount))}</p>
                          <p className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">Per {type.unit}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 leading-tight">OPD: {type.opd?.name}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    Tidak ada data ditemukan
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'klasifikasi' && (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Klasifikasi</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Retribusi</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rumus</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredClassifications.map((cls) => (
                      <tr key={cls.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            {cls.icon && (
                              <img 
                                src={cls.icon.startsWith('http') ? cls.icon : `${import.meta.env.VITE_API_URL}${cls.icon.startsWith('/') ? '' : '/'}${cls.icon}`} 
                                alt="" 
                                className="w-8 h-8 object-contain" 
                              />
                            )}
                            <div className="font-bold text-gray-900 dark:text-white text-sm">{cls.name}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-gray-600 dark:text-gray-400">{cls.retribution_type?.name}</td>
                        <td className="px-8 py-5 text-sm font-mono text-gray-500">{cls.code || '-'}</td>
                        <td className="px-8 py-5">
                          <code className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold rounded">
                            {cls.calculation_formula || '-'}
                          </code>
                        </td>
                        <td className="px-8 py-5 text-xs text-gray-400 max-w-xs truncate">{cls.description || '-'}</td>
                      </tr>
                    ))}
                    {filteredClassifications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                          Tidak ada data klasifikasi ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredClassifications.length > 0 ? (
                  filteredClassifications.map((cls) => (
                    <div key={cls.id} className="p-5 space-y-3">
                      <div className="flex items-center gap-4">
                        {cls.icon && (
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center p-2">
                             <img 
                              src={cls.icon.startsWith('http') ? cls.icon : `${import.meta.env.VITE_API_URL}${cls.icon.startsWith('/') ? '' : '/'}${cls.icon}`} 
                              alt="" 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white mb-0.5">{cls.name}</h4>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{cls.code || '-'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500">Jenis: {cls.retribution_type?.name}</p>
                      {cls.description && <p className="text-[10px] text-gray-400 leading-relaxed italic line-clamp-2">{cls.description}</p>}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    Tidak ada data ditemukan
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'zona' && (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Zona</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis & Klasifikasi</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Multiplier</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarif Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredZonas.map((zona) => (
                      <tr key={zona.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{zona.name}</div>
                          <div className="text-[10px] font-mono text-gray-400">{zona.code}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{zona.retribution_type?.name}</div>
                          <div className="text-[10px] font-bold text-blue-500 uppercase">{zona.classification?.name || 'General'}</div>
                        </td>
                        <td className="px-8 py-5 font-black text-emerald-600 dark:text-emerald-400">{zona.multiplier}x</td>
                        <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{formatCurrency(Number(zona.amount || 0))}</td>
                      </tr>
                    ))}
                    {filteredZonas.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                          Tidak ada data zona ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredZonas.length > 0 ? (
                  filteredZonas.map((zona) => (
                    <div key={zona.id} className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">{zona.name}</h4>
                          <span className="inline-block px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[8px] font-black rounded uppercase tracking-widest">
                            {zona.code}
                          </span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{zona.multiplier}x</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Klasifikasi</p>
                          <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{zona.classification?.name || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarif Akhir</p>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white">{formatCurrency(Number(zona.amount || 0))}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    Tidak ada data ditemukan
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'tarif' && (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Tarif</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis & Klasifikasi</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Zona</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{rate.name || 'Default Rate'}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{rate.retribution_type?.name}</div>
                          <div className="text-[10px] font-bold text-blue-500 uppercase">{rate.classification?.name || '-'}</div>
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-600 dark:text-gray-400 font-bold">{rate.zone?.name || '-'}</td>
                        <td className="px-8 py-5">
                          <div className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(Number(rate.amount))}</div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Per {rate.unit}</div>
                        </td>
                      </tr>
                    ))}
                    {filteredRates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                          Tidak ada data tarif spesifik ditemukan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRates.length > 0 ? (
                  filteredRates.map((rate) => (
                    <div key={rate.id} className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">{rate.name || 'Default Rate'}</h4>
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[8px] font-black rounded uppercase tracking-widest">
                            {formatCurrency(Number(rate.amount))}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">Per {rate.unit}</p>
                          <p className="text-[10px] font-bold text-slate-500">{rate.zone?.name || '-'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500">Kategori: {rate.retribution_type?.name}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    Tidak ada data ditemukan
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
