"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  BarChart3,
  Users,
  Target,
  Mail,
  Briefcase,
  FileText,
  Settings,
  Megaphone,
  BarChart,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Hourglass,
  ClipboardList,
  Loader2,
  Calendar,
  Filter,
  Eye,
  Download,
} from 'lucide-react';
import logo from 'figma:asset/3ac7475537d06d11ddf8dcded6e98d4e0c8dca4a.png';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { useAppPreferences } from '../../lib/appPreferences';
import { useNavigate } from 'react-router';

// --- IMPORTATION DES COMPOSANTS ---
import DashboardView from '../components/DashboardView';
import AthleteFormView from '../components/AthleteFormView'; 
import ProfileListView from '../components/ProfileListView';
import RecruitmentView from '../components/RecruitmentView';
import MessagesView from '../components/MessagesView';
import DocumentsView from '../components/DocumentsView'; 
import ReportsView from '../components/ReportsView';
import WorkJournalView from '../components/WorkJournalView';
import AlertsView from '../components/AlertsView';
import SettingsView from '../components/SettingsView';
import { enableDevicePush } from '../../lib/pushNotifications';

type Tab = 'overview' | 'athlete' | 'list' | 'recrutement' | 'messages' | 'documents' | 'reports' | 'journal' | 'bureau-rapport' | 'historique-rapports' | 'alerts' | 'settings';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const pushEnabledPref = localStorage.getItem('agta_push_enabled');
    if (Notification.permission === 'default' && pushEnabledPref !== '0') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user?.email) {
        void enableDevicePush(supabase as any, user.email, 'staff');
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const handleExternalTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const requestedTab = customEvent.detail as Tab;
      if (!requestedTab) return;
      setActiveTab(requestedTab);
    };

    window.addEventListener('agta:navigate-tab', handleExternalTabChange as EventListener);
    return () => {
      window.removeEventListener('agta:navigate-tab', handleExternalTabChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`staff-device-notify-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const id = String(payload?.new?.id || payload?.commit_timestamp || Date.now());
        const key = `messages-insert-${id}`;
        if (notifiedEventsRef.current.has(key) || activeTab === 'messages') return;
        notifiedEventsRef.current.add(key);

        const sender = String(payload?.new?.sender_name || 'AGTA');
        const content = String(payload?.new?.content || payload?.new?.attachment_name || 'Nouveau message');
        showDeviceNotification('AGTA • Nouveau message', `${sender}: ${content.slice(0, 120)}`, 'agta-msg-staff');
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
          showDeviceNotification('AGTA • Nouvelle candidature', `${candidate} vient de s'inscrire.`, 'agta-recruit-insert');
          return;
        }
        if (status === 'accepted') {
          showDeviceNotification('AGTA • Candidature validée', `${candidate} a été validé par la DG.`, 'agta-recruit-accepted');
          return;
        }
        if (status === 'rejected') {
          showDeviceNotification('AGTA • Candidature rejetée', `${candidate} a été rejeté par la DG.`, 'agta-recruit-rejected');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agta_activity' }, (payload: any) => {
        const id = String(payload?.new?.id || payload?.commit_timestamp || Date.now());
        const key = `activity-insert-${id}`;
        if (notifiedEventsRef.current.has(key)) return;
        notifiedEventsRef.current.add(key);

        const description = String(payload?.new?.description || payload?.new?.activity_type || 'Mise à jour AGTA');
        showDeviceNotification('AGTA • Mise à jour', description.slice(0, 140), 'agta-activity');
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeTab, showDeviceNotification]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login/staff");
  };

  const menuItems: MenuItem[] = [
    { id: "overview", label: "Dashboard", icon: BarChart3 },
    { id: "athlete", label: "Nouvel Athlète", icon: Users },
    { id: "list", label: "Liste Profils", icon: Briefcase },
    { id: "recrutement", label: "Recrutement", icon: Target },
    { id: "messages", label: "Messages", icon: Mail },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "reports", label: "Rapports", icon: BarChart },
    { id: "journal", label: "Journal", icon: Megaphone },
    { id: "bureau-rapport", label: "Rapport Bureau", icon: BarChart3 },
    { id: "historique-rapports", label: "Historique Rapports", icon: FileText },
    { id: "alerts", label: "Alertes", icon: Target },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardView />;
      case "athlete":
        return <AthleteFormView />;
      case "list":
        return <ProfileListView />;
      case "recrutement":
        return <RecruitmentView onAddClick={() => setActiveTab('athlete')} />;
      case "messages":
        return <MessagesView />;
      case "documents":
        return <DocumentsView />;
      case "reports":
        return <ReportsView />;
      case "journal":
        return <WorkJournalView />;
      case "bureau-rapport":
        return <BureauRapportView />;
      case "historique-rapports":
        return <HistoricalReportsView />;
      case "alerts":
        return <AlertsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
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
          <p className="text-zinc-400 text-xs mt-1">STAFF SECRETARY</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeTab === item.id
                    ? "bg-[#C7FF00] text-[#0A0A0A] font-semibold shadow-[0_0_20px_rgba(199,255,0,0.3)]"
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
              <span className="text-[#C7FF00] font-bold ml-2">● STAFF</span>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// COMPOSANT RAPPORT BUREAU
