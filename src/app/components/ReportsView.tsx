"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseStaff as supabase, withSessionRefresh } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { TrendingUp, Users, MapPin, BarChart3, Globe, RefreshCw, FileDown } from 'lucide-react';

interface OpsFeedItem {
  id: string;
  date: string;
  created_at: string;
  actor: string;
  task: string;
  status: string;
}

interface StaffDateSummaryRow {
  key: string;
  date: string;
  staff: string;
  reports: number;
  athletes: number;
  accepted: number;
  rejected: number;
  pending: number;
}

interface AthleteRow {
  id: string;
  created_at?: string | null;
  status?: string | null;
  location?: string | null;
}

interface RecruitmentRow {
  id: string;
  created_at?: string | null;
  status?: string | null;
  nationality?: string | null;
}

interface DocumentRow {
  id: string;
  created_at?: string | null;
  type?: string | null;
  name?: string | null;
}

interface ActivityRow {
  id?: string | number;
  created_at?: string | null;
  user_email?: string | null;
  activity_type?: string | null;
  description?: string | null;
  metadata?: {
    source?: string;
  } | null;
}

interface WorkLogRow {
  id?: string | number;
  created_at?: string | null;
  staff_name?: string | null;
  action?: string | null;
}

type NormalizedStatus = 'accepted' | 'rejected' | 'pending';

const normalizeStatus = (value: unknown): NormalizedStatus => {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'accepted' || s === 'accepte' || s === 'acceptee' || s === 'valide' || s === 'approved') return 'accepted';
  if (s === 'rejected' || s === 'rejete' || s === 'rejetee' || s === 'refuse' || s === 'declined') return 'rejected';
  return 'pending';
};

