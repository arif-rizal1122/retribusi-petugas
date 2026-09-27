import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface Option {
  id: string | number;
  label: string;
  subLabel?: string;
  badge?: string;
  rightText?: string;
  icon?: React.ReactNode;
}

export interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onSelect: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  themeColor?: 'emerald' | 'blue' | 'indigo';
  size?: 'sm' | 'md';
  showSearch?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder = 'Pilih item...',
  searchPlaceholder = 'Cari...',
  label,
  className = '',
  themeColor = 'blue',
  size = 'md',
  showSearch,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id.toString() === value.toString());

  // Determine if search should be shown: explicit prop or if options count > 6
  const enableSearch = showSearch !== undefined ? showSearch : options.length > 6;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (opt.badge && opt.badge.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const triggerPadding = size === 'sm' ? 'px-3.5 py-2.5 rounded-xl text-xs' : 'px-5 py-3.5 rounded-2xl text-sm';
  const ringHover =
    themeColor === 'emerald'
      ? 'hover:ring-2 hover:ring-emerald-500/20 focus:ring-2 focus:ring-emerald-500'
      : 'hover:ring-2 hover:ring-blue-500/20 focus:ring-2 focus:ring-blue-500';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full ${triggerPadding} bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer ${ringHover} transition-all font-bold shadow-xs select-none`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate ${selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400 font-normal'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedOption?.rightText && (
            <span
              className={`font-mono text-xs font-black ${
                themeColor === 'emerald'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {selectedOption.rightText}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
          {enableSearch && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-700/40">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value.toString() === opt.id.toString();
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onSelect(opt.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? themeColor === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'font-black' : ''}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate mt-0.5">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.rightText && (
                        <span
                          className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-md ${
                            isSelected
                              ? themeColor === 'emerald'
                                ? 'bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                                : 'bg-blue-200/70 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.rightText}
                        </span>
                      )}
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 shrink-0 ${
                            themeColor === 'emerald'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-6 text-center text-xs text-slate-400 italic font-medium">
                Pilihan tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
