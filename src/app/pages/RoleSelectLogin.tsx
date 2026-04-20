"use client";

import { motion } from "framer-motion";
import { Briefcase, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";

export default function RoleSelectLogin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#C7FF00]/10 blur-[140px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-2xl bg-zinc-950/70 border border-zinc-800 rounded-3xl p-8 md:p-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
            AGTA Portal
          </h1>
          <p className="text-zinc-400 mt-3 text-sm md:text-base">
            Choisissez votre espace de connexion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate("/login/dg")}
            className="group text-left rounded-2xl border border-zinc-800 bg-black/40 p-5 hover:border-[#C7FF00] hover:bg-black/60 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C7FF00]/15 border border-[#C7FF00]/40 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-[#C7FF00]" />
            </div>
            <p className="text-white font-black text-lg uppercase tracking-tight">Direction Generale</p>
            <p className="text-zinc-400 text-sm mt-2">
              Acces Directeur General
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/login/staff")}
            className="group text-left rounded-2xl border border-zinc-800 bg-black/40 p-5 hover:border-[#C7FF00] hover:bg-black/60 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C7FF00]/15 border border-[#C7FF00]/40 flex items-center justify-center mb-4">
              <Briefcase className="w-5 h-5 text-[#C7FF00]" />
            </div>
            <p className="text-white font-black text-lg uppercase tracking-tight">Staff Secretaire</p>
            <p className="text-zinc-400 text-sm mt-2">
              Acces equipe administrative
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
