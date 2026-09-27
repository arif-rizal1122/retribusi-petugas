// @ts-nocheck
import { ReactNode, useState } from 'react';
import ZoomControl from './ZoomControl';
import { InstallPWA } from './InstallPWA';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  ChevronLeft,
  Search,
  Info,
  QrCode,
  Home,
  User,
  Map,
  Download,
  CheckCircle,
  ClipboardList,
  Landmark,
  CreditCard,
  Printer,
  Car,
  Trash2,
  Store,
  Wrench,
  MapPin,
} from 'lucide-react';
import { useGps } from '../contexts/GpsContext';
import { UserRole } from '../types';
import { officerCanAccessPath, isPuprOfficer } from '../lib/officerRoleUtils';

interface LayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'verifikator', 'petugas', 'viewer'],
  },
  {
    label: 'Peta Lapangan',
    path: '/peta',
    icon: <Map className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Tugas',
    path: '/tasks',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Inspeksi Alat Berat',
    path: '/pupr-inspection',
    icon: <Wrench className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Wajib Pajak',
    path: '/taxpayers',
    icon: <Users className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Billing & Tagihan',
    path: '/billing',
    icon: <FileText className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Bayar Lapangan',
    path: '/officer-payment',
    icon: <CreditCard className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Parkir Cepat',
    path: '/parkir',
    icon: <Car className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Sampah DLH',
    path: '/dlh-collector',
    icon: <Trash2 className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Pasar Disperindag',
    path: '/pasar',
    icon: <Store className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Printer Thermal',
    path: '/mpad-printer',
    icon: <Printer className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Verifikasi Bayar',
    path: '/verification',
    icon: <CheckCircle className="w-5 h-5" />,
    roles: ['super_admin', 'opd'],
  },
  {
    label: 'Reporting',
    path: '/reporting',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'viewer', 'petugas'],
  },
  {
    label: 'PBB Bapenda',
    path: '/pbb-bapenda',
    icon: <FileText className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'BPHTB',
    path: '/bphtb',
    icon: <Landmark className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'petugas'],
  },
  {
    label: 'Unduh App',
    path: '/download',
    icon: <Download className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'verifikator', 'petugas', 'viewer'],
  },
  {
    label: 'Tentang Aplikasi',
    path: '/about',
    icon: <Info className="w-5 h-5" />,
    roles: ['super_admin', 'opd', 'verifikator', 'petugas', 'viewer'],
  },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const userAvatarUrl = (user as any)?.metadata?.avatar_url || null;

  const { location: gpsLoc, gpsStatus, requestGpsPermission } = useGps();

  const renderGpsBadge = (isMobile = false) => {
    if (gpsStatus === 'active' && gpsLoc) {
      return (
        <button
          type="button"
          onClick={requestGpsPermission}
          title={`GPS Terkunci: ${gpsLoc.lat.toFixed(5)}, ${gpsLoc.lng.toFixed(5)} (Akurasi ±${gpsLoc.accuracy}m)`}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold transition-all hover:bg-emerald-100 ${
            isMobile ? 'text-[10px] px-2 py-1' : 'text-xs'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="truncate max-w-[120px]">{isMobile ? `±${gpsLoc.accuracy}m` : `GPS Aktif (±${gpsLoc.accuracy}m)`}</span>
        </button>
      );
    }
    if (gpsStatus === 'checking') {
      return (
        <button
          type="button"
          onClick={requestGpsPermission}
          title="Mencari sinyal satelit GPS..."
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold ${
            isMobile ? 'text-[10px] px-2 py-1' : 'text-xs'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
          <span>{isMobile ? 'GPS...' : 'Mencari GPS...'}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={requestGpsPermission}
        title="GPS Wajib Aktif. Klik untuk menghubungkan sensor lokasi."
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black animate-pulse ${
          isMobile ? 'text-[10px] px-2 py-1' : 'text-xs'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
        <span>GPS Nonaktif</span>
      </button>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenu = menuItems.filter((item) =>
    user ? item.roles.includes(user.role) && officerCanAccessPath(user, item.path) : false
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-[#0F2547]/10 selection:text-[#0F2547] pb-24 lg:pb-0 relative overflow-x-hidden">
      
      {/* Top Navigation Bar (Desktop Only) */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-[40] px-8">
        <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between gap-8">
          
          {/* Left: Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform border border-slate-100">
              <img src="/mitra-logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  MITRA PAD (M-PAD) <span className="text-blue-600 dark:text-blue-400">Petugas</span>
                </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Kota Baubau</p>
            </div>
          </Link>

          {/* Center: Search */}
          <div className="flex-1 max-w-md relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0F2547] transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Cari transaksi, WP, atau tagihan..." 
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0F2547]/20 focus:bg-white transition-all outline-none"
            />
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-4">
            {renderGpsBadge(false)}
            <ZoomControl />
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all group"
              >
                {theme === 'light' ? (
                  <Sun size={20} className="text-amber-500 group-hover:rotate-12 transition-transform" />
                ) : (
                  <Moon size={20} className="text-blue-400 group-hover:-rotate-12 transition-transform" />
                )}
              </button>
              <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all relative group">
                <Bell size={20} className="text-slate-500 group-hover:shake transition-transform" />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-50 ring-2 ring-rose-500/20"></span>
              </button>
            </div>

            <div className="h-8 w-px bg-slate-100 mx-2"></div>

            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md hover:border-[#0F2547]/20 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:bg-[#0F2547]/10 group-hover:text-[#0F2547] transition-colors font-black overflow-hidden relative">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || <User size={20} />
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0F2547]/10 to-transparent"></div>
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1 line-clamp-1">{user?.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{user?.role.replace('_', ' ')}</p>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl transition-all active:scale-95"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header (Unified Single Top Navbar) */}
      <div className="lg:hidden px-4 pt-2.5 pb-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[40]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-[#0F2547] rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-slate-700 shrink-0">
              <img src="/mitra-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-[#0F2547] dark:text-white leading-none truncate">M-PAD</h1>
              <p className="text-[10px] font-bold text-slate-400 leading-none mt-0.5 truncate">Petugas Lapangan</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {renderGpsBadge(true)}
            <button className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all relative">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Dropdown Overlay */}
      {profileOpen && (
        <div 
          className="fixed inset-0 z-[190] lg:hidden"
          onClick={() => setProfileOpen(false)}
        ></div>
      )}

      {/* Sidebar Navigation (Desktop & Mobile) */}
      <aside
        className={`fixed left-0 top-0 lg:top-20 bottom-0 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-100 dark:border-slate-800 z-[100] transform transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col p-3 overflow-y-auto">
          {/* Mobile Header in Sidebar */}
          <div className="lg:hidden flex items-center justify-between mb-4 px-2 pt-1">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                <img src="/mitra-logo.png" alt="Logo" className="w-4 h-4 object-contain" />
              </div>
              <h1 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">MITRA PAD (M-PAD)</h1>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Tutup Menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <p className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Menu Utama</p>
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group overflow-hidden active:scale-[0.98] ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-[#0F2547] to-blue-500 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <span className={`relative z-10 shrink-0 ${isActive ? 'scale-105' : 'group-hover:scale-105'} transition-transform`}>
                    {item.icon}
                  </span>
                  <span className="relative z-10 text-xs sm:text-[13px] tracking-tight truncate">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full z-10 shadow-[0_0_6px_white] shrink-0"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer Account Card */}
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded-xl transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <LogOut size={16} className="text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                <span className="font-bold text-xs text-slate-600 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400">Sign Out</span>
              </div>
              <ChevronLeft size={14} className="text-slate-300 transform rotate-180 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-500"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <main className="lg:pt-20 lg:pl-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-10 max-w-full overflow-hidden">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only - Clean Modern Style) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between px-6 pb-2 pt-2 h-20 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {(isPuprOfficer(user)
          ? [
              { icon: Home, path: '/dashboard', label: 'Home' },
              { icon: ClipboardList, path: '/tasks', label: 'Survei' },
              { icon: Wrench, path: '/pupr-inspection', label: 'Inspeksi HM' },
              { icon: Map, path: '/peta', label: 'Peta Proyek' },
              { icon: User, path: '/profile', label: 'Akun' },
            ]
          : [
              { icon: Home, path: '/dashboard', label: 'Home' },
              { icon: Users, path: '/taxpayers', label: 'WP' },
              { icon: FileText, path: '/billing', label: 'Tagihan' },
              { icon: ClipboardList, path: '/tasks', label: 'Tugas' },
              { icon: User, path: '/profile', label: 'Account' }
            ]
        ).map((item, i) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/billing' && location.pathname.includes('/billing')) ||
            (item.path === '/taxpayers' && location.pathname.includes('/taxpayers')) ||
            (item.path === '/tasks' && location.pathname.includes('/tasks')) ||
            (item.path === '/pupr-inspection' && location.pathname.includes('/pupr-inspection'));

          return (
            <button 
              key={i}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 transition-all w-16"
            >
              <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0F2547]' : 'text-slate-400'}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-500' : ''} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <InstallPWA />
    </div>
  );
}
