"use client";

import { useState } from "react";
import { useNavigate } from "react-router";
import { supabaseDG as supabase } from "../../lib/supabase";
import { motion } from "framer-motion";
import { LogIn, AlertCircle } from "lucide-react";
import {
  formatRemainingMinutes,
  getLoginGuardState,
  randomAuthDelay,
  registerLoginFailure,
  registerLoginSuccess,
} from "../../lib/security";

const DG_EMAIL = "kbgmathieu@gmail.com";
const STAFF_EMAIL = "agta.management@gmail.com";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    const guard = getLoginGuardState(normalizedEmail);
    if (guard.blocked) {
      setError(`Trop de tentatives. Réessayez dans ${formatRemainingMinutes(guard.remainingMs)} minute(s).`);
      setLoading(false);
      return;
    }
    await randomAuthDelay();

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        { email: normalizedEmail, password }
      );

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("email logins are disabled")) {
          setError("Connexion email désactivée dans Supabase. Activez Email provider dans Authentication > Providers > Email.");
        } else if (msg.includes('email not confirmed')) {
          setError("Email non confirmé. Confirmez l'adresse dans Supabase (Authentication > Users) ou via l'email reçu.");
        } else if (msg.includes('invalid login credentials')) {
          const next = registerLoginFailure(normalizedEmail);
          if (next.blocked) {
            setError(`Compte temporairement verrouillé pour sécurité. Réessayez dans ${formatRemainingMinutes(next.remainingMs)} minute(s).`);
          } else {
            setError(`Email ou mot de passe incorrect. Tentatives restantes: ${next.remainingAttempts}.`);
          }
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      const loggedEmail = (data.user?.email || '').trim().toLowerCase();
      if (loggedEmail === DG_EMAIL) {
        registerLoginSuccess(normalizedEmail);
        navigate("/admin-dashboard");
      } else if (loggedEmail === STAFF_EMAIL) {
        registerLoginSuccess(normalizedEmail);
        navigate('/staff-dashboard');
      } else {
        setError("Accès refusé. Ce compte n'est pas autorisé sur AGTA.");
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block p-3 bg-zinc-900 border border-[#C7FF00] rounded-lg shadow-[0_0_20px_rgba(199,255,0,0.3)]"
          >
            <LogIn className="w-8 h-8 text-[#C7FF00]" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mt-4">AGTA Portal</h1>
          <p className="text-zinc-400 mt-2">Admin Authentication</p>
        </div>

        {/* Form Card */}
        <motion.div
          whileHover={{ boxShadow: "0 0 30px rgba(199, 255, 0, 0.1)" }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00] transition"
                placeholder="kbgmathieu@gmail.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#C7FF00] focus:ring-1 focus:ring-[#C7FF00] transition"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#C7FF00] text-[#0A0A0A] font-bold rounded-lg hover:bg-[#B0D900] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Connexion en cours..." : "Se Connecter"}
            </motion.button>
          </form>

          {/* Help Text */}
          <p className="text-zinc-500 text-xs text-center mt-4">
            Accès réservé aux administrateurs autorisés
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
