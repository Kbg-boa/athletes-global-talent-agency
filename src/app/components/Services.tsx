import { motion } from "motion/react";
import { Users, Search, Globe, FileText, Sparkles, UserPlus } from "lucide-react";

export default function Services() {
  const services = [
    {
      icon: <Users size={40} />,
      title: "Athlete Career Management",
      description: "Comprehensive career guidance, strategic planning, and professional development support.",
    },
    {
      icon: <Search size={40} />,
      title: "Talent Scouting & Recruitment",
      description: "Identifying emerging talents through our global network of scouts and partners.",
    },
    {
      icon: <Globe size={40} />,
      title: "International Tryouts & Trials",
      description: "Organizing trials with professional clubs and academies worldwide.",
    },
    {
      icon: <FileText size={40} />,
      title: "Contract Negotiation",
      description: "Expert legal support ensuring favorable terms and athlete protection.",
    },
    {
      icon: <Sparkles size={40} />,
      title: "Personal Branding & Media",
      description: "Building your personal brand, media presence, and sponsorship opportunities.",
    },
    {
      icon: <UserPlus size={40} />,
      title: "Club & Scout Connections",
      description: "Direct access to our network of clubs, scouts, and sports organizations globally.",
    },
  ];

  return (
    <section id="services" className="bg-[#1C1C1C] py-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Our <span className="text-[#C7FF00]">Services</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Comprehensive solutions to elevate your athletic career to the global stage
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-black p-8 rounded-lg hover:bg-[#252525] transition-all group hover:shadow-lg hover:shadow-[#C7FF00]/20 border border-transparent hover:border-[#C7FF00]/30"
            >
              <div className="text-[#C7FF00] mb-4 group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="text-gray-400">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
