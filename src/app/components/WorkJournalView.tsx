"use client";

import { useState, useEffect } from 'react';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { useAppPreferences } from '../../lib/appPreferences';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Edit3, 
  Filter, 
  CheckCircle2, 
  Zap, 
  Loader2, 
  ShieldAlert, 
  Users 
} from 'lucide-react';

export default function WorkJournalView() {
  const { formatTime } = useAppPreferences();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'admin' | 'terrain' | 'bureau'>('all');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteAction, setNewNoteAction] = useState('');
  const [newNoteTarget, setNewNoteTarget] = useState('');
  const [newNoteType, setNewNoteType] = useState<'Admin' | 'Terrain' | 'bureau_report'>('Terrain');
  const [savingNote, setSavingNote] = useState(false);

  // 1. CHARGEMENT DES DONNÉES DEPUIS LA TABLE 'work_logs'
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('work_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setLogs(data);
        } else {
          // Fallback avec tes vraies informations si la base est vide
          setLogs([
            { id: 1, staff_name: "Secrétariat", action: "Mise à jour dossier médical", target_athlete: "Exaucé Ikamba", created_at: new Date().toISOString(), type: "Admin" },
            { id: 2, staff_name: "Scout Nord", action: "Nouveau rapport de détection", target_athlete: "Tournoi U19 Kin", created_at: new Date().toISOString(), type: "Terrain" }
          ]);
        }
      } catch (err) {
        console.error("Erreur AGTA Logs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
    
    // 2. REALTIME : MISE À JOUR INSTANTANÉE QUAND LE STAFF ÉCRIT
    const channel = supabase
      .channel('journal_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_logs' }, (payload: any) => {
        setLogs((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const cycleFilter = () => {
    setActiveFilter((prev) => {
      if (prev === 'all') return 'admin';
      if (prev === 'admin') return 'terrain';
      if (prev === 'terrain') return 'bureau';
      return 'all';
    });
  };

  const filteredLogs = logs.filter((log) => {
    const normalized = String(log?.type || '').toLowerCase();
    if (activeFilter === 'all') return true;
    if (activeFilter === 'admin') return normalized === 'admin';
    if (activeFilter === 'terrain') return normalized === 'terrain';
    if (activeFilter === 'bureau') return normalized === 'bureau_report';
    return true;
  });

  const recentLogs = logs.filter((log) => {
    const createdAt = new Date(log?.created_at || 0).getTime();
    return Number.isFinite(createdAt) && (Date.now() - createdAt) <= 30 * 24 * 3600 * 1000;
  });

  const scoutingCount = recentLogs.filter((log) => {
    const txt = `${String(log?.type || '')} ${String(log?.action || '')}`.toLowerCase();
    return txt.includes('terrain') || txt.includes('scout') || txt.includes('recrut');
  }).length;

  const legalCount = recentLogs.filter((log) => {
    const txt = String(log?.action || '').toLowerCase();
    return txt.includes('jurid') || txt.includes('contrat') || txt.includes('document') || txt.includes('visa') || txt.includes('passport');
  }).length;

  const scoutingProgress = Math.min(100, scoutingCount * 10);
  const legalProgress = Math.min(100, legalCount * 10);

  const saveNewNote = async () => {
    const action = newNoteAction.trim();
    if (!action) return;

    setSavingNote(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const staffName = authData?.user?.email || 'staff@agta.local';

      const payload = {
        staff_name: staffName,
        action,
        target_athlete: newNoteTarget.trim() || null,
        type: newNoteType,
      };

      const { data, error } = await supabase
        .from('work_logs')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setLogs((prev) => [data, ...prev]);
      }
      setNewNoteAction('');
      setNewNoteTarget('');
      setNewNoteType('Terrain');
      setShowNewNote(false);
    } catch (err) {
      console.error('Erreur creation note journal:', err);
      alert('Impossible d\'enregistrer la note. Verifiez les permissions table work_logs.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* HEADER : TITRE ET ACTIONS DG */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-6 bg-[#C7FF00] rounded-full"></div>
            <h3 className="text-3xl font-black uppercase tracking-tighter text-zinc-900 italic">Journal de Bord</h3>
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[4px] ml-5">Traçabilité des opérations AGTA STAFF</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={cycleFilter}
            className="flex-1 md:flex-none bg-white border border-zinc-200 px-6 py-4 rounded-[20px] hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            <Filter size={16} className="text-zinc-400" />
            Filtre: {activeFilter === 'all' ? 'Tout' : activeFilter === 'admin' ? 'Admin' : activeFilter === 'terrain' ? 'Terrain' : 'Bureau'}
          </button>
          <button
            onClick={() => setShowNewNote((prev) => !prev)}
            className="flex-1 md:flex-none bg-black text-[#C7FF00] px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[2px] flex items-center justify-center gap-3 hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)] active:scale-95 transition-all"
          >
            <Edit3 size={16} strokeWidth={3} /> Nouvelle Note
          </button>
        </div>
      </div>

      {showNewNote && (
        <div className="bg-white border border-zinc-200 rounded-[25px] p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={newNoteAction}
              onChange={(e) => setNewNoteAction(e.target.value)}
              placeholder="Action effectuée"
              className="md:col-span-2 px-4 py-3 rounded-xl border border-zinc-200 text-sm font-semibold outline-none focus:border-black"
            />
            <input
              value={newNoteTarget}
              onChange={(e) => setNewNoteTarget(e.target.value)}
              placeholder="Cible (athlète/dossier)"
              className="px-4 py-3 rounded-xl border border-zinc-200 text-sm font-semibold outline-none focus:border-black"
            />
            <select
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value as 'Admin' | 'Terrain' | 'bureau_report')}
              className="px-4 py-3 rounded-xl border border-zinc-200 text-sm font-semibold outline-none focus:border-black"
            >
              <option value="Terrain">Terrain</option>
              <option value="Admin">Admin</option>
              <option value="bureau_report">Rapport Bureau</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowNewNote(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-black uppercase"
            >
              Annuler
            </button>
            <button
              onClick={saveNewNote}
              disabled={savingNote || !newNoteAction.trim()}
              className="px-4 py-2 rounded-xl bg-black text-[#C7FF00] text-xs font-black uppercase disabled:opacity-50"
            >
              {savingNote ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLONNE GAUCHE : LE FIL D'ACTUALITÉ RÉEL */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-[#C7FF00]" size={40} />
              <p className="text-[10px] font-black uppercase text-zinc-300 tracking-[3px]">Synchronisation flux DG...</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredLogs.map((log, index) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 10 }}
                  className="bg-white p-7 rounded-[35px] border border-zinc-100 shadow-sm hover:shadow-xl hover:border-[#C7FF00]/40 transition-all flex items-start gap-6 group relative overflow-hidden"
                >
                  {/* Badge de Type à gauche */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${log.type === 'Admin' ? 'bg-zinc-900 group-hover:bg-[#C7FF00]' : 'bg-zinc-50 group-hover:bg-black'}`}>
                    {log.type === 'Admin' ? (
                      <ShieldAlert className="text-[#C7FF00] group-hover:text-black" size={24} />
                    ) : (
                      <Users className="text-zinc-400 group-hover:text-[#C7FF00]" size={24} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${log.type === 'Admin' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          {log.type || 'OPÉRATION'}
                        </span>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                           <Clock size={10} />
                           <span className="text-[10px] font-bold">
                             {formatTime(log.created_at)}
                           </span>
                        </div>
                      </div>
                      <CheckCircle2 className="text-zinc-100 group-hover:text-[#C7FF00] transition-colors" size={20} />
                    </div>

                    <h4 className="font-black text-zinc-900 uppercase text-sm tracking-tight mb-2">{log.action}</h4>
                    
                    <div className="flex flex-wrap gap-4 items-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                        Cible : <span className="text-black font-black underline decoration-[#C7FF00] decoration-2 underline-offset-4">{log.target_athlete || log.target}</span>
                      </p>
                      <div className="w-1 h-1 bg-zinc-200 rounded-full"></div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                        Agent : <span className="text-zinc-900 font-black">{log.staff_name || log.user}</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* COLONNE DROITE : PERFORMANCE & CITATION */}
        <div className="space-y-6">
          
          {/* CARTE PERFORMANCE */}
          <div className="bg-[#111214] p-10 rounded-[50px] text-white border border-zinc-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700">
                 <Zap size={150} />
              </div>
              
              <div className="flex items-center gap-4 mb-10">
                 <div className="p-3 bg-[#C7FF00] rounded-xl">
                   <Zap className="text-black" size={20} fill="black" />
                 </div>
                 <h4 className="text-[11px] font-black uppercase tracking-[3px]">Performance Agence</h4>
              </div>

              <div className="space-y-10">
                {/* Objectif 1 */}
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase mb-4 tracking-[2px]">
                     <span className="text-zinc-400">Objectifs Scouting</span>
                    <span className="text-[#C7FF00]">{scoutingProgress}%</span>
                   </div>
                   <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden p-[2px]">
                      <motion.div 
                        initial={{ width: 0 }}
                      animate={{ width: `${scoutingProgress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-[#C7FF00] rounded-full shadow-[0_0_20px_rgba(199,255,0,0.4)]"
                      />
                   </div>
                </div>

                {/* Objectif 2 */}
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase mb-4 tracking-[2px]">
                     <span className="text-zinc-400">Dossiers Juridiques</span>
                     <span className="text-[#C7FF00]">{legalProgress}%</span>
                   </div>
                   <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden p-[2px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${legalProgress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      />
                   </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-zinc-800 flex items-center justify-between">
                 <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Status: Excellence</span>
                 <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-[#C7FF00] rounded-full animate-pulse"></div>)}
                 </div>
              </div>
          </div>

          {/* CITATION DG */}
          <div className="bg-zinc-50 p-12 rounded-[50px] border border-zinc-100 text-center relative">
             <BookOpen className="mx-auto text-zinc-200 mb-8" size={32} />
             <p className="text-sm font-black text-zinc-900 uppercase leading-relaxed italic tracking-tight">
               "L'excellence n'est pas un acte,<br/> 
               <span className="text-[#C7FF00] bg-black px-2 py-1 mt-1 inline-block not-italic">c'est une habitude."</span>
             </p>
             <div className="mt-8 flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-[4px] text-zinc-300">Aristote • AGTA Philosophy</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}