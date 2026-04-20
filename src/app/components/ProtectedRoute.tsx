"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getActiveSupabaseClient } from '../../lib/supabase';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const supabase = getActiveSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      try {
        // On récupère l'utilisateur actuel
        const { data: { user } } = await supabase.auth.getUser();
        
        // CONDITION DE SÉCURITÉ DG : 
        // 1. L'utilisateur doit exister
        // 2. L'email doit être le tien (kbgmathieu@gmail.com)
        if (user && user.email === 'kbgmathieu@gmail.com') {
          setAuthorized(true);
        } else {
          // Si un intrus essaie d'entrer ou si tu n'es pas connecté
          console.warn("Accès non autorisé détecté.");
          navigate('/login'); 
        }
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkUser();
  }, [navigate]);

  // ÉCRAN DE VÉRIFICATION AGTA
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-zinc-900 rounded-[25px] border border-zinc-800 flex items-center justify-center shadow-[0_0_50px_rgba(199,255,0,0.1)]"
        >
          <ShieldCheck className="text-[#C7FF00]" size={40} />
        </motion.div>
        
        <div className="text-center">
          <p className="text-[10px] font-black text-[#C7FF00] uppercase tracking-[5px] mb-2 animate-pulse">
            Vérification des accès DG
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-zinc-700" size={14} />
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              Portail sécurisé AGTA
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si autorisé, on affiche la page demandée, sinon rien (le useEffect redirige déjà)
  return authorized ? children : null;
}