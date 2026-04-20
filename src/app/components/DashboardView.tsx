"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Globe, 
  AlertCircle, 
  ArrowUpRight, 
  Activity,
  DollarSign,
  Loader2
} from 'lucide-react';

type DashboardStats = {
  totalAthletes: number;
  totalValue: number;
  pendingValidations: number;
  activeSports: number;
};

type ActivityPoint = {
  label: string;
  key: string;
  count: number;
};

type PriorityItem = {
  title: string;
  subtitle: string;
  isUrgent?: boolean;
};

type AthleteRow = {
  value?: unknown;
  status?: unknown;
  sport?: unknown;
  created_at?: string;
};

type RecruitmentRow = {
  status?: unknown;
  created_at?: string;
};

type PresenceRow = {
  user_name?: unknown;
};

type MessageRow = {
  priority?: unknown;
  created_at?: string;
};

const INITIAL_STATS: DashboardStats = {
  totalAthletes: 0,
  totalValue: 0,
  pendingValidations: 0,
  activeSports: 0,
};

const makeLast7Days = (): ActivityPoint[] => {
  const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const points: ActivityPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({
      key,
      label: formatter.format(d).replace('.', '').toUpperCase(),
      count: 0,
    });
  }
  return points;
};

const parseMoney = (raw: unknown): number => {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
};

const normalizeStatus = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isPendingStatus = (status: unknown) => {
  const s = normalizeStatus(status);
  return s === 'pending' || s === 'a valider' || s === 'a valider ' || s === 'a valider.' || s === 'a valider,' || s === 'a valider;' || s === 'a valider:';
};

