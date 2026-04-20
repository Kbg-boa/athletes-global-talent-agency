import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plane, Building2, Users2, MapPin, Briefcase, PlayCircle, Heart, MessageCircle, Send } from "lucide-react";
import { supabaseDG as supabase } from "../../lib/supabase";

type Opportunity = {
  id: string | number;
  title: string;
  sport?: string | null;
  position?: string | null;
  club?: string | null;
  location?: string | null;
  salary_range?: string | null;
  description?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type OpportunityInteraction = {
  liked: boolean;
  likes: number;
  comments: Array<{ id: string; author: string; content: string; created_at?: string | null }>;
};

const VISITOR_ID_STORAGE_KEY = "agta-opportunity-visitor-id";

const getOrCreateVisitorId = () => {
  if (typeof window === "undefined") return `guest-${Date.now()}`;
  const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (existing) return existing;
  const generated = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(VISITOR_ID_STORAGE_KEY, generated);
  return generated;
};

export default function Opportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [interactions, setInteractions] = useState<Record<string, OpportunityInteraction>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [visitorId] = useState(getOrCreateVisitorId);

  const isPublishedStatus = (value: unknown) => {
    const normalized = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    return normalized === "active" || normalized === "actif" || normalized === "published" || normalized === "publie";
  };

  const fetchPublishedOpportunities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError("");

    // Use fallback columns if schema is incomplete (legacy projects may miss some columns)
    const fallbackColumns = "id,title,sport,club,location,salary_range,description,image_url,video_url,status,created_at";
    const { data, error } = await supabase
      .from("opportunities")
      .select(fallbackColumns)
      .order("created_at", { ascending: false })
      .limit(24);

    if (!error) {
      const published = ((data || []) as Opportunity[])
        .filter((row) => isPublishedStatus(row.status))
        .slice(0, 6);
      setItems(published);
    } else {
      console.warn("Opportunities public fetch failed:", error.message);
      setLoadError(error.message || "Unable to load opportunities");
      setItems([]);
    }

    if (!silent) {
      setLoading(false);
    } else {
      setLoading((prev) => (prev ? false : prev));
    }
  }, []);

  useEffect(() => {
    void fetchPublishedOpportunities();
  }, [fetchPublishedOpportunities]);

  useEffect(() => {
    const channel = supabase
      .channel(`opportunities-public-live-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => {
        void fetchPublishedOpportunities(true);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPublishedOpportunities]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchPublishedOpportunities(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [fetchPublishedOpportunities]);

  const hasPublished = useMemo(() => items.length > 0, [items]);

  const refreshInteractions = useCallback(async () => {
    if (items.length === 0) {
      setInteractions({});
      return;
    }

    const ids = items.map((item) => item.id);

    const [likesRes, commentsRes] = await Promise.all([
      supabase
        .from("opportunity_likes")
        .select("opportunity_id, visitor_id")
        .in("opportunity_id", ids as any[]),
      supabase
        .from("opportunity_comments")
        .select("id, opportunity_id, author_label, content, created_at")
        .in("opportunity_id", ids as any[])
        .order("created_at", { ascending: true }),
    ]);

    const next: Record<string, OpportunityInteraction> = {};
    items.forEach((item) => {
      next[String(item.id)] = { liked: false, likes: 0, comments: [] };
    });

    if (!likesRes.error && likesRes.data) {
      likesRes.data.forEach((row: any) => {
        const key = String(row.opportunity_id);
        if (!next[key]) next[key] = { liked: false, likes: 0, comments: [] };
        next[key].likes += 1;
        if (String(row.visitor_id || "") === visitorId) next[key].liked = true;
      });
    }

    if (!commentsRes.error && commentsRes.data) {
      commentsRes.data.forEach((row: any) => {
        const key = String(row.opportunity_id);
        if (!next[key]) next[key] = { liked: false, likes: 0, comments: [] };
        next[key].comments.push({
          id: String(row.id),
          author: String(row.author_label || "fan"),
          content: String(row.content || ""),
          created_at: row.created_at,
        });
      });
    }

    setInteractions(next);
  }, [items, visitorId]);

  useEffect(() => {
    void refreshInteractions();
  }, [refreshInteractions]);

  useEffect(() => {
    const channel = supabase
      .channel(`opportunities-social-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_likes" }, () => {
        void refreshInteractions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_comments" }, () => {
        void refreshInteractions();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshInteractions]);

  const formatPublishedDate = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const toggleLike = async (id: string | number) => {
    const key = String(id);
    const current = interactions[key] || { liked: false, likes: 0, comments: [] };

    if (current.liked) {
      const { error } = await supabase
        .from("opportunity_likes")
        .delete()
        .eq("opportunity_id", id as any)
        .eq("visitor_id", visitorId);
      if (error) {
        console.warn("Unlike failed:", error.message);
      }
    } else {
      const { error } = await supabase
        .from("opportunity_likes")
        .insert([{ opportunity_id: id, visitor_id: visitorId }]);
      if (error && error.code !== "23505") {
        console.warn("Like failed:", error.message);
      }
    }

    await refreshInteractions();
  };

  const submitComment = async (id: string | number) => {
    const key = String(id);
    const text = String(commentDrafts[key] || "").trim();
    if (!text) return;

    const { error } = await supabase
      .from("opportunity_comments")
      .insert([{ opportunity_id: id, visitor_id: visitorId, author_label: "fan", content: text }]);

    if (error) {
      console.warn("Comment failed:", error.message);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [key]: "" }));
    await refreshInteractions();
  };

  return (
    <section id="opportunities" className="bg-[#1C1C1C] py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Global <span className="text-[#C7FF00]">Opportunities</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We open doors to international leagues, professional clubs, and world-class academies
          </p>
        </motion.div>

        {hasPublished ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {items.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="bg-black border border-zinc-800 rounded-xl overflow-hidden hover:border-[#C7FF00]/40 transition"
              >
                {item.image_url ? (
                  <img
                    src={String(item.image_url)}
                    alt={item.title}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-44 bg-zinc-900 flex items-center justify-center">
                    <Briefcase size={30} className="text-[#C7FF00]/70" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30 text-[11px] font-semibold">
                      Published by AGTA
                    </span>
                    <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px]">
                      Published on {formatPublishedDate(item.created_at)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{item.title}</h3>
                  <p className="text-[#C7FF00] text-sm font-semibold">{item.sport || "Sport"} • {item.position || "Position"}</p>

                  <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                    {item.club && <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Club: {item.club}</span>}
                    {item.location && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 inline-flex items-center gap-1">
                        <MapPin size={11} /> {item.location}
                      </span>
                    )}
                    {item.salary_range && <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200">Salaire: {item.salary_range}</span>}
                    {!item.club && !item.location && !item.salary_range && (
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-500 text-[10px]">Détails complets en consultation</span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-gray-300 text-sm mt-3 line-clamp-3">{item.description}</p>
                  )}

                  {item.video_url && (
                    <div className="mt-3">
                      <video src={String(item.video_url)} controls preload="metadata" className="w-full rounded-lg bg-black" />
                    </div>
                  )}

                  {(item.image_url || item.video_url) && (
                    <div className="flex gap-2 mt-3 text-xs">
                      {item.image_url && (
                        <a href={String(item.image_url)} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200">
                          Open image
                        </a>
                      )}
                      {item.video_url && (
                        <a href={String(item.video_url)} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                          <PlayCircle size={12} /> Open video
                        </a>
                      )}
                    </div>
                  )}

                  {(() => {
                    const key = String(item.id);
                    const social = interactions[key] || { liked: false, likes: 0, comments: [] };
                    return (
                      <div className="mt-4 border-t border-zinc-800 pt-3">
                        <div className="flex items-center gap-4 text-sm">
                          <button
                            onClick={() => toggleLike(item.id)}
                            className={`inline-flex items-center gap-1 transition ${social.liked ? "text-pink-400" : "text-zinc-300 hover:text-pink-300"}`}
                          >
                            <Heart size={15} fill={social.liked ? "currentColor" : "none"} />
                            {social.likes}
                          </button>
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <MessageCircle size={15} />
                            {social.comments.length}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <input
                            value={commentDrafts[key] || ""}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                submitComment(item.id);
                              }
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-[#C7FF00]/50"
                            maxLength={180}
                          />
                          <button
                            onClick={() => submitComment(item.id)}
                            className="px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-[#C7FF00] hover:border-[#C7FF00]/40 transition"
                            title="Post comment"
                          >
                            <Send size={14} />
                          </button>
                        </div>

                        {social.comments.length > 0 && (
                          <div className="mt-3 space-y-1 max-h-24 overflow-auto pr-1">
                            {social.comments.slice(-3).map((comment, idx) => (
                              <p key={`${key}-comment-${comment.id}-${idx}`} className="text-[11px] text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                                <span className="text-zinc-500 mr-1">{comment.author}:</span>
                                {comment.content}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-black p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C7FF00]/10 rounded-full mb-6 group-hover:bg-[#C7FF00]/20 transition-colors">
                <Plane size={40} className="text-[#C7FF00]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Trials Abroad</h3>
              <p className="text-gray-300 leading-relaxed">
                Organized tryouts with professional clubs in Europe, Asia, and the Americas. We handle visas, travel, and accommodation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-black p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C7FF00]/10 rounded-full mb-6 group-hover:bg-[#C7FF00]/20 transition-colors">
                <Building2 size={40} className="text-[#C7FF00]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">International Placements</h3>
              <p className="text-gray-300 leading-relaxed">
                Direct contracts with clubs worldwide. Our network spans over 50 countries and hundreds of professional teams.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-black p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C7FF00]/10 rounded-full mb-6 group-hover:bg-[#C7FF00]/20 transition-colors">
                <Users2 size={40} className="text-[#C7FF00]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Recruitment Programs</h3>
              <p className="text-gray-300 leading-relaxed">
                Structured pathways from local leagues to international competitions. Academy partnerships and scholarship programs available.
              </p>
            </motion.div>
          </div>
        )}

        {!loading && !hasPublished && (
          <p className="text-center text-zinc-500 text-sm mb-10">
            No active opportunities are published at the moment. The cards above are showcase content.
          </p>
        )}

        {!loading && loadError && (
          <p className="text-center text-red-300 text-sm mb-10">
            Opportunities could not be loaded: {loadError}
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-[#C7FF00] to-[#b3e600] p-12 rounded-lg text-center"
        >
          <h3 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Ready to Go Global?
          </h3>
          <p className="text-black/80 text-lg mb-6">
            Join hundreds of athletes who have successfully transitioned to international careers through AGTA
          </p>
          <a
            href="/join"
            className="inline-block bg-black text-[#C7FF00] px-8 py-4 rounded font-semibold hover:bg-[#1C1C1C] transition-colors"
          >
            Start Your Journey
          </a>
        </motion.div>
      </div>
    </section>
  );
}
