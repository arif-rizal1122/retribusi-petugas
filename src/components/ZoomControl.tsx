import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ZOOM_KEY = 'mpad-zoom-level';
const MIN_ZOOM = 70;
const MAX_ZOOM = 130;
const STEP = 5;
const DEFAULT_ZOOM = 100;

interface ZoomControlProps {
  variant?: 'header' | 'inline';
}

export default function ZoomControl({ variant = 'header' }: ZoomControlProps) {
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_ZOOM;
  });
  const [showLabel, setShowLabel] = useState(false);

  const applyZoom = useCallback((level: number) => {
    document.documentElement.style.zoom = `${level}%`;
  }, []);

  useEffect(() => {
    applyZoom(zoom);
  }, [zoom, applyZoom]);

  const changeZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
      localStorage.setItem(ZOOM_KEY, String(next));
      setShowLabel(true);
      setTimeout(() => setShowLabel(false), 1500);
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    localStorage.setItem(ZOOM_KEY, String(DEFAULT_ZOOM));
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1500);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        changeZoom(STEP);
      } else if (e.key === '-') {
        e.preventDefault();
        changeZoom(-STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeZoom, resetZoom]);

  const isDefault = zoom === DEFAULT_ZOOM;

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1 relative">
        <button
          onClick={() => changeZoom(-STEP)}
          disabled={zoom <= MIN_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-90 text-slate-500"
        >
          <ZoomOut size={14} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => changeZoom(STEP)}
          disabled={zoom >= MAX_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-90 text-slate-500"
        >
          <ZoomIn size={14} strokeWidth={2.5} />
        </button>

        {showLabel && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-[100]">
            Zoom: {zoom}%
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Version: Integrated in Header */}
      <div className="hidden lg:flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800">
        <button
          onClick={() => changeZoom(-STEP)}
          disabled={zoom <= MIN_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 text-slate-500 dark:text-slate-400"
          title={`Zoom Out (${zoom - STEP}%)`}
        >
          <ZoomOut size={14} strokeWidth={2.5} />
        </button>

        <button
          onClick={resetZoom}
          className={`min-w-[2.8rem] h-8 flex items-center justify-center rounded-lg text-[10px] font-black tracking-tight transition-all active:scale-95 ${
            isDefault
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-[#0F2547] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Reset ke 100%"
        >
          {zoom}%
        </button>

        <button
          onClick={() => changeZoom(STEP)}
          disabled={zoom >= MAX_ZOOM}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 text-slate-500 dark:text-slate-400"
          title={`Zoom In (${zoom + STEP}%)`}
        >
          <ZoomIn size={14} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
