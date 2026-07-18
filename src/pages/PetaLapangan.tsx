import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Navigation,
  Loader2,
  MapPin,
  User,
  Crosshair,
  RefreshCw,
  Calculator,
  CreditCard,
  ImagePlus,
  X
} from 'lucide-react';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Potential {
  position: [number, number];
  name: string;
  agency: string;
  address?: string;
  status: string;
  is_paid?: boolean;
  classification_name?: string;
  taxpayer_photo?: string | null;
  icon?: string | null;
  retribution_type_id?: number | string;
  retribution_classification_id?: number | string;
  tax_object_id?: number | string;
}

// Component to recenter map when position changes
function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

// Haversine distance calculation in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function PetaLapangan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [potentials, setPotentials] = useState<Potential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);

  // Modal Pembayaran State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    taxObjectId: string | number | null;
    taxpayerName: string;
    loading: boolean;
    submitting: boolean;
    periods: any[];
    selectedPeriod: string;
    proofFile: File | null;
    uploadingProof: boolean;
  }>({
    isOpen: false, taxObjectId: null, taxpayerName: '', loading: false, submitting: false, periods: [], selectedPeriod: '', proofFile: null, uploadingProof: false
  });

  const userAvatarUrl = (user as any)?.metadata?.avatar_url || null;

  const handleOpenPayment = async (taxObjectId: string | number, taxpayerName: string) => {
    setPaymentModal(prev => ({ ...prev, isOpen: true, loading: true, taxObjectId, taxpayerName, periods: [], selectedPeriod: '', proofFile: null, uploadingProof: false }));
    try {
      const res = await api.get(`/api/tax-objects/${taxObjectId}/pending-periods`);
      const periods = res.data || res;
      setPaymentModal(prev => ({ 
        ...prev, 
        loading: false, 
        periods,
        selectedPeriod: periods.length > 0 ? periods[0].period : ''
      }));
    } catch (error) {
      console.error('Failed to load periods', error);
      toast.error('Gagal mengambil tagihan pending');
      setPaymentModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'retribusi/bukti_bayar');

    const res = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.url || res.url;
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.taxObjectId || !paymentModal.selectedPeriod) return;
    setPaymentModal(prev => ({ ...prev, submitting: true }));
    let uploadedProofUrl = null;

    try {
      if (paymentModal.proofFile) {
        setPaymentModal(prev => ({ ...prev, uploadingProof: true }));
        uploadedProofUrl = await uploadToCloudinary(paymentModal.proofFile);
      }

      const selectedObj = paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod);
      await api.post('/api/payments', {
        tax_object_id: Number(paymentModal.taxObjectId),
        billing_period: paymentModal.selectedPeriod,
        payment_method: 'cash',
        amount: selectedObj?.total_amount || selectedObj?.amount || 0,
        proof_url: uploadedProofUrl // Terlampir if available
      });
      toast.success(`Pembayaran periode ${paymentModal.selectedPeriod} berhasil dicatat`);
      setPaymentModal(prev => ({ ...prev, isOpen: false, submitting: false }));
      // Refresh marker status (akan menjadi hijau lunas)
      fetchPotentials();
    } catch (error) {
      console.error('Payment failed', error);
      toast.error('Gagal memproses pembayaran atau mengunggah gambar');
      setPaymentModal(prev => ({ ...prev, submitting: false, uploadingProof: false }));
    }
  };

  // Fetch map potentials
  const fetchPotentials = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/map-potentials');
      setPotentials(res);
    } catch (error) {
      console.error('Error fetching map potentials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      // Default to Baubau city center
      setMyPosition([-5.47, 122.6]);
      return;
    }

    setGpsStatus('loading');
    
    // Store last sent position and time to limit API calls
    let lastSentPosition: [number, number] | null = null;
    let lastSentTime = 0;
    const MIN_DISTANCE_METERS = 50; // Minimum 50 meters before sending update
    const MIN_TIME_MS = 60000; // Minimum 1 minute before sending update

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setMyPosition(newPos);
        setGpsStatus('active');
        
        // Throttling Logic for API calls
        const now = Date.now();
        
        // Only consider sending if 1 minute has passed OR no position was sent yet
        if (now - lastSentTime >= MIN_TIME_MS || !lastSentPosition) {
          
          let shouldSend = false;
          
          if (!lastSentPosition) {
             shouldSend = true; // First time, always send
          } else {
             // Calculate distance from last sent position
             const distance = calculateDistance(
               lastSentPosition[0], lastSentPosition[1], 
               newPos[0], newPos[1]
             );
             
             // Send if distance > 50 meters
             if (distance >= MIN_DISTANCE_METERS) {
               shouldSend = true;
             }
          }
          
          if (shouldSend) {
            // Update to API
            api.put('/api/user/location', {
              latitude: newPos[0],
              longitude: newPos[1]
            }).catch(err => console.error("Failed to update location to server:", err));
            
            // Update trackers
            lastSentPosition = newPos;
            lastSentTime = now;
          }
        }
      },
      (error) => {
        console.warn('GPS Watch High-Accuracy Error:', error.message);
        
        // Coba pertolongan pertama dengan akurasi rendah (low-accuracy fallback)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setMyPosition(newPos);
            setGpsStatus('active');
            
            // Fallback location update, also apply minimum time logic but don't strictly require distance here
            // as fallbacks are rare and we want to capture them
            const now = Date.now();
            if (now - lastSentTime >= MIN_TIME_MS) {
                api.put('/api/user/location', {
                  latitude: newPos[0],
                  longitude: newPos[1]
                }).catch(err => console.error("Failed fallback location update:", err));
                lastSentPosition = newPos;
                lastSentTime = now;
            }
          },
          (fallbackErr) => {
             console.error('GPS Fallback Error:', fallbackErr.message);
             setGpsStatus('error');
             // Hanya set default ke Baubau jika belum pernah dapat posisi
             setMyPosition(prev => prev || [-5.47, 122.6]);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Tingkatkan dari 10000 ke 30000 ms agar HP punya waktu mengunci satelit
        maximumAge: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchPotentials();
  }, [fetchPotentials]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Create petugas marker icon with photo
  const createPetugasIcon = () => {
    const photoUrl = userAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'default'}&backgroundColor=b6e3f4`;
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative;">
          <div style="
            width: 48px; height: 48px; 
            background: white; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            box-shadow: 0 4px 20px rgba(45,92,213,0.4); border: 4px solid #2d5cd5;
            overflow: hidden;
            animation: pulse 2s ease-in-out infinite;
          ">
            <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'" />
          </div>
          <div style="
            position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
            background: #2d5cd5; color: white; padding: 3px 8px; border-radius: 6px;
            font-size: 8px; font-weight: 900; white-space: nowrap; border: 2px solid white;
            letter-spacing: 0.1em;
          ">
            SAYA
          </div>
          <div style="
            position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
            width: 12px; height: 12px; background: #2d5cd5; border-radius: 50%;
            border: 3px solid white; box-shadow: 0 0 0 4px rgba(45,92,213,0.2);
          "></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
    });
  };

  // Create taxpayer marker icon
  const createTaxpayerIcon = (potential: Potential) => {
    const color = potential.is_paid ? '#10b981' : '#ef4444';
    const label = potential.is_paid ? 'LUNAS' : 'BELUM BAYAR';
    
    const photoUrl = potential.taxpayer_photo?.startsWith('http')
      ? potential.taxpayer_photo
      : (potential.taxpayer_photo ? `${import.meta.env.VITE_API_URL}${potential.taxpayer_photo.startsWith('/') ? '' : '/'}${potential.taxpayer_photo}` : null);
    
    const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${potential.name || 'default'}&backgroundColor=b6e3f4`;

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative;">
          <div style="
            width: 38px; height: 38px; 
            background: white; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            box-shadow: 0 4px 12px ${color}4d; border: 3px solid ${color};
            overflow: hidden;
          ">
            <img src="${photoUrl || fallbackAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${fallbackAvatar}'" />
          </div>
          <div style="
            position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
            background: ${color}; color: white; padding: 2px 6px; border-radius: 4px;
            font-size: 7px; font-weight: 900; white-space: nowrap; border: 1px solid white;
            letter-spacing: 0.05em;
          ">
            ${label}
          </div>
          ${potential.classification_name ? `
            <div style="
              position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
              background: #8b5cf6; color: white; padding: 1px 4px; border-radius: 3px;
              font-size: 6px; font-weight: 900; white-space: nowrap; border: 1px solid white;
              letter-spacing: 0.05em; z-index: 10;
            ">
              ${potential.classification_name}
            </div>
          ` : ''}
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });
  };

  // Create zone/retribution icon
  const createZoneIcon = (potential: Potential) => {
    const iconUrl = potential.icon?.startsWith('http')
      ? potential.icon
      : (potential.icon ? `${import.meta.env.VITE_API_URL}${potential.icon.startsWith('/') ? '' : '/'}${potential.icon}` : `https://api.dicebear.com/7.x/shapes/svg?seed=${potential.name}&backgroundColor=2563eb&shape1Color=white`);

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: 32px; height: 32px; 
          background: white; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          overflow: hidden; border: 2px solid #10b981;
        ">
          <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  if (loading && !myPosition) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#2d5cd5]" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Peta...</p>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = myPosition || [-5.47, 122.6];

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] -m-4 sm:-m-6 lg:-m-10 z-0">
      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => navigate(-1)}
            className="w-11 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/50 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-xl border border-white/50">
            <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} className="text-[#2d5cd5]" />
              Peta Lapangan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* GPS Status */}
          <div className={`h-11 px-4 backdrop-blur-xl rounded-2xl flex items-center gap-2 shadow-xl border border-white/50 ${
            gpsStatus === 'active' ? 'bg-emerald-500/90 text-white' : 
            gpsStatus === 'loading' ? 'bg-amber-500/90 text-white' : 
            'bg-red-500/90 text-white'
          }`}>
            {gpsStatus === 'active' ? <Navigation size={14} /> : 
             gpsStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
             <Crosshair size={14} />}
            <span className="text-[9px] font-black uppercase tracking-widest">
              {gpsStatus === 'active' ? 'GPS Aktif' : gpsStatus === 'loading' ? 'Mencari...' : 'GPS Error'}
            </span>
          </div>

          {/* Recenter */}
          <button
            onClick={() => setShouldRecenter(prev => !prev)}
            className="w-11 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/50 active:scale-90 transition-all"
          >
            <Crosshair size={18} className="text-[#2d5cd5]" />
          </button>

          {/* Refresh data */}
          <button
            onClick={() => { setLoading(true); fetchPotentials(); }}
            className="w-11 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/50 active:scale-90 transition-all"
          >
            <RefreshCw size={18} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-11 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/50 active:scale-90 transition-all"
          >
            {isFullscreen ? <Minimize2 size={18} className="text-slate-600" /> : <Maximize2 size={18} className="text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {shouldRecenter && myPosition && <RecenterMap position={myPosition} />}

        {/* Petugas Position */}
        {myPosition && (
          <>
            <Circle
              center={myPosition}
              radius={100}
              pathOptions={{ color: '#2d5cd5', fillColor: '#2d5cd5', fillOpacity: 0.08, weight: 1 }}
            />
            <Marker position={myPosition} icon={createPetugasIcon()}>
              <Popup>
                <div className="p-3 min-w-[180px] font-sans text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl overflow-hidden border-2 border-[#2d5cd5] shadow-md">
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#2d5cd5] flex items-center justify-center text-white font-black text-lg">
                        {user?.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{user?.name}</h3>
                  <p className="text-[10px] text-[#2d5cd5] font-black uppercase tracking-wider mt-1">Posisi Saya</p>
                  <p className="text-[9px] text-slate-400 mt-1">
                    {myPosition[0].toFixed(6)}, {myPosition[1].toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Taxpayer & Zone Markers */}
        {potentials.map((potential, index) => {
          const distance = myPosition ? calculateDistance(myPosition[0], myPosition[1], potential.position[0], potential.position[1]) : null;
          const icon = potential.status === 'taxpayer' ? createTaxpayerIcon(potential) : createZoneIcon(potential);

          return (
            <Marker
              key={index}
              position={potential.position}
              icon={icon}
            >
              <Popup>
                <div className="p-3 min-w-[220px] font-sans">
                  <h3 className="font-black text-slate-900 text-sm mb-1">{potential.name}</h3>
                  <p className="text-[10px] text-[#2d5cd5] font-black uppercase mb-2 tracking-wider">{potential.agency}</p>
                  
                  {potential.address && (
                    <p className="text-[10px] text-slate-500 mb-2">{potential.address}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-[0.15em] ${
                      potential.status === 'taxpayer' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {potential.status === 'taxpayer' ? 'Wajib Pajak' : 'Zona Potensi'}
                    </span>
                    {potential.status === 'taxpayer' && (
                      <span className={`inline-flex px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-[0.15em] ${
                        potential.is_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {potential.is_paid ? 'Lunas' : 'Belum Bayar'}
                      </span>
                    )}
                  </div>

                  {potential.status === 'taxpayer' && (
                    <div className="pt-2 border-t mt-2">
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Klasifikasi</span>
                         <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                           {potential.classification_name || 'N/A'}
                         </span>
                       </div>
                       
                       {potential.tax_object_id && (
                         <div className="flex flex-col gap-2 mt-3">
                           <button 
                             onClick={() => navigate('/skpd/create', {
                               state: {
                                 taxObjectId: potential.tax_object_id,
                                 classificationId: potential.retribution_classification_id,
                                 defaultVars: potential.metadata || {}, 
                               }
                             })}
                             className="w-full py-2 bg-[#2d5cd5] hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
                           >
                             <Calculator size={12} />
                             Buat SKPD (On-Site Billing)
                           </button>
                           
                           <button
                             onClick={() => handleOpenPayment(potential.tax_object_id!, potential.name)}
                             className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
                           >
                             <CreditCard size={12} />
                             Bayar Tagihan
                           </button>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Distance from petugas */}
                  {distance !== null && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <Navigation size={12} className="text-[#2d5cd5]" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Jarak: {formatDistance(distance)}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bottom Legend */}
      <div className="absolute bottom-24 sm:bottom-28 lg:bottom-6 left-4 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-2xl space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 bg-[#2d5cd5] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
            <User size={8} className="text-white" />
          </div>
          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Posisi Saya</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 bg-[#10b981] rounded-full border-2 border-white shadow-sm"></div>
          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Lunas</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 bg-[#ef4444] rounded-full border-2 border-white shadow-sm"></div>
          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Belum Bayar</span>
        </div>
      </div>

      {/* Bottom Stats */}
      {myPosition && (
        <div className="absolute bottom-24 sm:bottom-28 lg:bottom-6 right-4 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-2xl">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-black text-[#2d5cd5]">{potentials.filter(p => p.status === 'taxpayer').length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Wajib Pajak</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-500">{potentials.filter(p => p.status === 'taxpayer' && !p.is_paid).length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Belum Lunas</p>
            </div>
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(45,92,213,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(45,92,213,0); }
        }
      `}</style>
      
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Bayar Tagihan</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{paymentModal.taxpayerName}</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                disabled={paymentModal.submitting}
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {paymentModal.loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2d5cd5] mb-4" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mencari Tagihan...</p>
                </div>
              ) : paymentModal.periods.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Tidak ada tagihan tertunggak</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Wajib Pajak ini telah melunasi semua tagihan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Periode Tunggakan</label>
                     <select
                       value={paymentModal.selectedPeriod}
                       onChange={(e) => setPaymentModal(prev => ({...prev, selectedPeriod: e.target.value}))}
                       className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#2d5cd5] outline-none"
                     >
                       {paymentModal.periods.map(p => (
                         <option key={p.period} value={p.period}>
                           Periode {p.period} - Rp {(p.total_amount || p.amount || 0).toLocaleString('id-ID')}
                         </option>
                       ))}
                     </select>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Bayar Kasir</span>
                       <span className="text-lg font-black text-[#2d5cd5]">
                         Rp {(paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod)?.total_amount || paymentModal.periods.find(p => p.period === paymentModal.selectedPeriod)?.amount || 0).toLocaleString('id-ID')}
                       </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {paymentModal.periods.length > 0 && !paymentModal.loading && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {/* Upload Bukti Pembayaran */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bukti Pembayaran (Opsional)</label>
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${paymentModal.proofFile ? 'border-[#2d5cd5] bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'}`}>
                      {paymentModal.proofFile ? (
                        <>
                          <img src={URL.createObjectURL(paymentModal.proofFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                          <div className="z-10 flex flex-col items-center bg-white/80 dark:bg-black/60 px-4 py-2 rounded-xl text-center">
                            <span className="text-xs font-black text-[#2d5cd5] dark:text-blue-400 truncate max-w-[150px]">{paymentModal.proofFile.name}</span>
                            <span className="text-[9px] font-bold text-blue-500 uppercase mt-1">Ganti Foto</span>
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
                            setPaymentModal(prev => ({...prev, proofFile: e.target.files![0]}));
                          }
                        }} 
                      />
                    </label>
                  </div>

                 <button
                   onClick={handleProcessPayment}
                   disabled={paymentModal.submitting}
                   className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                 >
                   {paymentModal.uploadingProof ? (
                     <><Loader2 className="w-4 h-4 animate-spin"/> MENGUNGGAH BUKTI...</>
                   ) : paymentModal.submitting ? (
                     <><Loader2 className="w-4 h-4 animate-spin" /> MEMPROSES...</>
                   ) : (
                     'Proses Pembayaran TUNAI'
                   )}
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
