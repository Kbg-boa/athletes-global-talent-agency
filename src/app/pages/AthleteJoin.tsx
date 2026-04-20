"use client";

import { motion } from "framer-motion";
import AthleteFormView from "../components/AthleteFormView";

export default function AthleteJoin() {
  return (
    <div className="min-h-screen text-white bg-[#0A0A0A] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#C7FF00]/12 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-[#C7FF00]/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-zinc-600/10 blur-3xl" />

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-[#C7FF00]/20 bg-zinc-900/75 backdrop-blur-md py-10"
      >
        <div className="max-w-5xl mx-auto text-center px-6">
          <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">AGTA <span className="text-[#C7FF00]">ATHLETE</span></h1>
          <p className="text-lg font-semibold text-zinc-200">Join the Global Talent Network</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        <AthleteFormView mode="public" />
      </div>
    </div>
  );
}
