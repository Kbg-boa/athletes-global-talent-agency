"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseStaff as supabase } from '../../lib/supabase';
import { useAppPreferences } from '../../lib/appPreferences';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  TrendingUp,
  MapPin,
  Activity,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';

type Athlete = {
  id: string;
  name: string;
  sport: string;
  position: string;
  club?: string | null;
  value?: string | null;
  status?: string | null;
  registration_type?: string | null;
  location?: string | null;
  created_at?: string | null;
  profilePhotoUrl?: string | null;
};

type RecruitmentRow = {
  full_name?: string | null;
  sport?: string | null;
  position?: string | null;
  experience?: string | null;
  created_at?: string | null;
};

type SortMode = 'recent' | 'name-asc' | 'value-desc' | 'value-asc';

const parseMoney = (raw: unknown): number => {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
};

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const athleteKey = (name?: string | null, sport?: string | null, position?: string | null) =>
  `${normalize(name)}|${normalize(sport)}|${normalize(position)}`;

const parseProfilePhotoFromExperience = (experience?: string | null) => {
  const text = String(experience || '');
  if (!text) return null;

  const linksMatch = text.match(/Liens\s*&\s*assets:\s*(.*)/i);
  if (!linksMatch) return null;

  const chunks = linksMatch[1].split(' | ');
  for (const chunk of chunks) {
    const [rawKey, ...rest] = chunk.split(': ');
    const key = String(rawKey || '').trim().toLowerCase();
    const value = rest.join(': ').trim();
    if (!value) continue;

    if (key === 'profile_photo_url') return value;
    if (key === 'photo_url') return value;
    if (key === 'photo_urls') {
      const first = value.split(',').map((v) => v.trim()).filter(Boolean)[0];
      if (first) return first;
    }
  }

  return null;
};

