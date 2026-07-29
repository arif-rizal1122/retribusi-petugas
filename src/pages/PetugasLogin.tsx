import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ShieldCheck, 
  BookOpen, 
  Download 
} from 'lucide-react';
import { InstallPWA } from '../components/InstallPWA';

export default function PetugasLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    const { error: loginError, user } = result as { error: string | null; user?: any };
    
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-blue-50/70 relative overflow-hidden flex flex-col justify-between font-sans">
      
      {/* Top Background Wave Contour Graphic */}
      <div className="absolute top-0 left-0 w-full h-96 opacity-15 pointer-events-none">
        <svg viewBox="0 0 1000 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M-100,100 Q200,300 500,150 T1100,200" stroke="#0F2547" strokeWidth="3" />
          <path d="M-100,150 Q200,350 500,200 T1100,250" stroke="#0F2547" strokeWidth="2" />
          <path d="M-100,200 Q200,400 500,250 T1100,300" stroke="#0F2547" strokeWidth="1" />
        </svg>
      </div>

      {/* Top Back Navigation */}
      <header className="relative z-20 px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-[#0F2547] transition-all font-bold text-xs sm:text-sm bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/80 shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            to="/user-guide"
            className="p-2 text-slate-500 hover:text-[#0F2547] transition-colors rounded-full bg-white/80 border border-slate-200/80 shadow-sm"
            title="Panduan Pengguna"
          >
            <BookOpen size={16} />
          </Link>
          <Link
            to="/download"
            className="p-2 text-slate-500 hover:text-[#0F2547] transition-colors rounded-full bg-white/80 border border-slate-200/80 shadow-sm"
            title="Pasang Aplikasi"
          >
            <Download size={16} />
          </Link>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md mx-auto">
          
          {/* Top Logo Branding Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#0F2547] rounded-[1.75rem] p-3.5 shadow-xl shadow-blue-950/20 border border-white/20 flex items-center justify-center mx-auto mb-3">
              <img 
                src="/mitra-logo.png" 
                alt="Logo Official Petugas" 
                className="w-full h-full object-contain" 
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#0F2547] tracking-tight leading-none mb-1">
              MITRA PAD (M-PAD)
            </h1>
            <p className="text-xl font-bold text-blue-600 mb-1">
              Petugas
            </p>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              Management Information Tax, Perhotelan & Asetda
            </p>
          </div>

          {/* Floating White Card Form */}
          <div className="bg-white rounded-[2.5rem] p-7 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100/90">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                Selamat datang!
              </h2>
              <p className="text-sm font-medium text-slate-400 mt-0.5">
                Silakan masuk untuk melanjutkan
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#00C8E5] focus:border-[#00C8E5] outline-none transition-all text-sm"
                    placeholder="Email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#00C8E5] focus:border-[#00C8E5] outline-none transition-all text-sm"
                    placeholder="Password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F2547] focus:ring-[#00C8E5] accent-[#0F2547]" 
                  />
                  <span className="text-xs font-semibold text-slate-600">Ingat saya</span>
                </label>

                <button 
                  type="button" 
                  onClick={() => alert('Silakan hubungi administrator Bapenda untuk reset password.')}
                  className="text-xs font-bold text-blue-600 hover:text-[#00C8E5] transition-colors"
                >
                  Lupa password?
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#0F2547] hover:bg-[#0B1E36] text-white font-black rounded-2xl shadow-xl shadow-blue-950/20 text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>

            </form>

            {/* Quick Access Dev Accounts */}
            {isDev && (
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-black">Quick Access (Dev)</p>
                <div className="grid grid-cols-3 gap-2">
                  {demoAccounts.map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => quickLogin(acc.email, acc.password)}
                      className="bg-slate-50 hover:bg-blue-50 text-[#0F2547] py-2 px-2 rounded-xl text-[10px] font-extrabold transition-all border border-slate-100 truncate"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Security Footer Badge */}
          <div className="flex items-center justify-center gap-2 mt-6 text-xs font-bold text-slate-400">
            <ShieldCheck size={18} className="text-blue-500" />
            <span>Aplikasi aman dan terpercaya</span>
          </div>

        </div>
      </main>

      {/* Bottom Monument Skyline Graphic Vector */}
      <div className="relative z-0 w-full opacity-35 pointer-events-none mt-auto">
        <svg viewBox="0 0 1200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Skyline silhouette */}
          <path d="M0 120 H1200 V90 Q1100 70 1000 90 T800 80 T600 50 T400 80 T200 75 T0 90 Z" fill="#93C5FD" opacity="0.4" />
          <path d="M0 120 H1200 V100 Q1050 85 900 100 T600 70 T300 95 T0 100 Z" fill="#60A5FA" opacity="0.3" />
        </svg>
      </div>

      <InstallPWA />
    </div>
  );
}
