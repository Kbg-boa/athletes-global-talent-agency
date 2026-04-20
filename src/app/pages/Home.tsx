import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Athletes from "../components/Athletes";
import Opportunities from "../components/Opportunities";
import News from "../components/News";
import Partners from "../components/Partners";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black dark overflow-x-hidden">
      <Navigation />
      <main>
        <Hero />
        <About />
        <Services />
        <Athletes />
        <Opportunities />
        <News />
        <Partners />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}