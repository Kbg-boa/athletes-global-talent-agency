import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, MapPin, Trophy, TrendingUp, Calendar } from "lucide-react";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

export default function AthleteProfile() {
  const { id } = useParams();

  const athleteData: Record<string, any> = {
    "1": {
      name: "Marcus Johnson",
      position: "Forward",
      sport: "Football",
      nationality: "Nigeria",
      age: 22,
      height: "6'1\"",
      weight: "176 lbs",
      image: "https://images.unsplash.com/photo-1745104172230-42630f9b75d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlcyUyMHNwb3J0cyUyMGFjdGlvbiUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzU0ODEzNTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      bio: "Dynamic forward with exceptional pace and technical ability. Marcus has been scoring consistently in the Nigerian Premier League and is ready for the next level.",
      stats: { goals: 28, assists: 12, matches: 45, rating: "8.7" },
      achievements: [
        "Nigerian Premier League Top Scorer 2025",
        "CAF Youth Player of the Year Nominee",
        "National Team Call-up",
      ],
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    "2": {
      name: "Sarah Williams",
      position: "Midfielder",
      sport: "Football",
      nationality: "Kenya",
      age: 20,
      height: "5'7\"",
      weight: "132 lbs",
      image: "https://images.unsplash.com/photo-1629977007371-0ba395424741?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHNvY2NlciUyMHBsYXllciUyMGFjdGlvbnxlbnwxfHx8fDE3NzU0ODEzNTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
      bio: "Creative midfielder with excellent vision and passing range. Sarah is a key player for Kenya's national team and seeks European opportunities.",
      stats: { goals: 15, assists: 24, matches: 42, rating: "8.5" },
      achievements: [
        "Kenyan Women's League MVP 2024",
        "CECAFA Championship Winner",
        "National Team Captain",
      ],
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    "3": {
      name: "David Chen",
      position: "Point Guard",
      sport: "Basketball",
      nationality: "China",
      age: 21,
      height: "6'3\"",
      weight: "185 lbs",
      image: "https://images.unsplash.com/photo-1749743823062-df9d9de55e94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3NTQ4MTM1NXww&ixlib=rb-4.1.0&q=80&w=1080",
      bio: "Explosive point guard with elite court vision and three-point shooting. David is looking to make the jump to international leagues.",
      stats: { points: "22.5 PPG", assists: "8.3 APG", rebounds: "4.1 RPG", rating: "9.0" },
      achievements: [
        "CBA Rising Star Award",
        "All-Star Selection 2025",
        "National Team Member",
      ],
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
  };

  const athlete = athleteData[id || "1"] || athleteData["1"];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="pt-24 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <Link to="/#athletes" className="inline-flex items-center text-[#C7FF00] hover:text-[#b3e600] mb-8 transition-colors">
            <ArrowLeft size={20} className="mr-2" />
            Back to Athletes
          </Link>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={athlete.image}
                alt={athlete.name}
                className="w-full rounded-lg shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center"
            >
              <h1 className="text-5xl font-bold text-white mb-4">{athlete.name}</h1>
              <p className="text-2xl text-[#C7FF00] mb-6">{athlete.position} • {athlete.sport}</p>

              <div className="flex items-center text-gray-300 mb-8">
                <MapPin size={20} className="mr-2 text-[#C7FF00]" />
                <span>{athlete.nationality}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#1C1C1C] p-4 rounded">
                  <p className="text-gray-400 text-sm mb-1">Age</p>
                  <p className="text-white font-bold text-xl">{athlete.age}</p>
                </div>
                <div className="bg-[#1C1C1C] p-4 rounded">
                  <p className="text-gray-400 text-sm mb-1">Height</p>
                  <p className="text-white font-bold text-xl">{athlete.height}</p>
                </div>
                <div className="bg-[#1C1C1C] p-4 rounded">
                  <p className="text-gray-400 text-sm mb-1">Weight</p>
                  <p className="text-white font-bold text-xl">{athlete.weight}</p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-8">{athlete.bio}</p>

              <a
                href="#contact"
                className="bg-[#C7FF00] text-black px-8 py-4 rounded font-semibold hover:bg-[#b3e600] transition-colors text-center"
              >
                Contact for Clubs
              </a>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-[#1C1C1C] p-8 rounded-lg"
            >
              <div className="flex items-center mb-6">
                <TrendingUp size={28} className="text-[#C7FF00] mr-3" />
                <h2 className="text-3xl font-bold text-white">Statistics</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(athlete.stats).map(([key, value]) => (
                  <div key={key} className="bg-black p-4 rounded">
                    <p className="text-gray-400 text-sm mb-1 capitalize">{key}</p>
                    <p className="text-[#C7FF00] font-bold text-2xl">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-[#1C1C1C] p-8 rounded-lg"
            >
              <div className="flex items-center mb-6">
                <Trophy size={28} className="text-[#C7FF00] mr-3" />
                <h2 className="text-3xl font-bold text-white">Achievements</h2>
              </div>
              <ul className="space-y-4">
                {athlete.achievements.map((achievement: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-[#C7FF00] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-gray-300">{achievement}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 bg-[#1C1C1C] p-8 rounded-lg"
          >
            <div className="flex items-center mb-6">
              <Calendar size={28} className="text-[#C7FF00] mr-3" />
              <h2 className="text-3xl font-bold text-white">Highlight Reel</h2>
            </div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={athlete.videoUrl}
                title={`${athlete.name} Highlights`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
