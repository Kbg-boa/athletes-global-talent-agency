"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useAppPreferences } from '../../lib/appPreferences';

interface ClockData {
  city: string;
  timezone: string;
  time: string;
  flag: string;
}

export default function WorldClocks() {
  const { locale } = useAppPreferences();
  const [clocks, setClocks] = useState<ClockData[]>([
    { city: "Kinshasa", timezone: "WAT", time: "", flag: "🇨🇩" },
    { city: "Dubaï", timezone: "GST", time: "", flag: "🇦🇪" },
  ]);

  useEffect(() => {
    const updateClocks = () => {
      setClocks((prev) =>
        prev.map((clock) => {
          let formatter: Intl.DateTimeFormat;

          if (clock.city === "Kinshasa") {
            formatter = new Intl.DateTimeFormat(locale, {
              timeZone: "Africa/Kinshasa",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          } else {
            formatter = new Intl.DateTimeFormat(locale, {
              timeZone: "Asia/Dubai",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          }

          return { ...clock, time: formatter.format(new Date()) };
        })
      );
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [locale]);

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-[#C7FF00]/20 rounded-xl p-6 shadow-[0_0_30px_rgba(199,255,0,0.1)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ rotate: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="p-2 bg-[#C7FF00]/10 border border-[#C7FF00]/50 rounded-lg"
        >
          <Clock className="w-5 h-5 text-[#C7FF00]" />
        </motion.div>
        <div>
          <h3 className="text-white font-bold text-lg">Horloges Mondiales</h3>
          <p className="text-zinc-400 text-xs">Opérations Globales</p>
        </div>
      </div>

      {/* Clocks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clocks.map((clock, idx) => (
          <motion.div
            key={clock.city}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="p-4 min-h-[170px] bg-[#C7FF00]/5 border border-[#C7FF00]/20 rounded-lg hover:border-[#C7FF00]/50 transition overflow-hidden"
          >
            {/* City Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold truncate pr-2" title={clock.city}>{clock.city}</h4>
              <span className="text-2xl">{clock.flag}</span>
            </div>

            {/* Time Display */}
            <motion.div
              key={clock.time}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center min-w-0"
            >
              <div className="text-[#C7FF00] font-mono font-bold text-[clamp(1.25rem,2.8vw,1.6rem)] tabular-nums leading-none mb-2 whitespace-nowrap">
                {clock.time}
              </div>
              <div className="text-zinc-400 text-xs uppercase tracking-widest whitespace-nowrap">{clock.timezone}</div>
            </motion.div>

            {/* Pulse Indicator */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-3 w-2 h-2 bg-[#C7FF00] rounded-full mx-auto"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
