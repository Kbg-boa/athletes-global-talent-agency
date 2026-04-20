"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { 
  ArrowRight, 
  Plus, 
  Loader2, 
  Target, 
  Calendar, 
  Clock, 
  Radar
} from 'lucide-react';

interface RecruitmentProps {
  onAddClick: () => void;
}

interface AthleteTarget {
  id: string;
  name: string;
  club?: string;
  position?: string;
  sport?: string;
}

interface Appointment {
  id: string;
  title: string;
  time: string;
  date: string;
  type: string;
}

type ApplicationStatusFilter = 'pending' | 'accepted' | 'rejected' | 'all';

const normalizeStatus = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isProspectionStatus = (value: unknown) => {
  const s = normalizeStatus(value);
  return s.includes('prospection') || s.includes('target') || s.includes('cible');
};

const toApplicationStatus = (value: unknown): ApplicationStatusFilter => {
  const s = normalizeStatus(value);

  if (
    s === 'pending' ||
    s === 'en attente' ||
    s === 'attente' ||
    s === 'a valider' ||
    s === 'a_valider'
  ) {
    return 'pending';
  }

  if (s === 'accepted' || s === 'accepte' || s === 'valide') {
    return 'accepted';
  }

  if (s === 'rejected' || s === 'rejete' || s === 'refuse') {
    return 'rejected';
  }

  return 'all';
};

const isPendingStatus = (value: unknown) => {
  return toApplicationStatus(value) === 'pending';
};

const formatAgendaDate = (rawDate: unknown) => {
  const text = String(rawDate || '').trim();
  if (!text) return '-';

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
};

const formatAgendaTime = (rawTime: unknown) => {
  const text = String(rawTime || '').trim();
  if (!text) return '--:--';
  return text;
};