function BureauRapportView() {
  const getToday = () => new Date().toISOString().split('T')[0];

  const normalizeStatus = (value: unknown) => {
    const normalized = String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (['accepted', 'accepte', 'acceptee', 'valide', 'approved'].includes(normalized)) return 'accepted';
    if (['rejected', 'rejete', 'rejetee', 'refuse', 'declined'].includes(normalized)) return 'rejected';
    return 'pending';
  };

  const describeCandidate = (item: any) => {
    const name = String(item?.full_name || item?.name || 'Candidat').trim();
    const sport = String(item?.sport || '').trim();
    const position = String(item?.position || '').trim();
    return [name, sport, position].filter(Boolean).join(' - ');
  };

  const [reportDate, setReportDate] = useState(getToday());
  const [athletesInscrits, setAthletesInscrits] = useState(0);
  const [candidaturesAcceptees, setCandidaturesAcceptees] = useState(0);
  const [candidaturesRejetees, setCandidaturesRejetees] = useState(0);
  const [candidaturesEnAttente, setCandidaturesEnAttente] = useState(0);
  const [acceptedCandidates, setAcceptedCandidates] = useState<string[]>([]);
  const [rejectedCandidates, setRejectedCandidates] = useState<string[]>([]);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDailyMetrics = useCallback(async (date: string) => {
    setLoading(true);
    setError('');

    try {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const [submissionsRes, decisionsRes, pendingRes, athletesTodayRes] = await Promise.all([
        supabase
          .from('recruitment')
          .select('id, full_name, sport, position, created_at')
          .gte('created_at', startIso)
          .lt('created_at', endIso),
        supabase
          .from('recruitment')
          .select('id, full_name, sport, position, status, updated_at')
          .gte('updated_at', startIso)
          .lt('updated_at', endIso),
        supabase
          .from('recruitment')
          .select('id, status', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('athletes')
          .select('id, name, sport, position, created_at', { count: 'exact' })
          .gte('created_at', startIso)
          .lt('created_at', endIso),
      ]);

      if (submissionsRes.error) throw submissionsRes.error;
      if (decisionsRes.error) throw decisionsRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (athletesTodayRes.error) throw athletesTodayRes.error;

      const submissions = submissionsRes.data || [];
      const decisions = decisionsRes.data || [];
      const athletesToday = athletesTodayRes.data || [];
      const acceptedToday = decisions.filter((item: any) => normalizeStatus(item.status) === 'accepted');
      const rejectedToday = decisions.filter((item: any) => normalizeStatus(item.status) === 'rejected');
      const pendingBacklog = pendingRes.count || 0;
      const newAdmissionsToday = athletesTodayRes.count || athletesToday.length;
      const acceptedNames = acceptedToday.map((item: any) => describeCandidate(item)).filter(Boolean);
      const rejectedNames = rejectedToday.map((item: any) => describeCandidate(item)).filter(Boolean);

      setAthletesInscrits(submissions.length);
      setCandidaturesAcceptees(acceptedToday.length);
      setCandidaturesRejetees(rejectedToday.length);
      setCandidaturesEnAttente(pendingBacklog);
      setAcceptedCandidates(acceptedNames);
      setRejectedCandidates(rejectedNames);

      if (!observations.trim()) {
        const latestSubmissionText = submissions.length > 0
          ? `Inscriptions du jour: ${submissions.slice(0, 3).map(describeCandidate).join(' ; ')}.`
          : 'Aucune nouvelle inscription recue ce jour.';
        const acceptedText = acceptedToday.length > 0
          ? `Validations DG du jour: ${acceptedToday.slice(0, 3).map(describeCandidate).join(' ; ')}.`
          : 'Aucune validation DG enregistree aujourd\'hui.';
        const rejectedText = rejectedToday.length > 0
          ? `Rejets DG du jour: ${rejectedToday.slice(0, 3).map(describeCandidate).join(' ; ')}.`
          : 'Aucun rejet DG enregistre aujourd\'hui.';
        const admissionsText = newAdmissionsToday > 0
          ? `${newAdmissionsToday} profil(s) ont rejoint la base athletes aujourd\'hui.`
          : 'Aucun nouveau profil n\'a ete bascule dans la base athletes aujourd\'hui.';

        setObservations([
          `Bilan du ${date}: ${submissions.length} inscription(s) recue(s), ${acceptedToday.length} validation(s) DG, ${rejectedToday.length} rejet(s) DG, ${pendingBacklog} dossier(s) actuellement en attente.`,
          latestSubmissionText,
          acceptedText,
          rejectedText,
          admissionsText,
        ].join(' '));
      }
    } catch (err: any) {
      console.error('Erreur chargement Rapport Bureau:', err);
      setError('Impossible de charger les donnees reelles du Rapport Bureau. Verifie les tables recruitment / athletes et leurs permissions.');
    } finally {
      setLoading(false);
    }
  }, [observations]);

  useEffect(() => {
    fetchDailyMetrics(reportDate);
  }, [reportDate, fetchDailyMetrics]);

  useEffect(() => {
    const recruitmentChannel = supabase
      .channel(`bureau-rapport-live-${reportDate}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment' }, () => {
        void fetchDailyMetrics(reportDate);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(recruitmentChannel);
    };
  }, [reportDate, fetchDailyMetrics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      const staffEmail = authData?.user?.email || 'staff@agta.local';

      const summary = [
        `Rapport Bureau ${reportDate}`,
        `Athletes inscrits: ${athletesInscrits}`,
        `Acceptees DG: ${candidaturesAcceptees}`,
        `Rejetees DG: ${candidaturesRejetees}`,
        `En attente DG: ${candidaturesEnAttente}`,
      ].join(' | ');

      const payload = {
        staff_name: staffEmail,
        action: `${summary} | Observations: ${observations || 'Aucune observation'}`,
        type: 'bureau_report',
        target_athlete: null,
      };

      const logInsert = await supabase.from('work_logs').insert([payload]);
      if (logInsert.error) throw logInsert.error;

      try {
        await supabase.from('operations_log').insert([
          {
            date: reportDate,
            scout: staffEmail,
            task: `Rapport Bureau Quotidien - ${summary}`,
            status: 'generated',
          },
        ]);
      } catch {
        // Optional log sink; keep report generation successful even if this table is unavailable.
      }

      setSuccess('Rapport Bureau genere et enregistre avec succes.');
    } catch (err: any) {
      console.error('Erreur generation Rapport Bureau:', err);
      setError('Echec de generation. Verifie les permissions Supabase (work_logs / operations_log).');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    {
      label: 'Athletes Inscrits',
      value: athletesInscrits,
      icon: <Users className="w-5 h-5 text-[#C7FF00]" />,
      tone: 'from-[#1f2937] to-[#0f172a]',
    },
    {
      label: 'Acceptees par DG',
      value: candidaturesAcceptees,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      tone: 'from-emerald-900/40 to-emerald-700/10',
    },
    {
      label: 'Rejetees par DG',
      value: candidaturesRejetees,
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
      tone: 'from-rose-900/40 to-rose-700/10',
    },
    {
      label: 'En Attente DG',
      value: candidaturesEnAttente,
      icon: <Hourglass className="w-5 h-5 text-amber-300" />,
      tone: 'from-amber-900/30 to-amber-700/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-gradient-to-br from-zinc-900 to-[#0b1220] border border-[#C7FF00]/20 rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-[#C7FF00] tracking-tight">Rapport Bureau Quotidien</h3>
            <p className="text-zinc-400 text-sm mt-1">Donnees automatiques du jour + validation manuelle des observations</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 border border-zinc-700 bg-[#0A0A0A] rounded-xl text-white focus:border-[#C7FF00] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => fetchDailyMetrics(reportDate)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-700 hover:border-[#C7FF00]/60 text-zinc-200 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.tone} p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-zinc-300 font-bold">{item.label}</p>
                {item.icon}
              </div>
              <p className="text-3xl font-black text-white">{loading ? '--' : item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">Candidats valides par DG (jour)</p>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            {loading ? (
              <p className="text-sm text-emerald-200/70">Chargement...</p>
            ) : acceptedCandidates.length === 0 ? (
              <p className="text-sm text-emerald-200/80">Aucune validation enregistree aujourd'hui.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {acceptedCandidates.slice(0, 8).map((name) => (
                  <span key={name} className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-xs text-emerald-100 font-semibold">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-rose-200 font-bold">Candidats rejetes par DG (jour)</p>
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            {loading ? (
              <p className="text-sm text-rose-200/70">Chargement...</p>
            ) : rejectedCandidates.length === 0 ? (
              <p className="text-sm text-rose-200/80">Aucun rejet enregistre aujourd'hui.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rejectedCandidates.slice(0, 8).map((name) => (
                  <span key={name} className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-xs text-rose-100 font-semibold">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-black/25 p-5">
            <label className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <ClipboardList className="w-4 h-4 text-[#C7FF00]" />
              Observations du Bureau
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Saisis les details operationnels, blocages, decisions et actions recommandees..."
              rows={5}
              className="w-full px-4 py-3 border border-zinc-700 bg-[#0A0A0A] rounded-xl text-white focus:border-[#C7FF00] focus:outline-none resize-none"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={saving || loading}
            className="w-full py-4 bg-gradient-to-r from-[#C7FF00] to-[#A9D600] text-black font-black rounded-xl hover:shadow-[0_0_30px_rgba(199,255,0,0.25)] transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Generation en cours...' : 'Generer Rapport Bureau'}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

// COMPOSANT HISTORIQUE DES RAPPORTS
function HistoricalReportsView() {
  const { formatDate } = useAppPreferences();

  interface Report {
    id: string;
    created_at: string;
    staff_name: string;
    action: string;
    type: string;
  }

  interface ParsedReport extends Report {
    date: string;
    dateKey: string;
    metrics: {
      athletes?: number;
      acceptees?: number;
      rejetees?: number;
      attente?: number;
    };
    observations: string;
  }

  interface StaffDateSummary {
    key: string;
    dateKey: string;
    dateLabel: string;
    staff_name: string;
    reportsCount: number;
    athletes: number;
    acceptees: number;
    rejetees: number;
    attente: number;
  }

  const [reports, setReports] = useState<ParsedReport[]>([]);
  const [summaryByStaffDate, setSummaryByStaffDate] = useState<StaffDateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtres
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [staffFilter, setStaffFilter] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ParsedReport | null>(null);

  const parseReportAction = (action: string) => {
    const metrics: ParsedReport['metrics'] = {};
    const observations = action.includes('| Observations:')
      ? action.split('| Observations:')[1]?.trim() || ''
      : '';

    // Extract metrics from action string
    const athletesMatch = action.match(/Athletes inscrits:\s*(\d+)/);
    const accepteesMatch = action.match(/Acceptees DG:\s*(\d+)/);
    const rejeteesMatch = action.match(/Rejetees DG:\s*(\d+)/);
    const attenteMatch = action.match(/En attente DG:\s*(\d+)/);

    if (athletesMatch) metrics.athletes = parseInt(athletesMatch[1], 10);
    if (accepteesMatch) metrics.acceptees = parseInt(accepteesMatch[1], 10);
    if (rejeteesMatch) metrics.rejetees = parseInt(rejeteesMatch[1], 10);
    if (attenteMatch) metrics.attente = parseInt(attenteMatch[1], 10);

    return { metrics, observations };
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('work_logs')
        .select('id, created_at, staff_name, action, type')
        .eq('type', 'bureau_report');

      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) throw err;

      const parsed: ParsedReport[] = (data || []).map((report: any) => {
        const { metrics, observations } = parseReportAction(report.action);
        const dateKey = String(report.created_at || '').slice(0, 10);
        return {
          ...report,
          dateKey,
          date: new Date(report.created_at).toLocaleDateString('fr-FR'),
          metrics,
          observations,
        };
      });

      // Apply staff filter if set
      const filtered = staffFilter
        ? parsed.filter((r) => r.staff_name.toLowerCase().includes(staffFilter.toLowerCase()))
        : parsed;

      setReports(filtered);

      const grouped = new Map<string, StaffDateSummary>();
      filtered.forEach((item) => {
        const key = `${item.dateKey}|${item.staff_name}`;
        const current = grouped.get(key);
        if (current) {
          current.reportsCount += 1;
          current.athletes += item.metrics.athletes || 0;
          current.acceptees += item.metrics.acceptees || 0;
          current.rejetees += item.metrics.rejetees || 0;
          current.attente += item.metrics.attente || 0;
          return;
        }

        grouped.set(key, {
          key,
          dateKey: item.dateKey,
          dateLabel: item.date,
          staff_name: item.staff_name,
          reportsCount: 1,
          athletes: item.metrics.athletes || 0,
          acceptees: item.metrics.acceptees || 0,
          rejetees: item.metrics.rejetees || 0,
          attente: item.metrics.attente || 0,
        });
      });

      const groupedRows = Array.from(grouped.values()).sort((a, b) => {
        if (a.dateKey === b.dateKey) return a.staff_name.localeCompare(b.staff_name);
        return a.dateKey < b.dateKey ? 1 : -1;
      });
      setSummaryByStaffDate(groupedRows);
    } catch (err: any) {
      console.error('Erreur chargement historique rapports:', err);
      setError('Impossible de charger les rapports. Verifie tes permissions Supabase.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter, formatDate]);

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo, staffFilter, fetchReports]);

  const downloadAsCSV = () => {
    if (reports.length === 0) {
      alert('Aucun rapport a telecharger.');
      return;
    }

    const headers = ['Date', 'Staff', 'Athletes', 'Acceptees', 'Rejetees', 'En Attente', 'Observations'];
    const rows = reports.map((r) => [
      r.date,
      r.staff_name,
      r.metrics.athletes || 0,
      r.metrics.acceptees || 0,
      r.metrics.rejetees || 0,
      r.metrics.attente || 0,
      r.observations.replace(/"/g, '""'), // Escape quotes
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapports-bureau-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="bg-gradient-to-br from-zinc-900 to-[#0b1220] border border-[#C7FF00]/20 rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-8">
          <h3 className="text-2xl md:text-3xl font-black text-[#C7FF00] tracking-tight">Historique des Rapports Bureau</h3>
          <p className="text-zinc-400 text-sm mt-1">Consulte les rapports generes avec filtres par date et staff</p>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2">
              <Calendar className="w-4 h-4 text-[#C7FF00]" />
              Du
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-700 bg-[#0A0A0A] rounded-xl text-white focus:border-[#C7FF00] focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2">
              <Calendar className="w-4 h-4 text-[#C7FF00]" />
              Au
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-700 bg-[#0A0A0A] rounded-xl text-white focus:border-[#C7FF00] focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 mb-2">
              <Filter className="w-4 h-4 text-[#C7FF00]" />
              Staff
            </label>
            <input
              type="text"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              placeholder="Filtrer par email ou nom..."
              className="w-full px-3 py-2 border border-zinc-700 bg-[#0A0A0A] rounded-xl text-white focus:border-[#C7FF00] focus:outline-none"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 mb-6">{error}</div>
        ) : null}

        {/* Boutons d'action */}
        <div className="flex gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchReports}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 hover:border-[#C7FF00]/60 text-zinc-200 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadAsCSV}
            disabled={loading || reports.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#C7FF00]/40 bg-[#C7FF00]/10 text-[#C7FF00] hover:bg-[#C7FF00]/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Telecharger CSV
          </motion.button>
        </div>

        {!loading && summaryByStaffDate.length > 0 && (
          <div className="mb-6 rounded-2xl border border-zinc-800 overflow-x-auto">
            <div className="px-4 py-3 bg-zinc-800/70 border-b border-zinc-700">
              <p className="text-sm font-black text-[#C7FF00] uppercase tracking-wider">Resume par staff et date</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-zinc-300">Date</th>
                  <th className="px-4 py-2 text-left font-bold text-zinc-300">Staff</th>
                  <th className="px-4 py-2 text-center font-bold text-zinc-300">Rapports</th>
                  <th className="px-4 py-2 text-center font-bold text-[#C7FF00]">Athletes</th>
                  <th className="px-4 py-2 text-center font-bold text-emerald-400">Acceptees</th>
                  <th className="px-4 py-2 text-center font-bold text-rose-400">Rejetees</th>
                  <th className="px-4 py-2 text-center font-bold text-amber-400">Attente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/30">
                {summaryByStaffDate.map((row) => (
                  <tr key={row.key} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-2 text-white">{row.dateLabel}</td>
                    <td className="px-4 py-2 text-zinc-300 text-xs">{row.staff_name}</td>
                    <td className="px-4 py-2 text-center text-zinc-200 font-bold">{row.reportsCount}</td>
                    <td className="px-4 py-2 text-center text-[#C7FF00] font-bold">{row.athletes}</td>
                    <td className="px-4 py-2 text-center text-emerald-400 font-bold">{row.acceptees}</td>
                    <td className="px-4 py-2 text-center text-rose-400 font-bold">{row.rejetees}</td>
                    <td className="px-4 py-2 text-center text-amber-400 font-bold">{row.attente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 border-b border-zinc-700">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-zinc-300">Date</th>
                <th className="px-4 py-3 text-left font-bold text-zinc-300">Staff</th>
                <th className="px-4 py-3 text-center font-bold text-zinc-300">Athletes</th>
                <th className="px-4 py-3 text-center font-bold text-emerald-400">Acceptees</th>
                <th className="px-4 py-3 text-center font-bold text-rose-400">Rejetees</th>
                <th className="px-4 py-3 text-center font-bold text-amber-400">Attente</th>
                <th className="px-4 py-3 text-center font-bold text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C7FF00]" />
                      Chargement des rapports...
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">Aucun rapport trouve pour les criteres selectionnes.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-zinc-800/50 transition"
                  >
                    <td className="px-4 py-3 text-white">{report.date}</td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">{report.staff_name}</td>
                    <td className="px-4 py-3 text-center text-[#C7FF00] font-bold">{report.metrics.athletes || '--'}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-bold">{report.metrics.acceptees || '--'}</td>
                    <td className="px-4 py-3 text-center text-rose-400 font-bold">{report.metrics.rejetees || '--'}</td>
                    <td className="px-4 py-3 text-center text-amber-400 font-bold">{report.metrics.attente || '--'}</td>
                    <td className="px-4 py-3 text-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C7FF00]/10 border border-[#C7FF00]/40 text-[#C7FF00] hover:bg-[#C7FF00]/20 transition"
                      >
                        <Eye className="w-3 h-3" />
                        Voir
                      </motion.button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Statistiques de synthese */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <p className="text-xs font-bold text-zinc-300 mb-2 uppercase">Total Athletes</p>
              <p className="text-2xl font-black text-[#C7FF00]">
                {reports.reduce((acc, r) => acc + (r.metrics.athletes || 0), 0)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <p className="text-xs font-bold text-emerald-300 mb-2 uppercase">Total Acceptees</p>
              <p className="text-2xl font-black text-emerald-400">
                {reports.reduce((acc, r) => acc + (r.metrics.acceptees || 0), 0)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <p className="text-xs font-bold text-rose-300 mb-2 uppercase">Total Rejetees</p>
              <p className="text-2xl font-black text-rose-400">
                {reports.reduce((acc, r) => acc + (r.metrics.rejetees || 0), 0)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
              <p className="text-xs font-bold text-amber-300 mb-2 uppercase">Total Attente</p>
              <p className="text-2xl font-black text-amber-400">
                {reports.reduce((acc, r) => acc + (r.metrics.attente || 0), 0)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detail du rapport */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReport(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-zinc-900 to-[#0b1220] border border-[#C7FF00]/20 rounded-2xl p-8 max-w-2xl w-full shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-black text-[#C7FF00]">Detail du Rapport</h4>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Date</p>
                    <p className="text-white font-semibold">{selectedReport.date}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Staff</p>
                    <p className="text-white font-semibold text-sm">{selectedReport.staff_name}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
                  <p className="text-xs font-bold text-zinc-300 uppercase mb-3">Metriques</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Athletes</p>
                      <p className="text-xl font-black text-[#C7FF00]">{selectedReport.metrics.athletes || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Acceptees</p>
                      <p className="text-xl font-black text-emerald-400">{selectedReport.metrics.acceptees || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Rejetees</p>
                      <p className="text-xl font-black text-rose-400">{selectedReport.metrics.rejetees || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Attente</p>
                      <p className="text-xl font-black text-amber-400">{selectedReport.metrics.attente || '--'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/25 p-4">
                  <p className="text-xs font-bold text-zinc-300 uppercase mb-2">Observations</p>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap">
                    {selectedReport.observations || 'Aucune observation'}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedReport(null)}
                  className="w-full py-2 bg-[#C7FF00]/10 border border-[#C7FF00]/40 text-[#C7FF00] rounded-xl hover:bg-[#C7FF00]/20 transition font-semibold"
                >
                  Fermer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}