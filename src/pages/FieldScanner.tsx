import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { QRScannerService } from '../services/QRScannerService';
import { 
  ArrowLeft, 
  Zap, 
  ShieldCheck, 
  Loader2, 
  RotateCw, 
  AlertCircle
} from 'lucide-react';

export default function FieldScanner() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [detectionHint, setDetectionHint] = useState<string | null>(null);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "reader";

  useEffect(() => {
    let isMounted = true;

    // 1. Check for cameras and setup scanner
    Html5Qrcode.getCameras().then(devices => {
      if (!isMounted) return;
      
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Default to back camera
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
        setActiveCamera(backCamera.id);
        startScanner(backCamera.id);
      } else {
        setError("Kamera tidak ditemukan pada perangkat ini.");
      }
    }).catch(err => {
      if (!isMounted) return;
      console.error(err);
      setError("Izin kamera ditolak atau terjadi kesalahan.");
    });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, []);

  const [torchSupported, setTorchSupported] = useState(false);

  const startScanner = async (cameraId: string) => {
    try {
      if (qrScannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(containerId);
      qrScannerRef.current = scanner;
      setIsScanning(true);
      setError(null);

      await scanner.start(
        cameraId,
        {
          fps: 20,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setIsScanning(false);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Triple pulse for success
          
          const result = QRScannerService.parse(decodedText);
          setScanResult(result.value);
          setDetectionHint(result.actionHint || 'Data Terdeteksi');

          let targetUrl = `/billing?search=${encodeURIComponent(result.value)}`;
          
          if (result.type === 'json' && result.metadata?.ids) {
            targetUrl = `/billing?ids=${result.metadata.ids.join(',')}`;
          } else if (result.type === 'url') {
            if (result.metadata?.isPbbSppt) {
              targetUrl = `/pbb-bapenda?nop=${encodeURIComponent(result.value)}&autoplay=true`;
            } else {
              targetUrl = `/billing?search=${encodeURIComponent(result.value)}&autoplay=true`;
            }
          }

          setTimeout(() => {
            stopScanner();
            navigate(targetUrl);
          }, 1500);
        },
        () => {}
      );

      // Check if torch is supported
      const track = scanner.getRunningTrackCapabilities();
      if ((track as any).torch) {
        setTorchSupported(true);
      } else {
        setTorchSupported(false);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal mengakses kamera. Pastikan browser memiliki izin.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
        setTorchSupported(false);
        setTorchOn(false);
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  const toggleTorch = async () => {
    if (!qrScannerRef.current || !torchSupported) return;
    try {
      const state = !torchOn;
      await qrScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: state } as any]
      });
      setTorchOn(state);
    } catch (err) {
      console.warn("Torch interaction failed:", err);
      // If it fails with OverconstrainedError, it means the hardware/browser lied about support
      if (err instanceof Error && err.name === 'OverconstrainedError') {
        setTorchSupported(false);
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setActiveCamera(nextCamera.id);
    startScanner(nextCamera.id);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0 m-0 fixed inset-0 z-[100] animate-in fade-in duration-500 overflow-hidden">
      {/* Immersive Camera Feed */}
      <div id={containerId} className="absolute inset-0 w-full h-full object-cover"></div>

      {/* Modern Overlay HUD */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
        {/* Top Controls */}
        <div className="flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl text-white active:scale-90 transition-all shadow-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-white font-black text-lg tracking-tight drop-shadow-lg">Inspeksi Lapangan</h1>
            <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.2em] drop-shadow-md">Scanner Aktif</p>
          </div>

          <div className="w-12 h-12"></div> {/* Spacer */}
        </div>

        {/* Center Target Box */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-72 h-72">
            {/* Animated Scan Line */}
            {isScanning && !scanResult && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] animate-v-scan z-10"></div>
            )}
            
            {/* Corners with Glow */}
            <div className="absolute top-0 left-0 w-12 min-h-[48px] border-t-4 border-l-4 border-blue-500 rounded-tl-3xl shadow-[-5px_-5px_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute top-0 right-0 w-12 min-h-[48px] border-t-4 border-r-4 border-blue-500 rounded-tr-3xl shadow-[5px_-5px_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute bottom-0 left-0 w-12 min-h-[48px] border-b-4 border-l-4 border-blue-500 rounded-bl-3xl shadow-[-5px_5px_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute bottom-0 right-0 w-12 min-h-[48px] border-b-4 border-r-4 border-blue-500 rounded-br-3xl shadow-[5px_5px_15px_rgba(59,130,246,0.5)]"></div>
            
            {/* Hint Text */}
            <div className="absolute -bottom-12 left-0 w-full text-center">
              <span className="text-white/60 font-bold text-[10px] uppercase tracking-widest bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                Posisikan QR di dalam kotak
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col gap-6 pointer-events-auto items-center">
          <div className="flex items-center gap-4 bg-black/40 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${torchOn ? 'bg-amber-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.4)]' : 'bg-white/10 text-white'}`}
              >
                <Zap className={`w-6 h-6 ${torchOn ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={switchCamera}
              className="w-14 h-14 bg-white/10 flex items-center justify-center rounded-2xl text-white active:bg-white/20 transition-all font-black text-xs"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full flex items-center justify-center gap-3 py-4">
             <ShieldCheck className="w-4 h-4 text-emerald-400" />
             <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Secure Verification System</span>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {scanResult && (
        <div className="absolute inset-0 z-[200] bg-blue-600/90 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
            <Loader2 className="w-12 h-12 animate-spin text-white" />
          </div>
          <h3 className="text-3xl font-black mb-2 tracking-tighter">
            {detectionHint || "DATA DITEMUKAN"}
          </h3>
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest">{scanResult}</p>
        </div>
      )}

      {/* Error View */}
      {error && (
        <div className="absolute inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Akses Kamera Gagal</h2>
          <p className="text-slate-400 mb-8 max-w-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
          >
            COBA LAGI
          </button>
        </div>
      )}

      <style>{`
        @keyframes v-scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-v-scan {
          animation: v-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        #reader {
          background: black !important;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
