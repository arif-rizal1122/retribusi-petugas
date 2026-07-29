import { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [videoError, setVideoError] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 400); // 400ms fade-out transition
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
    }

    const maxTimer = setTimeout(() => {
      handleComplete();
    }, 8000);

    return () => {
      clearTimeout(maxTimer);
    };
  }, []);

  return (
    <div
      onClick={handleComplete}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black cursor-pointer transition-opacity duration-400 ease-out w-screen h-screen overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {!videoError ? (
        <video
          ref={videoRef}
          src="/mpad-splash.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleComplete}
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover pointer-events-none fixed inset-0 scale-[1.05] transform-gpu border-none outline-none"
        />
      ) : (
        /* Fallback Static Animated Splash Screen */
        <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-white/10 rounded-3xl p-4 backdrop-blur-md border border-white/20 mb-6 flex items-center justify-center shadow-2xl animate-pulse">
            <img
              src="/mitra-logo.png"
              alt="M-PAD Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">M-PAD</h1>
          <p className="text-xs text-white/60 font-medium">Petugas Lapangan • Kota Baubau</p>
        </div>
      )}
    </div>
  );
}
