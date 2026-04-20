"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabaseDG as supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const DG_EMAIL = "kbgmathieu@gmail.com";

interface ProtectedDGRouteProps {
  children: React.ReactNode;
}

export default function ProtectedDGRoute({
  children,
}: ProtectedDGRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user && (user.email || '').trim().toLowerCase() === DG_EMAIL.toLowerCase()) {
          setAuthorized(true);
        } else {
          console.warn("Accès DG non autorisé.");
          navigate("/login/dg");
        }
      } catch {
        navigate("/login/dg");
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-zinc-900 rounded-full border border-[#C7FF00] flex items-center justify-center shadow-[0_0_50px_rgba(199,255,0,0.2)]"
        >
          <Loader2 className="w-10 h-10 text-[#C7FF00] animate-spin" />
        </motion.div>
        <p className="text-[#C7FF00] text-sm">Vérification d'accès DG...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-red-500">Accès réservé au Directeur Général</p>
      </div>
    );
  }

  return children;
}
