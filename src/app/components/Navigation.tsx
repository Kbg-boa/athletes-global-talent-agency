import { useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logo from "figma:asset/3ac7475537d06d11ddf8dcded6e98d4e0c8dca4a.png";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#1C1C1C]">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={logo} alt="AGTA Logo" className="h-12 w-auto" />
            <div className="hidden md:block text-white text-sm">Athletes Global Talent Agency</div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-white hover:text-[#C7FF00] transition-colors">About</a>
            <a href="#services" className="text-white hover:text-[#C7FF00] transition-colors">Services</a>
            <a href="#athletes" className="text-white hover:text-[#C7FF00] transition-colors">Athletes</a>
            <a href="#opportunities" className="text-white hover:text-[#C7FF00] transition-colors">Opportunities</a>
            <a href="#contact" className="text-white hover:text-[#C7FF00] transition-colors">Contact</a>
            <a href="#join" className="bg-[#C7FF00] text-black px-6 py-2 rounded hover:bg-[#b3e600] transition-colors">Join Us</a>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4"
            >
              <div className="flex flex-col space-y-4">
                <a href="#about" className="text-white hover:text-[#C7FF00] transition-colors" onClick={() => setIsOpen(false)}>About</a>
                <a href="#services" className="text-white hover:text-[#C7FF00] transition-colors" onClick={() => setIsOpen(false)}>Services</a>
                <a href="#athletes" className="text-white hover:text-[#C7FF00] transition-colors" onClick={() => setIsOpen(false)}>Athletes</a>
                <a href="#opportunities" className="text-white hover:text-[#C7FF00] transition-colors" onClick={() => setIsOpen(false)}>Opportunities</a>
                <a href="#contact" className="text-white hover:text-[#C7FF00] transition-colors" onClick={() => setIsOpen(false)}>Contact</a>
                <a href="#join" className="bg-[#C7FF00] text-black px-6 py-2 rounded hover:bg-[#b3e600] transition-colors text-center" onClick={() => setIsOpen(false)}>Join Us</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
