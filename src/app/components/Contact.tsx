import { motion } from "motion/react";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <section id="contact" className="bg-black py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Get In <span className="text-[#C7FF00]">Touch</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Ready to start your journey? Contact us today and let's build your global career together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C7FF00]/10 rounded-full mb-4 group-hover:bg-[#C7FF00]/20 transition-colors">
              <Mail size={32} className="text-[#C7FF00]" />
            </div>
            <h3 className="text-white font-semibold mb-2">Email</h3>
            <a href="mailto:agta.management@gmail.com" className="text-gray-400 hover:text-[#C7FF00] transition-colors">
              agta.management@gmail.com
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C7FF00]/10 rounded-full mb-4 group-hover:bg-[#C7FF00]/20 transition-colors">
              <Phone size={32} className="text-[#C7FF00]" />
            </div>
            <h3 className="text-white font-semibold mb-2">Phone</h3>
            <a href="tel:+971509018726" className="text-gray-400 hover:text-[#C7FF00] transition-colors">
              +971 50 901 8726
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C7FF00]/10 rounded-full mb-4 group-hover:bg-[#C7FF00]/20 transition-colors">
              <MessageCircle size={32} className="text-[#C7FF00]" />
            </div>
            <h3 className="text-white font-semibold mb-2">WhatsApp</h3>
            <a href="https://wa.me/971509018726" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#C7FF00] transition-colors">
              Message Us
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-[#1C1C1C] p-8 rounded-lg text-center hover:bg-[#252525] transition-all group"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C7FF00]/10 rounded-full mb-4 group-hover:bg-[#C7FF00]/20 transition-colors">
              <MapPin size={32} className="text-[#C7FF00]" />
            </div>
            <h3 className="text-white font-semibold mb-2">Locations</h3>
            <p className="text-gray-400 text-sm">Kinshasa</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <a
            href="https://wa.me/971509018726"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#C7FF00] text-black px-8 py-4 rounded font-semibold hover:bg-[#b3e600] transition-all transform hover:scale-105"
          >
            Chat with Us on WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
