import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowRight } from 'lucide-react';

export default function PetugasWelcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0F2547] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[60%] bg-white/20 rounded-full blur-[100px] transform rotate-12"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-[#4f7df2] rounded-full blur-[80px]"></div>
      
      {/* Floating 3D Spheres (CSS Visuals) */}
      <div className="absolute top-[15%] left-[10%] w-32 h-32 bg-gradient-to-br from-[#1a2b5d] to-[#070e27] rounded-full shadow-2xl opacity-80 animate-bounce" style={{ animationDuration: '4s' }}></div>
      <div className="absolute top-[45%] right-[15%] w-24 h-24 bg-gradient-to-br from-white/40 to-white/10 rounded-full backdrop-blur-sm shadow-xl"></div>
      <div className="absolute bottom-[10%] left-[20%] w-16 h-16 bg-white/20 rounded-full blur-sm"></div>
      <div className="absolute top-[25%] right-[30%] w-40 h-40 bg-gradient-to-tr from-[#638df8] via-[#4f7df2] to-[#0F2547] rounded-full opacity-60"></div>
      <div className="absolute bottom-[30%] left-[5%] w-12 h-12 bg-white/30 rounded-full"></div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
        {/* Main Icon */}
        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl mb-12 group hover:scale-110 transition-transform duration-500">
          <CreditCard size={48} className="text-white group-hover:rotate-12 transition-transform" />
        </div>

        {/* Content */}
        <div className="space-y-4 mb-16">
          <h1 className="text-5xl font-black text-white tracking-tighter leading-[1.1]">
            Welcome <br /> Back!
          </h1>
          <p className="text-white/70 text-lg font-medium px-10 leading-relaxed">
            Enter personal details to you <br /> employee account
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex bg-white/10 backdrop-blur-md rounded-[2.5rem] p-1.5 border border-white/10 shadow-2xl">
          <button
            onClick={() => navigate('/login')}
            className="flex-1 py-5 rounded-[2.2rem] text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="flex-1 py-5 bg-white text-[#0F2547] rounded-[2.2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
          >
            Sign up
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
