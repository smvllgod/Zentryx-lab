import Nav from "./components/Nav";
import Hero from "./components/Hero";
import LogoBar from "./components/LogoBar";
import HowItWorks from "./components/HowItWorks";
import StrategyModules from "./components/StrategyModules";
import Features from "./components/Features";
import Testimonials from "./components/Testimonials";
import Comparison from "./components/Comparison";
import Pricing from "./components/Pricing";
import Marketplace from "./components/Marketplace";
import FAQ from "./components/FAQ";
import EmailCapture from "./components/EmailCapture";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import CookieBanner from "./components/CookieBanner";
import BackToTop from "./components/BackToTop";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LogoBar />
        <HowItWorks />
        <StrategyModules />
        <Features />
        <Testimonials />
        <Comparison />
        <Pricing />
        <Marketplace />
        <FAQ />
        <EmailCapture />
        <FinalCTA />
      </main>
      <Footer />
      <CookieBanner />
      <BackToTop />
    </>
  );
}
