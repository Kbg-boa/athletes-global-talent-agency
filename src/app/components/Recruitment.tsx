import { motion } from "motion/react";
import { useState } from "react";
import { Upload, Check } from "lucide-react";

export default function Recruitment() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    sport: "",
    position: "",
    nationality: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="join" className="bg-black py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Join <span className="text-[#C7FF00]">Our Agency</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Take the first step toward your professional career. Fill out the form below and our scouts will review your profile.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-[#1C1C1C] p-8 md:p-12 rounded-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-white mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-white mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  required
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="sport" className="block text-white mb-2">
                  Sport *
                </label>
                <select
                  id="sport"
                  name="sport"
                  required
                  value={formData.sport}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                >
                  <option value="">Select Sport</option>
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="athletics">Athletics</option>
                  <option value="tennis">Tennis</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="position" className="block text-white mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Forward, Point Guard"
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="nationality" className="block text-white mb-2">
                Nationality *
              </label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                required
                value={formData.nationality}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-white mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-white mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black text-white border border-[#C7FF00]/30 rounded focus:border-[#C7FF00] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="video" className="block text-white mb-2">
                Upload Highlight Video *
              </label>
              <div className="border-2 border-dashed border-[#C7FF00]/30 rounded-lg p-8 text-center hover:border-[#C7FF00] transition-colors cursor-pointer">
                <Upload size={48} className="mx-auto text-[#C7FF00] mb-4" />
                <p className="text-gray-300 mb-2">Drag and drop your video here, or click to browse</p>
                <p className="text-sm text-gray-500">Max file size: 100MB (MP4, MOV, AVI)</p>
                <input type="file" id="video" accept="video/*" className="hidden" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#C7FF00] text-black px-8 py-4 text-lg font-semibold rounded hover:bg-[#b3e600] transition-all transform hover:scale-105 flex items-center justify-center"
            >
              {submitted ? (
                <>
                  <Check size={24} className="mr-2" />
                  Application Submitted!
                </>
              ) : (
                "Get Scouted Now"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
