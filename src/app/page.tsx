import Header from "@/components/shared/header/Header";
import Footer from "@/components/shared/footer/Footer";
import AnimatedParallaxBackground from "@/components/shared/background/AnimatedParallaxBackground";
import CasinoHero from "@/components/home/hero/CasinoHero";
import PlaySection from "@/components/home/game/PlaySection";
import FairnessSection from "@/components/home/fairness/FairnessSection";

export default function Home() {
  return (
    <>
      <AnimatedParallaxBackground />
      <Header />
      <main className="relative">
        <CasinoHero />
        <PlaySection />
        <FairnessSection />
      </main>
      <Footer />
    </>
  );
}
