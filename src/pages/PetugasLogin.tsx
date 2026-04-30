import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Loader2, Facebook, Twitter, Chrome, Apple, Eye, EyeOff, BookOpen } from 'lucide-react';
import { InstallPWA } from '../components/InstallPWA';

// Baubau Logo Colors
const BAUBAU_BLUE = '#074764';
const BAUBAU_GOLD = '#d9a742';

export default function PetugasLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    const { error: loginError, user } = result as { error: string | null, user?: any };
    
    if (!loginError) {
      if (user?.role === 'petugas' || user?.role === 'super_admin' || user?.role === 'opd') {
        navigate('/dashboard');
      } else {
        setError('Hanya akun Petugas yang dapat login melalui jalur ini.');
      }
    } else {
      setError(loginError || 'Email atau password salah');
    }
    setIsSubmitting(false);
  };

  const quickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setIsSubmitting(true);
    const result = await login(demoEmail, demoPassword);
    const { error: loginError } = result as { error: string | null };
    if (!loginError) {
      navigate('/dashboard');
    } else {
      setError(loginError);
    }
    setIsSubmitting(false);
  };

  const demoAccounts = [
    { email: 'superadmin@sipanda.online', password: 'Mpad123#', label: 'Super Admin' },
    { email: 'bapenda@baubaukota.go.id', password: 'password123', label: 'Admin Bapenda' },
    { email: 'petugas@bapenda.go.id', password: 'password123', label: 'Petugas Bapenda' },
  ];

  const isDev = import.meta.env.MODE === 'development' || 
                import.meta.env.VITE_APP_ENV === 'local' || 
                import.meta.env.VITE_APP_ENV === 'development' ||
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === 'petugas-dev.sipanda.online';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans" style={{ backgroundColor: BAUBAU_BLUE }}>
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-5%] right-[-10%] w-[100%] h-[40%] rounded-full blur-[80px] sm:blur-[120px] transform rotate-12" style={{ backgroundColor: `${BAUBAU_GOLD}30` }}></div>
      <div className="absolute top-[15%] left-[5%] w-16 h-16 sm:w-24 sm:h-24 rounded-full blur-md" style={{ backgroundColor: `${BAUBAU_GOLD}20` }}></div>
      <div className="absolute top-[30%] right-[15%] w-24 h-24 sm:w-32 sm:h-32 rounded-full backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>

      {/* Header / Back Button */}
      <div className="relative z-20 px-6 pt-10 sm:pt-12 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-all font-bold text-xs sm:text-sm"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
            <ArrowLeft size={18} />
          </div>
          <span>Kembali</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end relative z-10 pt-10 sm:pt-12">
        <div className="bg-white rounded-t-[2.5rem] sm:rounded-t-[3.5rem] px-6 sm:px-8 pt-10 sm:pt-12 pb-10 sm:pb-16 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <img 
                src="/mitra-logo.png" 
                alt="Logo Kota Baubau" 
                className="w-16 h-16 mx-auto mb-4 object-contain" 
              />
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2" style={{ color: BAUBAU_BLUE }}>MITRA PAD (M-PAD) Petugas</h1>
              <p className="text-slate-400 text-sm font-medium">Management Information of Tax, Retribution & Assets</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 ml-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:border-[#074764] transition-all outline-none font-semibold"
                  style={{ '--tw-ring-color': `${BAUBAU_BLUE}20` } as React.CSSProperties}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-bold text-slate-500">Password</label>
                  <button type="button" className="text-xs font-bold hover:underline" style={{ color: BAUBAU_BLUE }}>Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:border-[#074764] transition-all outline-none font-semibold pr-14"
                    placeholder="••••••••••••"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-1">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-5 h-5 rounded-lg border-slate-200 focus:ring-[#074764]" 
                  style={{ accentColor: BAUBAU_BLUE }}
                />
                <label htmlFor="remember" className="text-sm font-bold text-slate-500">Remember me</label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-black text-center animate-shake uppercase tracking-wider">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                style={{ 
                  backgroundColor: BAUBAU_BLUE, 
                  boxShadow: `0 20px 40px -12px ${BAUBAU_BLUE}60` 
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            <div className="mt-12">
              <div className="relative flex items-center justify-center mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Sign in with</span>
              </div>

              <div className="flex justify-center gap-5">
                {[Facebook, Twitter, Chrome, Apple].map((Icon, i) => (
                  <button key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#2d5cd5] hover:border-[#2d5cd5]/20 hover:bg-blue-50/50 transition-all active:scale-90">
                    <Icon size={18} fill="currentColor" className="opacity-80" />
                  </button>
                ))}
              </div>

              {isDev && (
                <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                  <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-black">Quick Access (Dev)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {demoAccounts.map(acc => (
                      <button
                        key={acc.email}
                        onClick={() => quickLogin(acc.email, acc.password)}
                        className="bg-slate-50 hover:bg-blue-50 text-[#2d5cd5] py-3 px-4 rounded-2xl text-[10px] font-black transition-all border border-slate-100 uppercase tracking-tighter"
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center mt-8 sm:mt-10 text-xs sm:text-sm font-bold text-slate-400">
                Belum punya akun?{' '}
                <Link to="/register" className="hover:underline" style={{ color: BAUBAU_BLUE }}>Daftar sekarang</Link>
              </p>

              <div className="mt-8 flex justify-center">
                <Link 
                  to="/user-guide" 
                  className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#074764] transition-colors group"
                >
                  <BookOpen size={14} className="group-hover:rotate-12 transition-transform" />
                  View User Guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <InstallPWA />
    </div>
  );
}
