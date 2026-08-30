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
  Car
} from 'lucide-react';
import { UserRole } from '../types';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenu = menuItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
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
      <div className="lg:hidden px-5 pt-3 pb-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[40]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F2547] rounded-2xl flex items-center justify-center p-1.5 shadow-sm border border-slate-700">
              <img src="/mitra-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-black text-[#0F2547] dark:text-white leading-none">M-PAD</h1>
              <p className="text-[11px] font-bold text-slate-400 leading-none mt-0.5">Petugas Lapangan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all relative">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu size={18} />
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
        className={`fixed left-0 top-0 lg:top-20 bottom-0 w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-100 dark:border-slate-800 z-[100] transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          {/* Mobile Header in Sidebar */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                <img src="/mitra-logo.png" alt="Logo" className="w-5 h-5 object-contain" />
              </div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">MITRA PAD (M-PAD)</h1>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="flex-1 space-y-2">
            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Main Navigation</p>
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all relative group overflow-hidden ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800 shadow-none'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0F2547] to-blue-400 z-0"></div>
                  )}
                  <span className={`relative z-10 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                    {item.icon}
                  </span>
                  <span className="relative z-10 font-bold text-sm tracking-tight">{item.label}</span>
                  {isActive && (
                    <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full z-10 shadow-[0_0_8px_white]"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer Account Card */}
          <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} className="text-slate-400 group-hover:text-rose-600" />
                <span className="font-bold text-sm text-slate-600 group-hover:text-rose-600">Sign Out</span>
              </div>
              <ChevronLeft size={16} className="text-slate-300 transform rotate-180 group-hover:translate-x-1 transition-transform" />
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
      <main className="lg:pt-20 lg:pl-72 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-10 max-w-full overflow-hidden">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only - Clean Modern Style) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between px-6 pb-2 pt-2 h-20 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {[
          { icon: Home, path: '/dashboard', label: 'Home' },
          { icon: Users, path: '/taxpayers', label: 'WP' },
          { icon: FileText, path: '/billing', label: 'Tagihan' },
          { icon: ClipboardList, path: '/tasks', label: 'Tugas' },
          { icon: User, path: '/profile', label: 'Account' }
        ].map((item, i) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/billing' && location.pathname.includes('/billing')) ||
            (item.path === '/taxpayers' && location.pathname.includes('/taxpayers'));

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
