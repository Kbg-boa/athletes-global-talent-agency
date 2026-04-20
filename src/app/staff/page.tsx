"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppPreferences } from '../../lib/appPreferences';

// --- IMPORTATION DES COMPOSANTS SÉPARÉS ---
import AthleteFormView from '../components/AthleteFormView'; 
import ProfileListView from '../components/ProfileListView';
import RecruitmentView from '../components/RecruitmentView';
import MessagesView from '../components/MessagesView'; // <-- AJOUTÉ : Importation indispensable

// --- TYPES ---
type Tab = 'athlete' | 'list' | 'recrutement' | 'messages' | 'documents' | 'reports' | 'journal' | 'alerts' | 'settings';

export default function StaffDashboard() {
  const { formatTime } = useAppPreferences();
  const [activeTab, setActiveTab] = useState<Tab>('athlete');

  // --- CONFIGURATION DU MENU ---
  const menuItems = [
    { id: 'athlete', label: 'Nouvel Athlète', icon: '📂' },
    { id: 'list', label: 'Liste des Profils', icon: '📋' },
    { id: 'recrutement', label: 'Recrutement', icon: '🎯' },
    { id: 'messages', label: 'Messages', icon: '📥' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'reports', label: 'Rapports & Activités', icon: '📊' },
    { id: 'journal', label: 'Journal de travail', icon: '📅' },
    { id: 'alerts', label: 'Alertes', icon: '🔔' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-zinc-800 flex overflow-hidden font-sans">
      
      {/* SIDEBAR GAUCHE (FIXE) */}
      <aside className="w-72 bg-[#1A1C1E] text-zinc-400 flex flex-col border-r border-zinc-800 shadow-2xl">
        <div className="p-8 border-b border-zinc-800/50">
          <h1 className="text-2xl font-black text-white tracking-tighter">AGTA <span className="text-[#C7FF00]">STAFF</span></h1>
          <p className="text-[10px] mt-1 text-zinc-500 font-bold uppercase tracking-[2px]">Management Portal</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === item.id 
                ? 'bg-[#C7FF00] text-black shadow-[0_10px_20px_rgba(199,255,0,0.2)] scale-[1.02]' 
                : 'hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">S</div>
            <div>
              <p className="text-[11px] font-bold text-white uppercase">Secrétariat AGTA</p>
              <p className="text-[9px] text-zinc-500">Session Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ZONE DE CONTENU (DYNAMIQUE) */}
      <main className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-xl relative">
        
        {/* TOP BAR */}
        <header className="h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <span className="text-xl">{menuItems.find(i => i.id === activeTab)?.icon}</span>
             <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800">
               {menuItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col text-right border-r pr-6 border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Kinshasa Time</span>
                <span className="text-xs font-black">{formatTime(new Date(), { second: '2-digit' })}</span>
             </div>
             <button className="bg-zinc-100 p-3 rounded-xl relative hover:bg-zinc-200 transition-colors">
                🔔 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        {/* AFFICHAGE DES PAGES SÉPARÉES */}
        <div className="p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Vues Actives */}
              {activeTab === 'athlete' && <AthleteFormView />}
              {activeTab === 'list' && <ProfileListView />}
              {activeTab === 'recrutement' && <RecruitmentView onAddClick={() => setActiveTab('athlete')} />}
              {activeTab === 'messages' && <MessagesView />} {/* <-- AJOUTÉ : Appel du module */}
              {activeTab === 'reports' && <ReportsView />}

              {/* LOGIQUE D'EXCLUSION CORRIGÉE (Ajout de 'messages') */}
              {!['athlete', 'list', 'recrutement', 'reports', 'messages'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-[500px] border-2 border-dashed border-zinc-200 rounded-[40px] bg-zinc-50/50">
                  <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">
                    {menuItems.find(i => i.id === activeTab)?.icon}
                  </div>
                  <h3 className="font-black text-zinc-800 uppercase tracking-widest">Accès Restreint</h3>
                  <p className="text-zinc-400 font-bold text-[10px] mt-2 uppercase tracking-[3px]">Module {activeTab} en cours d'intégration</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- MODULE RAPPORTS ---
function ReportsView() {
    return (
      <div className="bg-[#C7FF00] p-12 rounded-[50px] shadow-2xl shadow-[#C7FF00]/20 flex justify-between items-center">
        <div>
          <h3 className="text-black font-black text-3xl uppercase tracking-tighter">Rapport d'activité</h3>
          <p className="text-black/60 text-sm mt-2 font-bold uppercase tracking-widest">Données synchronisées avec le Bureau DG</p>
        </div>
        <div className="text-6xl font-black text-black/10">AGTA</div>
      </div>
    );
}