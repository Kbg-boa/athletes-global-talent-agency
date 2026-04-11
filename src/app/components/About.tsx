import { motion } from "motion/react";
import { Target, Eye, Award, Download } from "lucide-react";
import portfolio1 from "../../imports/1.jpeg";
import portfolio2 from "../../imports/2.jpeg";
import portfolio3 from "../../imports/3.jpeg";
import portfolio4 from "../../imports/4.jpeg";
import portfolio5 from "../../imports/5.jpeg";
import portfolio6 from "../../imports/6.jpeg";
import portfolio7 from "../../imports/7.jpeg";
import portfolio8 from "../../imports/8.jpeg";
import portfolioPDF from "../../imports/PORTFOLIO_AGTA.pdf";

export default function About() {
  return (
    <section id="about" className="bg-black py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            About <span className="text-[#C7FF00]">AGTA</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Athletes Global Talent Agency is an international sports management company dedicated to discovering, developing, and promoting athletes worldwide. We connect local talents to global professional opportunities across all sports.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg hover:bg-[#252525] transition-all group"
          >
            <div className="mb-4 text-[#C7FF00] group-hover:scale-110 transition-transform">
              <Target size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Mission</h3>
            <p className="text-gray-300">
              To transform raw talent into global professionals by providing world-class management, training, and international opportunities.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg hover:bg-[#252525] transition-all group"
          >
            <div className="mb-4 text-[#C7FF00] group-hover:scale-110 transition-transform">
              <Eye size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Vision</h3>
            <p className="text-gray-300">
              To become the leading bridge between emerging markets and elite sports leagues, creating pathways for athletes worldwide.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg hover:bg-[#252525] transition-all group"
          >
            <div className="mb-4 text-[#C7FF00] group-hover:scale-110 transition-transform">
              <Award size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Values</h3>
            <p className="text-gray-300">
              Excellence, integrity, dedication, and unwavering commitment to athlete success and professional development.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-gray-300 mb-4">
            <span className="text-[#C7FF00] font-bold">Global Presence:</span> Africa • Asia • Europe • North America • South America • Oceania
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Our <span className="text-[#C7FF00]">Portfolio</span>
            </h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Discover our work and the athletes we've successfully connected to global opportunities
            </p>
            <a
              href={portfolioPDF}
              download="AGTA_Portfolio.pdf"
              className="inline-flex items-center gap-2 bg-[#C7FF00] text-black px-8 py-4 rounded font-semibold hover:bg-[#b3e600] transition-all transform hover:scale-105"
            >
              <Download size={20} />
              Download Portfolio PDF
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[portfolio1, portfolio2, portfolio3, portfolio4, portfolio5, portfolio6, portfolio7, portfolio8].map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="aspect-square overflow-hidden rounded-lg bg-[#1C1C1C] hover:shadow-2xl hover:shadow-[#C7FF00]/20 transition-all group"
              >
                <img
                  src={image}
                  alt={`Portfolio ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
