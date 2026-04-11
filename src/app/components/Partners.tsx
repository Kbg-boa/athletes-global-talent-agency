import { motion } from "motion/react";

export default function Partners() {
  const partners = [
    "FC Barcelona Academy",
    "Real Madrid Foundation",
    "Manchester United",
    "Bayern Munich",
    "NBA Academy Africa",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "CAF",
    "FIBA",
    "Emirates Sports",
    "Aspire Academy",
  ];

  return (
    <section className="bg-[#1C1C1C] py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Our <span className="text-[#C7FF00]">Partners</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Trusted by elite clubs, academies, and sports organizations worldwide
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {partners.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="bg-black p-6 rounded-lg flex items-center justify-center hover:bg-[#252525] transition-all group hover:shadow-lg hover:shadow-[#C7FF00]/10"
            >
              <p className="text-gray-400 text-center group-hover:text-[#C7FF00] transition-colors font-semibold">
                {partner}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 text-lg">
            + 200 Professional Clubs & Academies Worldwide
          </p>
        </motion.div>
      </div>
    </section>
  );
}
