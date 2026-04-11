import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Athletes from "../components/Athletes";
import Opportunities from "../components/Opportunities";
import Recruitment from "../components/Recruitment";
import Partners from "../components/Partners";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black dark">
      <Navigation />
      <Hero />
      <About />
      <Services />
      <Athletes />
      <Opportunities />
      <Recruitment />
      <Partners />
      <Contact />
      <Footer />
    </div>
  );
}
