"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabaseStaff as supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const ALLOWED_EMAILS = [
  "agta.management@gmail.com", // Staff Secretary
];

interface ProtectedStaffRouteProps {
  children: React.ReactNode;
}

export default function ProtectedStaffRoute({
  children,
}: ProtectedStaffRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const normalizedUserEmail = (user?.email || '').trim().toLowerCase();
        const allowedEmailsNormalized = ALLOWED_EMAILS.map((mail) => mail.trim().toLowerCase());

        if (user && allowedEmailsNormalized.includes(normalizedUserEmail)) {
          setAuthorized(true);
        } else {
          if (import.meta.env.DEV) {
            console.info("Route staff: redirection vers /login/staff (session invalide ou absente).");
          }
          navigate("/login/staff");
        }
      } catch {
        navigate("/login/staff");
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
        <p className="text-[#C7FF00] text-sm">Vérification d'accès...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-red-500">Accès non autorisé</p>
      </div>
    );
  }

  return children;
}
