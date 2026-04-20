import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import coverImage from "figma:asset/cd795efe97abe25328e7da8086eab268fbbdb0db.png";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* BACKGROUND - S'adapte à toutes les tailles d'écran */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 z-10"></div>
        <img
          src={coverImage}
          alt="Athletes training"
          className="w-full h-full object-cover opacity-50 sm:opacity-60"
        />
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-[100vw]" // Empêche le texte de dépasser sur petit téléphone
        >
          {/* TEXTE : Taille dynamique (Petit sur Mobile, Énorme sur TV) */}
          <h1 className="text-4xl xs:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white mb-6 leading-[1.1] tracking-tighter">
            WE BUILD<br />
            <span className="text-[#C7FF00] drop-shadow-[0_0_15px_rgba(199,255,0,0.3)]">
              GLOBAL ATHLETES
            </span>
          </h1>

          <p className="text-lg md:text-2xl lg:text-3xl text-gray-300 mb-10 max-w-xl md:max-w-3xl mx-auto leading-relaxed">
            From local talent to international professional careers
          </p>

          {/* BOUTONS : S'empilent sur mobile, côte à côte sur ordi */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/join"
              className="w-full sm:w-auto bg-[#C7FF00] text-black px-10 py-4 text-lg font-bold rounded-full hover:bg-[#b3e600] transition-all transform hover:scale-105 shadow-lg active:scale-95"
            >
              Join Our Agency
            </a>
            <a
              href="#athletes"
              className="w-full sm:w-auto bg-transparent border-2 border-[#C7FF00] text-[#C7FF00] px-10 py-4 text-lg font-bold rounded-full hover:bg-[#C7FF00] hover:text-black transition-all transform hover:scale-105 active:scale-95"
            >
              Discover Talent
            </a>
          </div>
        </motion.div>

        {/* SCROLL INDICATOR : Discret sur mobile, visible sur TV */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-6 md:bottom-10"
        >
          <a href="#about" className="flex flex-col items-center text-[#C7FF00] animate-bounce opacity-80 hover:opacity-100">
            <span className="text-xs md:text-sm mb-2 uppercase tracking-widest">Scroll</span>
            <ChevronDown size={28} className="md:w-8 md:h-8" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}