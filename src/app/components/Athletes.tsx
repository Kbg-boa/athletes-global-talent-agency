import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import ikambaImage from "../../imports/IKAMBA_01.jpg.jpeg";
import mbussaImage from "../../imports/MBUSSA_02.jpg.jpeg";
import { supabase } from "../../lib/supabase";

type AthleteRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  sport?: string | null;
  position?: string | null;
  nationality?: string | null;
  location?: string | null;
  bio?: string | null;
  description?: string | null;
  profile?: string | null;
  achievements?: string | null;
  height?: string | null;
  weight?: string | null;
  wingspan?: string | null;
  status?: string | null;
  profile_photo_url?: string | null;
  photo_urls?: string | null;
  created_at?: string | null;
};

const FALLBACK_IMAGES = [ikambaImage, mbussaImage];

const PINNED_FEATURED = [
  {
    id: "legacy-ikamba",
    name: "Exaucé Ikamba",
    position: "Basketball • Forward/Center",
    nationality: "DR Congo 🇨🇩",
    image: ikambaImage,
    height: "2.04 m",
    weight: "95 kg",
    wingspan: "2.08 m",
    profile: "Explosive • Versatile Playmaker • Shooter • Defender",
    achievements: ["National Team Player", "BAL Qualified Player", "LIPROBAKIN All-Star 2025"],
    description: "AGTA proudly presents Exaucé Ikamba, a basketball prospect with strong potential ready for the next level.",
  },
  {
    id: "legacy-mbussa",
    name: "Victorine Mbussa",
    position: "Athletics • 100m Sprinter",
    nationality: "DR Congo 🇨🇩",
    image: mbussaImage,
    height: "",
    weight: "",
    wingspan: "",
    profile: "Elite Sprint Specialist • National Team Athlete • High Performance Competitor",
    achievements: [],
    description: "AGTA is proud to represent Victorine Mbussa, a 100m sprinter from the national team from DR Congo.",
  },
] as const;

const pickImage = (row: AthleteRow, index: number): string => {
  const profile = String(row.profile_photo_url || "").trim();
  if (profile) return profile;
  const firstPhoto = String(row.photo_urls || "")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  if (firstPhoto) return firstPhoto;
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
};

