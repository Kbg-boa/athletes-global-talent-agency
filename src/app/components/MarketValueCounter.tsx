"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign } from "lucide-react";

interface CounterProps {
  initialValue?: number;
}

export default function MarketValueCounter({ initialValue = 2500000 }: CounterProps) {
  const [value, setValue] = useState(initialValue);
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    // Simulation d'augmentation de la valeur marchande
    const interval = setInterval(() => {
      setValue((prev) => {
        const increase = Math.floor(Math.random() * 50000) + 10000;
        return prev + increase;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Animation du compteur
  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplayValue(Math.floor(start + (end - start) * progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value]);

  const formatValue = (num: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-[#C7FF00]/10 to-[#C7FF00]/5 border border-[#C7FF00]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(199,255,0,0.15)] cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 bg-[#C7FF00]/20 border border-[#C7FF00] rounded-lg"
          >
            <DollarSign className="w-5 h-5 text-[#C7FF00]" />
          </motion.div>
          <div>
            <h3 className="text-white font-bold text-lg">Valeur Marchande</h3>
            <p className="text-zinc-400 text-xs">Portefeuille Global</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-5 h-5 text-[#C7FF00]" />
        </motion.div>
      </div>

      {/* Counter Display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2"
      >
        <motion.div
          key={displayValue}
          className="text-4xl font-black text-[#C7FF00] font-mono"
        >
          {formatValue(displayValue)}
        </motion.div>
        <motion.div
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="h-1 bg-gradient-to-r from-[#C7FF00] to-transparent rounded-full"
        />
      </motion.div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-[#C7FF00]/20 text-xs text-zinc-400 flex items-center justify-between">
        <span>Mis à jour en temps réel</span>
        <span className="text-[#C7FF00] font-mono">+{((value / initialValue - 1) * 100).toFixed(2)}%</span>
      </div>
    </motion.div>
  );
}
