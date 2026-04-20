"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabaseDG as supabase } from "../../lib/supabase";
import { useAppPreferences } from '../../lib/appPreferences';
import { Activity, TrendingUp } from "lucide-react";

interface RadarItem {
  id: string;
  email: string;
  activity: string;
  timestamp: string;
  createdAt: string;
  intensity: number; // 1-10
}

export default function RecruitmentRadar() {
  const { formatTime } = useAppPreferences();
  const [activities, setActivities] = useState<RadarItem[]>([]);
  const maxIntensity = 10;

  const toReadableActivity = (raw: unknown) => {
    const text = String(raw || "Update").trim();
    if (!text) return "Update";
    if (text.toLowerCase().startsWith("candidature ")) {
      return text;
    }
    return text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  useEffect(() => {
    const toIntensity = (kind: string, status: string) => {
      const k = kind.toLowerCase();
      const s = status.toLowerCase();
      if (k.includes('recruitment') && s === 'pending') return 10;
      if (k.includes('recruitment') && s === 'accepted') return 8;
      if (k.includes('recruitment') && s === 'rejected') return 6;
      if (k.includes('activity')) return 5;
      return 4;
    };

    const mapRecruitment = (row: any): RadarItem => ({
      id: `recruitment-${row.id ?? Math.random().toString()}`,
      email: String(row.full_name || row.email || 'Candidat'),
      activity: `Candidature ${String(row.status || 'pending')}`,
      timestamp: formatTime(new Date(row.created_at || new Date()), { second: '2-digit' }),
      createdAt: String(row.created_at || new Date().toISOString()),
      intensity: toIntensity('recruitment', String(row.status || 'pending')),
    });

    const mapActivity = (row: any): RadarItem => ({
      id: `activity-${row.id ?? Math.random().toString()}`,
      email: String(row.user_email || 'Staff AGTA'),
      activity: toReadableActivity(row.activity_type || row.description || 'Mise à jour AGTA'),
      timestamp: formatTime(new Date(row.created_at || new Date()), { second: '2-digit' }),
      createdAt: String(row.created_at || new Date().toISOString()),
      intensity: toIntensity('activity', ''),
    });

    const mergeAndTrim = (incoming: RadarItem[]) => {
      setActivities((prev) => {
        const dedup = new Map<string, RadarItem>();
        [...incoming, ...prev].forEach((item) => {
          if (!dedup.has(item.id)) dedup.set(item.id, item);
        });
        return Array.from(dedup.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 8);
      });
    };

    const loadInitialData = async () => {
      const [{ data: recruitmentData }, { data: activityData }] = await Promise.all([
        supabase.from('recruitment').select('id, full_name, email, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('agta_activity').select('id, user_email, activity_type, description, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const initialItems = [
        ...(recruitmentData || []).map(mapRecruitment),
        ...(activityData || []).map(mapActivity),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);

      setActivities(initialItems);
    };

    void loadInitialData();

    const recruitmentChannel = supabase
      .channel(`recruitment-radar-recruitment-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruitment' }, (payload: any) => {
        mergeAndTrim([mapRecruitment(payload.new || payload.old || {})]);
      })
      .subscribe();

    const activityChannel = supabase
      .channel(`recruitment-radar-activity-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agta_activity' }, (payload: any) => {
        mergeAndTrim([mapActivity(payload.new || {})]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(recruitmentChannel);
      void supabase.removeChannel(activityChannel);
    };
  }, [formatTime]);

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-[#C7FF00]/20 rounded-xl p-6 shadow-[0_0_30px_rgba(199,255,0,0.1)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="p-2 bg-[#C7FF00]/10 border border-[#C7FF00]/50 rounded-lg"
        >
          <Activity className="w-5 h-5 text-[#C7FF00]" />
        </motion.div>
        <div>
          <h3 className="text-white font-bold text-lg">Radar de Recrutement</h3>
          <p className="text-zinc-400 text-xs">Activité en temps réel</p>
        </div>
      </div>

      {/* Radar Items */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">
              En attente d'activité de recrutement...
            </p>
          </motion.div>
        ) : (
          activities.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="grid grid-cols-[56px_minmax(0,1fr)_74px] items-center gap-3 p-3 bg-[#C7FF00]/5 border border-[#C7FF00]/20 rounded-lg hover:border-[#C7FF00]/50 transition overflow-hidden"
            >
              {/* Intensity Bar */}
              <div className="w-14">
                <div className="h-2 w-12 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.intensity / maxIntensity) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-[#C7FF00] rounded-full"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate" title={item.email}>
                  {item.email}
                </p>
                <p className="text-zinc-400 text-xs truncate" title={item.activity}>{item.activity}</p>
              </div>

              {/* Time */}
              <p className="text-[#C7FF00] text-xs font-mono text-right whitespace-nowrap">{item.timestamp}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span>Total: {activities.length}</span>
        <span className="text-[#C7FF00]">LIVE</span>
      </div>
    </div>
  );
}