export default function Athletes() {
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [recruitmentPhotoMap, setRecruitmentPhotoMap] = useState<Record<string, string>>({});

  const athleteKey = (name?: string | null, sport?: string | null, position?: string | null) =>
    `${String(name || '').trim().toLowerCase()}|${String(sport || '').trim().toLowerCase()}|${String(position || '').trim().toLowerCase()}`;

  const parseProfilePhotoFromExperience = (experience?: string | null) => {
    const text = String(experience || "");
    if (!text) return "";

    const linksMatch = text.match(/Liens\s*&\s*assets:\s*(.*)/i);
    if (!linksMatch) return "";

    const links: Record<string, string> = {};
    linksMatch[1].split(" | ").forEach((chunk) => {
      const [rawKey, ...rest] = chunk.split(": ");
      const value = rest.join(": ").trim();
      if (rawKey && value) {
        links[rawKey.trim().toLowerCase()] = value;
      }
    });

    const direct = String(links.profile_photo_url || links.photo_url || "").trim();
    if (direct) return direct;

    const firstPhoto = String(links.photo_urls || "")
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);
    return firstPhoto || "";
  };

  const fetchPublishedAthletes = useCallback(async () => {
    const [athletesRes, recruitmentRes] = await Promise.all([
      supabase
        .from("athletes")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("recruitment")
        .select("full_name, sport, position, experience, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (athletesRes.error) {
      console.error("Erreur chargement Featured Athletes:", athletesRes.error);
      return;
    }

    if (recruitmentRes.error) {
      console.error("Erreur chargement photos recrutement:", recruitmentRes.error);
      return;
    }

    const fallback: Record<string, string> = {};
    (recruitmentRes.data || []).forEach((row: any) => {
      const key = athleteKey(row.full_name, row.sport, row.position);
      if (!key || fallback[key]) return;
      const photo = parseProfilePhotoFromExperience(row.experience);
      if (photo) fallback[key] = photo;
    });

    setRecruitmentPhotoMap(fallback);

    const rows = ((athletesRes.data || []) as AthleteRow[]).filter((row) => {
      const status = String(row.status || "").toLowerCase().trim();
      return status === "published";
    });

    setAthletes(rows);
  }, []);

  useEffect(() => {
    void fetchPublishedAthletes();

    const channel = supabase
      .channel("public-featured-athletes")
      .on("postgres_changes", { event: "*", schema: "public", table: "athletes" }, () => {
        void fetchPublishedAthletes();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "recruitment" }, () => {
        void fetchPublishedAthletes();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPublishedAthletes]);

  const normalizedAthletes = useMemo(
    () =>
      athletes.map((row, index) => ({
        id: row.id,
        name: String(row.name || row.full_name || "Athlète AGTA"),
        position: [row.sport, row.position].filter(Boolean).join(" • ") || "Athlète",
        nationality: String(row.nationality || row.location || "International"),
        image: (() => {
          const direct = pickImage(row, index);
          const hasDirect = String(row.profile_photo_url || "").trim() || String(row.photo_urls || "").trim();
          if (hasDirect) return direct;
          const key = athleteKey(row.name || row.full_name, row.sport, row.position);
          return recruitmentPhotoMap[key] || direct;
        })(),
        height: row.height || "",
        weight: row.weight || "",
        wingspan: row.wingspan || "",
        profile: String(row.profile || "High Potential Prospect"),
        achievements: String(row.achievements || "")
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
        description: String(
          row.bio ||
            row.description ||
            "AGTA presents this talent profile for international clubs, recruiters and agencies."
        ),
      })),
    [athletes, recruitmentPhotoMap]
  );

  const featuredAthletes = useMemo(() => {
    const existingNames = new Set(
      normalizedAthletes.map((athlete) => athlete.name.trim().toLowerCase())
    );
    const missingPinned = PINNED_FEATURED.filter(
      (athlete) => !existingNames.has(athlete.name.trim().toLowerCase())
    );
    return [...missingPinned, ...normalizedAthletes];
  }, [normalizedAthletes]);

  return (
    <section id="athletes" className="bg-black py-20 px-6">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Featured <span className="text-[#C7FF00]">Athletes</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            🏀 NEW TALENTS AVAILABLE FOR INTERNATIONAL OPPORTUNITIES
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {featuredAthletes.map((athlete, index) => (
            <motion.div
              key={athlete.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-[#1C1C1C] rounded-lg overflow-hidden hover:shadow-2xl hover:shadow-[#C7FF00]/20 transition-all"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={athlete.image}
                  alt={athlete.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-3xl font-bold text-white">
                    {athlete.name}
                  </h3>
                  <div className="flex items-center text-gray-300">
                    <MapPin size={20} className="mr-2 text-[#C7FF00]" />
                    <span>{athlete.nationality}</span>
                  </div>
                </div>

                <p className="text-[#C7FF00] text-lg font-semibold mb-3">
                  {athlete.position}
                </p>

                <p className="text-gray-300 mb-4 leading-relaxed">
                  {athlete.description}
                </p>

                {athlete.height && (
                  <div className="mb-4 bg-black/50 p-4 rounded">
                    <h4 className="text-white font-semibold mb-3">📊 Player Info</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Height</p>
                        <p className="text-white font-semibold">{athlete.height}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Weight</p>
                        <p className="text-white font-semibold">{athlete.weight}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Wingspan</p>
                        <p className="text-white font-semibold">{athlete.wingspan}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-white font-semibold mb-2">⚡ Profile</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {athlete.profile}
                  </p>
                </div>

                {athlete.achievements && (
                  <div className="mb-4">
                    <h4 className="text-white font-semibold mb-2">🏆 Achievements</h4>
                    <ul className="space-y-1">
                      {athlete.achievements.map((achievement, i) => (
                        <li key={i} className="text-gray-300 text-sm flex items-start">
                          <span className="text-[#C7FF00] mr-2">•</span>
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm">
                    📩 Clubs, recruiters and agents looking for elite African talent, contact AGTA now.
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
