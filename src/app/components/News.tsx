import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Newspaper, PlayCircle, Heart, MessageCircle, Send } from "lucide-react";
import { supabaseDG as supabase } from "../../lib/supabase";

type Post = {
  id: string | number;
  title: string;
  caption?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  category?: string | null;
  status?: string | null;
  published_at?: string | null;
  created_at?: string | null;
};

type PostInteraction = {
  liked: boolean;
  likes: number;
  comments: Array<{ id: string; author: string; content: string; created_at?: string | null }>;
};

const VISITOR_ID_NEWS_KEY = "agta-news-visitor-id";

const getOrCreateVisitorId = () => {
  if (typeof window === "undefined") return `guest-${Date.now()}`;
  const existing = localStorage.getItem(VISITOR_ID_NEWS_KEY);
  if (existing) return existing;
  const generated = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(VISITOR_ID_NEWS_KEY, generated);
  return generated;
};

const CATEGORY_LABELS: Record<string, string> = {
  match: "Match",
  event: "Event",
  announcement: "Announcement",
  general: "Actualites",
};

export default function News() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<Record<string, PostInteraction>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [visitorId] = useState(getOrCreateVisitorId);

  const fetchPublishedPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id,title,caption,image_url,video_url,category,status,published_at,created_at")
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(9);

    if (!error) {
      setItems((data || []) as Post[]);
    } else {
      console.warn("News public fetch failed:", error.message);
      setItems([]);
    }

    if (!silent) {
      setLoading(false);
    } else {
      setLoading((prev) => (prev ? false : prev));
    }
  }, []);

  useEffect(() => {
    void fetchPublishedPosts();
  }, [fetchPublishedPosts]);

  useEffect(() => {
    const channel = supabase
      .channel(`news-posts-live-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        void fetchPublishedPosts(true);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPublishedPosts]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchPublishedPosts(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [fetchPublishedPosts]);

  const hasPublished = useMemo(() => items.length > 0, [items]);

  const refreshInteractions = useCallback(async () => {
    if (items.length === 0) { setInteractions({}); return; }
    const ids = items.map(item => item.id);

    const [likesRes, commentsRes] = await Promise.all([
      supabase
        .from("post_likes")
        .select("post_id, visitor_id")
        .in("post_id", ids as any[]),
      supabase
        .from("post_comments")
        .select("id, post_id, author_label, content, created_at")
        .in("post_id", ids as any[])
        .order("created_at", { ascending: true }),
    ]);

    const next: Record<string, PostInteraction> = {};
    items.forEach(item => {
      next[String(item.id)] = { liked: false, likes: 0, comments: [] };
    });

    if (!likesRes.error && likesRes.data) {
      likesRes.data.forEach((row: any) => {
        const key = String(row.post_id);
        if (!next[key]) next[key] = { liked: false, likes: 0, comments: [] };
        next[key].likes += 1;
        if (String(row.visitor_id || "") === visitorId) next[key].liked = true;
      });
    }

    if (!commentsRes.error && commentsRes.data) {
      commentsRes.data.forEach((row: any) => {
        const key = String(row.post_id);
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

  useEffect(() => { void refreshInteractions(); }, [refreshInteractions]);

  useEffect(() => {
    const channel = supabase
      .channel(`news-social-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => {
        void refreshInteractions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => {
        void refreshInteractions();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refreshInteractions]);

  const formatPublishedDate = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
  };

  const toggleLike = async (id: string | number) => {
    const key = String(id);
    const current = interactions[key] || { liked: false, likes: 0, comments: [] };
    if (current.liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", id as any)
        .eq("visitor_id", visitorId);
      if (error) console.warn("Unlike failed:", error.message);
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert([{ post_id: id, visitor_id: visitorId }]);
      if (error && error.code !== "23505") console.warn("Like failed:", error.message);
    }
    await refreshInteractions();
  };

  const submitComment = async (id: string | number) => {
    const key = String(id);
    const text = String(commentDrafts[key] || "").trim();
    if (!text) return;
    const { error } = await supabase
      .from("post_comments")
      .insert([{ post_id: id, visitor_id: visitorId, author_label: "fan", content: text }]);
    if (error) { console.warn("Comment failed:", error.message); return; }
    setCommentDrafts(prev => ({ ...prev, [key]: "" }));
    await refreshInteractions();
  };

  return (
    <section id="actualites" className="bg-[#0A0A0A] py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Latest <span className="text-[#C7FF00]">Actualites</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Stay up to date with AGTA — match results, events, announcements, and athlete highlights
          </p>
        </motion.div>

        {hasPublished ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                    <Newspaper size={30} className="text-[#C7FF00]/70" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full bg-[#C7FF00]/15 text-[#C7FF00] border border-[#C7FF00]/30 text-[11px] font-semibold">
                      Published by AGTA
                    </span>
                    {item.category && item.category !== 'general' && (
                      <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] capitalize">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px]">
                      {formatPublishedDate(item.published_at || item.created_at)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{item.title}</h3>
                  {item.caption && (
                    <p className="text-gray-300 text-sm mt-2 line-clamp-3">{item.caption}</p>
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
                            onChange={e => setCommentDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitComment(item.id); } }}
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
          !loading && (
            <div className="text-center py-16 text-zinc-500">
              <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold text-zinc-400">No actualites published yet.</p>
              <p className="text-sm mt-2">Check back soon for the latest AGTA updates.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