export default function ProfileListView() {
  const { formatDateTime } = useAppPreferences();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [minValueFilter, setMinValueFilter] = useState('');
  const [maxValueFilter, setMaxValueFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    setError('');

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

      const recruitment = (recruitmentRes.data || []) as RecruitmentRow[];
      const photoByAthleteKey = new Map<string, string>();

      recruitment.forEach((row) => {
        const key = athleteKey(row.full_name, row.sport, row.position);
        if (!key || photoByAthleteKey.has(key)) return;
        const photo = parseProfilePhotoFromExperience(row.experience);
        if (photo) photoByAthleteKey.set(key, photo);
      });

      const merged = ((athletesRes.data || []) as Athlete[]).map((athlete) => {
        const key = athleteKey(athlete.name, athlete.sport, athlete.position);
        return {
          ...athlete,
          profilePhotoUrl: photoByAthleteKey.get(key) || null,
        };
      });

      setAthletes(merged);
    } catch (err: any) {
      console.error('Erreur chargement profils:', err);
      setError('Impossible de charger les profils pour le moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAthletes();

    const channel = supabase
      .channel(`profiles-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes' }, () => {
        void fetchAthletes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAthletes]);

  const uniqueSports = useMemo(() => {
    return Array.from(new Set(athletes.map((a) => (a.sport || '').trim()).filter(Boolean))).sort();
  }, [athletes]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(athletes.map((a) => (a.status || '').trim()).filter(Boolean))).sort();
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    const minValue = minValueFilter ? Number(minValueFilter) : null;
    const maxValue = maxValueFilter ? Number(maxValueFilter) : null;

    const list = athletes.filter((athlete) => {
      const haystack = [athlete.name, athlete.sport, athlete.position, athlete.club, athlete.status, athlete.value]
        .map((part) => normalize(part))
        .join(' ');

      const matchesSearch = !searchTerm || haystack.includes(normalize(searchTerm));
      const matchesSport = !sportFilter || normalize(athlete.sport) === normalize(sportFilter);
      const matchesStatus = !statusFilter || normalize(athlete.status) === normalize(statusFilter);
      const matchesPosition = !positionFilter || normalize(athlete.position).includes(normalize(positionFilter));
      const matchesClub = !clubFilter || normalize(athlete.club).includes(normalize(clubFilter));

      const numericValue = parseMoney(athlete.value);
      const matchesMinValue = minValue == null || numericValue >= minValue;
      const matchesMaxValue = maxValue == null || numericValue <= maxValue;

      return (
        matchesSearch &&
        matchesSport &&
        matchesStatus &&
        matchesPosition &&
        matchesClub &&
        matchesMinValue &&
        matchesMaxValue
      );
    });

    if (sortMode === 'name-asc') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    }

    if (sortMode === 'value-desc') {
      return list.sort((a, b) => parseMoney(b.value) - parseMoney(a.value));
    }

    if (sortMode === 'value-asc') {
      return list.sort((a, b) => parseMoney(a.value) - parseMoney(b.value));
    }

    return list.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [
    athletes,
    searchTerm,
    sportFilter,
    statusFilter,
    positionFilter,
    clubFilter,
    minValueFilter,
    maxValueFilter,
    sortMode,
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setSportFilter('');
    setStatusFilter('');
    setPositionFilter('');
    setClubFilter('');
    setMinValueFilter('');
    setMaxValueFilter('');
    setSortMode('recent');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[35px] border border-zinc-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un talent (Nom, Sport...)"
            className="w-full bg-zinc-50 border-none p-4 pl-14 rounded-2xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider transition-all text-zinc-900 placeholder-zinc-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <button
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="bg-black text-white p-4 px-6 rounded-2xl flex items-center gap-3 hover:bg-zinc-800 transition-all active:scale-95"
          >
            <Filter size={18} className="text-[#C7FF00]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtres Avances</span>
          </button>

          <button
            onClick={() => void fetchAthletes()}
            className="bg-zinc-100 text-zinc-900 p-4 px-5 rounded-2xl flex items-center gap-2 hover:bg-zinc-200 transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Actualiser</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-[35px] border border-zinc-100 shadow-sm overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Sport</label>
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider text-zinc-900"
                >
                  <option value="">Tous les sports</option>
                  {uniqueSports.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider text-zinc-900"
                >
                  <option value="">Tous les statuts</option>
                  {uniqueStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Tri</label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider text-zinc-900"
                >
                  <option value="recent">Plus recents</option>
                  <option value="name-asc">Nom A-Z</option>
                  <option value="value-desc">Valeur decroissante</option>
                  <option value="value-asc">Valeur croissante</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Position</label>
                <input
                  type="text"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  placeholder="Ex: Forward, Guard..."
                  className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider text-zinc-900 placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Club</label>
                <input
                  type="text"
                  value={clubFilter}
                  onChange={(e) => setClubFilter(e.target.value)}
                  placeholder="Ex: AGTA Academy"
                  className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs uppercase tracking-wider text-zinc-900 placeholder-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Valeur min</label>
                  <input
                    type="number"
                    min="0"
                    value={minValueFilter}
                    onChange={(e) => setMinValueFilter(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs text-zinc-900 placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Valeur max</label>
                  <input
                    type="number"
                    min="0"
                    value={maxValueFilter}
                    onChange={(e) => setMaxValueFilter(e.target.value)}
                    placeholder="100000"
                    className="w-full bg-zinc-50 border-none p-3 rounded-xl outline-none focus:ring-2 ring-[#C7FF00] font-bold text-xs text-zinc-900 placeholder-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition"
              >
                Reinitialiser les filtres
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl px-4 py-3">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => <div key={n} className="h-64 bg-zinc-100 animate-pulse rounded-[40px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAthletes.map((athlete) => (
              <motion.div
                key={athlete.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white p-8 rounded-[45px] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all relative overflow-hidden"
              >
                <div className="absolute top-6 right-6">
                  <span className="text-[8px] font-black bg-[#C7FF00] text-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    {athlete.status || 'A VALIDER'}
                  </span>
                </div>

                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    {athlete.profilePhotoUrl ? (
                      <img
                        src={athlete.profilePhotoUrl}
                        alt={athlete.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-xl text-[#C7FF00] font-black italic">
                        {String(athlete.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-zinc-900 uppercase tracking-tighter text-lg leading-tight">{athlete.name}</h4>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{athlete.sport}</p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Activity size={14} />
                        <span className="text-[10px] font-bold uppercase">Poste</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-tighter">{athlete.position || 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-bold uppercase">Valeur</span>
                      </div>
                      <span className="text-[10px] font-black text-black">{athlete.value ? `${athlete.value} $` : 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin size={14} />
                      <span className="text-[10px] font-bold uppercase italic">{athlete.club || 'Sans Club'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAthlete(athlete)}
                    className="mt-8 w-full py-4 bg-zinc-50 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:bg-black group-hover:text-[#C7FF00] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Eye size={14} />
                    Consulter le dossier complet
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredAthletes.length === 0 && (
        <div className="text-center py-20 bg-zinc-50 rounded-[45px] border-2 border-dashed border-zinc-200">
          <p className="font-black uppercase text-zinc-400 tracking-[5px] text-xs">Aucun profil trouve</p>
        </div>
      )}

      <AnimatePresence>
        {selectedAthlete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 p-4 flex items-center justify-center"
            onClick={() => setSelectedAthlete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  {selectedAthlete.profilePhotoUrl ? (
                    <img
                      src={selectedAthlete.profilePhotoUrl}
                      alt={selectedAthlete.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-zinc-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-[#C7FF00] font-black text-2xl flex items-center justify-center">
                      {String(selectedAthlete.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                  <h3 className="text-2xl font-black text-zinc-900">{selectedAthlete.name}</h3>
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-wide">{selectedAthlete.sport} • {selectedAthlete.position}</p>
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAthlete(null)}
                  className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2"><span className="font-bold text-zinc-500">Photo profil:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.profilePhotoUrl ? 'Disponible' : 'Non fournie'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Statut:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.status || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Valeur:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.value || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Club:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.club || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3"><span className="font-bold text-zinc-500">Localisation:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.location || 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2"><span className="font-bold text-zinc-500">Inscrit le:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.created_at ? formatDateTime(selectedAthlete.created_at) : 'N/A'}</span></div>
                <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-2"><span className="font-bold text-zinc-500">ID:</span> <span className="font-semibold text-zinc-900">{selectedAthlete.id}</span></div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
