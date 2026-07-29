import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Facebook, Twitter, Chrome, Apple, Eye, EyeOff } from 'lucide-react';

export default function PetugasRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Mock registration for petugas (usually handled by admin)
    setTimeout(() => {
      setError('Registration is restricted to authorized personnel only. Please contact your administrator.');
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0F2547] flex flex-col relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-white/20 rounded-full blur-[100px] transform rotate-12"></div>
      <div className="absolute top-[15%] right-[15%] w-24 h-24 bg-white/20 rounded-full blur-md"></div>
      <div className="absolute top-[5%] left-[10%] w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm"></div>

      {/* Header / Back Button */}
      <div className="relative z-20 px-6 pt-12 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-all font-bold text-sm"
        >
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
            <ArrowLeft size={20} />
          </div>
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end relative z-10 mt-12">
        <div className="bg-white rounded-t-[3.5rem] px-8 pt-12 pb-16 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-black text-[#0F2547] tracking-tight mb-2">Get Started</h1>
              <p className="text-slate-400 font-medium">Create your officer profile</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 ml-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0F2547] transition-all outline-none font-semibold"
                  placeholder="Enter Full Name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 ml-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0F2547] transition-all outline-none font-semibold"
                  placeholder="Enter Email"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0F2547] transition-all outline-none font-semibold pr-14"
                    placeholder="Enter Password"
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

              <div className="flex items-start gap-3 px-1">
                <input type="checkbox" id="terms" className="mt-1 w-5 h-5 rounded-lg border-slate-200 text-[#0F2547] focus:ring-[#0F2547]" required />
                <label htmlFor="terms" className="text-xs font-bold text-slate-500 leading-tight">
                  I agree to the processing of <span className="text-[#0F2547] cursor-pointer hover:underline">Personal data</span>
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black text-center animate-shake uppercase tracking-wider leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F2547] text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_-12px_rgba(45,92,213,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(45,92,213,0.6)] active:scale-[0.97] disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing up...</span>
                  </>
                ) : (
                  <span>Sign up</span>
                )}
              </button>
            </form>

            <div className="mt-12">
              <div className="relative flex items-center justify-center mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Sign up with</span>
              </div>

              <div className="flex justify-center gap-5">
                {[Facebook, Twitter, Chrome, Apple].map((Icon, i) => (
                  <button key={i} className="w-14 h-14 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#0F2547] hover:border-[#0F2547]/20 hover:bg-blue-50/50 transition-all active:scale-90">
                    <Icon size={20} fill="currentColor" className="opacity-80" />
                  </button>
                ))}
              </div>

              <p className="text-center mt-10 text-sm font-bold text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-[#0F2547] hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
