import { getActiveSupabaseClient } from "./supabase";

// Interface pour les activités du staff
export interface ActivityLog {
  id?: string;
  user_email: string;
  activity_type: string; // "message", "report", "update", etc.
  description: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

// Envoyer une activité (utilisée par le formulaire staff)
export async function logActivity(activity: ActivityLog) {
  try {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase
      .from("agta_activity")
      .insert([
        {
          user_email: activity.user_email,
          activity_type: activity.activity_type,
          description: activity.description,
          metadata: activity.metadata || {},
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Erreur lors de l'enregistrement de l'activité:", error);
    return { success: false, error: error.message };
  }
}

// Récupérer les activités en temps réel
export async function getRecentActivities(limit: number = 10) {
  try {
    const supabase = getActiveSupabaseClient();
    const { data, error } = await supabase
      .from("agta_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Erreur lors de la récupération des activités:", error);
    return { success: false, error: error.message };
  }
}

// Souscrire aux changements en temps réel
export function subscribeToActivities(
  callback: (payload: any) => void
) {
  const supabase = getActiveSupabaseClient();
  return supabase
    .channel("agta_activity_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "agta_activity" },
      callback
    )
    .subscribe();
}

// Obtenir les statistiques du jour
export async function getTodayStats() {
  try {
    const supabase = getActiveSupabaseClient();
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("agta_activity")
      .select("*")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);

    if (error) throw error;

    return {
      success: true,
      total: data?.length || 0,
      byType: groupByType(data || []),
    };
  } catch (error: any) {
    console.error("Erreur lors de la récupération des stats:", error);
    return { success: false, error: error.message };
  }
}

function groupByType(activities: any[]) {
  return activities.reduce((acc, activity) => {
    acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
    return acc;
  }, {});
}
