import { Link } from "react-router";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Video, MessageCircle, Pin, Camera } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1C1C1C] border-t border-[#C7FF00]/20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="inline-block mb-4">
              <div className="text-2xl font-bold text-[#C7FF00]">AGTA</div>
              <div className="text-white text-sm">Athletes Global Talent Agency</div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Building global athletes and connecting local talent to international opportunities.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Services
                </a>
              </li>
              <li>
                <a href="#athletes" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Athletes
                </a>
              </li>
              <li>
                <a href="#opportunities" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Opportunities
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#join" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Join Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#C7FF00] transition-colors text-sm">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Follow Us</h4>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/company/athletes-global-talent-agency-agta"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://x.com/AGTA_Global"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="X (Twitter)"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://www.tiktok.com/@agta.global?_r=1&_t=ZS-95LxOYoSjiv"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="TikTok"
              >
                <Video size={20} />
              </a>
              <a
                href="https://www.facebook.com/share/18SDCiYPkX/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://www.instagram.com/agta.global?igsh=Njh3cTJpdTRia2N6&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://pin.it/5QuDzYaOR"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="Pinterest"
              >
                <Pin size={20} />
              </a>
              <a
                href="https://discord.gg/75jWSnTHj3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="Discord"
              >
                <MessageCircle size={20} />
              </a>
              <a
                href="https://www.youtube.com/@AthletesGlobalTalentAgencyAGTA"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="YouTube"
              >
                <Youtube size={20} />
              </a>
              <a
                href="https://snapchat.com/t/X7zTx817"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-gray-400 hover:text-[#C7FF00] hover:bg-[#252525] transition-all"
                aria-label="Snapchat"
              >
                <Camera size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#C7FF00]/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2026 Athletes Global Talent Agency. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Turning raw talent into global professionals
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
