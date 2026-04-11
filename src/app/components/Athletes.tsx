import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import ikambaImage from "../../imports/IKAMBA_01.jpg.jpeg";
import mbussaImage from "../../imports/MBUSSA_02.jpg.jpeg";

export default function Athletes() {
  const athletes = [
    {
      id: 1,
      name: "Exaucé Ikamba",
      position: "Basketball Player",
      sport: "Basketball",
      nationality: "DR Congo 🇨🇩",
      image: ikambaImage,
      height: "2.04 m",
      weight: "95 kg",
      wingspan: "2.08 m",
      profile: "Explosive • Versatile Playmaker • Shooter • Defender",
      achievements: [
        "National Team Player",
        "BAL Qualified Player",
        "LIPROBAKIN All-Star 2025"
      ],
      description: "AGTA proudly presents Exaucé Ikamba, a basketball prospect with strong potential ready for the next level."
    },
    {
      id: 2,
      name: "Victorine Mbussa",
      position: "100m Sprinter",
      sport: "Athletics",
      nationality: "DR Congo 🇨🇩",
      image: mbussaImage,
      profile: "Elite Sprint Specialist • National Team Athlete • High Performance Competitor",
      description: "AGTA is proud to represent Victorine Mbussa, a 100m sprinter from the national team from DR Congo. We continue our mission to connect the best African talents to global opportunities."
    },
  ];

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
          {athletes.map((athlete, index) => (
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
