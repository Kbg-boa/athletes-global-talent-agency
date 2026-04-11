import { motion } from "motion/react";
import { Plane, Building2, Users2 } from "lucide-react";

export default function Opportunities() {
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
            href="#join"
            className="inline-block bg-black text-[#C7FF00] px-8 py-4 rounded font-semibold hover:bg-[#1C1C1C] transition-colors"
          >
            Start Your Journey
          </a>
        </motion.div>
      </div>
    </section>
  );
}