const formatUsd = (amount: number) => `${amount.toLocaleString('fr-FR')} $`;

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [onlineStaff, setOnlineStaff] = useState<string[]>([]);
  const [activity7d, setActivity7d] = useState<ActivityPoint[]>(makeLast7Days());
  const [priorities, setPriorities] = useState<PriorityItem[]>([
    { title: 'Pipeline recrutement', subtitle: 'Aucune alerte pour le moment' },
    { title: 'Rapports scouts', subtitle: 'Aucun nouveau profil cette semaine' },
  ]);
  const [loading, setLoading] = useState(true);

  const handleGenerateGlobalReport = useCallback(() => {
    window.dispatchEvent(new CustomEvent('agta:navigate-tab', { detail: 'bureau-rapport' }));
  }, []);

  // Handlers pour chaque carte - navigation au clic
  const handleCardClick = useCallback((cardType: string) => {
    const navigationMap: Record<string, string> = {
      'talents': 'list',              // Portefeuille Talents → Liste Profils
      'valeur': 'list',               // Valeur Estimée → Liste Profils (peut filtrer par valeur)
      'disciplines': 'recrutement',   // Disciplines → Recrutement (voir les sports)
      'validation': 'messages',       // À Valider → Messages (voir les alertes DG)
    };
    const targetTab = navigationMap[cardType];
    if (targetTab) {
      window.dispatchEvent(new CustomEvent('agta:navigate-tab', { detail: targetTab }));
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const [athletesRes, recruitmentRes, presenceRes, messagesRes] = await Promise.all([
        supabase.from('athletes').select('value, status, sport, created_at'),
        supabase.from('recruitment').select('status, created_at').gte('created_at', sevenDaysAgo),
        supabase
          .from('chat_presence')
          .select('user_name, is_online, last_seen')
          .or(`is_online.eq.true,last_seen.gte.${tenMinutesAgo}`)
          .order('last_seen', { ascending: false }),
        supabase.from('messages').select('priority, created_at').eq('priority', 'high').gte('created_at', sevenDaysAgo),
      ]);

      if (athletesRes.error) throw athletesRes.error;

      const athletes: AthleteRow[] = (athletesRes.data || []) as AthleteRow[];
      const recruitment: RecruitmentRow[] = (recruitmentRes.data || []) as RecruitmentRow[];
      const presence: PresenceRow[] = (presenceRes.data || []) as PresenceRow[];
      const highPriorityMessages: MessageRow[] = (messagesRes.data || []) as MessageRow[];

      const total = athletes.length;
      const value = athletes.reduce((acc: number, curr: AthleteRow) => acc + parseMoney(curr.value), 0);
      const pendingAthletes = athletes.filter((a: AthleteRow) => isPendingStatus(a.status)).length;
      const pendingRecruitment = recruitment.filter((r: RecruitmentRow) => isPendingStatus(r.status)).length;
      const pending = pendingAthletes + pendingRecruitment;
      const sports = new Set(athletes.map((a: AthleteRow) => String(a.sport || '').trim()).filter(Boolean)).size;

      setStats({
        totalAthletes: total,
        totalValue: value,
        pendingValidations: pending,
        activeSports: sports,
      });

      const points = makeLast7Days();
      const byDay = new Map<string, number>(points.map((p) => [p.key, 0]));
      athletes.forEach((a: AthleteRow) => {
        const key = String(a.created_at || '').slice(0, 10);
        if (byDay.has(key)) byDay.set(key, (byDay.get(key) || 0) + 1);
      });
      recruitment.forEach((r: RecruitmentRow) => {
        const key = String(r.created_at || '').slice(0, 10);
        if (byDay.has(key)) byDay.set(key, (byDay.get(key) || 0) + 1);
      });
      setActivity7d(points.map((p) => ({ ...p, count: byDay.get(p.key) || 0 })));

      const onlineNames: string[] = presence
        .map((p: PresenceRow) => String(p.user_name || '').trim())
        .filter((name: string) => name && !/agta bot/i.test(name));
      setOnlineStaff(Array.from(new Set<string>(onlineNames)).slice(0, 5));

      const newProfiles7d = recruitment.length;
      const urgentCount = pendingRecruitment + highPriorityMessages.length;
      setPriorities([
        {
          title: urgentCount > 0 ? 'Validation DG' : 'Pipeline recrutement',
          subtitle:
            urgentCount > 0
              ? `${urgentCount} element${urgentCount > 1 ? 's' : ''} prioritaire${urgentCount > 1 ? 's' : ''}`
              : 'Aucune urgence detectee',
          isUrgent: urgentCount > 0,
        },
        {
          title: 'Rapports scouts',
          subtitle: `${newProfiles7d} nouveau${newProfiles7d > 1 ? 'x' : ''} profil${newProfiles7d > 1 ? 's' : ''} (7 jours)`,
        },
      ]);
    } catch (err) {
      console.error('Erreur Sync Dashboard:', err);
      setStats(INITIAL_STATS);
      setActivity7d(makeLast7Days());
      setOnlineStaff([]);
      setPriorities([
        { title: 'Pipeline recrutement', subtitle: 'Donnees indisponibles temporairement' },
        { title: 'Rapports scouts', subtitle: 'Donnees indisponibles temporairement' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const channels = [
      supabase.channel(`dashboard-athletes-${Date.now()}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'athletes' },
        fetchDashboardData
      ),
      supabase.channel(`dashboard-recruitment-${Date.now()}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recruitment' },
        fetchDashboardData
      ),
      supabase.channel(`dashboard-presence-${Date.now()}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_presence' },
        fetchDashboardData
      ),
      supabase.channel(`dashboard-messages-${Date.now()}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        fetchDashboardData
      ),
    ];

    channels.forEach((channel) => channel.subscribe());

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchDashboardData]);

  const cards = [
    { 
      id: 'talents',
      label: "Portefeuille Talents", 
      value: stats.totalAthletes, 
      sub: "Athlètes enregistrés", 
      icon: <Users size={24} />, 
      color: "text-blue-500",
      bg: "bg-blue-50",
      source: "Table: athletes | COUNT(*)",
      description: "Total de tous les athlètes enregistrés dans le système"
    },
    { 
      id: 'valeur',
      label: "Valeur Estimée", 
      value: formatUsd(stats.totalValue), 
      sub: "Market Value Globale", 
      icon: <DollarSign size={24} />, 
      color: "text-[#C7FF00]",
      bg: "bg-black",
      source: "Table: athletes.value | SUM()",
      description: "Somme de toutes les valuations des athlètes"
    },
    { 
      id: 'disciplines',
      label: "Disciplines", 
      value: stats.activeSports, 
      sub: "Sports représentés", 
      icon: <Activity size={24} />, 
      color: "text-purple-500",
      bg: "bg-purple-50",
      source: "Table: athletes.sport | COUNT(DISTINCT)",
      description: "Nombre de disciplines sportives distinctes"
    },
    { 
      id: 'validation',
      label: "À Valider", 
      value: stats.pendingValidations, 
      sub: "Décisions DG en attente", 
      icon: <AlertCircle size={24} />, 
      color: "text-red-500",
      bg: "bg-red-50",
      source: "Tables: recruitment (status=pending) + messages (priority=high)",
      description: "Candidatures en attente de validation DG + messages prioritaires"
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* SECTION BIENVENUE */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-800 italic">Vision Globale</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-[#C7FF00] rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[4px]">Management Live Portals</p>
          </div>
        </div>
        
        <div className="hidden md:flex bg-white border border-zinc-100 p-2 rounded-[20px] items-center gap-4 px-5 shadow-sm">
           <div className="flex -space-x-3">
              {(onlineStaff.length > 0 ? onlineStaff : ['DG']).slice(0, 3).map((name, i) => (
                <div key={`${name}-${i}`} className={`w-9 h-9 rounded-full border-4 border-white ${i === 0 ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'} flex items-center justify-center text-[8px] font-bold`}>
                  {name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              ))}
           </div>
           <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{onlineStaff.length || 1} staff en ligne</span>
        </div>
      </div>

      {/* GRILLE DE STATS RÉELLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div 
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleCardClick(card.id)}
            title={`${card.description}\nSource: ${card.source}`}
            className={`${card.bg === 'bg-black' ? 'bg-[#111214] text-white shadow-2xl' : 'bg-white text-zinc-800'} p-8 rounded-[45px] border border-zinc-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${card.bg === 'bg-black' ? 'bg-white/5 text-[#C7FF00]' : 'bg-zinc-50 ' + card.color}`}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : card.icon}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${card.bg === 'bg-black' ? 'text-zinc-500' : 'text-zinc-400'}`}>{card.label}</p>
            <h3 className="text-3xl font-black mt-2 tracking-tighter italic">
              {loading ? "---" : card.value}
            </h3>
            <p className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-tighter">{card.sub}</p>
            <p className={`text-[7px] mt-3 opacity-50 font-mono ${card.bg === 'bg-black' ? 'text-zinc-600' : 'text-zinc-500'}`}>{card.source}</p>
            
            <ArrowUpRight className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all text-[#C7FF00]" size={20} />
          </motion.div>
        ))}
      </div>

      {/* ANALYSE GRAPHIQUE & PRIORITÉS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Graphique de Flux */}
        <div className="lg:col-span-2 bg-white rounded-[50px] p-10 border border-zinc-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800">Flux de Détection</h4>
              <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">7 derniers jours d'activité</p>
            </div>
            <Globe size={18} className="text-zinc-200 group-hover:rotate-180 transition-transform duration-1000" />
          </div>
          
          <div className="h-48 flex items-end gap-3 justify-between">
            {activity7d.map((point, i) => {
              const max = Math.max(...activity7d.map((p) => p.count), 1);
              const height = Math.max((point.count / max) * 100, point.count > 0 ? 10 : 4);
              return (
              <div key={point.key} className="flex-1 flex flex-col items-center gap-3">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 1.5, ease: "circOut", delay: i * 0.1 }}
                  className={`w-full rounded-t-2xl shadow-inner ${i === activity7d.length - 1 ? 'bg-[#C7FF00]' : 'bg-zinc-100'} hover:bg-black transition-all cursor-pointer relative group/bar`}
                />
                <span className="text-[8px] font-black text-zinc-300 uppercase">{point.label}</span>
              </div>
            );})}
          </div>
        </div>

        {/* Radar Alertes DG */}
        <div className="bg-[#111214] rounded-[50px] p-10 text-white shadow-2xl overflow-hidden relative border border-white/5">
           <div className="absolute -top-10 -right-10 p-8 opacity-5">
              <TrendingUp size={150} />
           </div>
           <h4 className="text-[10px] font-black uppercase tracking-[4px] text-[#C7FF00] mb-8 italic">Priorités Stratégiques</h4>
           
           <div className="space-y-4">
              <div className="flex items-center gap-5 p-5 rounded-[30px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#C7FF00]/20 transition-all cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl ${priorities[0]?.isUrgent ? 'bg-red-500/10' : 'bg-[#C7FF00]/10'} flex items-center justify-center`}>
                  <AlertCircle size={18} className={priorities[0]?.isUrgent ? 'text-red-500 animate-pulse' : 'text-[#C7FF00]'} />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-tight">{priorities[0]?.title || 'Validation DG'}</p>
                   <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{priorities[0]?.subtitle || 'Aucune alerte'}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 rounded-[30px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-[#C7FF00]/10 flex items-center justify-center">
                   <Activity size={18} className="text-[#C7FF00]" />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-tight">{priorities[1]?.title || 'Rapports scouts'}</p>
                   <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{priorities[1]?.subtitle || 'Aucune nouvelle activite'}</p>
                </div>
              </div>
           </div>
           
            <button
             onClick={handleGenerateGlobalReport}
             className="w-full mt-12 py-5 bg-[#C7FF00] text-black rounded-[22px] text-[10px] font-black uppercase tracking-[3px] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(199,255,0,0.1)]"
            >
              Générer Rapport Global
           </button>
        </div>

      </div>
    </div>
  );
}