import { useState, useEffect, useCallback } from 'react';
import { MapPin, X, Navigation, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapPickerProps {
  value: string; // "lat,lng"
  onChange: (value: string) => void;
  label?: string;
}

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

function ResizeHandle() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

function LocateControl({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos && !map.getBounds().contains(pos)) {
      map.setView(pos, 18);
    }
  }, [pos, map]);
  return null;
}

export function MapPicker({ value, onChange, label }: MapPickerProps) {
  const [showModal, setShowModal] = useState(false);
  
  let initialPos: [number, number] | null = null;
  if (value && value.includes(',')) {
    const [lat, lng] = value.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      initialPos = [lat, lng];
    }
  }

  const [pos, setPos] = useState<[number, number] | null>(initialPos || [-5.4677, 122.6048]);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung oleh browser Anda.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setPos(newPos);
        setIsLocating(false);
      },
      () => {
        // Retry without high accuracy (fixes macOS CoreLocation / desktop)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
            setPos(newPos);
            setIsLocating(false);
          },
          () => {
            console.warn("Geolocation unavailable after retry");
            alert("GPS tidak tersedia. Silakan pilih lokasi secara manual di peta.");
            setIsLocating(false);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const handleSave = () => {
    if (pos) {
      onChange(`${pos[0]},${pos[1]}`);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-2">
      <div 
        onClick={() => setShowModal(true)}
        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <MapPin className={value ? "text-emerald-500" : "text-blue-500"} size={18} />
          <div className="flex flex-col min-w-0">
            <span className={`text-[10px] font-black uppercase tracking-widest ${value ? 'text-emerald-600' : 'text-blue-600'}`}>
              {value ? 'Lokasi Tersimpan' : 'Titik Lokasi'}
            </span>
            <span className={`text-sm font-bold truncate ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
              {value ? value : `Pilih Lokasi ${label || ''}`}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
            {value ? 'Ubah Titik' : 'Pilih'}
          </div>
          {value && (
            <span className="text-[8px] font-bold text-gray-400 italic">Klik untuk menyesuaikan</span>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Pilih Lokasi Objek</h3>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">
                  {value ? 'Apakah Anda ingin mengubah titik lokasi ini?' : 'Klik pada peta untuk menentukan koordinat'}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-3 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-gray-100 dark:bg-gray-800 relative" style={{ minHeight: '450px' }}>
              <MapContainer 
                center={pos || [-5.4677, 122.6048]} 
                zoom={15} 
                style={{ height: '450px', width: '100%', zIndex: 1 }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <ResizeHandle />
                <LocateControl pos={pos} />
                <LocationMarker position={pos} setPosition={setPos} />
              </MapContainer>

              {/* Float Locate Button */}
              <button
                onClick={handleLocate}
                disabled={isLocating}
                className="absolute bottom-8 right-8 z-[2] w-14 h-14 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-gray-100 dark:border-gray-700"
              >
                {isLocating ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Navigation className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all border-t border-white/20"
                >
                  Simpan Lokasi
                </button>
              </div>
              {pos && (
                <p className="text-center mt-5 text-[10px] font-mono text-gray-400">
                  Koordinat Terpilih: {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
