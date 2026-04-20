"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { LogOut, BarChart3, Users, Target, Briefcase, DollarSign, UserCheck, Megaphone, FileText, Settings, Plus, Edit, Trash2, Mail, BarChart, Search, X, ChevronDown, Globe, TrendingUp, Star, Award, CheckCircle2, Clock, Loader2, RefreshCw, UploadCloud, Sparkles } from "lucide-react";
import logo from "figma:asset/3ac7475537d06d11ddf8dcded6e98d4e0c8dca4a.png";
import { supabaseDG as supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import RecruitmentRadar from "../components/RecruitmentRadar";
import WorldClocks from "../components/WorldClocks";
import MessagesView from "../components/MessagesView";
import SettingsView from "../components/SettingsView";
import { enableDevicePush } from "../../lib/pushNotifications";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  const showDeviceNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const pushEnabledPref = localStorage.getItem('agta_push_enabled');
    if (pushEnabledPref === '0') return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      const notif = new Notification(title, { body, tag });
      window.setTimeout(() => notif.close(), 9000);
    } catch {
      // Ignore notification failures.
    }
  }, []);

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "athletes", label: "Athlètes", icon: Users },
    { id: "recruitment", label: "Recrutement", icon: Target },
    { id: "opportunities", label: "Opportunités", icon: Briefcase },
    { id: "payments", label: "Paiements", icon: DollarSign },
    { id: "recruiters", label: "Recruteurs", icon: UserCheck },
    { id: "publication", label: "Publication", icon: Megaphone },
    { id: "messages", label: "Messages", icon: Mail },
    { id: "reports", label: "Rapports", icon: BarChart },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const DG_EMAIL = 'kbgmathieu@gmail.com';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || (user.email || '').trim().toLowerCase() !== DG_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        navigate('/login/dg');
        return;
      }
      setUser(user);

      if (user?.email) {
        void enableDevicePush(supabase as any, user.email, 'dg');
      }
    };
    getUser();
  }, [navigate]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const pushEnabledPref = localStorage.getItem('agta_push_enabled');
    if (Notification.permission === 'default' && pushEnabledPref !== '0') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handleExternalTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) setActiveMenu(customEvent.detail);
    };
    window.addEventListener('agta:navigate-tab', handleExternalTabChange as EventListener);
    return () => window.removeEventListener('agta:navigate-tab', handleExternalTabChange as EventListener);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`dg-device-notify-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const id = String(payload?.new?.id || payload?.commit_timestamp || Date.now());
        const key = `messages-insert-${id}`;
        if (notifiedEventsRef.current.has(key) || activeMenu === 'messages') return;
        notifiedEventsRef.current.add(key);

        const sender = String(payload?.new?.sender_name || 'AGTA');
        const content = String(payload?.new?.content || payload?.new?.attachment_name || 'Nouveau message');
        showDeviceNotification('AGTA • Nouveau message', `${sender}: ${content.slice(0, 120)}`, 'agta-msg-dg');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment' }, (payload: any) => {
        const id = String(payload?.new?.id || payload?.old?.id || payload?.commit_timestamp || Date.now());
        const key = `recruitment-${payload?.eventType || 'change'}-${id}`;
        if (notifiedEventsRef.current.has(key)) return;
        notifiedEventsRef.current.add(key);

        const eventType = String(payload?.eventType || '').toUpperCase();
        const status = String(payload?.new?.status || '').toLowerCase();
        const candidate = String(payload?.new?.full_name || payload?.new?.name || 'Candidat');

        if (eventType === 'INSERT') {
          showDeviceNotification('AGTA • Nouvelle candidature', `${candidate} vient de s'inscrire.`, 'agta-recruit-insert-dg');
          return;
        }
        if (status === 'accepted') {
          showDeviceNotification('AGTA • Candidature validée', `${candidate} a été validé par la DG.`, 'agta-recruit-accepted-dg');
          return;
        }
        if (status === 'rejected') {
          showDeviceNotification('AGTA • Candidature rejetée', `${candidate} a été rejeté par la DG.`, 'agta-recruit-rejected-dg');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agta_activity' }, (payload: any) => {
        const id = String(payload?.new?.id || payload?.commit_timestamp || Date.now());
        const key = `activity-insert-${id}`;
        if (notifiedEventsRef.current.has(key)) return;
        notifiedEventsRef.current.add(key);

        const description = String(payload?.new?.description || payload?.new?.activity_type || 'Mise à jour AGTA');
        showDeviceNotification('AGTA • Mise à jour', description.slice(0, 140), 'agta-activity-dg');
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeMenu, showDeviceNotification]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login/dg");
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardContent />;
      case "athletes":
        return <AthletesContent />;
      case "recruitment":
        return <RecruitmentContent />;
      case "opportunities":
        return <OpportunitiesContent />;
      case "payments":
        return <PaymentsContent />;
      case "recruiters":
        return <RecruitersContent />;
      case "publication":
        return <PublicationContent />;
      case "messages":
        return <MessagesView currentUserName="Direction Générale" defaultChannel="Direction Générale" defaultPeerUser="STAFF SECRETARY" />;
      case "reports":
        return <ReportsContent />;
      case "documents":
        return <DocumentsContent />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 bg-zinc-900 border-r border-[#C7FF00]/20 flex flex-col"
      >
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800 flex flex-col items-center">
          <img src={logo} alt="AGTA Logo" className="h-14 w-auto object-contain" />
          <p className="text-zinc-400 text-xs mt-1">ADMIN DG</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeMenu === item.id
                    ? "bg-[#C7FF00] text-[#0A0A0A] font-semibold"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            ))}
          </div>
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-zinc-800">
          {user && (
            <div className="text-sm text-zinc-400 mb-3">
              {user.email}
              <span className="text-[#C7FF00] font-bold ml-2">● DG</span>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Dashboard Content
type TrendPoint = {
  time: string;
  activites: number;
};

type PeriodKey = "24h" | "7d" | "30d";

type KpiKey = "athletes" | "contracts" | "revenue" | "partners";

type DashboardSnapshot = {
  athletesCount: number;
  athletesGrowth: string;
  contractsCount: number;
  contractsGrowth: string;
  revenueTotal: number;
  revenueGrowth: string;
  partnersCount: number;
  partnersGrowth: string;
  portfolioValue: number;
  portfolioGrowth: string;
  trend24h: TrendPoint[];
  updatedAt: string;
};

const EMPTY_TREND: TrendPoint[] = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((time) => ({
  time,
  activites: 0,
}));

const EMPTY_DASHBOARD: DashboardSnapshot = {
  athletesCount: 0,
  athletesGrowth: "+0.00%",
  contractsCount: 0,
  contractsGrowth: "+0.00%",
  revenueTotal: 0,
  revenueGrowth: "+0.00%",
  partnersCount: 0,
  partnersGrowth: "+0.00%",
  portfolioValue: 0,
  portfolioGrowth: "+0.00%",
  trend24h: EMPTY_TREND,
  updatedAt: "--:--:--",
};

const parseAmount = (raw: unknown): number => {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const normalized = String(raw).replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeGrowth = (current: number, previous: number): string => {
  if (previous === 0 && current === 0) return "+0.00%";
  if (previous === 0) return "+100.00%";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
};

const formatCompactUsd = (amount: number): string => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
};

const formatUsd = (amount: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

const getPeriodBounds = (period: PeriodKey, now: Date) => {
  const currentStart = new Date(now);
  const previousStart = new Date(now);

  if (period === "24h") {
    currentStart.setHours(currentStart.getHours() - 24);
    previousStart.setHours(previousStart.getHours() - 48);
  } else if (period === "7d") {
    currentStart.setDate(currentStart.getDate() - 7);
    previousStart.setDate(previousStart.getDate() - 14);
  } else {
    currentStart.setDate(currentStart.getDate() - 30);
    previousStart.setDate(previousStart.getDate() - 60);
  }

  return {
    currentStartIso: currentStart.toISOString(),
    previousStartIso: previousStart.toISOString(),
    nowIso: now.toISOString(),
  };
};

const buildTrendSeries = (period: PeriodKey, dateValues: string[], now: Date): TrendPoint[] => {
  if (period === "24h") {
    const template = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((time) => ({
      time,
      activites: 0,
    }));
    const start = new Date(now);
    start.setHours(start.getHours() - 24);
    const startIso = start.toISOString();

    dateValues.forEach((dateRaw) => {
      if (!dateRaw || dateRaw < startIso) return;
      const date = new Date(dateRaw);
      const bucket = Math.min(Math.floor(date.getHours() / 4), template.length - 1);
      template[bucket].activites += 1;
    });

    return template;
  }

  if (period === "7d") {
    const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
    const points: Array<TrendPoint & { key: string }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      points.push({
        key: d.toISOString().slice(0, 10),
        time: formatter.format(d).replace(".", "").toUpperCase(),
        activites: 0,
      });
    }

    const byDay = new Map<string, number>(points.map((p) => [p.key, 0] as [string, number]));
    dateValues.forEach((dateRaw) => {
      const key = String(dateRaw || "").slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) || 0) + 1);
    });

    return points.map((p) => ({ time: p.time, activites: byDay.get(p.key) || 0 }));
  }

  const points: Array<TrendPoint & { start: number; end: number }> = [];
  for (let i = 9; i >= 0; i -= 1) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - i * 3);
    const start = new Date(end);
    start.setDate(start.getDate() - 2);
    start.setHours(0, 0, 0, 0);
    points.push({
      time: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      start: start.getTime(),
      end: end.getTime(),
      activites: 0,
    });
  }

  dateValues.forEach((dateRaw) => {
    const ms = new Date(dateRaw || "").getTime();
    if (!Number.isFinite(ms)) return;
    const bucket = points.find((p) => ms >= p.start && ms <= p.end);
    if (bucket) bucket.activites += 1;
  });

  return points.map((p) => ({ time: p.time, activites: p.activites }));
};

