"use client";

import { useState } from 'react';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import logo from 'figma:asset/3ac7475537d06d11ddf8dcded6e98d4e0c8dca4a.png';
import {
  formatRemainingMinutes,
  getLoginGuardState,
  randomAuthDelay,
  registerLoginFailure,
  registerLoginSuccess,
} from '../../lib/security';

const DG_EMAIL = 'kbgmathieu@gmail.com';
const STAFF_EMAIL = 'agta.management@gmail.com';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const normalizedEmail = email.trim().toLowerCase();

    const guard = getLoginGuardState(normalizedEmail);
    if (guard.blocked) {
      setErrorMsg(`Trop de tentatives. Réessayez dans ${formatRemainingMinutes(guard.remainingMs)} minute(s).`);
      setLoading(false);
      return;
    }
    await randomAuthDelay();
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('email logins are disabled')) {
          setErrorMsg("Connexion email désactivée dans Supabase. Activez Email provider dans Authentication > Providers > Email.");
        } else if (msg.includes('email not confirmed')) {
          setErrorMsg("Email non confirmé. Confirmez l'adresse dans Supabase (Authentication > Users) ou via l'email reçu.");
        } else if (msg.includes('invalid login credentials')) {
          const next = registerLoginFailure(normalizedEmail);
          if (next.blocked) {
            setErrorMsg(`Compte temporairement verrouillé pour sécurité. Réessayez dans ${formatRemainingMinutes(next.remainingMs)} minute(s).`);
          } else {
            setErrorMsg(`Email ou mot de passe incorrect. Tentatives restantes: ${next.remainingAttempts}.`);
          }
        } else {
          setErrorMsg(error.message || "Identifiants invalides. Accès refusé.");
        }
      } else if ((data.user?.email || '').trim().toLowerCase() === STAFF_EMAIL) {
        registerLoginSuccess(normalizedEmail);
        navigate('/staff-dashboard');
      } else if ((data.user?.email || '').trim().toLowerCase() === DG_EMAIL) {
        registerLoginSuccess(normalizedEmail);
        navigate('/admin-dashboard');
      } else {
        setErrorMsg("Accès refusé. Ce compte n'est pas autorisé sur AGTA.");
        await supabase.auth.signOut();
      }
    } catch (err) {
      setErrorMsg("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 font-sans selection:bg-[#C7FF00] selection:text-black">
      
      {/* EFFET DE GLOW EN ARRIÈRE-PLAN */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C7FF00]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-zinc-950/50 backdrop-blur-xl p-10 rounded-[40px] border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10"
      >
        {/* LOGO SECTION */}
        <div className="text-center mb-10">
          <img src={logo} alt="AGTA Logo" className="h-20 w-auto object-contain mx-auto mb-6" />
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">
            <span className="text-[#C7FF00]">Portail d'accès</span>
          </h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-[4px]">
            Athletes Global Talent Agency
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          {/* EMAIL */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Identifiant Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#C7FF00] transition-colors" size={18} />
              <input 
                type="email" 
                className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-12 py-4 text-sm text-white focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/20 outline-none transition-all placeholder:text-zinc-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dg@agta-group.com"
                required
              />
            </div>
          </div>

          {/* MOT DE PASSE */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#C7FF00] transition-colors" size={18} />
              <input 
                type="password" 
                className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-12 py-4 text-sm text-white focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00]/20 outline-none transition-all placeholder:text-zinc-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          {/* ERROR MESSAGE */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20"
              >
                <AlertCircle size={14} />
                <p className="text-[10px] font-black uppercase tracking-tight">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* SUBMIT BUTTON */}
          <button 
            disabled={loading}
            className="w-full bg-[#C7FF00] text-black font-black py-5 rounded-2xl hover:bg-[#d9ff4d] transition-all transform active:scale-[0.98] shadow-[0_10px_30px_rgba(199,255,0,0.15)] disabled:opacity-50 text-[11px] uppercase tracking-[3px] flex items-center justify-center gap-3 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Authentification...
              </>
            ) : (
              'Ouvrir la session'
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[4px]">
            &copy; 2026 AGTA RD Congo
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
            <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
            <div className="w-1 h-1 bg-[#C7FF00] rounded-full animate-pulse"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}