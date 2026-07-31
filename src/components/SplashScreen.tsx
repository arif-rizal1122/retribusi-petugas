// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [videoError, setVideoError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 400); // 400ms fade-out
  };

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          videoRef.current.muted = false;
          await videoRef.current.play();
        } catch (error) {
          if (error instanceof Error && error.name === 'NotAllowedError') {
            try {
              videoRef.current.muted = true;
              setIsMuted(true);
              await videoRef.current.play();
            } catch (fallbackError) {
              setVideoError(true);
            }
          } else {
            setVideoError(true);
          }
        }
      }
    };

    playVideo();

    // Timeout for slow network (fallback to static if video doesn't play in 2.5s)
    const networkTimeout = setTimeout(() => {
      setVideoError((prev) => {
        if (videoRef.current && videoRef.current.readyState < 3) {
          return true;
        }
        return prev;
      });
    }, 2500);

    // Fallback if video is stuck or taking too long (max 8 seconds total)
    const maxTimer = setTimeout(() => {
      handleComplete();
    }, 8000);

    return () => {
      clearTimeout(maxTimer);
      clearTimeout(networkTimeout);
    };
  }, []);

  useEffect(() => {
    // Jika fallback static muncul (karena error/jaringan lambat),
    // tampilkan fallback selama 1.5 detik lalu masuk ke aplikasi.
    if (videoError) {
      const fallbackTimer = setTimeout(() => {
        handleComplete();
      }, 1500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [videoError]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <div
      onClick={handleComplete}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black cursor-pointer transition-opacity duration-400 ease-out w-screen h-screen overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {!videoError ? (
        <>
          <video
            ref={videoRef}
            src="/mpad-splash.mp4"
            playsInline
            preload="auto"
            onPlaying={() => setIsVideoPlaying(true)}
            onEnded={handleComplete}
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover pointer-events-none fixed inset-0 scale-[1.05] transform-gpu border-none outline-none"
          />
          
          {/* Tombol Toggle Suara */}
          <div 
            onClick={toggleMute}
            className="absolute bottom-6 left-6 z-10 p-3 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-white transition-all duration-300 animate-in fade-in zoom-in duration-500 delay-300 cursor-pointer shadow-lg"
          >
            {isMuted ? (
              // Icon Volume Off (X)
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            ) : (
              // Icon Volume On
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            )}
          </div>
          
          {/* Tombol Lewati */}
          <div className="absolute top-8 right-6 z-10 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold tracking-widest uppercase hover:bg-black/60 transition-colors">
            Lewati
          </div>
        </>
      ) : (
        /* Fallback Static Animated Splash Screen (Light Mode) */
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl p-4 border border-slate-100 mb-6 flex items-center justify-center shadow-xl animate-pulse">
            <img
              src="/mitra-logo.png"
              alt="M-PAD Petugas Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">M-PAD</h1>
          <p className="text-xs text-slate-500 font-medium">Petugas Lapangan • Kota Baubau</p>
        </div>
      )}
    </div>
  );
}