function DashboardContent() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("24h");
  const [selectedKpi, setSelectedKpi] = useState<KpiKey>("athletes");

  const fetchDashboardSnapshot = useCallback(async () => {
    const now = new Date();
    const { currentStartIso, previousStartIso, nowIso } = getPeriodBounds(selectedPeriod, now);

    const safeSelect = async (table: string, columns: string) => {
      const { data, error } = await supabase.from(table).select(columns);
      if (error) {
        console.warn(`Dashboard: impossible de lire ${table}`, error.message);
        return [] as any[];
      }
      return (data || []) as any[];
    };

    try {
      const [
        athletes,
        payments,
        recruiters,
        documents,
        recruitment,
        activities,
      ] = await Promise.all([
        safeSelect("athletes", "id, value, created_at"),
        safeSelect("payments", "id, amount, status, created_at"),
        safeSelect("recruiters", "id, created_at"),
        safeSelect("documents", "id, document_type, created_at"),
        safeSelect("recruitment", "id, status, created_at"),
        safeSelect("agta_activity", "id, created_at"),
      ]);

      const inRange = (dateRaw: unknown, fromIso: string, toIso: string) => {
        const date = String(dateRaw || "");
        return date >= fromIso && date < toIso;
      };

      const athletesCount = athletes.length;
      const athletesCurrent = athletes.filter((a) => inRange(a.created_at, currentStartIso, nowIso)).length;
      const athletesPrevious = athletes.filter((a) => inRange(a.created_at, previousStartIso, currentStartIso)).length;

      const portfolioValue = athletes.reduce((sum, athlete) => sum + parseAmount(athlete.value), 0);
      const portfolioCurrent = athletes
        .filter((a) => inRange(a.created_at, currentStartIso, nowIso))
        .reduce((sum, athlete) => sum + parseAmount(athlete.value), 0);
      const portfolioPrevious = athletes
        .filter((a) => inRange(a.created_at, previousStartIso, currentStartIso))
        .reduce((sum, athlete) => sum + parseAmount(athlete.value), 0);

      const docsContracts = documents.filter((doc) =>
        String(doc.document_type || "").toLowerCase().includes("contract")
      );
      const acceptedRecruitment = recruitment.filter((row) => String(row.status || "").toLowerCase() === "accepted");
      const useRecruitmentFallback = docsContracts.length === 0;

      const contractsCount = useRecruitmentFallback ? acceptedRecruitment.length : docsContracts.length;
      const contractsCurrent = useRecruitmentFallback
        ? acceptedRecruitment.filter((row) => inRange(row.created_at, currentStartIso, nowIso)).length
        : docsContracts.filter((row) => inRange(row.created_at, currentStartIso, nowIso)).length;
      const contractsPrevious = useRecruitmentFallback
        ? acceptedRecruitment.filter((row) => inRange(row.created_at, previousStartIso, currentStartIso)).length
        : docsContracts.filter((row) => inRange(row.created_at, previousStartIso, currentStartIso)).length;

      const completedPayments = payments.filter((payment) => String(payment.status || "completed").toLowerCase() === "completed");
      const revenueTotal = completedPayments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
      const revenueCurrent = completedPayments
        .filter((p) => inRange(p.created_at, currentStartIso, nowIso))
        .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
      const revenuePrevious = completedPayments
        .filter((p) => inRange(p.created_at, previousStartIso, currentStartIso))
        .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);

      const partnersCount = recruiters.length;
      const partnersCurrent = recruiters.filter((r) => inRange(r.created_at, currentStartIso, nowIso)).length;
      const partnersPrevious = recruiters.filter((r) => inRange(r.created_at, previousStartIso, currentStartIso)).length;

      const trendTemplate = buildTrendSeries(
        selectedPeriod,
        [...recruitment, ...completedPayments, ...activities].map((row) => String(row.created_at || "")),
        now
      );

      setSnapshot({
        athletesCount,
        athletesGrowth: computeGrowth(athletesCurrent, athletesPrevious),
        contractsCount,
        contractsGrowth: computeGrowth(contractsCurrent, contractsPrevious),
        revenueTotal,
        revenueGrowth: computeGrowth(revenueCurrent, revenuePrevious),
        partnersCount,
        partnersGrowth: computeGrowth(partnersCurrent, partnersPrevious),
        portfolioValue,
        portfolioGrowth: computeGrowth(portfolioCurrent, portfolioPrevious),
        trend24h: trendTemplate,
        updatedAt: new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(now),
      });
    } catch (error) {
      console.error("Erreur dashboard DG:", error);
      setSnapshot((prev) => ({ ...prev, updatedAt: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()) }));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchDashboardSnapshot();

    const tables = ["athletes", "payments", "recruiters", "documents", "recruitment", "agta_activity"];
    const channels = tables.map((table) =>
      supabase
        .channel(`dg-dashboard-${table}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, fetchDashboardSnapshot)
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [fetchDashboardSnapshot]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-black text-[#C7FF00] mb-2">Dashboard</h1>
        <p className="text-zinc-400">Vue globale de l'agence</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-widest mr-2">Période</span>
        {([
          { id: "24h", label: "24h" },
          { id: "7d", label: "7j" },
          { id: "30d", label: "30j" },
        ] as Array<{ id: PeriodKey; label: string }>).map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedPeriod(option.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              selectedPeriod === option.id
                ? "bg-[#C7FF00] text-black"
                : "bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-[#C7FF00]/40"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Top Row: Radar + Counter + Clocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecruitmentRadar />
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-[#C7FF00]/10 to-[#C7FF00]/5 border border-[#C7FF00]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(199,255,0,0.15)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-lg">Valeur Marchande</h3>
              <p className="text-zinc-400 text-xs">Portefeuille Global</p>
            </div>
            <DollarSign className="w-6 h-6 text-[#C7FF00]" />
          </div>

          <div className="space-y-2">
            <div className="text-4xl font-black text-[#C7FF00] font-mono">
              {loading ? "..." : formatUsd(snapshot.portfolioValue)}
            </div>
            <motion.div
              animate={{ width: ["0%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="h-1 bg-gradient-to-r from-[#C7FF00] to-transparent rounded-full"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-[#C7FF00]/20 text-xs text-zinc-400 flex items-center justify-between">
            <span>Mis à jour en temps réel</span>
            <span className="text-[#C7FF00] font-mono">{snapshot.portfolioGrowth}</span>
          </div>
        </motion.div>
        <WorldClocks />
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-[#C7FF00]/20 rounded-xl p-6"
      >
        <h3 className="text-white font-bold text-lg mb-6">
          Tendances - Performance {selectedPeriod === "24h" ? "24h" : selectedPeriod === "7d" ? "7 jours" : "30 jours"}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={snapshot.trend24h}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(199, 255, 0, 0.1)" />
            <XAxis dataKey="time" stroke="#A1A1A1" />
            <YAxis stroke="#A1A1A1" />
            <Line
              type="monotone"
              dataKey="activites"
              stroke="#C7FF00"
              fill="rgba(199, 255, 0, 0.1)"
              dot={{ fill: "#C7FF00" }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-zinc-500 text-xs mt-3">Dernière synchro: {snapshot.updatedAt}</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: "athletes" as KpiKey, label: "Athlètes", value: String(snapshot.athletesCount), change: snapshot.athletesGrowth },
          { id: "contracts" as KpiKey, label: "Contrats", value: String(snapshot.contractsCount), change: snapshot.contractsGrowth },
          { id: "revenue" as KpiKey, label: "Revenus", value: formatCompactUsd(snapshot.revenueTotal), change: snapshot.revenueGrowth },
          { id: "partners" as KpiKey, label: "Partenaires", value: String(snapshot.partnersCount), change: snapshot.partnersGrowth },
        ].map((stat, idx) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedKpi(stat.id)}
            className={`p-4 bg-[#C7FF00]/5 border rounded-lg transition cursor-pointer ${
              selectedKpi === stat.id
                ? "border-[#C7FF00]"
                : "border-[#C7FF00]/20 hover:border-[#C7FF00]/50"
            }`}
          >
            <p className="text-zinc-400 text-xs mb-2">{stat.label}</p>
            <p className="text-2xl font-black text-[#C7FF00]">{stat.value}</p>
            <p className="text-[#C7FF00] text-xs">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5"
      >
        <h4 className="text-white font-bold text-sm mb-3">Drill-down KPI</h4>
        {selectedKpi === "athletes" ? (
          <div className="text-sm text-zinc-300 space-y-1">
            <p>Total portefeuille athlètes: <span className="text-[#C7FF00] font-bold">{snapshot.athletesCount}</span></p>
            <p>Variation période: <span className="text-[#C7FF00] font-bold">{snapshot.athletesGrowth}</span></p>
            <p className="text-zinc-500 text-xs">Source: table athletes (COUNT)</p>
          </div>
        ) : selectedKpi === "contracts" ? (
          <div className="text-sm text-zinc-300 space-y-1">
            <p>Contrats actifs/validés: <span className="text-[#C7FF00] font-bold">{snapshot.contractsCount}</span></p>
            <p>Variation période: <span className="text-[#C7FF00] font-bold">{snapshot.contractsGrowth}</span></p>
            <p className="text-zinc-500 text-xs">Source: documents(contract) puis fallback recruitment(accepted)</p>
          </div>
        ) : selectedKpi === "revenue" ? (
          <div className="text-sm text-zinc-300 space-y-1">
            <p>Revenu cumulé: <span className="text-[#C7FF00] font-bold">{formatUsd(snapshot.revenueTotal)}</span></p>
            <p>Variation période: <span className="text-[#C7FF00] font-bold">{snapshot.revenueGrowth}</span></p>
            <p className="text-zinc-500 text-xs">Source: payments(status=completed)</p>
          </div>
        ) : (
          <div className="text-sm text-zinc-300 space-y-1">
            <p>Partenaires/recruteurs: <span className="text-[#C7FF00] font-bold">{snapshot.partnersCount}</span></p>
            <p>Variation période: <span className="text-[#C7FF00] font-bold">{snapshot.partnersGrowth}</span></p>
            <p className="text-zinc-500 text-xs">Source: table recruiters</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// ATHLÈTES — section principale Admin DG
// ─────────────────────────────────────────────
type AthleteStatus = 'Actif' | 'Inactif' | 'published' | 'active' | 'inactive';

interface AthleteRecord {
  id: string;
  name: string;
  sport?: string | null;
  position?: string | null;
  club?: string | null;
  value?: string | null;
  status?: AthleteStatus | string | null;
  location?: string | null;
  registration_type?: string | null;
  created_at?: string | null;
  nationality?: string | null;
  age?: number | null;
  height?: string | null;
  weight?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  achievements?: string | null;
  // Links
  portfolio_url?: string | null;
  website_url?: string | null;
  youtube_url?: string | null;
  highlight_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  x_url?: string | null;
  // File URLs (stored after upload)
  profile_photo_url?: string | null;
  photo_urls?: string | null;
  video_urls?: string | null;
  cv_url?: string | null;
  portfolio_file_url?: string | null;
}

const SPORTS_LIST = ['Football', 'Basketball', 'Athletics', 'Tennis', 'Rugby', 'Volleyball', 'Swimming', 'Boxing', 'Cycling', 'Other'];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  Actif:     { label: 'Actif',     cls: 'bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30' },
  active:    { label: 'Actif',     cls: 'bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30' },
  published: { label: 'Publié',    cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  Inactif:   { label: 'Inactif',   cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600' },
  inactive:  { label: 'Inactif',   cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600' },
};

const getBadge = (status?: string | null) =>
  STATUS_BADGE[status || ''] ?? { label: status || 'N/A', cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600' };

const LEGACY_PUBLISHED_NAMES = new Set(['exauce ikamba', 'victorine mbussa']);

const normalizeName = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isLegacyPublishedAthlete = (athlete: AthleteRecord) =>
  LEGACY_PUBLISHED_NAMES.has(normalizeName(athlete.name));

const EMPTY_ATHLETE: Omit<AthleteRecord, 'id' | 'created_at'> = {
  name: '',
  sport: '',
  position: '',
  club: '',
  value: '',
  status: 'Actif',
  location: '',
  nationality: '',
  age: null,
  height: '',
  weight: '',
  bio: '',
  email: '',
  phone: '',
  achievements: '',
  portfolio_url: '',
  website_url: '',
  youtube_url: '',
  highlight_url: '',
  instagram_url: '',
  tiktok_url: '',
  linkedin_url: '',
  facebook_url: '',
  x_url: '',
  profile_photo_url: '',
  photo_urls: '',
  video_urls: '',
  cv_url: '',
  portfolio_file_url: '',
};

function AthletesContent() {
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [recruitmentPhotoMap, setRecruitmentPhotoMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [formData, setFormData] = useState<Omit<AthleteRecord, 'id' | 'created_at'>>(EMPTY_ATHLETE);
  const [formError, setFormError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  // File states for uploads
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const athleteKey = (name?: string | null, sport?: string | null, position?: string | null) =>
    `${String(name || '').trim().toLowerCase()}|${String(sport || '').trim().toLowerCase()}|${String(position || '').trim().toLowerCase()}`;

  const parseProfilePhotoFromExperience = (experience?: string | null) => {
    const text = String(experience || '');
    if (!text) return '';

    const linksMatch = text.match(/Liens\s*&\s*assets:\s*(.*)/i);
    if (!linksMatch) return '';

    const links: Record<string, string> = {};
    linksMatch[1].split(' | ').forEach((chunk) => {
      const [rawKey, ...rest] = chunk.split(': ');
      const value = rest.join(': ').trim();
      if (rawKey && value) links[rawKey.trim().toLowerCase()] = value;
    });

    const direct = String(links.profile_photo_url || links.photo_url || '').trim();
    if (direct) return direct;

    const firstPhoto = String(links.photo_urls || '')
      .split(',')
      .map((part) => part.trim())
      .find(Boolean);
    return firstPhoto || '';
  };

  // ── Fetch ──────────────────────────────────
  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    try {
      const [athletesRes, recruitmentRes] = await Promise.all([
        supabase
          .from('athletes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('recruitment')
          .select('full_name, sport, position, experience, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (athletesRes.error) throw athletesRes.error;
      if (recruitmentRes.error) throw recruitmentRes.error;

      const fallback: Record<string, string> = {};
      (recruitmentRes.data || []).forEach((row: any) => {
        const key = athleteKey(row.full_name, row.sport, row.position);
        if (!key || fallback[key]) return;
        const photo = parseProfilePhotoFromExperience(row.experience);
        if (photo) fallback[key] = photo;
      });

      setRecruitmentPhotoMap(fallback);
      setAthletes((athletesRes.data || []) as AthleteRecord[]);
    } catch (err) {
      console.error('Erreur fetch athlètes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAthletes(); }, [fetchAthletes]);

  // ── Realtime ───────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('athletes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes' }, () => {
        void fetchAthletes();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [fetchAthletes]);

  // ── Derived ────────────────────────────────
  const sports = useMemo(() => {
    const s = new Set(athletes.map(a => a.sport).filter(Boolean) as string[]);
    return ['all', ...Array.from(s).sort()];
  }, [athletes]);

  const filtered = useMemo(() => {
    return athletes.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q || [a.name, a.sport, a.position, a.club, a.location]
        .some(f => String(f || '').toLowerCase().includes(q));
      const matchSport = filterSport === 'all' || a.sport === filterSport;
      const effectiveStatus = isLegacyPublishedAthlete(a) ? 'published' : String(a.status || '');
      const matchStatus = filterStatus === 'all' || effectiveStatus === filterStatus;
      return matchSearch && matchSport && matchStatus;
    });
  }, [athletes, search, filterSport, filterStatus]);

  const selectedAthlete = useMemo(() =>
    athletes.find(a => a.id === selectedId) ?? null
  , [athletes, selectedId]);

  const getAthleteImage = (athlete: AthleteRecord) => {
    const profile = String(athlete.profile_photo_url || '').trim();
    if (profile) return profile;
    const firstPhoto = String(athlete.photo_urls || '')
      .split(',')
      .map((part) => part.trim())
      .find(Boolean);
    if (firstPhoto) return firstPhoto;
    const key = athleteKey(athlete.name, athlete.sport, athlete.position);
    return recruitmentPhotoMap[key] || '';
  };

  const kpis = useMemo(() => {
    const actif = athletes.filter(a => {
      const effectiveStatus = isLegacyPublishedAthlete(a) ? 'published' : String(a.status || '');
      return ['Actif', 'active'].includes(effectiveStatus);
    }).length;
    const published = athletes.filter(a => {
      const effectiveStatus = isLegacyPublishedAthlete(a) ? 'published' : String(a.status || '');
      return effectiveStatus === 'published';
    }).length;
    const sports_count = new Set(athletes.map(a => a.sport).filter(Boolean)).size;
    return { total: athletes.length, actif, published, sports_count };
  }, [athletes]);

  // ── Profile Score ─────────────────────────
  const profileScore = useMemo(() => {
    const checks = [
      formData.name, formData.sport, formData.position, formData.club,
      formData.value, formData.bio, formData.age, formData.email, formData.phone,
      formData.height, formData.weight, formData.nationality,
      formData.portfolio_url, formData.website_url, formData.youtube_url,
      formData.highlight_url, formData.instagram_url, formData.tiktok_url,
      formData.linkedin_url, formData.facebook_url, formData.x_url,
      profilePhotoFile ? '1' : (formData.profile_photo_url || ''),
      photoFiles.length > 0 ? '1' : (formData.photo_urls || ''),
      videoFiles.length > 0 ? '1' : (formData.video_urls || ''),
      cvFile ? '1' : (formData.cv_url || ''),
      portfolioFile ? '1' : (formData.portfolio_file_url || ''),
    ];
    const filled = checks.filter(v => String(v ?? '').trim().length > 0).length;
    return Math.round((filled / checks.length) * 100);
  }, [formData, profilePhotoFile, photoFiles.length, videoFiles.length, cvFile, portfolioFile]);

  const scoreColor = profileScore >= 70 ? '#C7FF00' : profileScore >= 40 ? '#facc15' : '#f87171';

  // ── Storage upload helper ─────────────────
  const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const path = `athletes/${prefix}_${Date.now()}_${safeFileName(file.name)}`;
    for (const bucket of ['athlete-files', 'agta-files']) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl || null;
      }
    }
    return null;
  };

  const uploadFiles = async (files: File[], prefix: string): Promise<string[]> => {
    const results = await Promise.all(files.map(f => uploadFile(f, prefix)));
    return results.filter((u): u is string => Boolean(u));
  };

  const extractMissingAthletesColumn = (error: any): string | null => {
    const msg = String(error?.message || '');
    const postgrestMatch = msg.match(/Could not find the '([^']+)' column of 'athletes'/i);
    if (postgrestMatch?.[1]) return postgrestMatch[1];

    const postgresMatch = msg.match(/column\s+['\"]?([a-zA-Z0-9_]+)['\"]?\s+(?:of relation ['\"]?athletes['\"]?|does not exist)/i);
    if (postgresMatch?.[1]) return postgresMatch[1];

    return null;
  };

  const writeAthleteWithSchemaFallback = async (
    mode: 'insert' | 'update',
    inputPayload: Record<string, any>,
    id?: string
  ): Promise<string[]> => {
    const payload: Record<string, any> = { ...inputPayload };
    const droppedColumns: string[] = [];

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { error } = mode === 'insert'
        ? await supabase.from('athletes').insert([payload])
        : await supabase.from('athletes').update(payload).eq('id', id as string);

      if (!error) return droppedColumns;

      const isSchemaMismatch =
        error.code === 'PGRST204'
        || /schema cache/i.test(String(error.message || ''))
        || /column\s+.+\s+does not exist/i.test(String(error.message || ''));
      const missingColumn = extractMissingAthletesColumn(error);

      if (!isSchemaMismatch || !missingColumn || !(missingColumn in payload)) {
        throw error;
      }

      delete payload[missingColumn];
      if (!droppedColumns.includes(missingColumn)) {
        droppedColumns.push(missingColumn);
      }
    }

    throw new Error('Sauvegarde impossible: colonnes athletes incompatibles avec le schéma actuel.');
  };

  const resetFiles = () => {
    setProfilePhotoFile(null);
    setPhotoFiles([]);
    setVideoFiles([]);
    setCvFile(null);
    setPortfolioFile(null);
    setUploadProgress('');
  };

  // ── CRUD ──────────────────────────────────
  const openAdd = () => {
    setFormData(EMPTY_ATHLETE);
    setFormError('');
    setSaveNotice('');
    resetFiles();
    setShowModal('add');
  };

  const openEdit = (a: AthleteRecord) => {
    const { id: _id, created_at: _ca, ...rest } = a;
    setFormData({ ...EMPTY_ATHLETE, ...rest });
    setFormError('');
    setSaveNotice('');
    resetFiles();
    setShowModal('edit');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setFormError('Le nom est obligatoire.'); return; }
    setSaving(true);
    setFormError('');
    setSaveNotice('');
    setUploadProgress('');
    try {
      const payload: Record<string, any> = { ...formData };
      let droppedColumns: string[] = [];

      // Upload files
      if (profilePhotoFile) {
        setUploadProgress('Photo profil…');
        const url = await uploadFile(profilePhotoFile, 'profile');
        if (url) payload.profile_photo_url = url;
      }
      if (photoFiles.length) {
        setUploadProgress(`Photos (${photoFiles.length})…`);
        const urls = await uploadFiles(photoFiles, 'photo');
        if (urls.length) payload.photo_urls = [formData.photo_urls, ...urls].filter(Boolean).join(', ');
      }
      if (videoFiles.length) {
        setUploadProgress(`Vidéos (${videoFiles.length})…`);
        const urls = await uploadFiles(videoFiles, 'video');
        if (urls.length) payload.video_urls = [formData.video_urls, ...urls].filter(Boolean).join(', ');
      }
      if (cvFile) {
        setUploadProgress('CV…');
        const url = await uploadFile(cvFile, 'cv');
        if (url) payload.cv_url = url;
      }
      if (portfolioFile) {
        setUploadProgress('Portfolio…');
        const url = await uploadFile(portfolioFile, 'portfolio');
        if (url) payload.portfolio_file_url = url;
      }

      setUploadProgress('Sauvegarde…');
      if (showModal === 'add') {
        droppedColumns = await writeAthleteWithSchemaFallback('insert', payload);
      } else if (showModal === 'edit' && selectedId) {
        droppedColumns = await writeAthleteWithSchemaFallback('update', payload, selectedId);
      }
      if (droppedColumns.length > 0) {
        setSaveNotice(`Colonnes absentes ignorees automatiquement: ${droppedColumns.join(', ')}`);
      }
      setShowModal(null);
      resetFiles();
      await fetchAthletes();
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer définitivement cet athlète?')) return;
    try {
      const { error } = await supabase.from('athletes').delete().eq('id', id);
      if (error) throw error;
      if (selectedId === id) setSelectedId(null);
      setAthletes(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erreur delete:', err);
    }
  };

  const handleToggleStatus = async (a: AthleteRecord) => {
    const currentStatus = isLegacyPublishedAthlete(a) ? 'published' : String(a.status || '');
    const next = currentStatus === 'published' ? 'Actif' : 'published';
    try {
      const { error } = await supabase.from('athletes').update({ status: next }).eq('id', a.id);
      if (error) throw error;
      setAthletes(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
    } catch (err) { console.error('Erreur toggle status:', err); }
  };

  // ── Render ────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00] tracking-tight">Gestion Athlètes</h1>
          <p className="text-zinc-400 text-sm mt-1">Total: <span className="text-white font-bold">{athletes.length}</span> athlètes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAthletes}
            className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-[#C7FF00] hover:border-[#C7FF00]/30 transition"
            title="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-[#C7FF00] text-black font-black text-sm rounded-lg hover:bg-[#b3e600] transition flex items-center gap-2 shadow-lg shadow-[#C7FF00]/20"
          >
            <Plus size={16} /> Add Athlete
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
          {saveNotice}
        </div>
      )}

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Athlètes', value: kpis.total, icon: <Users size={16} />, color: 'text-[#C7FF00]' },
          { label: 'Actifs', value: kpis.actif, icon: <CheckCircle2 size={16} />, color: 'text-emerald-400' },
          { label: 'Publiés', value: kpis.published, icon: <Globe size={16} />, color: 'text-blue-400' },
          { label: 'Sports', value: kpis.sports_count, icon: <TrendingUp size={16} />, color: 'text-purple-400' },
        ].map((k, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`${k.color} opacity-70`}>{k.icon}</div>
            <div>
              <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un athlète…"
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C7FF00]/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={filterSport}
            onChange={e => setFilterSport(e.target.value)}
            className="pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#C7FF00]/50 appearance-none cursor-pointer"
          >
            {sports.map(s => <option key={s} value={s}>{s === 'all' ? 'Tous les sports' : s}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#C7FF00]/50 appearance-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="Actif">Actif</option>
            <option value="active">Active</option>
            <option value="published">Publié</option>
            <option value="Inactif">Inactif</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* ── Main Grid: list + detail ── */}
      <div className="flex gap-5 min-h-[500px]">

        {/* ── Athlete List ── */}
        <div className={`flex-1 space-y-2 overflow-y-auto ${selectedAthlete ? 'max-h-[680px]' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-zinc-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-600">
              <Users size={28} />
              <p className="text-sm">Aucun athlète trouvé.</p>
              {!search && !athletes.length && (
                <button onClick={openAdd} className="text-xs text-[#C7FF00] underline mt-1">Ajouter le premier athlète</button>
              )}
            </div>
          ) : (
            filtered.map((a, idx) => {
              const effectiveStatus = isLegacyPublishedAthlete(a) ? 'published' : String(a.status || '');
              const badge = getBadge(effectiveStatus);
              const isSelected = selectedId === a.id;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedId(isSelected ? null : a.id)}
                  className={`group p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-800 border-[#C7FF00]/50 shadow-lg shadow-[#C7FF00]/5'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {getAthleteImage(a) ? (
                      <img
                        src={getAthleteImage(a)}
                        alt={a.name || 'Athlète'}
                        className="w-11 h-11 rounded-full border border-zinc-700 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-[#C7FF00] font-black text-sm flex-shrink-0">
                        {(a.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black truncate">{a.name || 'Sans nom'}</p>
                      <p className="text-[#C7FF00]/80 text-xs font-semibold truncate">
                        {[a.sport, a.position].filter(Boolean).join(' • ') || 'N/A'}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {a.club && (
                          <span className="text-zinc-500 text-[11px] truncate max-w-[180px]">
                            🏟 {a.club}
                          </span>
                        )}
                        {a.value && (
                          <span className="text-zinc-400 text-[11px]">
                            💰 {a.value.startsWith('$') ? a.value : `$${a.value}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(a); }}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition opacity-0 group-hover:opacity-100"
                        title="Modifier"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleStatus(a); }}
                        className="p-1.5 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-[#C7FF00]/10 hover:text-[#C7FF00] transition opacity-0 group-hover:opacity-100"
                        title={effectiveStatus === 'published' ? 'Dépublier' : 'Publier'}
                      >
                        <Globe size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition opacity-0 group-hover:opacity-100"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ── Athlete Detail Panel ── */}
        {selectedAthlete && (
          <motion.div
            key={selectedAthlete.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="w-80 flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden self-start sticky top-0"
          >
            {/* Card header */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 relative">
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-700/50 text-zinc-500 hover:text-white transition"
              >
                <X size={14} />
              </button>
              <div className="flex flex-col items-center gap-3">
                {getAthleteImage(selectedAthlete) ? (
                  <img
                    src={getAthleteImage(selectedAthlete)}
                    alt={selectedAthlete.name || 'Athlète'}
                    className="w-16 h-16 rounded-2xl border border-[#C7FF00]/30 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C7FF00]/20 to-zinc-700 border border-[#C7FF00]/30 flex items-center justify-center text-[#C7FF00] font-black text-xl">
                    {(selectedAthlete.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-white font-black text-lg leading-tight">{selectedAthlete.name}</h3>
                  <p className="text-[#C7FF00] text-sm font-semibold mt-0.5">
                    {[selectedAthlete.sport, selectedAthlete.position].filter(Boolean).join(' • ') || 'N/A'}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider ${getBadge(selectedAthlete.status).cls}`}>
                  {getBadge(isLegacyPublishedAthlete(selectedAthlete) ? 'published' : selectedAthlete.status).label}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5 space-y-4">
              {[
                { icon: '🏟', label: 'Club', value: selectedAthlete.club },
                { icon: '💰', label: 'Valeur marchande', value: selectedAthlete.value ? (selectedAthlete.value.startsWith('$') ? selectedAthlete.value : `$${selectedAthlete.value}`) : null },
                { icon: '📍', label: 'Localisation', value: selectedAthlete.location || selectedAthlete.nationality },
                { icon: '📏', label: 'Taille / Poids', value: [selectedAthlete.height, selectedAthlete.weight].filter(Boolean).join(' • ') || null },
                { icon: '🎂', label: 'Âge', value: selectedAthlete.age ? `${selectedAthlete.age} ans` : null },
                { icon: '✉️', label: 'Email', value: selectedAthlete.email },
                { icon: '📱', label: 'Téléphone', value: selectedAthlete.phone },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base mt-0.5">{f.icon}</span>
                  <div className="min-w-0">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{f.label}</p>
                    <p className="text-white text-sm font-semibold break-words">{f.value}</p>
                  </div>
                </div>
              ))}

              {selectedAthlete.bio && (
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Bio</p>
                  <p className="text-zinc-300 text-xs leading-relaxed">{selectedAthlete.bio}</p>
                </div>
              )}

              {selectedAthlete.achievements && (
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Award size={10} /> Palmarès
                  </p>
                  <div className="space-y-1">
                    {selectedAthlete.achievements.split('|').filter(Boolean).map((ach: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Star size={10} className="text-[#C7FF00] mt-0.5 flex-shrink-0" />
                        <span className="text-zinc-300 text-xs">{ach.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAthlete.created_at && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800">
                  <Clock size={11} className="text-zinc-600" />
                  <p className="text-zinc-600 text-[10px]">
                    Inscrit le {new Date(selectedAthlete.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEdit(selectedAthlete)}
                  className="flex-1 py-2 rounded-lg bg-[#C7FF00]/10 border border-[#C7FF00]/20 text-[#C7FF00] text-xs font-black hover:bg-[#C7FF00]/20 transition flex items-center justify-center gap-1.5"
                >
                  <Edit size={13} /> Modifier
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedAthlete)}
                  className="flex-1 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black hover:bg-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Globe size={13} /> {(isLegacyPublishedAthlete(selectedAthlete) ? 'published' : selectedAthlete.status) === 'published' ? 'Dépublier' : 'Publier'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C7FF00]/10 rounded-lg">
                  {showModal === 'add' ? <Sparkles size={18} className="text-[#C7FF00]" /> : <Edit size={18} className="text-[#C7FF00]" />}
                </div>
                <div>
                  <h2 className="text-white font-black">{showModal === 'add' ? 'Nouvel Athlète' : 'Modifier Athlète'}</h2>
                  <p className="text-zinc-500 text-xs">{showModal === 'add' ? 'Remplir les informations du profil' : formData.name}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{formError}</div>
              )}

              {/* Identité */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Identité</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-zinc-500 text-xs block mb-1">Nom complet *</label>
                    <input
                      value={formData.name}
                      onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                      placeholder="ex: Exaucé Ikamba"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Sport</label>
                    <div className="relative">
                      <select
                        value={formData.sport || ''}
                        onChange={e => setFormData(p => ({...p, sport: e.target.value}))}
                        className="w-full pl-3 pr-8 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 appearance-none"
                      >
                        <option value="">Choisir...</option>
                        {SPORTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Poste / Spécialité</label>
                    <input
                      value={formData.position || ''}
                      onChange={e => setFormData(p => ({...p, position: e.target.value}))}
                      placeholder="ex: Forward/Center"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Âge</label>
                    <input
                      type="number" min={10} max={60}
                      value={formData.age ?? ''}
                      onChange={e => setFormData(p => ({...p, age: e.target.value ? Number(e.target.value) : null}))}
                      placeholder="ex: 23"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Nationalité</label>
                    <input
                      value={formData.nationality || ''}
                      onChange={e => setFormData(p => ({...p, nationality: e.target.value}))}
                      placeholder="ex: DR Congo"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Physique */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Physique & Club</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Taille</label>
                    <input
                      value={formData.height || ''}
                      onChange={e => setFormData(p => ({...p, height: e.target.value}))}
                      placeholder="ex: 2.04 m"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Poids</label>
                    <input
                      value={formData.weight || ''}
                      onChange={e => setFormData(p => ({...p, weight: e.target.value}))}
                      placeholder="ex: 95 kg"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-zinc-500 text-xs block mb-1">Club actuel</label>
                    <input
                      value={formData.club || ''}
                      onChange={e => setFormData(p => ({...p, club: e.target.value}))}
                      placeholder="ex: National Team DR Congo"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Contrat & Valeur */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Valeur & Statut</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Valeur marchande</label>
                    <input
                      value={formData.value || ''}
                      onChange={e => setFormData(p => ({...p, value: e.target.value}))}
                      placeholder="ex: $High Potential Prospect"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Statut</label>
                    <div className="relative">
                      <select
                        value={formData.status || 'Actif'}
                        onChange={e => setFormData(p => ({...p, status: e.target.value}))}
                        className="w-full pl-3 pr-8 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 appearance-none"
                      >
                        <option value="Actif">Actif</option>
                        <option value="published">Publié</option>
                        <option value="Inactif">Inactif</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-zinc-500 text-xs block mb-1">Localisation</label>
                    <input
                      value={formData.location || ''}
                      onChange={e => setFormData(p => ({...p, location: e.target.value}))}
                      placeholder="ex: Kinshasa, DRC"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                      placeholder="athlete@example.com"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Téléphone</label>
                    <input
                      value={formData.phone || ''}
                      onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      placeholder="+243 xxx xxx xxx"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Bio & Palmarès */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Profil & Palmarès</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Bio / Description</label>
                    <textarea
                      rows={3}
                      value={formData.bio || ''}
                      onChange={e => setFormData(p => ({...p, bio: e.target.value}))}
                      placeholder="Présentation courte de l'athlète..."
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs block mb-1">Palmarès <span className="text-zinc-600">(séparés par |)</span></label>
                    <textarea
                      rows={2}
                      value={formData.achievements || ''}
                      onChange={e => setFormData(p => ({...p, achievements: e.target.value}))}
                      placeholder="National Team Player | BAL Qualified | All-Star 2025"
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Assets Optionnels */}
              <div>
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-1">Assets Optionnels <span className="text-[#C7FF00]">(fortement recommandés)</span></p>
                <p className="text-zinc-600 text-[10px] mb-4">Augmentent significativement les chances de visibilité et de contrat.</p>

                {/* File uploads */}
                <div className="space-y-3">

                  {/* Photo Profil */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                    <div className="p-2 bg-zinc-700 rounded-lg flex-shrink-0">
                      <span className="text-lg">🖼️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">Photo Profil</p>
                      <p className="text-zinc-500 text-[10px] mb-2">Photo principale affichée dans Liste Profils</p>
                      {formData.profile_photo_url && (
                        <div className="mb-2">
                          <img
                            src={formData.profile_photo_url}
                            alt={formData.name || 'Aperçu photo profil'}
                            className="w-14 h-14 rounded-lg object-cover border border-zinc-700"
                          />
                        </div>
                      )}
                      {profilePhotoFile ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#C7FF00] text-[10px] truncate max-w-[180px]">✓ {profilePhotoFile.name}</span>
                          <button onClick={() => setProfilePhotoFile(null)} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : formData.profile_photo_url ? (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-[10px] truncate max-w-[180px]">🔗 Existant</span>
                          <button onClick={() => setFormData(p => ({...p, profile_photo_url: ''}))} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir un fichier
                          <input type="file" accept="image/*" className="hidden" onChange={e => setProfilePhotoFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                      <div className="mt-2">
                        <input
                          type="url"
                          value={formData.profile_photo_url || ''}
                          onChange={e => setFormData(p => ({...p, profile_photo_url: e.target.value}))}
                          placeholder="URL photo profil (optionnel)"
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF00]/50 placeholder-zinc-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photos (up to 20) */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                    <div className="p-2 bg-zinc-700 rounded-lg flex-shrink-0">
                      <span className="text-lg">📷</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">Photos</p>
                      <p className="text-zinc-500 text-[10px] mb-2">Jusqu'à 20 photos</p>
                      {photoFiles.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#C7FF00] text-[10px]">✓ {photoFiles.length} fichier(s)</span>
                          <button onClick={() => setPhotoFiles([])} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir des fichiers
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                            const files = Array.from(e.target.files || []).slice(0, 20);
                            setPhotoFiles(files);
                          }} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Videos (up to 10) */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                    <div className="p-2 bg-zinc-700 rounded-lg flex-shrink-0">
                      <span className="text-lg">🎬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">Vidéo (fichier)</p>
                      <p className="text-zinc-500 text-[10px] mb-2">Jusqu'à 10 vidéos</p>
                      {videoFiles.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#C7FF00] text-[10px]">✓ {videoFiles.length} fichier(s)</span>
                          <button onClick={() => setVideoFiles([])} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir des fichiers
                          <input type="file" accept="video/*" multiple className="hidden" onChange={e => {
                            const files = Array.from(e.target.files || []).slice(0, 10);
                            setVideoFiles(files);
                          }} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* CV */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                    <div className="p-2 bg-zinc-700 rounded-lg flex-shrink-0">
                      <span className="text-lg">📄</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">CV</p>
                      <p className="text-zinc-500 text-[10px] mb-2">Un seul document, taille minimale 5 MB</p>
                      {cvFile ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] truncate max-w-[180px] ${cvFile.size < 5 * 1024 * 1024 ? 'text-yellow-400' : 'text-[#C7FF00]'}`}>
                            {cvFile.size < 5 * 1024 * 1024 ? '⚠️' : '✓'} {cvFile.name} ({(cvFile.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                          <button onClick={() => setCvFile(null)} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : formData.cv_url ? (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-[10px]">🔗 Existant</span>
                          <button onClick={() => setFormData(p => ({...p, cv_url: ''}))} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir un fichier
                          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setCvFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Portfolio file */}
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                    <div className="p-2 bg-zinc-700 rounded-lg flex-shrink-0">
                      <span className="text-lg">📁</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">Portfolio (fichier)</p>
                      <p className="text-zinc-500 text-[10px] mb-2">Un seul document, taille minimale 5 MB</p>
                      {portfolioFile ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] truncate max-w-[180px] ${portfolioFile.size < 5 * 1024 * 1024 ? 'text-yellow-400' : 'text-[#C7FF00]'}`}>
                            {portfolioFile.size < 5 * 1024 * 1024 ? '⚠️' : '✓'} {portfolioFile.name} ({(portfolioFile.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                          <button onClick={() => setPortfolioFile(null)} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : formData.portfolio_file_url ? (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-[10px]">🔗 Existant</span>
                          <button onClick={() => setFormData(p => ({...p, portfolio_file_url: ''}))} className="text-zinc-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir un fichier
                          <input type="file" accept=".pdf,.doc,.docx,.zip" className="hidden" onChange={e => setPortfolioFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Liens optionnels */}
                <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mt-6 mb-1">Liens optionnels <span className="text-zinc-500 font-normal normal-case tracking-normal">(augmentent les chances)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  {([
                    { key: 'portfolio_url',  label: 'Lien portfolio',         placeholder: 'https://...' },
                    { key: 'website_url',    label: 'Site web perso',          placeholder: 'https://...' },
                    { key: 'youtube_url',    label: 'Lien YouTube',            placeholder: 'https://youtube.com/...' },
                    { key: 'highlight_url',  label: 'Lien Video Highlights',   placeholder: 'https://...' },
                    { key: 'instagram_url',  label: 'Instagram',               placeholder: 'https://instagram.com/...' },
                    { key: 'tiktok_url',     label: 'TikTok',                  placeholder: 'https://tiktok.com/...' },
                    { key: 'linkedin_url',   label: 'LinkedIn',                placeholder: 'https://linkedin.com/in/...' },
                    { key: 'facebook_url',   label: 'Facebook',                placeholder: 'https://facebook.com/...' },
                    { key: 'x_url',          label: 'X / Twitter',             placeholder: 'https://x.com/...' },
                  ] as { key: keyof typeof formData; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-zinc-500 text-[10px] block mb-1">{label}</label>
                      <input
                        type="url"
                        value={String(formData[key] || '')}
                        onChange={e => setFormData(p => ({...p, [key]: e.target.value}))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF00]/50 placeholder-zinc-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Profil */}
              <div className="p-4 bg-zinc-800/60 rounded-xl border border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: scoreColor }} />
                    <p className="text-white text-sm font-black">Score Profil</p>
                  </div>
                  <p className="text-xl font-black" style={{ color: scoreColor }}>{profileScore}%</p>
                </div>
                <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: scoreColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${profileScore}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-zinc-500 text-[10px] mt-2">
                  {profileScore < 40 ? 'Profil incomplet — ajoutez des informations pour augmenter la visibilité.' :
                   profileScore < 70 ? 'Profil correct — quelques assets supplémentaires amélioreraient les chances.' :
                   'Excellent profil — très bonne visibilité auprès des recruteurs.'}
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={() => setShowModal(null)}
                className="px-5 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-[#C7FF00] text-black text-sm font-black hover:bg-[#b3e600] transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-[#C7FF00]/20"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {saving ? (uploadProgress || 'Sauvegarde…') : showModal === 'add' ? "Créer l'athlète" : 'Enregistrer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Recrutement Content
function RecruitmentContent() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'score-desc' | 'score-asc' | 'recent'>('score-desc');
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  const normalizeStatus = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const isPendingStatus = (value: unknown) => {
    const s = normalizeStatus(value);
    return s === 'pending' || s === 'en attente' || s === 'a valider' || s === 'a_valider' || s === 'new';
  };

  const isAcceptedStatus = (value: unknown) => {
    const s = normalizeStatus(value);
    return s === 'accepted' || s === 'accepte';
  };

  const isRejectedStatus = (value: unknown) => {
    const s = normalizeStatus(value);
    return s === 'rejected' || s === 'rejete';
  };

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const { data, error } = await supabase
          .from('recruitment')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setCandidates(data || []);
      } catch (err) {
        console.error('Erreur lors du chargement des candidatures:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();

    const ch = supabase
      .channel('dg-recruitment-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment' }, () => {
        void fetchCandidates();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const extractLinksFromExperience = (experience?: string | null) => {
    const text = String(experience || '');
    const linksMatch = text.match(/Liens\s*&\s*assets:\s*(.*)/i);
    const links: Record<string, string> = {};

    if (linksMatch && !/aucun fourni/i.test(linksMatch[1])) {
      linksMatch[1].split(' | ').forEach((chunk) => {
        const [rawKey, ...rest] = chunk.split(': ');
        const value = rest.join(': ').trim();
        if (rawKey && value) links[rawKey.trim()] = value;
      });
    }

    return links;
  };

  const extractLineValue = (experience: string | null | undefined, label: string) => {
    const text = String(experience || '');
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}:\\s*(.*)`, 'i'));
    return String(match?.[1] || '').trim();
  };

  const handleApprove = async (candidate: any) => {
    try {
      const links = extractLinksFromExperience(candidate.experience);
      const bio = extractLineValue(candidate.experience, 'Bio');
      const achievements = extractLineValue(candidate.experience, 'Palmares');
      const firstPhotoFromList = String(links.photo_urls || '')
        .split(',')
        .map((part) => part.trim())
        .find(Boolean) || null;

      // 1. Insert dans la table athletes
      const { error: insertError } = await supabase
        .from('athletes')
        .insert([{
          name: candidate.full_name,
          sport: candidate.sport,
          position: candidate.position,
          club: candidate.club || 'AGTA Academy',
          value: candidate.value || 'To be evaluated',
          registration_type: 'online',
          location: candidate.nationality || 'International',
          nationality: candidate.nationality || null,
          age: candidate.age || null,
          email: candidate.email || null,
          phone: candidate.phone || null,
          height: candidate.height || null,
          weight: candidate.weight || null,
          bio: bio || null,
          achievements: achievements || null,
          profile_photo_url: candidate.profile_photo_url || links.profile_photo_url || links.photo_url || firstPhotoFromList,
          photo_urls: candidate.photo_urls || links.photo_urls || null,
          video_urls: links.video_urls || null,
          cv_url: candidate.cv_url || links.cv || null,
          portfolio_file_url: links.portfolio_file_url || null,
          website_url: links.website || null,
          portfolio_url: links.portfolio_link || null,
          youtube_url: links.youtube || null,
          highlight_url: links.video_highlight || null,
          instagram_url: links.instagram || null,
          tiktok_url: links.tiktok || null,
          linkedin_url: links.linkedin || null,
          facebook_url: links.facebook || null,
          x_url: links.x || null,
          status: 'Actif',
        }]);
      
      if (insertError) throw insertError;

      // 2. Update status dans recruitment
      const { error: updateError } = await supabase
        .from('recruitment')
        .update({ status: 'accepted' })
        .eq('id', candidate.id);
      
      if (updateError) throw updateError;

      setCandidates(candidates.filter(c => c.id !== candidate.id));
    } catch (err) {
      console.error('Erreur lors de l\'approbation:', err);
    }
  };

  const handleReject = async (candidate: any) => {
    try {
      const { error } = await supabase
        .from('recruitment')
        .update({ status: 'rejected' })
        .eq('id', candidate.id);
      
      if (error) throw error;
      setCandidates(candidates.filter(c => c.id !== candidate.id));
    } catch (err) {
      console.error('Erreur lors du rejet:', err);
    }
  };

  const parseExperienceMeta = (experience?: string | null) => {
    const text = String(experience || '');
    const scoreMatch = text.match(/Profil enrichi:\s*(\d+)%/i);
    const linksMatch = text.match(/Liens\s*&\s*assets:\s*(.*)/i);

    const links: Record<string, string> = {};

    if (linksMatch && !/aucun fourni/i.test(linksMatch[1])) {
      linksMatch[1].split(' | ').forEach((chunk) => {
        const [rawKey, ...rest] = chunk.split(': ');
        const value = rest.join(': ').trim();
        if (rawKey && value) {
          links[rawKey.trim()] = value;
        }
      });
    }

    return {
      scoreFromText: scoreMatch ? Number(scoreMatch[1]) : null,
      links,
    };
  };

  const computeFallbackScore = (candidate: any) => {
    const checkpoints = [
      candidate.full_name,
      candidate.sport,
      candidate.position,
      candidate.club,
      candidate.value,
      candidate.age,
      candidate.email,
      candidate.phone,
      candidate.height,
      candidate.weight,
      candidate.nationality,
      candidate.video_url,
      candidate.cv_url,
      candidate.experience,
    ];

    const filled = checkpoints.filter((item) => String(item || '').trim().length > 0).length;
    return Math.round((filled / checkpoints.length) * 100);
  };

  const statusFilteredCandidates = useMemo(() => {
    if (statusFilter === 'all') return candidates;
    if (statusFilter === 'pending') return candidates.filter((candidate) => isPendingStatus(candidate.status));
    if (statusFilter === 'accepted') return candidates.filter((candidate) => isAcceptedStatus(candidate.status));
    return candidates.filter((candidate) => isRejectedStatus(candidate.status));
  }, [candidates, statusFilter]);

  const enrichedCandidates = useMemo(() => {
    return statusFilteredCandidates.map((candidate) => {
      const meta = parseExperienceMeta(candidate.experience);
      const profileScore = meta.scoreFromText ?? computeFallbackScore(candidate);

      const mergedLinks: Record<string, string> = {
        ...meta.links,
      };

      if (candidate.video_url) {
        mergedLinks.video = candidate.video_url;
      }
      if (candidate.cv_url) {
        mergedLinks.cv = candidate.cv_url;
      }

      return {
        ...candidate,
        profileScore,
        profileLinks: mergedLinks,
      };
    });
  }, [statusFilteredCandidates]);

  const statusSummary = useMemo(() => {
    const summary = {
      total: candidates.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      other: 0,
    };

    candidates.forEach((candidate) => {
      const s = normalizeStatus(candidate.status);
      if (isPendingStatus(s)) {
        summary.pending += 1;
      } else if (isAcceptedStatus(s)) {
        summary.accepted += 1;
      } else if (isRejectedStatus(s)) {
        summary.rejected += 1;
      } else {
        summary.other += 1;
      }
    });

    return summary;
  }, [candidates]);

  const sports = useMemo(() => {
    const values = Array.from(
      new Set(
        enrichedCandidates
          .map((candidate) => String(candidate.sport || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
    return ['all', ...values];
  }, [enrichedCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedCandidates.filter((candidate) => {
      const matchScore = candidate.profileScore >= minScore;
      const matchSport = sportFilter === 'all' || String(candidate.sport || '').trim() === sportFilter;
      const matchSearch =
        q.length === 0
        || [candidate.full_name, candidate.email, candidate.phone, candidate.club, candidate.sport, candidate.position]
          .some((field) => String(field || '').toLowerCase().includes(q));
      return matchScore && matchSport && matchSearch;
    });
  }, [enrichedCandidates, minScore, sportFilter, searchTerm]);

  const sortedCandidates = useMemo(() => {
    const list = [...filteredCandidates];
    if (sortMode === 'recent') {
      return list.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
    if (sortMode === 'score-asc') {
      return list.sort((a, b) => a.profileScore - b.profileScore);
    }
    return list.sort((a, b) => b.profileScore - a.profileScore);
  }, [filteredCandidates, sortMode]);

  const avgScore = useMemo(() => {
    if (enrichedCandidates.length === 0) return 0;
    const sum = enrichedCandidates.reduce((acc, curr) => acc + curr.profileScore, 0);
    return Math.round(sum / enrichedCandidates.length);
  }, [enrichedCandidates]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm, sportFilter, minScore, sortMode]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedCandidates.length / PAGE_SIZE)), [sortedCandidates.length]);

  const pagedCandidates = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedCandidates.slice(start, start + PAGE_SIZE);
  }, [sortedCandidates, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00] mb-2">Recrutement - Candidatures</h1>
          <p className="text-zinc-400 text-sm">
            Affichage enrichi: media, liens sociaux, portfolio, score de dossier
            {' • '}
            En attente: {statusSummary.pending} / Total: {statusSummary.total}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 min-w-[280px]">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Score de dossier</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-black text-[#C7FF00]">{avgScore}%</p>
            <p className="text-xs text-zinc-400">Moyenne sur {enrichedCandidates.length} profil(s)</p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <label className="text-xs text-zinc-400">Statut:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'accepted' | 'rejected' | 'all')}
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="pending">En attente</option>
              <option value="accepted">Acceptees</option>
              <option value="rejected">Rejetees</option>
              <option value="all">Toutes</option>
            </select>

            <label className="text-xs text-zinc-400 mt-1">Recherche:</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, email, club..."
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />

            <label className="text-xs text-zinc-400 mt-1">Sport:</label>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="all">Tous les sports</option>
              {sports.filter((s) => s !== 'all').map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>

            <label className="text-xs text-zinc-400 mr-2">Tri:</label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'score-desc' | 'score-asc' | 'recent')}
              className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
            >
              <option value="score-desc">Plus complets d'abord</option>
              <option value="score-asc">Moins complets d'abord</option>
              <option value="recent">Plus recents d'abord</option>
            </select>

            <label className="text-xs text-zinc-400 mt-1">Score minimum: {minScore}%</label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="accent-[#C7FF00]"
            />
            <p className="text-[11px] text-zinc-500">Resultats filtres: {sortedCandidates.length} • Page {page}/{totalPages}</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <p className="text-zinc-400">Chargement...</p>
      ) : statusFilteredCandidates.length === 0 ? (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm space-y-1">
          <p className="text-zinc-200 font-semibold">Aucune candidature pour ce statut.</p>
          <p className="text-zinc-500 text-xs">
            Repartition actuelle: acceptees {statusSummary.accepted} • rejetees {statusSummary.rejected} • autres {statusSummary.other}
          </p>
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm">
          Aucun resultat avec le filtre actuel (score minimum {minScore}%).
        </div>
      ) : (
        <div className="space-y-4">
          {pagedCandidates.map((candidate) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 bg-zinc-900 border border-zinc-700 rounded-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <p className="text-white font-black text-lg">{candidate.full_name}</p>
                  <p className="text-[#C7FF00] text-sm font-bold">{candidate.sport} • {candidate.position}</p>
                  <p className="text-zinc-400 text-xs mt-2">
                    {(candidate.nationality || 'N/A')} • {(candidate.email || 'N/A')} • {(candidate.phone || 'N/A')}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Club: {candidate.club || 'N/A'}</span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Valeur: {candidate.value || 'N/A'}</span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Age: {candidate.age || 'N/A'}</span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Taille: {candidate.height || 'N/A'}</span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Poids: {candidate.weight || 'N/A'}</span>
                  </div>

                  {candidate.experience ? (
                    <p className="text-zinc-300 text-xs mt-3 whitespace-pre-line">
                      {String(candidate.experience).slice(0, 280)}
                      {String(candidate.experience).length > 280 ? '...' : ''}
                    </p>
                  ) : null}

                  <div className="mt-3">
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-2">Media / Liens fournis</p>
                    {Object.entries(candidate.profileLinks).length === 0 ? (
                      <p className="text-xs text-zinc-500">Aucun lien ajoute.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(candidate.profileLinks).map(([key, url]) => (
                          <a
                            key={`${candidate.id}-${key}`}
                            href={String(url)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-[#C7FF00]/10 text-[#C7FF00] text-[11px] hover:bg-[#C7FF00]/20 transition"
                          >
                            {key}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#C7FF00] font-black text-xl">{candidate.profileScore}%</p>
                  <p className="text-zinc-400 text-xs">Score dossier</p>
                  {candidate.profileScore >= 75 ? (
                    <p className="text-[10px] font-black text-emerald-400 mt-1">TOP PROFIL</p>
                  ) : null}
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full mt-2 ml-auto overflow-hidden">
                    <div className="h-full bg-[#C7FF00]" style={{ width: `${candidate.profileScore}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApprove(candidate)}
                  className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 text-sm font-bold rounded-lg hover:bg-green-500/30 transition"
                >
                  ✅ Approuver
                </button>
                <button 
                  onClick={() => handleReject(candidate)}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 transition"
                >
                  ❌ Rejeter
                </button>
              </div>
            </motion.div>
          ))}

          {sortedCandidates.length > PAGE_SIZE && (
            <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
              <p className="text-xs text-zinc-400">Page {page} sur {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 disabled:opacity-40"
                >
                  Precedent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Opportunities Content
function OpportunitiesContent() {
  type OpportunityStatus = 'active' | 'filled' | 'expired';
  type OpportunityRecord = {
    id: string | number;
    title: string;
    sport: string;
    position: string;
    club?: string | null;
    location?: string | null;
    salary_range?: string | null;
    description?: string | null;
    requirements?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    status?: OpportunityStatus | string | null;
    created_at?: string | null;
  };

  const EMPTY_OPPORTUNITY: Omit<OpportunityRecord, 'id' | 'created_at'> = {
    title: '',
    sport: '',
    position: '',
    club: '',
    location: '',
    salary_range: '',
    description: '',
    requirements: '',
    image_url: '',
    video_url: '',
    status: 'active',
  };

  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OpportunityStatus>('all');
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Omit<OpportunityRecord, 'id' | 'created_at'>>(EMPTY_OPPORTUNITY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOpportunities((data || []) as OpportunityRecord[]);
    } catch (err: any) {
      console.error('Erreur chargement opportunites:', err);
      setError(err?.message || 'Impossible de charger les opportunites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOpportunities();

    const ch = supabase
      .channel('dg-opportunities-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => {
        void fetchOpportunities();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [fetchOpportunities]);

  const normalizedStatus = (value: unknown): OpportunityStatus => {
    const s = String(value || '').toLowerCase().trim();
    if (s === 'filled') return 'filled';
    if (s === 'expired') return 'expired';
    return 'active';
  };

  const statusMeta = (value: unknown) => {
    const s = normalizedStatus(value);
    if (s === 'filled') return { label: 'Pourvu', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' };
    if (s === 'expired') return { label: 'Expire', cls: 'bg-zinc-700/50 text-zinc-300 border border-zinc-600' };
    return { label: 'Actif', cls: 'bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30' };
  };

  const kpis = useMemo(() => {
    const active = opportunities.filter((o) => normalizedStatus(o.status) === 'active').length;
    const filled = opportunities.filter((o) => normalizedStatus(o.status) === 'filled').length;
    const expired = opportunities.filter((o) => normalizedStatus(o.status) === 'expired').length;
    return { total: opportunities.length, active, filled, expired };
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      const matchStatus = statusFilter === 'all' || normalizedStatus(o.status) === statusFilter;
      const matchQuery =
        q.length === 0
        || [o.title, o.sport, o.position, o.club, o.location, o.description]
          .some((field) => String(field || '').toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [opportunities, query, statusFilter]);

  const openAdd = () => {
    setFormData(EMPTY_OPPORTUNITY);
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
    setSelectedId(null);
    setShowModal('add');
    setError('');
  };

  const openEdit = (opportunity: OpportunityRecord) => {
    const { id, created_at: _createdAt, ...rest } = opportunity;
    setFormData({
      ...EMPTY_OPPORTUNITY,
      ...rest,
      status: normalizedStatus(rest.status),
    });
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
    setSelectedId(id);
    setShowModal('edit');
    setError('');
  };

  const closeModal = () => {
    setShowModal(null);
    setSelectedId(null);
    setFormData(EMPTY_OPPORTUNITY);
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
  };

  const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const uploadOpportunityFile = async (file: File, prefix: string): Promise<string | null> => {
    const path = `opportunities/${prefix}_${Date.now()}_${safeFileName(file.name)}`;
    for (const bucket of ['athlete-files', 'agta-files']) {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl || null;
      }
    }
    return null;
  };

  const extractMissingOpportunityColumn = (err: any): string | null => {
    const msg = String(err?.message || '');
    const postgrestMatch = msg.match(/Could not find the '([^']+)' column of 'opportunities'/i);
    if (postgrestMatch?.[1]) return postgrestMatch[1];
    const postgresMatch = msg.match(/column\s+['\"]?([a-zA-Z0-9_]+)['\"]?\s+(?:of relation ['\"]?opportunities['\"]?|does not exist)/i);
    if (postgresMatch?.[1]) return postgresMatch[1];
    return null;
  };

  const writeOpportunityWithSchemaFallback = async (
    mode: 'insert' | 'update',
    inputPayload: Record<string, any>,
    id?: string | number | null
  ) => {
    const payload: Record<string, any> = { ...inputPayload };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error: writeError } = mode === 'insert'
        ? await supabase.from('opportunities').insert([payload])
        : await supabase.from('opportunities').update(payload).eq('id', id as any);

      if (!writeError) return;

      const missingColumn = extractMissingOpportunityColumn(writeError);
      const isSchemaMismatch =
        writeError.code === 'PGRST204'
        || /schema cache/i.test(String(writeError?.message || ''))
        || /column\s+.+\s+does not exist/i.test(String(writeError?.message || ''));

      if (!isSchemaMismatch || !missingColumn || !(missingColumn in payload)) {
        throw writeError;
      }

      delete payload[missingColumn];
    }

    throw new Error('Sauvegarde opportunite impossible: schema opportunities incompatible.');
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.sport.trim() || !formData.position.trim()) {
      setError('Titre, sport et poste sont obligatoires.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        ...formData,
        title: formData.title.trim(),
        sport: formData.sport.trim(),
        position: formData.position.trim(),
        club: String(formData.club || '').trim() || null,
        location: String(formData.location || '').trim() || null,
        salary_range: String(formData.salary_range || '').trim() || null,
        description: String(formData.description || '').trim() || null,
        requirements: String(formData.requirements || '').trim() || null,
        image_url: String(formData.image_url || '').trim() || null,
        video_url: String(formData.video_url || '').trim() || null,
        status: normalizedStatus(formData.status),
      };

      if (imageFile) {
        setUploadProgress('Upload image...');
        const imageUrl = await uploadOpportunityFile(imageFile, 'image');
        if (imageUrl) payload.image_url = imageUrl;
      }

      if (videoFile) {
        setUploadProgress('Upload video...');
        const videoUrl = await uploadOpportunityFile(videoFile, 'video');
        if (videoUrl) payload.video_url = videoUrl;
      }

      setUploadProgress('Sauvegarde...');

      if (showModal === 'add') {
        await writeOpportunityWithSchemaFallback('insert', payload);
      } else if (showModal === 'edit' && selectedId != null) {
        await writeOpportunityWithSchemaFallback('update', payload, selectedId);
      }

      closeModal();
      await fetchOpportunities();
    } catch (err: any) {
      console.error('Erreur sauvegarde opportunite:', err);
      setError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Supprimer cette opportunite ?')) return;
    try {
      const { error: deleteError } = await supabase.from('opportunities').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Erreur suppression opportunite:', err);
    }
  };

  const handleCycleStatus = async (opportunity: OpportunityRecord) => {
    const current = normalizedStatus(opportunity.status);
    const next: OpportunityStatus = current === 'active' ? 'filled' : current === 'filled' ? 'expired' : 'active';
    try {
      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ status: next })
        .eq('id', opportunity.id);
      if (updateError) throw updateError;
      setOpportunities((prev) => prev.map((o) => (o.id === opportunity.id ? { ...o, status: next } : o)));
    } catch (err) {
      console.error('Erreur update statut opportunite:', err);
    }
  };

  const handlePublishToggle = async (opportunity: OpportunityRecord) => {
    const current = normalizedStatus(opportunity.status);
    const next: OpportunityStatus = current === 'active' ? 'expired' : 'active';
    try {
      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ status: next })
        .eq('id', opportunity.id);
      if (updateError) throw updateError;
      setOpportunities((prev) => prev.map((o) => (o.id === opportunity.id ? { ...o, status: next } : o)));
    } catch (err) {
      console.error('Erreur publication opportunite:', err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00] mb-2">Opportunités</h1>
          <p className="text-zinc-400 text-sm">Gestion complète: création, édition, statut et suppression</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchOpportunities()}
            className="p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-[#C7FF00] hover:border-[#C7FF00]/30 transition"
            title="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-[#C7FF00] text-black font-black text-sm rounded-lg hover:bg-[#b3e600] transition flex items-center gap-2"
          >
            <Plus size={16} /> Nouvelle opportunité
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: kpis.total, color: 'text-white' },
          { label: 'Actives', value: kpis.active, color: 'text-[#C7FF00]' },
          { label: 'Pourvues', value: kpis.filled, color: 'text-emerald-300' },
          { label: 'Expirees', value: kpis.expired, color: 'text-zinc-300' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (titre, sport, club...)"
          className="sm:col-span-2 w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | OpportunityStatus)}
          className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="filled">Pourvues</option>
          <option value="expired">Expirees</option>
        </select>
      </div>

      {loading ? (
        <p className="text-zinc-400">Chargement des opportunites...</p>
      ) : filtered.length === 0 ? (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 text-sm">Aucune opportunité trouvée.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opportunity) => {
            const meta = statusMeta(opportunity.status);
            return (
              <motion.div
                key={opportunity.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-zinc-900 border border-zinc-700 rounded-xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-black text-lg leading-tight">{opportunity.title}</h3>
                      <span className={`text-[11px] px-2 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                      {normalizedStatus(opportunity.status) === 'active' ? (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30">
                          Visible sur site principal
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600">
                          Masquee du site principal
                        </span>
                      )}
                    </div>
                    <p className="text-[#C7FF00] text-sm font-bold mt-1">{opportunity.sport} • {opportunity.position}</p>

                    <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Club: {opportunity.club || 'N/A'}</span>
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Lieu: {opportunity.location || 'N/A'}</span>
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Salaire: {opportunity.salary_range || 'N/A'}</span>
                    </div>

                    {opportunity.description && (
                      <p className="text-zinc-300 text-xs mt-3 whitespace-pre-line">
                        {String(opportunity.description).slice(0, 240)}
                        {String(opportunity.description).length > 240 ? '...' : ''}
                      </p>
                    )}

                    {(opportunity.image_url || opportunity.video_url) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {opportunity.image_url && (
                          <a
                            href={String(opportunity.image_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="block bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
                          >
                            <img
                              src={String(opportunity.image_url)}
                              alt={`Aperçu ${opportunity.title}`}
                              className="w-full h-36 object-cover"
                              loading="lazy"
                            />
                            <p className="px-2 py-1 text-[11px] text-blue-300">Image (ouvrir)</p>
                          </a>
                        )}
                        {opportunity.video_url && (
                          <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                            <video
                              src={String(opportunity.video_url)}
                              controls
                              preload="metadata"
                              className="w-full h-36 object-cover bg-black"
                            />
                            <a
                              href={String(opportunity.video_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="block px-2 py-1 text-[11px] text-purple-300"
                            >
                              Video (ouvrir)
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:min-w-[180px]">
                    <button
                      onClick={() => openEdit(opportunity)}
                      className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/30 transition flex items-center justify-center gap-1"
                    >
                      <Edit size={12} /> Edit
                    </button>
                    <button
                      onClick={() => void handlePublishToggle(opportunity)}
                      className="flex-1 px-3 py-2 bg-[#C7FF00]/15 text-[#C7FF00] text-xs font-bold rounded-lg hover:bg-[#C7FF00]/25 transition"
                    >
                      {normalizedStatus(opportunity.status) === 'active' ? 'Retirer du site' : 'Publier sur site'}
                    </button>
                    <button
                      onClick={() => void handleCycleStatus(opportunity)}
                      className="flex-1 px-3 py-2 bg-[#C7FF00]/15 text-[#C7FF00] text-xs font-bold rounded-lg hover:bg-[#C7FF00]/25 transition"
                    >
                      Changer statut
                    </button>
                    <button
                      onClick={() => void handleDelete(opportunity.id)}
                      className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 text-xs font-bold rounded-lg hover:bg-red-500/30 transition flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-white font-black text-lg">{showModal === 'add' ? 'Nouvelle opportunité' : 'Modifier opportunité'}</h2>
                <p className="text-zinc-500 text-xs">Renseigner les détails de publication</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-zinc-500 text-xs block mb-1">Titre *</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Sport *</label>
                  <input
                    value={formData.sport}
                    onChange={(e) => setFormData((p) => ({ ...p, sport: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Poste *</label>
                  <input
                    value={formData.position}
                    onChange={(e) => setFormData((p) => ({ ...p, position: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Club</label>
                  <input
                    value={formData.club || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, club: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Localisation</label>
                  <input
                    value={formData.location || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Salaire</label>
                  <input
                    value={formData.salary_range || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, salary_range: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs block mb-1">Statut</label>
                  <select
                    value={normalizedStatus(formData.status)}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as OpportunityStatus }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                  >
                    <option value="active">Actif</option>
                    <option value="filled">Pourvu</option>
                    <option value="expired">Expire</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-zinc-500 text-xs block mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-zinc-500 text-xs block mb-1">Exigences</label>
                  <textarea
                    rows={3}
                    value={formData.requirements || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, requirements: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 border-t border-zinc-800 pt-3">
                  <p className="text-zinc-400 text-[10px] uppercase tracking-[2px] font-bold mb-3">Media</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 text-xs block mb-1">Image (upload)</label>
                      {imageFile ? (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-[#C7FF00] truncate max-w-[180px]">{imageFile.name}</span>
                          <button onClick={() => setImageFile(null)} className="text-zinc-500 hover:text-red-400 transition">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="text-zinc-500 text-xs block mb-1">Video (upload)</label>
                      {videoFile ? (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-[#C7FF00] truncate max-w-[180px]">{videoFile.name}</span>
                          <button onClick={() => setVideoFile(null)} className="text-zinc-500 hover:text-red-400 transition">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-[#C7FF00] transition">
                          <UploadCloud size={12} /> Choisir video
                          <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="text-zinc-500 text-xs block mb-1">URL image (optionnel)</label>
                      <input
                        type="url"
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-500 text-xs block mb-1">URL video (optionnel)</label>
                      <input
                        type="url"
                        value={formData.video_url || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#C7FF00]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-[#C7FF00] text-black text-sm font-black hover:bg-[#b3e600] transition disabled:opacity-60"
              >
                {saving ? (uploadProgress || 'Sauvegarde...') : showModal === 'add' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Recruiters Content
function RecruitersContent() {
  type RecruiterStatus = 'active' | 'inactive' | 'suspended';
  type RecruiterAccess = 'basic' | 'premium' | 'enterprise';
  type RecruiterEmailTemplate = 'onboarding' | 'followup' | 'renewal';
  type Recruiter = {
    id: number;
    email: string;
    name: string | null;
    company: string | null;
    subscription_status: string | null;
    subscription_type: string | null;
    access_level: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const EMPTY_FORM = {
    email: '',
    name: '',
    company: '',
    subscription_status: 'active' as RecruiterStatus,
    subscription_type: 'monthly',
    access_level: 'basic' as RecruiterAccess,
  };

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RecruiterStatus>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | RecruiterAccess>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | '30d' | '90d' | 'ytd'>('90d');
  const [sortField, setSortField] = useState<'created_at' | 'company' | 'email' | 'subscription_status' | 'access_level'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [emailTemplateById, setEmailTemplateById] = useState<Record<number, RecruiterEmailTemplate>>({});
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [actionInfo, setActionInfo] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const PAGE_SIZE = 10;

  const fetchRecruiters = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('recruiters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecruiters((data || []) as Recruiter[]);
    } catch (e: any) {
      setFetchError(String(e?.message || 'Impossible de charger les recruteurs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRecruiters(); }, [fetchRecruiters]);

  const fmtDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

  const isInPeriod = (iso: string | null) => {
    if (!iso || periodFilter === 'all') return true;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    if (periodFilter === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      return d >= start && d <= now;
    }
    const days = periodFilter === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return d >= start && d <= now;
  };

  const scoped = useMemo(
    () => recruiters.filter((r) => isInPeriod(r.created_at)),
    [recruiters, periodFilter]
  );

  const statusMeta = (value: string | null) => {
    const s = String(value || '').toLowerCase();
    if (s === 'active') return { label: 'Active', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' };
    if (s === 'suspended') return { label: 'Suspendu', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' };
    return { label: 'Inactive', cls: 'bg-zinc-700/40 text-zinc-300 border border-zinc-600' };
  };

  const accessMeta = (value: string | null) => {
    const a = String(value || '').toLowerCase();
    if (a === 'enterprise') return { label: 'Enterprise', cls: 'text-[#C7FF00]' };
    if (a === 'premium') return { label: 'Premium', cls: 'text-sky-300' };
    return { label: 'Basic', cls: 'text-zinc-300' };
  };

  const kpis = useMemo(() => {
    const active = scoped.filter((r) => String(r.subscription_status || '').toLowerCase() === 'active').length;
    const inactive = scoped.filter((r) => String(r.subscription_status || '').toLowerCase() === 'inactive').length;
    const suspended = scoped.filter((r) => String(r.subscription_status || '').toLowerCase() === 'suspended').length;
    const premium = scoped.filter((r) => String(r.access_level || '').toLowerCase() === 'premium').length;
    const enterprise = scoped.filter((r) => String(r.access_level || '').toLowerCase() === 'enterprise').length;
    const conversion = scoped.length ? Math.round(((premium + enterprise) / scoped.length) * 100) : 0;
    return { total: scoped.length, active, inactive, suspended, premium, enterprise, conversion };
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((r) => {
      const matchStatus = statusFilter === 'all' || String(r.subscription_status || '').toLowerCase() === statusFilter;
      const matchAccess = accessFilter === 'all' || String(r.access_level || '').toLowerCase() === accessFilter;
      const matchQ = !q
        || String(r.company || '').toLowerCase().includes(q)
        || String(r.email || '').toLowerCase().includes(q)
        || String(r.name || '').toLowerCase().includes(q)
        || String(r.subscription_type || '').toLowerCase().includes(q);
      return matchStatus && matchAccess && matchQ;
    });
  }, [scoped, query, statusFilter, accessFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const av = String((a as any)[sortField] || '').toLowerCase();
      const bv = String((b as any)[sortField] || '').toLowerCase();
      if (sortField === 'created_at') {
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDir === 'asc' ? ad - bd : bd - ad;
      }
      const cmp = av.localeCompare(bv, 'fr', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: 'created_at' | 'company' | 'email' | 'subscription_status' | 'access_level') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir(field === 'created_at' ? 'desc' : 'asc');
  };

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, accessFilter, periodFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, currentPage]);

  const pageIds = useMemo(() => paginated.map((row) => row.id), [paginated]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const filteredIds = useMemo(() => sorted.map((row) => row.id), [sorted]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const visibleSelectedCount = useMemo(
    () => selectedIds.filter((id) => filteredIds.includes(id)).length,
    [selectedIds, filteredIds]
  );
  const hiddenSelectedCount = Math.max(0, selectedIds.length - visibleSelectedCount);

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setSelectedId(null);
    setShowModal('add');
  };

  const openEdit = (row: Recruiter) => {
    setForm({
      email: row.email || '',
      name: row.name || '',
      company: row.company || '',
      subscription_status: (row.subscription_status as RecruiterStatus) || 'active',
      subscription_type: row.subscription_type || 'monthly',
      access_level: (row.access_level as RecruiterAccess) || 'basic',
    });
    setFormError('');
    setSelectedId(row.id);
    setShowModal('edit');
  };

  const handleSave = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setFormError('Email invalide.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = {
      email: normalizedEmail,
      name: form.name.trim() || null,
      company: form.company.trim() || null,
      subscription_status: form.subscription_status,
      subscription_type: form.subscription_type.trim() || null,
      access_level: form.access_level,
    };

    try {
      if (showModal === 'add') {
        const { error } = await supabase.from('recruiters').insert(payload);
        if (error) throw error;
      } else if (selectedId != null) {
        const { error } = await supabase.from('recruiters').update(payload).eq('id', selectedId);
        if (error) throw error;
      }
      setShowModal(null);
      await fetchRecruiters();
    } catch (e: any) {
      setFormError(String(e?.message || 'Impossible de sauvegarder ce recruteur.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const { error } = await supabase.from('recruiters').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      setFetchError(String(error.message || 'Suppression impossible.'));
      return;
    }
    await fetchRecruiters();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('recruiters').delete().in('id', selectedIds);
    setBulkDeleting(false);
    if (error) {
      setFetchError(String(error.message || 'Suppression en lot impossible.'));
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds([]);
    setActionInfo('Suppression en lot effectuée.');
    await fetchRecruiters();
  };

  const openRecruiterEmail = async (row: Recruiter) => {
    const template = emailTemplateById[row.id] || 'onboarding';
    setSendingEmailId(row.id);
    setActionInfo('');

    const { error, data } = await supabase.functions.invoke('recruiter-email-send', {
      body: {
        recruiter_id: row.id,
        to: row.email,
        company: row.company,
        contact_name: row.name,
        template,
      },
    });

    setSendingEmailId(null);

    if (error) {
      setFetchError(String(error.message || 'Envoi email impossible.'));
      return;
    }

    if ((data as any)?.error) {
      setFetchError(String((data as any).error));
      return;
    }

    setActionInfo(`Email ${template} envoyé à ${row.email}.`);
  };

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date Creation', 'Entreprise', 'Nom', 'Email', 'Abonnement', 'Niveau', 'Statut'];
    const rows = filtered.map((r) => [
      r.created_at ? new Date(r.created_at).toISOString() : '',
      r.company || '',
      r.name || '',
      r.email || '',
      r.subscription_type || '',
      r.access_level || '',
      r.subscription_status || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recruiters-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00]">Recruteurs</h1>
          <p className="text-zinc-400 text-sm mt-1">{kpis.total} partenaire{kpis.total > 1 ? 's' : ''} sur la période</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-bold text-sm hover:bg-zinc-700 transition disabled:opacity-40"
          >
            <FileText size={14} /> Export CSV
          </button>
          <button onClick={() => void fetchRecruiters()} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition text-zinc-300">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7FF00] text-black font-bold text-sm hover:bg-[#b3e600] transition">
            <Plus size={15} /> Nouveau recruteur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Actifs', value: String(kpis.active), sub: `${kpis.inactive} inactifs`, icon: '✅', accent: true },
          { label: 'Premium + Enterprise', value: String(kpis.premium + kpis.enterprise), sub: `${kpis.conversion}% conversion`, icon: '⭐', accent: false },
          { label: 'Suspendus', value: String(kpis.suspended), sub: 'Suivi requis', icon: '⛔', accent: false },
          { label: 'Total', value: String(kpis.total), sub: 'Partenaires enregistrés', icon: '🤝', accent: false },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`p-5 rounded-xl border ${kpi.accent ? 'bg-[#C7FF00]/5 border-[#C7FF00]/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{kpi.icon}</span>
              <p className="text-[10px] text-zinc-500 text-right leading-snug">{kpi.sub}</p>
            </div>
            <p className={`text-2xl font-black ${kpi.accent ? 'text-[#C7FF00]' : 'text-white'}`}>{kpi.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher entreprise, nom, email..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Tous les statuts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspendu</option>
          </select>
          <select value={accessFilter} onChange={(e) => setAccessFilter(e.target.value as typeof accessFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Tous les niveaux</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Période: Tout</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="ytd">Cette année</option>
          </select>
          {sorted.length > 0 && (
            <button
              onClick={toggleSelectAllFiltered}
              className="px-3 py-2 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-700 transition"
            >
              {allFilteredSelected ? 'Désélectionner filtrés' : `Tout filtrer (${sorted.length})`}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="px-3 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition"
            >
              Supprimer ({selectedIds.length})
            </button>
          )}
          <span className="text-xs text-zinc-500 ml-auto">{sorted.length} résultat(s)</span>
        </div>

        {(selectedIds.length > 0 || actionInfo) && (
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 flex flex-wrap items-center gap-2 text-xs">
            {selectedIds.length > 0 ? (
              <span className="text-zinc-300">
                {selectedIds.length} sélectionné(s)
                {hiddenSelectedCount > 0 ? `, dont ${hiddenSelectedCount} hors filtre courant` : ''}.
              </span>
            ) : null}
            {selectedIds.length > 0 ? (
              <>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Vider sélection
                </button>
                <button
                  onClick={toggleSelectAllFiltered}
                  className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Ajouter filtre courant
                </button>
              </>
            ) : null}
            {actionInfo ? <span className="text-[#C7FF00] ml-auto">{actionInfo}</span> : null}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-zinc-400">
            <Loader2 size={18} className="animate-spin" /> Chargement...
          </div>
        ) : fetchError ? (
          <div className="text-center py-12 text-red-400 text-sm px-4">{fetchError}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-zinc-500">Aucun recruteur trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-widest">
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      className="accent-[#C7FF00]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-1 hover:text-zinc-300 transition">
                      Date <ChevronDown size={12} className={sortField === 'created_at' && sortDir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('company')} className="inline-flex items-center gap-1 hover:text-zinc-300 transition">
                      Entreprise <ChevronDown size={12} className={sortField === 'company' && sortDir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('email')} className="inline-flex items-center gap-1 hover:text-zinc-300 transition">
                      Email <ChevronDown size={12} className={sortField === 'email' && sortDir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Abonnement</th>
                  <th className="px-4 py-3 text-center">
                    <button onClick={() => toggleSort('access_level')} className="inline-flex items-center gap-1 hover:text-zinc-300 transition">
                      Niveau <ChevronDown size={12} className={sortField === 'access_level' && sortDir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <button onClick={() => toggleSort('subscription_status')} className="inline-flex items-center gap-1 hover:text-zinc-300 transition">
                      Statut <ChevronDown size={12} className={sortField === 'subscription_status' && sortDir === 'asc' ? 'rotate-180 transition' : 'transition'} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, i) => {
                  const sm = statusMeta(row.subscription_status);
                  const am = accessMeta(row.access_level);
                  return (
                    <motion.tr key={row.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleRowSelection(row.id)}
                          className="accent-[#C7FF00]"
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3 text-white font-semibold">{row.company || '—'}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.name || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[220px] truncate">{row.email || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.subscription_type || '—'}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${am.cls}`}>{am.label}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] px-2 py-1 rounded-full ${sm.cls}`}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={emailTemplateById[row.id] || 'onboarding'}
                            onChange={(e) => setEmailTemplateById((prev) => ({ ...prev, [row.id]: e.target.value as RecruiterEmailTemplate }))}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                            title="Template email"
                          >
                            <option value="onboarding">Onboarding</option>
                            <option value="followup">Relance</option>
                            <option value="renewal">Renouvellement</option>
                          </select>
                          <button
                            onClick={() => void openRecruiterEmail(row)}
                            disabled={sendingEmailId === row.id}
                            className="p-1.5 rounded hover:bg-sky-500/20 text-zinc-400 hover:text-sky-300 transition disabled:opacity-50"
                            aria-label={`Envoyer email a ${row.email}`}
                            title="Envoyer email"
                          >
                            {sendingEmailId === row.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                          </button>
                          <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => void handleDelete(row.id)} disabled={deletingId === row.id}
                            className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition disabled:opacity-40">
                            {deletingId === row.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !fetchError && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
            <span>
              Affichage {Math.min((currentPage - 1) * PAGE_SIZE + 1, sorted.length)}-
              {Math.min(currentPage * PAGE_SIZE, sorted.length)} sur {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-zinc-500">Page {currentPage}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">{showModal === 'add' ? 'Nouveau recruteur' : 'Modifier le recruteur'}</h2>
              <button onClick={() => setShowModal(null)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"><X size={17} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Entreprise</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Elite Sports"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nom du contact</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="recruiter@agency.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Statut</label>
                  <select
                    value={form.subscription_status}
                    onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value as RecruiterStatus }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Niveau</label>
                  <select
                    value={form.access_level}
                    onChange={(e) => setForm((f) => ({ ...f, access_level: e.target.value as RecruiterAccess }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                  >
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Type d'abonnement</label>
                <input
                  value={form.subscription_type}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_type: e.target.value }))}
                  placeholder="monthly, yearly, trial..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
                />
              </div>

              {formError && <p className="text-xs text-red-400">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition">
                  Annuler
                </button>
                <button onClick={() => void handleSave()} disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-[#C7FF00] text-black font-bold text-sm hover:bg-[#b3e600] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {saving ? 'Enregistrement...' : showModal === 'add' ? 'Créer' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
          >
            <h3 className="text-white font-black text-lg mb-2">Confirmer la suppression</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Tu vas supprimer {selectedIds.length} recruteur(s). Cette action est irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleting}
                className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                {bulkDeleting ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Payments Content
function PaymentsContent() {
  type PaymentType = 'subscription' | 'commission' | 'service';
  type PaymentStatus = 'completed' | 'pending' | 'failed';
  type Payment = {
    id: number;
    user_email: string | null;
    amount: number | null;
    currency: string | null;
    type: string | null;
    status: string | null;
    description: string | null;
    created_at: string | null;
  };

  const EMPTY_FORM = {
    user_email: '',
    amount: '',
    currency: 'EUR',
    type: 'subscription' as PaymentType,
    status: 'completed' as PaymentStatus,
    description: '',
  };

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PaymentType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '30d' | '90d' | 'ytd'>('30d');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const PAGE_SIZE = 10;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const { data, error: err } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPayments((data || []) as Payment[]);
    } catch (e: any) {
      setFetchError(String(e?.message || 'Impossible de charger les paiements.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPayments(); }, [fetchPayments]);

  const fmt = (amount: number | null, currency: string | null) => {
    const c = (currency || 'EUR').toUpperCase();
    if (amount == null) return '—';
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(amount);
    } catch {
      return `${amount} ${c}`;
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

  const statusMeta = (s: string | null) => {
    const v = String(s || '').toLowerCase();
    if (v === 'completed') return { label: 'Complété', cls: 'bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30' };
    if (v === 'pending') return { label: 'En attente', cls: 'bg-amber-400/15 text-amber-300 border border-amber-400/30' };
    return { label: 'Échoué', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' };
  };

  const typeMeta = (t: string | null) => {
    const v = String(t || '').toLowerCase();
    if (v === 'subscription') return { label: 'Abonnement', icon: '🔄', cls: 'text-violet-400' };
    if (v === 'commission') return { label: 'Commission', icon: '💼', cls: 'text-sky-400' };
    return { label: 'Service', icon: '⚡', cls: 'text-orange-400' };
  };

  const isInPeriod = (iso: string | null) => {
    if (!iso || periodFilter === 'all') return true;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    if (periodFilter === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      return d >= start && d <= now;
    }
    const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return d >= start && d <= now;
  };

  const scopedPayments = useMemo(
    () => payments.filter((p) => isInPeriod(p.created_at)),
    [payments, periodFilter]
  );

  const kpis = useMemo(() => {
    const completed = scopedPayments.filter(p => String(p.status || '').toLowerCase() === 'completed');
    const pending = scopedPayments.filter(p => String(p.status || '').toLowerCase() === 'pending');
    const failed = scopedPayments.filter(p => String(p.status || '').toLowerCase() === 'failed');
    const totalRevenue = completed.reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = pending.reduce((s, p) => s + (p.amount || 0), 0);
    const successRate = scopedPayments.length ? Math.round((completed.length / scopedPayments.length) * 100) : 0;

    const byType = (['subscription', 'commission', 'service'] as PaymentType[]).map(t => ({
      type: t,
      amount: completed.filter(p => String(p.type || '').toLowerCase() === t).reduce((s, p) => s + (p.amount || 0), 0),
      count: completed.filter(p => String(p.type || '').toLowerCase() === t).length,
    }));

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: d.toLocaleString('fr-FR', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), amount: 0 };
    });
    completed.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const m = months.find(x => x.month === d.getMonth() && x.year === d.getFullYear());
      if (m) m.amount += (p.amount || 0);
    });

    return { totalRevenue, pendingAmount, failedCount: failed.length, pendingCount: pending.length, completedCount: completed.length, successRate, total: scopedPayments.length, byType, months };
  }, [scopedPayments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedPayments.filter(p => {
      const matchType = typeFilter === 'all' || String(p.type || '').toLowerCase() === typeFilter;
      const matchStatus = statusFilter === 'all' || String(p.status || '').toLowerCase() === statusFilter;
      const matchQ = !q || String(p.user_email || '').toLowerCase().includes(q) || String(p.description || '').toLowerCase().includes(q);
      return matchType && matchStatus && matchQ;
    });
  }, [scopedPayments, query, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Email', 'Type', 'Description', 'Montant', 'Devise', 'Statut'];
    const rows = filtered.map((p) => [
      p.created_at ? new Date(p.created_at).toISOString() : '',
      p.user_email || '',
      p.type || '',
      p.description || '',
      p.amount ?? '',
      (p.currency || 'EUR').toUpperCase(),
      p.status || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setSelectedId(null); setShowModal('add'); };
  const openEdit = (p: Payment) => {
    setForm({ user_email: p.user_email || '', amount: String(p.amount ?? ''), currency: p.currency || 'EUR', type: (p.type as PaymentType) || 'subscription', status: (p.status as PaymentStatus) || 'completed', description: p.description || '' });
    setFormError(''); setSelectedId(p.id); setShowModal('edit');
  };

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) { setFormError('Montant invalide.'); return; }
    setSaving(true); setFormError('');
    const payload = { user_email: form.user_email || null, amount: Number(form.amount), currency: form.currency || 'EUR', type: form.type, status: form.status, description: form.description || null };
    try {
      if (showModal === 'add') {
        const { error: e } = await supabase.from('payments').insert(payload);
        if (e) throw e;
      } else if (selectedId != null) {
        const { error: e } = await supabase.from('payments').update(payload).eq('id', selectedId);
        if (e) throw e;
      }
      setShowModal(null);
      await fetchPayments();
    } catch (e: any) {
      setFormError(String(e?.message || 'Erreur lors de la sauvegarde.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await supabase.from('payments').delete().eq('id', id);
    setDeletingId(null);
    await fetchPayments();
  };

  const maxMonthAmount = Math.max(...kpis.months.map(m => m.amount), 1);
  const maxTypeAmount = Math.max(...kpis.byType.map(x => x.amount), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00]">Paiements</h1>
          <p className="text-zinc-400 text-sm mt-1">{kpis.total} transaction{kpis.total !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-bold text-sm hover:bg-zinc-700 transition disabled:opacity-40"
          >
            <FileText size={14} /> Export CSV
          </button>
          <button onClick={() => void fetchPayments()} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition text-zinc-300">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7FF00] text-black font-bold text-sm hover:bg-[#b3e600] transition">
            <Plus size={15} /> Nouveau paiement
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenus totaux', value: fmt(kpis.totalRevenue, 'EUR'), sub: `${kpis.completedCount} complétés`, icon: '💰', accent: true },
          { label: 'En attente', value: fmt(kpis.pendingAmount, 'EUR'), sub: `${kpis.pendingCount} transaction(s)`, icon: '⏳', accent: false },
          { label: 'Transactions', value: String(kpis.total), sub: `${kpis.completedCount} réussies · ${kpis.failedCount} échouées`, icon: '📊', accent: false },
          { label: 'Taux de succès', value: `${kpis.successRate}%`, sub: `${kpis.failedCount} échoué(s)`, icon: '✅', accent: false },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`p-5 rounded-xl border ${kpi.accent ? 'bg-[#C7FF00]/5 border-[#C7FF00]/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{kpi.icon}</span>
              <p className="text-[10px] text-zinc-500 text-right leading-snug max-w-[100px]">{kpi.sub}</p>
            </div>
            <p className={`text-2xl font-black ${kpi.accent ? 'text-[#C7FF00]' : 'text-white'}`}>{kpi.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Breakdown + Monthly trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By type */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-5">Répartition par type</h2>
          <div className="space-y-5">
            {kpis.byType.map(({ type, amount, count }) => {
              const meta = typeMeta(type);
              const pct = Math.round((amount / maxTypeAmount) * 100);
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${meta.cls}`}>{meta.icon} {meta.label}</span>
                    <span className="text-sm text-white font-bold">
                      {fmt(amount, 'EUR')} <span className="text-zinc-500 font-normal text-xs">· {count} tx</span>
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.2 }}
                      className="h-full rounded-full bg-[#C7FF00]/70" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-5">Tendance 6 mois</h2>
          <div className="flex items-end gap-2 h-28 mb-2">
            {kpis.months.map((m, i) => {
              const pct = (m.amount / maxMonthAmount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[10px] text-white bg-zinc-800 px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    {fmt(m.amount, 'EUR')}
                  </div>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(pct, m.amount > 0 ? 4 : 0)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.07 }}
                    className="w-full bg-[#C7FF00]/70 rounded-t hover:bg-[#C7FF00] transition cursor-default" />
                  <span className="text-[10px] text-zinc-500">{m.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-600 text-right">Revenus complétés uniquement</p>
        </div>
      </div>

      {/* Filters + table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher email, description…"
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#C7FF00]" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Tous les types</option>
            <option value="subscription">Abonnement</option>
            <option value="commission">Commission</option>
            <option value="service">Service</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Tous les statuts</option>
            <option value="completed">Complété</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
          </select>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as typeof periodFilter)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
            <option value="all">Période: Tout</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="ytd">Cette année</option>
          </select>
          <span className="text-xs text-zinc-500 ml-auto">{filtered.length} résultat(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-zinc-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : fetchError ? (
          <div className="text-center py-12 text-red-400 text-sm px-4">{fetchError}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-zinc-500">Aucun paiement trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-widest">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Email client</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, i) => {
                  const sm = statusMeta(p.status);
                  const tm = typeMeta(p.type);
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                      <td className="px-4 py-3 text-zinc-300 max-w-[160px] truncate">{p.user_email || '—'}</td>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${tm.cls}`}>{tm.icon} {tm.label}</td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">{p.description || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">{fmt(p.amount, p.currency)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-[11px] px-2 py-1 rounded-full ${sm.cls}`}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => void handleDelete(p.id)} disabled={deletingId === p.id}
                            className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition disabled:opacity-40">
                            {deletingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !fetchError && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
            <span>
              Affichage {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}-
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-zinc-500">Page {currentPage}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">{showModal === 'add' ? 'Nouveau paiement' : 'Modifier le paiement'}</h2>
              <button onClick={() => setShowModal(null)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"><X size={17} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email client</label>
                <input value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))}
                  placeholder="client@example.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Montant <span className="text-red-400">*</span></label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Devise</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="XAF">XAF</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PaymentType }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
                    <option value="subscription">Abonnement</option>
                    <option value="commission">Commission</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PaymentStatus }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]">
                    <option value="completed">Complété</option>
                    <option value="pending">En attente</option>
                    <option value="failed">Échoué</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Détails du paiement…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00] resize-none" />
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition">
                  Annuler
                </button>
                <button onClick={() => void handleSave()} disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-[#C7FF00] text-black font-bold text-sm hover:bg-[#b3e600] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {saving ? 'Enregistrement…' : showModal === 'add' ? 'Créer' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Publication Content
function PublicationContent() {
  type PostStatus = 'draft' | 'active' | 'archived';
  type PostTarget = 'site' | 'facebook' | 'instagram' | 'tiktok' | 'x' | 'linkedin' | 'pinterest' | 'discord' | 'youtube' | 'snapchat';
  type PostRecord = {
    id: string | number;
    title: string;
    caption?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    category?: string | null;
    targets?: PostTarget[] | null;
    status?: PostStatus | string | null;
    published_at?: string | null;
    created_at?: string | null;
  };
  type PublicationJob = {
    id: string | number;
    post_id: string | number;
    platform_id: string;
    status: 'queued' | 'processing' | 'ok' | 'failed' | 'dead' | string;
    attempt_count?: number | null;
    max_attempts?: number | null;
    next_retry_at?: string | null;
    last_error?: string | null;
    updated_at?: string | null;
    last_external_url?: string | null;
  };

  const SOCIAL_TARGETS: Array<{ id: PostTarget; label: string; icon: string; url: string }> = [
    { id: 'facebook', label: 'Facebook', icon: '📘', url: 'https://facebook.com' },
    { id: 'instagram', label: 'Instagram', icon: '📷', url: 'https://instagram.com/agta.global' },
    { id: 'tiktok', label: 'TikTok', icon: '🎵', url: 'https://tiktok.com/@agta.global' },
    { id: 'x', label: 'X', icon: '🐦', url: 'https://x.com/AGTA_Global' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼', url: 'https://linkedin.com/company/athletes-global-talent-agency-agta' },
    { id: 'pinterest', label: 'Pinterest', icon: '📌', url: 'https://pinterest.com' },
    { id: 'discord', label: 'Discord', icon: '🎮', url: 'https://discord.gg/75jWSnTHj3' },
    { id: 'youtube', label: 'YouTube', icon: '▶️', url: 'https://youtube.com/@AthletesGlobalTalentAgencyAGTA' },
    { id: 'snapchat', label: 'Snapchat', icon: '👻', url: 'https://snapchat.com/t/X7zTx817' },
    { id: 'site', label: 'Site', icon: '🌐', url: '/' },
  ];

  const DEFAULT_TARGETS: PostTarget[] = SOCIAL_TARGETS.map((p) => p.id);

  const EMPTY_POST: Omit<PostRecord, 'id' | 'created_at' | 'published_at'> = {
    title: '',
    caption: '',
    image_url: '',
    video_url: '',
    category: 'general',
    targets: DEFAULT_TARGETS,
    status: 'draft',
  };

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [retryingJobs, setRetryingJobs] = useState(false);
  const [error, setError] = useState('');
  const [dispatchInfo, setDispatchInfo] = useState('');
  const [jobs, setJobs] = useState<PublicationJob[]>([]);
  const [isPostsTableMissing, setIsPostsTableMissing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all');
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Omit<PostRecord, 'id' | 'created_at' | 'published_at'>>(EMPTY_POST);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const parseTargets = (value: unknown): PostTarget[] => {
    if (!Array.isArray(value)) return DEFAULT_TARGETS;
    const valid = value.filter((target) => SOCIAL_TARGETS.some((platform) => platform.id === target)) as PostTarget[];
    return valid.length > 0 ? valid : DEFAULT_TARGETS;
  };

  const isPostsMissingMessage = (msg: string) =>
    /Could not find the table 'public.posts'/i.test(msg)
    || /relation ['\"]?posts['\"]? does not exist/i.test(msg)
    || /schema cache/i.test(msg);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    setDispatchInfo('');
    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setPosts((data || []).map((row: any) => ({ ...row, targets: parseTargets(row.targets) })) as PostRecord[]);
      setIsPostsTableMissing(false);
    } catch (err: any) {
      const msg = String(err?.message || 'Impossible de charger les publications.');
      const missing = isPostsMissingMessage(msg);
      setIsPostsTableMissing(missing);
      setError(
        missing
          ? "Table posts absente. Exécutez d'abord SETUP_POSTS_TABLE.sql puis SETUP_SOCIAL_PUBLISHING.sql dans Supabase SQL Editor."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('publication_jobs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(120);
      if (fetchError) throw fetchError;
      setJobs((data || []) as PublicationJob[]);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
    void fetchJobs();
    const ch = supabase
      .channel('dg-posts-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        void fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publication_jobs' }, () => {
        void fetchJobs();
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [fetchPosts, fetchJobs]);

  const normalizedPostStatus = (value: unknown): PostStatus => {
    const s = String(value || '').toLowerCase().trim();
    if (s === 'active') return 'active';
    if (s === 'archived') return 'archived';
    return 'draft';
  };

  const statusMeta = (value: unknown) => {
    const s = normalizedPostStatus(value);
    if (s === 'active') return { label: 'Publié · Site', cls: 'bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30' };
    if (s === 'archived') return { label: 'Archivé', cls: 'bg-zinc-700/50 text-zinc-300 border border-zinc-600' };
    return { label: 'Brouillon', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' };
  };

  const kpis = useMemo(() => {
    const active = posts.filter((p) => normalizedPostStatus(p.status) === 'active').length;
    const draft = posts.filter((p) => normalizedPostStatus(p.status) === 'draft').length;
    const archived = posts.filter((p) => normalizedPostStatus(p.status) === 'archived').length;
    return { total: posts.length, active, draft, archived };
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchStatus = statusFilter === 'all' || normalizedPostStatus(p.status) === statusFilter;
      const matchQuery = q.length === 0 || [p.title, p.caption, p.category].some((f) => String(f || '').toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [posts, query, statusFilter]);

  const openAdd = () => {
    setFormData(EMPTY_POST);
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
    setSelectedId(null);
    setShowModal('add');
    setError('');
    setDispatchInfo('');
  };

  const openEdit = (post: PostRecord) => {
    const { id: _id, created_at: _ca, published_at: _pa, ...rest } = post;
    setFormData({
      ...EMPTY_POST,
      ...rest,
      targets: parseTargets(rest.targets),
      status: normalizedPostStatus(rest.status),
    });
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
    setSelectedId(post.id);
    setShowModal('edit');
    setError('');
    setDispatchInfo('');
  };

  const closeModal = () => {
    setShowModal(null);
    setSelectedId(null);
    setFormData(EMPTY_POST);
    setImageFile(null);
    setVideoFile(null);
    setUploadProgress('');
  };

  const safePostFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const uploadPostFile = async (file: File, prefix: string): Promise<string | null> => {
    const path = `posts/${prefix}_${Date.now()}_${safePostFileName(file.name)}`;
    for (const bucket of ['athlete-files', 'agta-files']) {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl || null;
      }
    }
    return null;
  };

  const extractMissingPostColumn = (err: any): string | null => {
    const msg = String(err?.message || '');
    const m1 = msg.match(/Could not find the '([^']+)' column of 'posts'/i);
    if (m1?.[1]) return m1[1];
    const m2 = msg.match(/column\s+['\"]?([a-zA-Z0-9_]+)['\"]?\s+(?:of relation ['\"]?posts['\"]?|does not exist)/i);
    if (m2?.[1]) return m2[1];
    return null;
  };

  const writePostWithSchemaFallback = async (mode: 'insert' | 'update', inputPayload: Record<string, any>, id?: string | number | null) => {
    const payload: Record<string, any> = { ...inputPayload };
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error: writeError } = mode === 'insert'
        ? await supabase.from('posts').insert([payload])
        : await supabase.from('posts').update(payload).eq('id', id as any);
      if (!writeError) return;
      const missingColumn = extractMissingPostColumn(writeError);
      const isSchemaMismatch =
        writeError.code === 'PGRST204'
        || /schema cache/i.test(String(writeError?.message || ''))
        || /column\s+.+\s+does not exist/i.test(String(writeError?.message || ''));
      if (!isSchemaMismatch || !missingColumn || !(missingColumn in payload)) throw writeError;
      delete payload[missingColumn];
    }
    throw new Error('Sauvegarde post impossible: schema posts incompatible.');
  };

  const dispatchToNetworks = async (post: PostRecord) => {
    const targets = parseTargets(post.targets);
    const nonSiteTargets = targets.filter((target) => target !== 'site');

    if (nonSiteTargets.length === 0) {
      setDispatchInfo('Publié sur le site principal. Aucune autre cible sélectionnée.');
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke('social-publish', {
      body: {
        post: {
          id: post.id,
          title: post.title,
          caption: post.caption || '',
          image_url: post.image_url || null,
          video_url: post.video_url || null,
          published_at: post.published_at || new Date().toISOString(),
        },
        targets: nonSiteTargets,
      },
    });

    if (invokeError) {
      setDispatchInfo('Post publié sur site. La diffusion réseaux a échoué: deployez la fonction social-publish.');
      return;
    }

    const resultRows = Array.isArray((data as any)?.results) ? (data as any).results : [];
    const successRows = resultRows.filter((row: any) => String(row?.status || '').toLowerCase() === 'ok');
    const failedRows = resultRows.filter((row: any) => String(row?.status || '').toLowerCase() !== 'ok');
    const failedNames = failedRows.map((row: any) => String(row?.target || '')).filter(Boolean);

    if (failedRows.length === 0) {
      setDispatchInfo(`Site publié. Réseaux: ${successRows.length}/${nonSiteTargets.length} publiés avec succès.`);
      return;
    }

    setDispatchInfo(
      `Site publié. Réseaux OK: ${successRows.length}/${nonSiteTargets.length}. En échec: ${failedNames.join(', ') || failedRows.length}.`
    );
    await fetchJobs();
  };

  const handleRetryDue = async () => {
    setRetryingJobs(true);
    setDispatchInfo('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('social-publish', {
        body: { action: 'retry_due', limit: 40 },
      });
      if (invokeError) throw invokeError;
      const total = Number((data as any)?.total || 0);
      const okCount = Number((data as any)?.okCount || 0);
      const failedCount = Number((data as any)?.failedCount || 0);
      setDispatchInfo(`Relance automatique exécutée. Total: ${total}, OK: ${okCount}, Échecs: ${failedCount}.`);
      await fetchJobs();
    } catch (err: any) {
      setDispatchInfo(err?.message || 'Relance automatique impossible.');
    } finally {
      setRetryingJobs(false);
    }
  };

  const handleRetryPostFailures = async (postId: string | number) => {
    setRetryingJobs(true);
    setDispatchInfo('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('social-publish', {
        body: { action: 'retry_post', post_id: postId, force: true },
      });
      if (invokeError) throw invokeError;
      const total = Number((data as any)?.total || 0);
      const okCount = Number((data as any)?.okCount || 0);
      setDispatchInfo(`Relance post #${postId} terminée. OK: ${okCount}/${total}.`);
      await fetchJobs();
    } catch (err: any) {
      setDispatchInfo(err?.message || 'Relance du post impossible.');
    } finally {
      setRetryingJobs(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    setDispatchInfo('');
    try {
      const payload: Record<string, any> = {
        title: formData.title.trim(),
        caption: String(formData.caption || '').trim() || null,
        image_url: String(formData.image_url || '').trim() || null,
        video_url: String(formData.video_url || '').trim() || null,
        category: String(formData.category || 'general').trim(),
        targets: parseTargets(formData.targets),
        status: normalizedPostStatus(formData.status),
      };
      if (imageFile) {
        setUploadProgress('Upload image...');
        const url = await uploadPostFile(imageFile, 'image');
        if (url) payload.image_url = url;
      }
      if (videoFile) {
        setUploadProgress('Upload vidéo...');
        const url = await uploadPostFile(videoFile, 'video');
        if (url) payload.video_url = url;
      }
      setUploadProgress('Sauvegarde...');
      if (showModal === 'add') {
        await writePostWithSchemaFallback('insert', payload);
      } else if (showModal === 'edit' && selectedId != null) {
        await writePostWithSchemaFallback('update', payload, selectedId);
      }
      closeModal();
      await fetchPosts();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Supprimer ce post ?')) return;
    try {
      const { error: deleteError } = await supabase.from('posts').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Erreur suppression post:', err);
    }
  };

  const handlePublishToggle = async (post: PostRecord) => {
    const current = normalizedPostStatus(post.status);
    const next: PostStatus = current === 'active' ? 'draft' : 'active';
    const publishedAt = next === 'active' ? new Date().toISOString() : null;
    try {
      const updatePayload: Record<string, any> = { status: next, published_at: publishedAt };
      const { error: updateError } = await supabase.from('posts').update(updatePayload).eq('id', post.id);
      if (updateError) throw updateError;

      const updatedPost: PostRecord = { ...post, status: next, published_at: publishedAt };
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updatedPost : p)));

      if (next === 'active') {
        await dispatchToNetworks(updatedPost);
      } else {
        setDispatchInfo('Publication retirée du site.');
      }
    } catch (err) {
      console.error('Erreur publication post:', err);
      setError('Erreur lors de la publication.');
    }
  };

  const handleTargetToggle = (target: PostTarget) => {
    setFormData((prev) => {
      const current = parseTargets(prev.targets);
      if (target === 'site') {
        if (current.includes('site')) return prev;
        return { ...prev, targets: ['site', ...current] };
      }
      const next = current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target];
      return { ...prev, targets: next.includes('site') ? next : ['site', ...next] };
    });
  };

  const jobSummary = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        const key = String(job.status || 'queued').toLowerCase();
        if (key === 'ok') acc.ok += 1;
        else if (key === 'failed') acc.failed += 1;
        else if (key === 'dead') acc.dead += 1;
        else if (key === 'processing') acc.processing += 1;
        else acc.queued += 1;
        return acc;
      },
      { queued: 0, processing: 0, ok: 0, failed: 0, dead: 0 }
    );
  }, [jobs]);

  const failedByPost = useMemo(() => {
    const map: Record<string, number> = {};
    jobs.forEach((job) => {
      const s = String(job.status || '').toLowerCase();
      if (s === 'failed' || s === 'dead') {
        const key = String(job.post_id);
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [jobs]);

  const CATEGORIES = ['general', 'match', 'event', 'announcement'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-[#C7FF00]">Publication</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#C7FF00] text-black font-bold rounded-lg hover:bg-[#b3e600] transition text-sm"
        >
          <Plus size={16} /> Nouveau post
        </button>
      </div>

      {/* Platforms row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {SOCIAL_TARGETS.map((platform, idx) => (
          <motion.div
            key={platform.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-3 rounded-lg text-center border ${platform.id === 'site' ? 'bg-[#C7FF00]/10 border-[#C7FF00]/40' : 'bg-zinc-900 border-zinc-700'}`}
          >
            <p className={`text-sm font-semibold ${platform.id === 'site' ? 'text-[#C7FF00]' : 'text-zinc-200'}`}>
              {platform.icon} {platform.label}
            </p>
            <p className={`text-[10px] mt-0.5 ${platform.id === 'site' ? 'text-[#C7FF00]/70' : 'text-zinc-500'}`}>
              {platform.id === 'site' ? 'Connecté' : 'Prêt à diffuser'}
            </p>
            <a href={platform.url} target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-zinc-300">
              {platform.url.replace(/^https?:\/\//, '')}
            </a>
          </motion.div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: kpis.total, cls: 'text-white' },
          { label: 'Publiés · Site', value: kpis.active, cls: 'text-[#C7FF00]' },
          { label: 'Brouillons', value: kpis.draft, cls: 'text-amber-300' },
          { label: 'Archivés', value: kpis.archived, cls: 'text-zinc-400' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <p className={`text-3xl font-black ${cls}`}>{value}</p>
            <p className="text-zinc-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm outline-none focus:border-[#C7FF00]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | PostStatus)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
      </div>

      {isPostsTableMissing && (
        <div className="mb-5 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
          <p className="text-red-300 text-sm font-semibold mb-1">Base non prête pour Publication</p>
          <p className="text-red-200/90 text-xs">
            Exécutez les scripts SQL dans Supabase: 1) SETUP_POSTS_TABLE.sql 2) SETUP_SOCIAL_PUBLISHING.sql.
          </p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {dispatchInfo && <p className="text-[#C7FF00] text-sm mb-4">{dispatchInfo}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 py-12 justify-center">
          <Loader2 size={20} className="animate-spin" /> Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Aucun post trouvé</p>
          <p className="text-sm mt-1">Créez votre premier post avec le bouton "Nouveau post"</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((post) => {
            const sm = statusMeta(post.status);
            const isActive = normalizedPostStatus(post.status) === 'active';
            return (
              <motion.div
                key={String(post.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition"
              >
                {post.image_url && (
                  <img src={post.image_url} alt={post.title} className="w-full h-36 object-cover" loading="lazy" />
                )}
                {!post.image_url && (
                  <div className="h-20 bg-zinc-800 flex items-center justify-center">
                    <Megaphone size={24} className="text-zinc-600" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sm.cls}`}>{sm.label}</span>
                    {post.category && post.category !== 'general' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">{post.category}</span>
                    )}
                    {parseTargets(post.targets).length > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {parseTargets(post.targets).length} canaux
                      </span>
                    )}
                    {isActive && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">🌐 Visible</span>
                    )}
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{post.title}</h3>
                  {post.caption && <p className="text-zinc-400 text-xs line-clamp-3 mb-2">{post.caption}</p>}

                  {post.video_url && (
                    <div className="mt-2 mb-3">
                      <video src={post.video_url} controls preload="metadata" className="w-full rounded-lg bg-black max-h-32" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {parseTargets(post.targets).map((target) => {
                      const info = SOCIAL_TARGETS.find((platform) => platform.id === target);
                      if (!info) return null;
                      return (
                        <span key={`${post.id}-${target}`} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px]">
                          {info.icon} {info.label}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-zinc-600 text-[11px] mb-3">
                    {post.published_at ? `Publié le ${new Date(post.published_at).toLocaleDateString('fr-FR')}` : `Créé le ${new Date(String(post.created_at || '')).toLocaleDateString('fr-FR')}`}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePublishToggle(post)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${isActive ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-[#C7FF00]/10 text-[#C7FF00] border border-[#C7FF00]/30 hover:bg-[#C7FF00]/20'}`}
                    >
                      {isActive ? '🌐 Retirer du site' : '🌐 Publier sur site'}
                    </button>
                    {(failedByPost[String(post.id)] || 0) > 0 && (
                      <button
                        onClick={() => handleRetryPostFailures(post.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition"
                        title="Relancer les plateformes en échec"
                      >
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(post)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-zinc-900/70 border border-zinc-700 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-black text-lg">Centre d'Opérations Publication</h3>
            <p className="text-zinc-500 text-xs">Queue, backoff automatique et suivi par plateforme</p>
          </div>
          <button
            onClick={handleRetryDue}
            disabled={retryingJobs}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-[#C7FF00] hover:border-[#C7FF00]/40 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={retryingJobs ? 'animate-spin' : ''} />
            Relancer les jobs en attente
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Queued', value: jobSummary.queued, cls: 'text-zinc-300' },
            { label: 'Processing', value: jobSummary.processing, cls: 'text-blue-300' },
            { label: 'OK', value: jobSummary.ok, cls: 'text-emerald-300' },
            { label: 'Failed', value: jobSummary.failed, cls: 'text-amber-300' },
            { label: 'Dead', value: jobSummary.dead, cls: 'text-red-300' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <p className={`text-2xl font-black ${item.cls}`}>{item.value}</p>
              <p className="text-zinc-500 text-[11px]">{item.label}</p>
            </div>
          ))}
        </div>

        {jobsLoading ? (
          <div className="text-zinc-500 text-sm py-4">Chargement des jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-zinc-500 text-sm py-4">Aucun job de publication pour le moment.</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {jobs.slice(0, 30).map((job) => {
              const s = String(job.status || 'queued').toLowerCase();
              const cls =
                s === 'ok' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                : s === 'failed' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                : s === 'dead' ? 'text-red-300 border-red-500/30 bg-red-500/10'
                : s === 'processing' ? 'text-blue-300 border-blue-500/30 bg-blue-500/10'
                : 'text-zinc-300 border-zinc-700 bg-zinc-800';
              return (
                <div key={String(job.id)} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded-full border ${cls}`}>{job.status}</span>
                    <span className="text-zinc-400">Post #{job.post_id}</span>
                    <span className="text-zinc-300 font-semibold uppercase">{job.platform_id}</span>
                    <span className="text-zinc-500 ml-auto">Tentative {Number(job.attempt_count || 0)}/{Number(job.max_attempts || 0)}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex flex-wrap gap-3">
                    <span>Next: {job.next_retry_at ? new Date(job.next_retry_at).toLocaleString('fr-FR') : '-'}</span>
                    <span>Updated: {job.updated_at ? new Date(job.updated_at).toLocaleString('fr-FR') : '-'}</span>
                    {job.last_external_url && (
                      <a href={job.last_external_url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                        Ouvrir publication
                      </a>
                    )}
                  </div>
                  {job.last_error && (
                    <p className="text-[11px] text-red-300 mt-1 line-clamp-2">{job.last_error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-[#C7FF00]">{showModal === 'add' ? 'Nouveau post' : 'Modifier le post'}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white transition"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Titre *</label>
                <input
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre du post"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none focus:border-[#C7FF00]/50"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Caption / Texte</label>
                <textarea
                  value={String(formData.caption || '')}
                  onChange={e => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Texte du post..."
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none focus:border-[#C7FF00]/50 resize-none"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Catégorie</label>
                <select
                  value={String(formData.category || 'general')}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Statut</label>
                <select
                  value={String(formData.status || 'draft')}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as PostStatus }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none"
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Publié · Site</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Canaux de publication</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOCIAL_TARGETS.map((platform) => {
                    const selected = parseTargets(formData.targets).includes(platform.id);
                    const isSite = platform.id === 'site';
                    return (
                      <label
                        key={platform.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition ${selected ? 'border-[#C7FF00]/40 bg-[#C7FF00]/10' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'} ${isSite ? 'opacity-100' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={isSite}
                          onChange={() => handleTargetToggle(platform.id)}
                          className="accent-[#C7FF00]"
                        />
                        <span className="text-sm text-zinc-200">{platform.icon} {platform.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Le canal Site est obligatoire. À la publication, le post part vers tous les canaux cochés.
                </p>
              </div>

              {/* Image */}
              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Image</label>
                <input
                  value={String(formData.image_url || '')}
                  onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="URL image (optionnel)"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none focus:border-[#C7FF00]/50 mb-2"
                />
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition">
                  <UploadCloud size={14} className="text-zinc-400" />
                  <span className="text-zinc-400 text-sm">{imageFile ? imageFile.name : 'Upload image...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                </label>
                {(formData.image_url || imageFile) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : String(formData.image_url)}
                    alt="aperçu"
                    className="mt-2 w-full h-28 object-cover rounded-lg"
                  />
                )}
              </div>

              {/* Video */}
              <div>
                <label className="text-zinc-300 text-sm font-semibold mb-1 block">Vidéo</label>
                <input
                  value={String(formData.video_url || '')}
                  onChange={e => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="URL vidéo (optionnel)"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm outline-none focus:border-[#C7FF00]/50 mb-2"
                />
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition">
                  <UploadCloud size={14} className="text-zinc-400" />
                  <span className="text-zinc-400 text-sm">{videoFile ? videoFile.name : 'Upload vidéo...'}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                </label>
                {(formData.video_url || videoFile) && (
                  <video
                    src={videoFile ? URL.createObjectURL(videoFile) : String(formData.video_url)}
                    controls
                    preload="metadata"
                    className="mt-2 w-full rounded-lg bg-black max-h-32"
                  />
                )}
              </div>

              {uploadProgress && <p className="text-[#C7FF00] text-sm">{uploadProgress}</p>}
              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#C7FF00] text-black font-bold rounded-lg hover:bg-[#b3e600] transition disabled:opacity-50 text-sm"
                >
                  {saving ? 'Enregistrement...' : showModal === 'add' ? 'Créer le post' : 'Enregistrer'}
                </button>
                <button onClick={closeModal} className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Reports Content
function ReportsContent() {
  type ActivityReport = {
    id: number | string;
    activity_type?: string | null;
    description?: string | null;
    metadata?: any;
    user_email?: string | null;
    created_at?: string | null;
    source?: 'agta_activity' | 'work_logs';
  };

  const PAGE_SIZE = 12;

  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [page, setPage] = useState(1);

  const fetchReports = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError('');

    try {
      const [activityRes, workLogsRes] = await Promise.all([
        supabase
          .from('agta_activity')
          .select('id, activity_type, description, metadata, user_email, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('work_logs')
          .select('id, created_at, staff_name, action, type')
          .eq('type', 'bureau_report')
          .order('created_at', { ascending: false })
          .limit(300),
      ]);

      if (activityRes.error) throw activityRes.error;

      const baseRows: ActivityReport[] = ((activityRes.data || []) as ActivityReport[]).map((row) => ({
        ...row,
        source: 'agta_activity',
      }));

      const secRows: ActivityReport[] = !workLogsRes.error
        ? ((workLogsRes.data || []) as any[]).map((row) => ({
            id: `sec-${row.id}`,
            activity_type: row.type || 'bureau_report',
            description: row.action || 'Rapport bureau staff',
            metadata: { source: 'work_logs', origin: 'staff-secretary' },
            user_email: row.staff_name || 'STAFF SECRETARY',
            created_at: row.created_at,
            source: 'work_logs' as const,
          }))
        : [];

      const merged = [...baseRows, ...secRows]
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 700);

      setReports(merged);
    } catch (err: any) {
      setFetchError(String(err?.message || 'Chargement des rapports impossible.'));
    } finally {
      if (silent) {
        setRefreshing(false);
        setLoading((prev) => (prev ? false : prev));
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const channel = supabase
      .channel(`dg-reports-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agta_activity' }, () => {
        void fetchReports(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, () => {
        void fetchReports(true);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchReports(true);
    }, 20000);

    return () => window.clearInterval(timer);
  }, [fetchReports]);

  const activityTypes = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((r) => String(r.activity_type || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [reports]);

  const userEmails = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((r) => String(r.user_email || '').trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [reports]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (periodFilter === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (periodFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (periodFilter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
  }, [periodFilter]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchType = typeFilter === 'all' || String(report.activity_type || '') === typeFilter;
      const email = String(report.user_email || '').trim().toLowerCase();
      const matchUser = userFilter === 'all' || email === userFilter;
      const matchQuery =
        q.length === 0 ||
        String(report.activity_type || '').toLowerCase().includes(q) ||
        String(report.description || '').toLowerCase().includes(q) ||
        String(report.user_email || '').toLowerCase().includes(q) ||
        JSON.stringify(report.metadata || '').toLowerCase().includes(q);
      return Boolean(matchType && matchUser && matchQuery);
    });
  }, [reports, typeFilter, userFilter, query]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((report) => {
      if (!periodStart) return true;
      const created = report.created_at ? new Date(report.created_at) : null;
      return Boolean(created && created >= periodStart);
    });
  }, [baseFiltered, periodStart]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, userFilter, periodFilter]);

  const periodComparison = useMemo(() => {
    if (!periodStart || periodFilter === 'all') return null;

    const now = new Date();
    const periodMs =
      periodFilter === '24h'
        ? 24 * 60 * 60 * 1000
        : periodFilter === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    const previousStart = new Date(periodStart.getTime() - periodMs);
    const previousEnd = periodStart;

    const currentCount = baseFiltered.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return d >= periodStart && d <= now;
    }).length;

    const previousCount = baseFiltered.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return d >= previousStart && d < previousEnd;
    }).length;

    const delta = previousCount === 0
      ? (currentCount > 0 ? 100 : 0)
      : Math.round(((currentCount - previousCount) / previousCount) * 100);

    return { currentCount, previousCount, delta };
  }, [baseFiltered, periodStart, periodFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const withMetadata = filtered.filter((r) => r.metadata != null).length;
    const uniqueUsers = new Set(filtered.map((r) => String(r.user_email || '').trim()).filter(Boolean)).size;
    const today = filtered.filter((r) => {
      if (!r.created_at) return false;
      const date = new Date(r.created_at);
      const now = new Date();
      return date.toDateString() === now.toDateString();
    }).length;
    return { total, withMetadata, uniqueUsers, today };
  }, [filtered]);

  const trendData = useMemo(() => {
    const bucketDays = periodFilter === '24h' ? 2 : periodFilter === '7d' ? 7 : 30;
    const now = new Date();
    const bucket = new Map<string, number>();

    for (let i = bucketDays - 1; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      bucket.set(key, 0);
    }

    filtered.forEach((item) => {
      if (!item.created_at) return;
      const key = new Date(item.created_at).toISOString().slice(0, 10);
      if (bucket.has(key)) bucket.set(key, (bucket.get(key) || 0) + 1);
    });

    return Array.from(bucket.entries()).map(([key, value]) => ({
      time: key.slice(5),
      activites: value,
    }));
  }, [filtered, periodFilter]);

  const topTypes = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((report) => {
      const key = String(report.activity_type || 'N/A').trim() || 'N/A';
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Type', 'Description', 'Utilisateur', 'Metadata'];
    const rows = filtered.map((r) => [
      r.created_at || '',
      r.activity_type || '',
      r.description || '',
      r.user_email || '',
      r.metadata ? JSON.stringify(r.metadata) : '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dg-rapports-activite-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = 50;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("Rapports d'Activite - DG", margin, y);
      y += 24;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Genere le: ${new Date().toLocaleString()}`, margin, y);
      y += 16;
      doc.text(`Filtres: periode=${periodFilter} | type=${typeFilter} | user=${userFilter === 'all' ? 'all' : userFilter} | q=${query || '-'}`, margin, y);
      y += 20;

      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${kpis.total} | Aujourd'hui: ${kpis.today} | Utilisateurs: ${kpis.uniqueUsers} | Metadata: ${kpis.withMetadata}`, margin, y);
      y += 20;

      if (periodComparison) {
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Comparaison periode: actuel=${periodComparison.currentCount} vs precedente=${periodComparison.previousCount} | delta=${periodComparison.delta > 0 ? '+' : ''}${periodComparison.delta}%`,
          margin,
          y
        );
        y += 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Top activites', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      topTypes.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${item.label}: ${item.count}`, margin, y);
        y += 14;
      });

      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Dernieres lignes (max 20)', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');

      filtered.slice(0, 20).forEach((r) => {
        const line = `[${r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}] ${String(r.activity_type || 'N/A')} | ${String(r.source || 'agta_activity')} | ${String(r.user_email || 'system')} | ${String(r.description || '').slice(0, 90)}`;
        const wrapped = doc.splitTextToSize(line, 510);
        wrapped.forEach((segment: string) => {
          if (y > 800) {
            doc.addPage();
            y = 50;
          }
          doc.text(segment, margin, y);
          y += 12;
        });
      });

      doc.save(`dg-rapports-activite-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error: any) {
      alert(`Export PDF impossible: ${error?.message || 'Erreur inconnue'}`);
    }
  };

  const metaPreview = (value: any) => {
    if (value == null) return '—';
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (raw.length <= 120) return raw;
    return `${raw.slice(0, 120)}...`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00]">Rapports d'Activité</h1>
          <p className="text-zinc-400 text-sm mt-1">Pilotage DG: historique, tendances, catégories, export</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-40"
          >
            <FileText size={14} className="inline mr-2" /> Export CSV
          </button>
          <button
            onClick={() => void exportPdf()}
            disabled={filtered.length === 0}
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-40"
          >
            <FileText size={14} className="inline mr-2" /> Export PDF
          </button>
          <button
            onClick={() => void fetchReports(true)}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activités', value: String(kpis.total), sub: periodComparison ? `${periodComparison.delta > 0 ? '+' : ''}${periodComparison.delta}% vs période précédente` : 'sur le filtre courant', accent: true },
          { label: 'Aujourd’hui', value: String(kpis.today), sub: 'activité du jour', accent: false },
          { label: 'Utilisateurs', value: String(kpis.uniqueUsers), sub: 'emails uniques', accent: false },
          { label: 'Avec metadata', value: String(kpis.withMetadata), sub: periodComparison ? `${periodComparison.currentCount} actuel / ${periodComparison.previousCount} précédent` : 'événements détaillés', accent: false },
        ].map((kpi, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            className={`p-5 rounded-xl border ${kpi.accent ? 'bg-[#C7FF00]/5 border-[#C7FF00]/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <p className={`text-2xl font-black ${kpi.accent ? 'text-[#C7FF00]' : 'text-white'}`}>{kpi.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{kpi.label}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher type, description, utilisateur..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
        >
          <option value="all">Tous les types</option>
          {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
        >
          <option value="all">Tous les utilisateurs</option>
          {userEmails.map((email) => <option key={email} value={email}>{email}</option>)}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as '24h' | '7d' | '30d' | 'all')}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
        >
          <option value="24h">24h</option>
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="all">Tout</option>
        </select>

        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} résultat(s)</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-zinc-200 mb-4">Tendance des activités</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="activites" stroke="#C7FF00" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-zinc-200 mb-4">Top catégories</h3>
          {topTypes.length === 0 ? (
            <p className="text-zinc-500 text-sm">Aucune donnée.</p>
          ) : (
            <div className="space-y-3">
              {topTypes.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-300 truncate pr-2">{item.label}</span>
                    <span className="text-[#C7FF00] font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-[#C7FF00]"
                      style={{ width: `${Math.max(8, Math.round((item.count / Math.max(1, topTypes[0]?.count || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Chargement des rapports...</div>
      ) : fetchError ? (
        <div className="text-red-400 text-sm">{fetchError}</div>
      ) : paginated.length === 0 ? (
        <div className="text-zinc-500 text-sm">Aucun rapport disponible sur ce filtre.</div>
      ) : (
        <div className="space-y-3">
          {paginated.map((report, idx) => (
            <motion.div
              key={String(report.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-white font-bold text-sm">{String(report.activity_type || 'Activité')}</p>
                  <p className="text-zinc-500 text-xs mt-1">{report.user_email || 'Utilisateur système'} • {report.source === 'work_logs' ? 'SEC' : 'DG/System'}</p>
                </div>
                <span className="text-[#C7FF00] text-xs font-bold">
                  {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              <p className="text-zinc-300 text-sm mt-3 leading-relaxed">{report.description || 'Sans description'}</p>

              <div className="mt-3 p-3 bg-black/50 rounded text-zinc-400 text-xs break-all">
                <span className="text-zinc-500 mr-1">Metadata:</span>{metaPreview(report.metadata)}
              </div>
            </motion.div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">Page {currentPage} / {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Documents Content
function DocumentsContent() {
  type DgDocument = {
    id: number | string;
    name?: string | null;
    type?: string | null;
    size?: string | null;
    storage_path?: string | null;
    category?: string | null;
    created_at?: string | null;
  };

  const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET || 'agta_vault').trim();
  const PAGE_SIZE = 12;

  const [docs, setDocs] = useState<DgDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'contract' | 'cv' | 'passport' | 'other'>('all');
  const [fetchError, setFetchError] = useState('');
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<DgDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const normalizeType = (value: unknown) => String(value || '').trim().toLowerCase();

  const inferCategory = (doc: DgDocument): 'contract' | 'cv' | 'passport' | 'other' => {
    const t = normalizeType(doc.type);
    const n = String(doc.name || '').toLowerCase();
    const c = normalizeType(doc.category);

    if (c.includes('passport') || c.includes('passeport') || t.includes('passport') || n.includes('passport') || n.includes('passeport')) return 'passport';
    if (c.includes('cv') || t === 'cv' || n.includes('cv')) return 'cv';
    if (c.includes('contract') || c.includes('contrat') || t.includes('contract') || n.includes('contrat') || n.includes('contract')) return 'contract';
    return 'other';
  };

  const formatSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fetchDocs = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError('');

    try {
      const { data, error } = await supabase
        .from('documents_agta')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(600);

      if (error) throw error;
      setDocs((data || []) as DgDocument[]);
    } catch (err: any) {
      setFetchError(String(err?.message || 'Chargement des documents impossible.'));
    } finally {
      if (silent) {
        setRefreshing(false);
        setLoading((prev) => (prev ? false : prev));
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    const channel = supabase
      .channel(`dg-documents-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents_agta' }, () => {
        void fetchDocs(true);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchDocs]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((doc) => {
      const cat = inferCategory(doc);
      const matchCategory = categoryFilter === 'all' || cat === categoryFilter;
      const matchQuery =
        q.length === 0
        || String(doc.name || '').toLowerCase().includes(q)
        || String(doc.type || '').toLowerCase().includes(q)
        || String(doc.category || '').toLowerCase().includes(q)
        || String(doc.storage_path || '').toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [docs, query, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const kpis = useMemo(() => {
    const contract = docs.filter((d) => inferCategory(d) === 'contract').length;
    const cv = docs.filter((d) => inferCategory(d) === 'cv').length;
    const passport = docs.filter((d) => inferCategory(d) === 'passport').length;
    const other = docs.filter((d) => inferCategory(d) === 'other').length;
    return { total: docs.length, contract, cv, passport, other };
  }, [docs]);

  const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const tryInsertDocumentRow = async (payload: Record<string, any>) => {
    const firstTry = await supabase.from('documents_agta').insert([payload]);
    if (!firstTry.error) return;

    const msg = String(firstTry.error.message || '').toLowerCase();
    const categoryMissing = msg.includes('category') && msg.includes('column');
    if (categoryMissing) {
      const fallback = { ...payload };
      delete fallback.category;
      const secondTry = await supabase.from('documents_agta').insert([fallback]);
      if (!secondTry.error) return;
      throw secondTry.error;
    }

    throw firstTry.error;
  };

  const logDocActivity = async (action: 'upload' | 'download' | 'delete', doc: DgDocument) => {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email || 'dg@agta.local';
    await supabase.from('agta_activity').insert([
      {
        user_email: email,
        activity_type: `document_${action}`,
        description: `${action.toUpperCase()} - ${doc.name || 'document'}`,
        metadata: {
          source: 'documents-dg',
          document_id: doc.id,
          document_name: doc.name,
          document_type: doc.type,
          storage_path: doc.storage_path,
        },
      },
    ]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    setFetchError('');

    try {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'dat').toLowerCase();
        const path = `vault/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.name)}`;

        const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        const category = inferCategory({ id: `temp-${Date.now()}`, name: file.name, type: ext, category: null });
        const payload = {
          name: file.name,
          type: ext.toUpperCase(),
          size: formatSize(file.size),
          storage_path: path,
          category,
        };

        await tryInsertDocumentRow(payload);
        await logDocActivity('upload', { id: path, name: file.name, type: ext.toUpperCase(), size: formatSize(file.size), storage_path: path, category });
      }

      await fetchDocs(true);
      e.target.value = '';
    } catch (err: any) {
      setFetchError(String(err?.message || 'Upload impossible.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DgDocument) => {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(doc.storage_path);
    if (error) {
      setFetchError(String(error.message || 'Téléchargement impossible.'));
      return;
    }

    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', String(doc.name || 'document'));
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    await logDocActivity('download', doc);
  };

  const isPreviewable = (doc: DgDocument) => {
    const ext = normalizeType(doc.type);
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  };

  const openPreview = async (doc: DgDocument) => {
    if (!doc.storage_path || !isPreviewable(doc)) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setPreviewDoc(doc);
    setPreviewLoading(true);

    try {
      const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(doc.storage_path);
      if (error) throw error;
      setPreviewUrl(URL.createObjectURL(data));
    } catch (err: any) {
      setFetchError(String(err?.message || 'Prévisualisation impossible.'));
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const handleDelete = async (doc: DgDocument) => {
    if (!window.confirm(`Supprimer ${doc.name || 'ce document'} ?`)) return;
    setDeletingId(doc.id);
    try {
      if (doc.storage_path) {
        const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
        if (storageError) console.warn('Delete storage warning:', storageError.message);
      }

      const { error: dbError } = await supabase.from('documents_agta').delete().eq('id', doc.id);
      if (dbError) throw dbError;

      setDocs((prev) => prev.filter((x) => x.id !== doc.id));
      await logDocActivity('delete', doc);
    } catch (err: any) {
      setFetchError(String(err?.message || 'Suppression impossible.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-[#C7FF00]">Documents</h1>
          <p className="text-zinc-400 text-sm mt-1">Contrats, CV, passeports et autres pièces DG</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-4 py-2 rounded-lg bg-[#C7FF00] text-black font-bold text-sm hover:bg-[#b3e600] transition cursor-pointer">
            <UploadCloud size={14} className="inline mr-2" /> {uploading ? 'Import...' : 'Importer'}
            <input type="file" className="hidden" multiple onChange={handleUpload} disabled={uploading} />
          </label>
          <button
            onClick={() => void fetchDocs(true)}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: kpis.total, key: 'all' },
          { label: 'Contrats', value: kpis.contract, key: 'contract' },
          { label: 'CV', value: kpis.cv, key: 'cv' },
          { label: 'Passeports', value: kpis.passport, key: 'passport' },
          { label: 'Autres', value: kpis.other, key: 'other' },
        ].map((k) => (
          <button
            key={k.label}
            onClick={() => setCategoryFilter(k.key as 'all' | 'contract' | 'cv' | 'passport' | 'other')}
            className={`p-4 rounded-xl border text-left transition ${categoryFilter === k.key ? 'bg-[#C7FF00]/10 border-[#C7FF00]/40' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60'}`}
          >
            <p className={`text-2xl font-black ${categoryFilter === k.key ? 'text-[#C7FF00]' : 'text-white'}`}>{k.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom/type/catégorie..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
          />
        </div>
        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} document(s)</span>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Chargement des documents...</div>
      ) : fetchError ? (
        <div className="text-red-400 text-sm">{fetchError}</div>
      ) : paginated.length === 0 ? (
        <div className="text-zinc-500 text-sm">Aucun document trouvé.</div>
      ) : (
        <div className="space-y-3">
          {paginated.map((doc, idx) => {
            const cat = inferCategory(doc);
            return (
              <motion.div
                key={String(doc.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{doc.name || 'Sans nom'}</p>
                  <p className="text-zinc-500 text-xs mt-1 uppercase">
                    {doc.type || 'N/A'} • {cat} • {doc.size || 'N/A'} • {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void openPreview(doc)}
                    disabled={!isPreviewable(doc)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition disabled:opacity-40"
                  >
                    Aperçu
                  </button>
                  <button
                    onClick={() => void handleDownload(doc)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition"
                  >
                    Télécharger
                  </button>
                  <button
                    onClick={() => void handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs hover:bg-red-500/30 transition disabled:opacity-40"
                  >
                    {deletingId === doc.id ? '...' : 'Supprimer'}
                  </button>
                </div>
              </motion.div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">Page {currentPage} / {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-700 transition disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closePreview}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl h-[84vh] bg-[#111214] border border-zinc-800 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">Prévisualisation - {previewDoc.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{previewDoc.type} • {previewDoc.size}</p>
              </div>
              <button onClick={closePreview} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition">Fermer</button>
            </div>

            <div className="h-[calc(84vh-56px)] bg-zinc-950 flex items-center justify-center">
              {previewLoading ? (
                <Loader2 className="animate-spin text-zinc-500" />
              ) : previewUrl ? (
                normalizeType(previewDoc.type) === 'pdf' ? (
                  <iframe src={previewUrl} className="w-full h-full" title={`dg-preview-${previewDoc.id}`} />
                ) : (
                  <img src={previewUrl} alt={String(previewDoc.name || '')} className="max-w-full max-h-full object-contain" />
                )
              ) : (
                <p className="text-zinc-500 text-sm">Aperçu indisponible.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Settings Content
// SettingsContent removed — replaced by <SettingsView /> imported above