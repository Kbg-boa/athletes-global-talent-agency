import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import coverImage from "figma:asset/cd795efe97abe25328e7da8086eab268fbbdb0db.png";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-10"></div>
        <img
          src={coverImage}
          alt="Athletes training"
          className="w-full h-full object-cover opacity-60"
        />
      </div>

      <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            WE BUILD<br />
            <span className="text-[#C7FF00]">GLOBAL ATHLETES</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            From local talent to international professional careers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#join"
              className="bg-[#C7FF00] text-black px-8 py-4 text-lg font-semibold rounded hover:bg-[#b3e600] transition-all transform hover:scale-105"
            >
              Join Our Agency
            </a>
            <a
              href="#athletes"
              className="bg-transparent border-2 border-[#C7FF00] text-[#C7FF00] px-8 py-4 text-lg font-semibold rounded hover:bg-[#C7FF00] hover:text-black transition-all transform hover:scale-105"
            >
              Discover Talent
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10"
        >
          <a href="#about" className="flex flex-col items-center text-[#C7FF00] animate-bounce">
            <span className="text-sm mb-2">Scroll Down</span>
            <ChevronDown size={32} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