const isToday = (value: unknown) => {
  if (!value) return false;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export default function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    athletes: 0,
    transfers: 0,
    cities: '06',
    athletesDelta: '+0%',
    transfersDelta: '+0',
  });
  const [activities, setActivities] = useState<OpsFeedItem[]>([]);
  const [dailySummary, setDailySummary] = useState('Rapport Bureau Quotidien - Aucun élément');
  const [reportDate, setReportDate] = useState('');
  const [logFilter, setLogFilter] = useState<'today' | '7d' | '30d' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [staffDateSummary, setStaffDateSummary] = useState<StaffDateSummaryRow[]>([]);

  const extractMetric = (text: string, label: string) => {
    const regex = new RegExp(`${label}\\s*:\\s*(\\d+)`, 'i');
    const match = String(text || '').match(regex);
    return match ? Number(match[1]) : 0;
  };

  // RÉCUPÉRATION DES DONNÉES DEPUIS SUPABASE
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [athletesRes, recruitmentRes, docsRes, activityRes, workLogsRes] = await Promise.all([
        withSessionRefresh(supabase, () => supabase.from('athletes').select('id, created_at, status, location')),
        withSessionRefresh(supabase, () => supabase.from('recruitment').select('id, created_at, status, nationality')),
        withSessionRefresh(supabase, () => supabase.from('documents_agta').select('id, created_at, type, name')),
        withSessionRefresh(supabase, () => supabase.from('agta_activity').select('*').order('created_at', { ascending: false }).limit(8)),
        withSessionRefresh(supabase, () => supabase.from('work_logs').select('id, created_at, staff_name, action, type').eq('type', 'bureau_report').order('created_at', { ascending: false }).limit(120)),
      ]);

      const managerEmail = 'agta.management@gmail.com';
      const athletes: AthleteRow[] = athletesRes.error ? [] : ((athletesRes.data || []) as AthleteRow[]);
      const recruitment: RecruitmentRow[] = recruitmentRes.error ? [] : ((recruitmentRes.data || []) as RecruitmentRow[]);
      const docs: DocumentRow[] = docsRes.error ? [] : ((docsRes.data || []) as DocumentRow[]);
      const logs: any[] = []; // operations_log table not in schema — skip
      const activity: ActivityRow[] = activityRes.error ? [] : ((activityRes.data || []) as ActivityRow[]);
      const bureauLogs: WorkLogRow[] = workLogsRes.error ? [] : ((workLogsRes.data || []) as WorkLogRow[]);

      const todayAthletes = athletes.filter((a) => isToday(a.created_at)).length;
      const last7Athletes = athletes.filter((a) => {
        if (!a?.created_at) return false;
        const d = new Date(a.created_at);
        if (Number.isNaN(d.getTime())) return false;
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 7);
        return d >= threshold;
      }).length;

      const transferCount = docs.filter((d) => {
        const type = String(d.type || '').toUpperCase();
        const name = String(d.name || '').toLowerCase();
        return type.includes('CONTRAT') || name.includes('contrat') || name.includes('contract');
      }).length;

      const statuses = [
        ...recruitment.map((r) => normalizeStatus(r.status)),
        ...athletes.map((a) => normalizeStatus(a.status)),
      ];
      const acceptedCount = statuses.filter((s) => s === 'accepted').length;
      const rejectedCount = statuses.filter((s) => s === 'rejected').length;
      const pendingCount = statuses.filter((s) => s === 'pending').length;

      const citySet = new Set<string>();
      [...athletes, ...recruitment].forEach((row) => {
        const athleteCity = 'location' in row ? row.location : undefined;
        const recruitmentCity = 'nationality' in row ? row.nationality : undefined;
        const city = String(athleteCity || recruitmentCity || '').trim();
        if (city) citySet.add(city.toLowerCase());
      });
      const cityCount = citySet.size || 6;

      const todayLabel = new Date().toISOString().slice(0, 10);
      const bureauSummary = `Rapport Bureau Quotidien - Rapport Bureau ${todayLabel} | Athletes inscrits: ${todayAthletes} | Acceptees DG: ${acceptedCount} | Rejetees DG: ${rejectedCount} | En attente DG: ${pendingCount}`;

      const feedFromLogs: OpsFeedItem[] = logs.map((log: any, i: number) => ({
        id: `ops-${log.id || i}`,
        date: log.date || String(log.created_at || '').slice(0, 10) || todayLabel,
        created_at: log.created_at || `${log.date || todayLabel}T12:00:00.000Z`,
        actor: log.scout || managerEmail,
        task: log.task || log.description || 'Opération interne',
        status: log.status || 'en cours',
      }));

      const feedFromActivity: OpsFeedItem[] = activity
        .filter((act) => {
          const src = String(act.metadata?.source || '').toLowerCase();
          return src === 'documents' || src === 'messages' || String(act.activity_type || '').length > 0;
        })
        .slice(0, 4)
        .map((act, i: number) => ({
          id: `activity-${act.id || i}`,
          date: String(act.created_at || '').slice(0, 10) || todayLabel,
          created_at: act.created_at || `${todayLabel}T12:00:00.000Z`,
          actor: act.user_email || managerEmail,
          task: act.description || act.activity_type || 'Activité AGTA',
          status: 'generated',
        }));

      const generatedHead: OpsFeedItem = {
        id: `generated-${todayLabel}`,
        date: todayLabel,
        created_at: new Date().toISOString(),
        actor: managerEmail,
        task: `${bureauSummary}\n\ngenerated`,
        status: 'generated',
      };

      setStats({
        athletes: athletes.length,
        transfers: transferCount,
        cities: String(cityCount).padStart(2, '0'),
        athletesDelta: `+${last7Athletes}%`,
        transfersDelta: `+${Math.max(0, transferCount - 1)}`,
      });

      setDailySummary(bureauSummary);
      setReportDate(todayLabel);
      setActivities([generatedHead, ...feedFromLogs, ...feedFromActivity].slice(0, 6));

      const grouped = new Map<string, StaffDateSummaryRow>();
      bureauLogs.forEach((entry) => {
        const date = String(entry?.created_at || '').slice(0, 10);
        const staff = String(entry?.staff_name || managerEmail);
        const key = `${date}|${staff}`;
        const athletesMetric = extractMetric(entry?.action || '', 'Athletes inscrits');
        const acceptedMetric = extractMetric(entry?.action || '', 'Acceptees DG');
        const rejectedMetric = extractMetric(entry?.action || '', 'Rejetees DG');
        const pendingMetric = extractMetric(entry?.action || '', 'En attente DG');

        const existing = grouped.get(key);
        if (existing) {
          existing.reports += 1;
          existing.athletes += athletesMetric;
          existing.accepted += acceptedMetric;
          existing.rejected += rejectedMetric;
          existing.pending += pendingMetric;
          return;
        }

        grouped.set(key, {
          key,
          date,
          staff,
          reports: 1,
          athletes: athletesMetric,
          accepted: acceptedMetric,
          rejected: rejectedMetric,
          pending: pendingMetric,
        });
      });

      const summaryRows = Array.from(grouped.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
      setStaffDateSummary(summaryRows.slice(0, 12));
    } catch (error) {
      console.error("Erreur Dashboard AGTA:", error);
      const fallbackDate = new Date().toISOString().slice(0, 10);
      setReportDate(fallbackDate);
      setDailySummary(`Rapport Bureau Quotidien - Rapport Bureau ${fallbackDate} | Athletes inscrits: 0 | Acceptees DG: 0 | Rejetees DG: 0 | En attente DG: 0`);
      setActivities([
        {
          id: `fallback-${fallbackDate}`,
          date: fallbackDate,
          created_at: new Date().toISOString(),
          actor: 'agta.management@gmail.com',
          task: `Rapport Bureau Quotidien - Rapport Bureau ${fallbackDate} | Athletes inscrits: 0 | Acceptees DG: 0 | Rejetees DG: 0 | En attente DG: 0\n\ngenerated`,
          status: 'generated',
        },
      ]);
      setStaffDateSummary([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const kpis = [
    { label: "Total Athlètes", value: stats.athletes, change: stats.athletesDelta, icon: <Users size={20}/> },
    { label: "Transferts Indexés", value: stats.transfers, change: stats.transfersDelta, icon: <TrendingUp size={20}/> },
    { label: "Villes Actives", value: stats.cities, change: "Global", icon: <MapPin size={20}/> },
  ];

  const filteredActivities = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    let end: Date | null = null;
    if (logFilter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (logFilter === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (logFilter === '30d') {
      start.setDate(now.getDate() - 30);
    } else {
      if (!customStartDate && !customEndDate) return activities;
      if (customStartDate) {
        const parsedStart = new Date(`${customStartDate}T00:00:00`);
        if (!Number.isNaN(parsedStart.getTime())) {
          start.setTime(parsedStart.getTime());
        }
      } else {
        start.setTime(0);
      }
      if (customEndDate) {
        const parsedEnd = new Date(`${customEndDate}T23:59:59.999`);
        if (!Number.isNaN(parsedEnd.getTime())) {
          end = parsedEnd;
        }
      }
    }

    return activities.filter((act) => {
      const dt = new Date(act.created_at || `${act.date}T12:00:00.000Z`);
      if (Number.isNaN(dt.getTime())) return false;
      if (dt < start) return false;
      if (end && dt > end) return false;
      return true;
    });
  }, [activities, logFilter, customStartDate, customEndDate]);

  const exportDailyReportPdf = useCallback(async () => {
    const todayOps = activities.filter((act) => isToday(act.created_at || act.date));
    const printableRows = todayOps.length > 0
      ? todayOps
      : [{
          id: 'fallback-print',
          date: reportDate || new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          actor: 'agta.management@gmail.com',
          task: dailySummary,
          status: 'generated',
        } as OpsFeedItem];
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = 48;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Rapport d\'activite - Bureau DG', margin, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Données securisées • Kinshasa - Dubai • ${reportDate || new Date().toISOString().slice(0, 10)}`, margin, y);
      y += 22;

      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(dailySummary, pageWidth - margin * 2);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 14 + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total Athlètes: ${stats.athletes}   |   Transferts Indexés: ${stats.transfers}   |   Villes Actives: ${stats.cities}`, margin, y);
      y += 24;

      doc.setFontSize(10);
      doc.text('Date', margin, y);
      doc.text('Acteur', margin + 90, y);
      doc.text('Operation', margin + 230, y);
      doc.text('Statut', pageWidth - margin - 70, y);
      y += 8;
      doc.setLineWidth(0.7);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      printableRows.forEach((row) => {
        const opLines = doc.splitTextToSize(String(row.task || ''), 260);
        const lineHeight = 12;
        const blockHeight = Math.max(16, opLines.length * lineHeight);

        if (y + blockHeight > pageHeight - 50) {
          doc.addPage();
          y = 48;
        }

        doc.text(String(row.date || ''), margin, y);
        doc.text(String(row.actor || ''), margin + 90, y);
        doc.text(opLines, margin + 230, y);
        doc.text(String(row.status || ''), pageWidth - margin - 70, y);
        y += blockHeight + 8;
      });

      const autoDate = reportDate || new Date().toISOString().slice(0, 10);
      doc.save(`Rapport-Bureau-${autoDate}.pdf`);
    } catch (error: any) {
      alert(`Export PDF impossible: ${error?.message || 'Erreur inconnue'}`);
    }
  }, [activities, dailySummary, reportDate, stats]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* BANNIÈRE DIRECTION GÉNÉRALE */}
      <div className="bg-[#C7FF00] p-10 md:p-14 rounded-[50px] shadow-2xl shadow-[#C7FF00]/20 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <h3 className="text-black font-black text-4xl uppercase tracking-tighter leading-none italic">Rapport d'activité</h3>
            <button
              onClick={exportDailyReportPdf}
              className="px-4 py-2 rounded-full bg-black text-[#C7FF00] text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition flex items-center gap-2"
            >
              <FileDown size={14} /> Exporter PDF
            </button>
            <button 
              onClick={fetchDashboardData} 
              className="p-2 bg-black/5 rounded-full hover:bg-black/10 transition-all active:rotate-180 duration-500"
            >
              <RefreshCw size={18} className="text-black" />
            </button>
          </div>
          <p className="text-black/60 text-[10px] mt-4 font-black uppercase tracking-[4px]">Données sécurisées • Bureau DG</p>
          <div className="flex gap-4 mt-8 justify-center md:justify-start">
              <div className="bg-black text-[#C7FF00] px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">Live Feed</div>
              <div className="bg-white/40 backdrop-blur-sm text-black px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest italic">Kinshasa - Dubai</div>
          </div>
        </div>
        <div className="text-[140px] font-black text-black/5 italic absolute -right-6 bottom-[-30px] select-none pointer-events-none">AGTA</div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-9 rounded-[45px] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-[#C7FF00]/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-[#C7FF00] transition-all">
                {stat.icon}
              </div>
              <span className="text-[9px] font-black text-[#C7FF00] bg-black px-3 py-1.5 rounded-full tracking-widest">{stat.change}</span>
            </div>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[2px]">{stat.label}</p>
            {loading ? (
              <div className="h-10 w-20 bg-zinc-100 animate-pulse rounded-lg mt-2"></div>
            ) : (
              <p className="text-4xl font-black text-zinc-900 mt-1">{stat.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      {!loading && staffDateSummary.length > 0 && (
        <div className="bg-white rounded-[35px] p-6 border border-zinc-100 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-zinc-900 font-black uppercase tracking-tight text-lg">Resume Staff / Date</h4>
            <span className="text-[10px] font-black uppercase tracking-[2px] text-zinc-500">Rapports Bureau reels</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-200">
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase">Date</th>
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase">Staff</th>
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase text-center">Rapports</th>
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase text-center">Athletes</th>
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase text-center">Acceptees</th>
                <th className="py-2 pr-4 text-zinc-500 text-xs uppercase text-center">Rejetees</th>
                <th className="py-2 text-zinc-500 text-xs uppercase text-center">Attente</th>
              </tr>
            </thead>
            <tbody>
              {staffDateSummary.map((row) => (
                <tr key={row.key} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4 text-zinc-900 font-semibold">{row.date}</td>
                  <td className="py-2 pr-4 text-zinc-600 text-xs">{row.staff}</td>
                  <td className="py-2 pr-4 text-center font-bold text-zinc-700">{row.reports}</td>
                  <td className="py-2 pr-4 text-center font-bold text-[#8bb500]">{row.athletes}</td>
                  <td className="py-2 pr-4 text-center font-bold text-emerald-600">{row.accepted}</td>
                  <td className="py-2 pr-4 text-center font-bold text-rose-600">{row.rejected}</td>
                  <td className="py-2 text-center font-bold text-amber-600">{row.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LOG DES OPÉRATIONS RÉELLES */}
        <div className="bg-[#111214] rounded-[50px] p-10 border border-zinc-800 text-white shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex flex-col gap-3">
              <h4 className="font-black uppercase tracking-tighter text-xl flex items-center gap-3">
                <BarChart3 className="text-[#C7FF00]" size={22}/> Log des Opérations
              </h4>
              <div className="flex items-center gap-2">
                {[
                  { id: 'today', label: 'Aujourd\'hui' },
                  { id: '7d', label: '7 jours' },
                  { id: '30d', label: '30 jours' },
                  { id: 'custom', label: 'Personnalisé' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLogFilter(item.id as 'today' | '7d' | '30d' | 'custom')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
                      logFilter === item.id ? 'bg-[#C7FF00] text-black' : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {logFilter === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white/10 border border-white/15 text-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C7FF00]"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white/10 border border-white/15 text-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C7FF00]"
                  />
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/10 text-zinc-300 hover:bg-white/20"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-5 rounded-[25px] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] transition-all">
                  <div>
                    <p className="text-[9px] font-black text-[#C7FF00] uppercase tracking-widest">
                      {act.date} — {act.actor}
                    </p>
                    <p className="text-sm font-bold text-zinc-200 mt-1 tracking-tight whitespace-pre-line">{act.task}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl">
                    <span className={`w-2 h-2 rounded-full ${act.status === 'Terminé' || act.status === 'generated' ? 'bg-[#C7FF00]' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span className="text-[9px] font-black uppercase text-zinc-400">{act.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center opacity-30 italic text-sm font-medium">
                Aucune opération trouvée pour cette période.
              </div>
            )}
          </div>
        </div>

        {/* COUVERTURE GLOBALE */}
        <div className="bg-white rounded-[50px] p-10 border border-zinc-100 shadow-sm flex flex-col justify-between group">
           <div className="flex items-center gap-3 mb-6">
              <Globe className="text-zinc-400 group-hover:text-black transition-colors" size={22}/>
              <h4 className="font-black uppercase tracking-tighter text-xl text-zinc-800">Couverture Globale</h4>
           </div>
           
           <div className="flex-1 flex items-center justify-center relative py-6">
              <div className="w-56 h-56 rounded-full border-[15px] border-zinc-50 flex items-center justify-center shadow-inner">
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }} 
                   animate={{ scale: 1, opacity: 1 }} 
                   className="w-36 h-36 rounded-full border-[15px] border-[#C7FF00] shadow-[0_0_40px_rgba(199,255,0,0.2)] flex flex-col items-center justify-center bg-white"
                 >
                    <span className="text-3xl font-black italic text-black">65%</span>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Afrique</span>
                 </motion.div>
              </div>
           </div>
           
           <div className="mt-8 p-6 bg-zinc-50 rounded-[30px] border border-dashed border-zinc-200 text-center">
             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[2px]">
               Expansion : Moyen-Orient & Europe <span className="text-black">(Q3 2026)</span>
             </p>
             <p className="text-[9px] font-black text-zinc-400 mt-3 tracking-wider">
               {reportDate ? `${reportDate} — Synthèse DG` : ''}
             </p>
             <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
               {dailySummary}
             </p>
           </div>
        </div>
      </div>

      {/* FOOTER DG */}
      <div className="flex justify-center pt-4">
          <p className="text-[8px] font-black text-zinc-300 uppercase tracking-[6px]">
            AGTA — Intelligence & Management Documentaire
          </p>
      </div>
    </div>
  );
}