export default function RecruitmentView({ onAddClick }: RecruitmentProps) {
  const [targets, setTargets] = useState<AthleteTarget[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>('all');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    date: '',
    time: '',
    type: 'Prospection',
  });
  const [selectedTarget, setSelectedTarget] = useState<AthleteTarget | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. RÉCUPÉRATION DES CIBLES ET DES RDV
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch Athlètes
      const { data: athletes } = await supabase
        .from('athletes')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch Agenda (Rendez-vous)
      const { data: agenda } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .limit(2);

      const { data: recruitment } = await supabase
        .from('recruitment')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (recruitment) setApplications(recruitment);

      const athleteTargets: AthleteTarget[] = (athletes || [])
        .filter((a: any) => isProspectionStatus(a.status))
        .map((a: any) => ({
          id: `ath-${a.id}`,
          name: a.name,
          club: a.club,
          position: a.position,
          sport: a.sport,
        }));

      const recruitmentTargets: AthleteTarget[] = (recruitment || [])
        .filter((r: any) => isPendingStatus(r.status))
        .map((r: any) => ({
          id: `rec-${r.id}`,
          name: r.full_name,
          club: r.club,
          position: r.position,
          sport: r.sport,
        }));

      const mergedTargets = [...athleteTargets, ...recruitmentTargets].reduce<AthleteTarget[]>((acc, current) => {
        const key = `${String(current.name || '').toLowerCase()}|${String(current.sport || '').toLowerCase()}|${String(current.position || '').toLowerCase()}`;
        const exists = acc.some((item) => {
          const k = `${String(item.name || '').toLowerCase()}|${String(item.sport || '').toLowerCase()}|${String(item.position || '').toLowerCase()}`;
          return k === key;
        });
        if (!exists) acc.push(current);
        return acc;
      }, []);

      setTargets(mergedTargets);
      
      const mappedAppointments: Appointment[] = (agenda || [])
        .map((item: any) => ({
          id: String(item.id ?? `${item.title || item.name || 'rdv'}-${item.date || item.due_at || item.created_at || Date.now()}`),
          title: String(item.title || item.name || item.task || item.subject || '').trim() || 'Rendez-vous AGTA',
          time: formatAgendaTime(item.time || item.hour),
          date: formatAgendaDate(item.date || item.due_at || item.created_at),
          type: String(item.type || item.category || 'Agenda').trim() || 'Agenda',
        }))
        .slice(0, 2);

      setAppointments(mappedAppointments);
    } catch (err) {
      console.error("Erreur Sync:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. REALTIME (Écoute les deux tables)
  useEffect(() => {
    fetchData();

    const targetChannel = supabase
      .channel('recruitment_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(targetChannel); };
  }, [fetchData]);

  const resetAppointmentForm = () => {
    setAppointmentForm({
      title: '',
      date: '',
      time: '',
      type: 'Prospection',
    });
    setAppointmentError('');
  };

  const handleCreateAppointment = async () => {
    const title = appointmentForm.title.trim();
    const date = appointmentForm.date.trim();
    const time = appointmentForm.time.trim();
    const type = appointmentForm.type.trim() || 'Agenda';

    if (!title || !date || !time) {
      setAppointmentError('Titre, date et heure sont obligatoires.');
      return;
    }

    try {
      setSavingAppointment(true);
      setAppointmentError('');

      const { error } = await supabase
        .from('appointments')
        .insert([{ title, date, time, type }]);

      if (error) throw error;

      setIsAppointmentModalOpen(false);
      resetAppointmentForm();
      await fetchData();
    } catch (err: any) {
      console.error('Erreur creation RDV:', err);
      setAppointmentError(err?.message || 'Impossible d ajouter le rendez-vous.');
    } finally {
      setSavingAppointment(false);
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
        if (rawKey && value) links[rawKey.trim()] = value;
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

  const enrichedApplications = applications
    .filter((candidate) => {
      if (applicationStatusFilter === 'all') return true;
      return toApplicationStatus(candidate.status) === applicationStatusFilter;
    })
    .map((candidate) => {
      const meta = parseExperienceMeta(candidate.experience);
      const profileScore = meta.scoreFromText ?? computeFallbackScore(candidate);

      const links: Record<string, string> = { ...meta.links };
      if (candidate.video_url) links.video = candidate.video_url;
      if (candidate.cv_url) links.cv = candidate.cv_url;

      return { ...candidate, profileScore, profileLinks: links };
    })
    .sort((a, b) => b.profileScore - a.profileScore);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* SECTION HAUTE : STATS & RAPPELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS CIBLES */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111214] p-10 rounded-[45px] text-white border border-white/5 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Radar size={120} className="animate-spin-slow" />
          </div>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-full bg-[#C7FF00]/10 flex items-center justify-center">
                <Target className="text-[#C7FF00] w-4 h-4" />
             </div>
             <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[3px]">Cibles Identifiées</p>
          </div>
          <p className="text-6xl font-black text-white italic tracking-tighter">
            {loading ? "--" : targets.length.toString().padStart(2, '0')}
          </p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase mt-4 tracking-widest italic">
            {targets.length > 0 ? 'Signal actif sur Kinshasa' : 'Aucun signal sur le radar'}
          </p>
        </motion.div>

        {/* SECTION RAPPELS RDV (DYNAMIQUE) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-8 rounded-[45px] border border-zinc-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <Calendar className="text-zinc-400 w-4 h-4" />
              <h4 className="text-[10px] font-black uppercase text-zinc-800 tracking-[3px]">Rappels Rendez-vous</h4>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
               <span className="text-[8px] font-black text-[#C7FF00] bg-black px-3 py-1 rounded-full uppercase tracking-tighter">Agenda LIVE AGTA</span>
               <button
                type="button"
                onClick={() => {
                  resetAppointmentForm();
                  setIsAppointmentModalOpen(true);
                }}
                className="px-3 py-1 rounded-full bg-zinc-900 text-[#C7FF00] text-[9px] font-black uppercase tracking-tighter hover:opacity-90"
               >
                Ajouter RDV
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.length === 0 ? (
              <div className="md:col-span-2 p-6 bg-zinc-50/60 rounded-[25px] border border-dashed border-zinc-200 text-center">
                <p className="text-[11px] font-black uppercase text-zinc-500 tracking-[2px]">Aucun rendez-vous programme</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-2">Ajoutez un rdv dans la table appointments pour alimenter l agenda live.</p>
              </div>
            ) : appointments.map((rdv) => (
              <div key={rdv.id} className="flex items-center justify-between p-5 bg-zinc-50 rounded-[25px] border border-zinc-100 hover:border-black/5 hover:bg-white hover:shadow-xl transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-[#C7FF00] transition-colors border border-zinc-50">
                    <Clock size={16} className="text-zinc-400 group-hover:text-black" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-zinc-800 uppercase leading-none mb-1.5">{rdv.title}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{rdv.date} • {rdv.time}</p>
                  </div>
                </div>
                <div className="text-[8px] font-black px-3 py-1.5 bg-zinc-200/50 rounded-xl uppercase text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors">{rdv.type}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* SECTION RADAR */}
      <div className="bg-white p-10 rounded-[50px] shadow-sm border border-zinc-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black uppercase tracking-tighter text-zinc-800 italic">Radar Recrutement</h3>
              <div className="w-2 h-2 bg-[#C7FF00] rounded-full animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-4 h-[1px] bg-zinc-200" /> Base de données temps réel
            </p>
          </div>
          
          <button 
            onClick={onAddClick}
            className="group w-full sm:w-auto bg-black text-[#C7FF00] px-10 py-5 rounded-[22px] text-[10px] font-black uppercase flex items-center justify-center gap-4 hover:scale-105 transition-all duration-300 shadow-2xl active:scale-95"
          >
            <Plus size={16} strokeWidth={4} className="group-hover:rotate-90 transition-transform" />
            Ajouter une Cible📡
          </button>
        </div>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="animate-spin text-zinc-200 mb-4" size={40} />
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[4px]">Scan en cours...</p>
              </div>
            ) : targets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.map((target, index) => (
                  <motion.div 
                    key={target.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-6 bg-zinc-50/50 hover:bg-white rounded-[35px] border border-zinc-100 hover:border-[#C7FF00]/50 hover:shadow-2xl transition-all relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-zinc-50 flex items-center justify-center font-black text-zinc-300 group-hover:text-black group-hover:bg-[#C7FF00] transition-all text-xl">
                        {target.name.charAt(0)}
                      </div>
                      <div className="px-3 py-1 bg-white rounded-full border border-zinc-100 text-[8px] font-black uppercase italic text-zinc-500">
                        {target.sport || "Talent"}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="font-black uppercase text-[13px] block text-zinc-800 tracking-tight">{target.name}</span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter flex items-center gap-2">
                        {target.club || "Agent Libre"} <span className="w-1 h-1 bg-zinc-300 rounded-full" /> {target.position || "Prospect"}
                      </span>
                    </div>

                      <div className="mt-8 flex items-center justify-between">
                       <span className="text-[8px] font-black uppercase text-zinc-400 group-hover:text-black transition-colors">Consulter Rapport</span>
                        <button
                        onClick={() => setSelectedTarget(target)}
                        className="p-2 bg-white rounded-xl border border-zinc-100 group-hover:bg-black group-hover:text-[#C7FF00] transition-all shadow-sm"
                        >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-28 bg-zinc-50/30 border-2 border-dashed border-zinc-100 rounded-[50px] flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <span className="text-4xl animate-pulse">📡</span>
                </div>
                <p className="text-zinc-400 font-black uppercase text-[11px] tracking-[5px] mb-2">
                  Aucun signal détecté sur le radar
                </p>
                <p className="text-[9px] text-zinc-300 font-bold uppercase max-w-[250px] leading-relaxed">
                  Le staff n'a pas encore identifié de nouvelles cibles.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SECTION CANDIDATURES ENRICHIES */}
      <div className="bg-white p-8 rounded-[35px] border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[3px] text-zinc-800">Candidatures Enrichies</h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">Classement par score de dossier</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={applicationStatusFilter}
              onChange={(e) => setApplicationStatusFilter(e.target.value as ApplicationStatusFilter)}
              className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-black outline-none"
            >
              <option value="all">Tous</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="px-3 py-2 rounded-xl bg-black text-[#C7FF00] text-xs font-black">
              {enrichedApplications.length} profil(s)
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-zinc-400 text-sm">Chargement candidatures...</p>
        ) : enrichedApplications.length === 0 ? (
          <p className="text-zinc-400 text-sm">Aucune candidature pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {enrichedApplications.map((candidate) => (
              <div key={candidate.id} className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/60">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-zinc-900 font-black text-sm">{candidate.full_name}</p>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1">{candidate.sport} • {candidate.position} • {candidate.status}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{candidate.email || 'N/A'} • {candidate.phone || 'N/A'}</p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(candidate.profileLinks).map(([key, url]) => (
                        <a
                          key={`${candidate.id}-${key}`}
                          href={String(url)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-black text-[#C7FF00] text-[10px] font-bold uppercase"
                        >
                          {key}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-black text-zinc-900">{candidate.profileScore}%</p>
                    <p className="text-[10px] text-zinc-500 font-bold">Score dossier</p>
                    {candidate.profileScore >= 75 ? (
                      <p className="text-[10px] text-emerald-600 font-black mt-1">TOP PROFIL</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAppointmentModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center"
            onClick={() => {
              if (savingAppointment) return;
              setIsAppointmentModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl border border-zinc-200 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xl font-black text-zinc-900">Ajouter un rendez-vous</h4>
                <button
                  type="button"
                  onClick={() => {
                    if (savingAppointment) return;
                    setIsAppointmentModalOpen(false);
                  }}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-zinc-500 mb-1">Titre</label>
                  <input
                    type="text"
                    value={appointmentForm.title}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Test U17 Stade Tata Raphael"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 [color-scheme:light] outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-500 mb-1">Heure</label>
                    <input
                      type="time"
                      value={appointmentForm.time}
                      onChange={(e) => setAppointmentForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 [color-scheme:light] outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-zinc-500 mb-1">Type</label>
                  <input
                    type="text"
                    value={appointmentForm.type}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, type: e.target.value }))}
                    placeholder="Prospection, Business, Scout..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black"
                  />
                </div>

                {appointmentError ? (
                  <p className="text-xs font-bold text-red-600">{appointmentError}</p>
                ) : null}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (savingAppointment) return;
                    setIsAppointmentModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-black uppercase"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateAppointment}
                  disabled={savingAppointment}
                  className="flex-1 py-3 rounded-xl bg-black text-[#C7FF00] text-xs font-black uppercase disabled:opacity-70"
                >
                  {savingAppointment ? 'Enregistrement...' : 'Enregistrer RDV'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTarget ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center"
            onClick={() => setSelectedTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-3xl border border-zinc-200 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xl font-black text-zinc-900">Rapport Cible</h4>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Nom:</span> <span className="font-semibold text-zinc-900">{selectedTarget.name}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Sport:</span> <span className="font-semibold text-zinc-900">{selectedTarget.sport || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Poste:</span> <span className="font-semibold text-zinc-900">{selectedTarget.position || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Club:</span> <span className="font-semibold text-zinc-900">{selectedTarget.club || 'Agent Libre'}</span></div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="mt-6 w-full py-3 rounded-xl bg-black text-[#C7FF00] text-xs font-black uppercase tracking-widest"
              >
                Fermer Rapport
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}