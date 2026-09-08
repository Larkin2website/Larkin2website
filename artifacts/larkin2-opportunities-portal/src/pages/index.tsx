import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Larkin2Wordmark } from "@/components/brand";
import { ArrowRight } from "lucide-react";

const videoBasePath = `${import.meta.env.BASE_URL}videos`;

export default function LandingPage() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(motionPreference.matches);

    motionPreference.addEventListener("change", updateMotionPreference);
    return () => motionPreference.removeEventListener("change", updateMotionPreference);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#080a0c] flex flex-col relative isolate text-foreground selection:bg-primary/30 selection:text-primary overflow-y-auto">
      <div
        className="absolute inset-0 z-0 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url("${videoBasePath}/portal-home-poster.webp")` }}
        aria-hidden="true"
      >
        {!reduceMotion && !videoFailed && (
          <video
            className="h-full w-full object-cover object-center"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={`${videoBasePath}/portal-home-poster.webp`}
            onError={() => setVideoFailed(true)}
          >
            <source src={`${videoBasePath}/portal-home-loop.mp4`} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-[#080a0c]/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080a0c]/45 via-[#080a0c]/25 to-[#080a0c]/75" />
      </div>

      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")`
      }} />

      <header className="w-full h-24 shrink-0 flex items-center px-6 lg:px-16 z-20 min-w-0">
        <Larkin2Wordmark />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 py-12 shrink-0 min-w-0">
        <div className="w-full max-w-4xl space-y-12 min-w-0">
          <div className="animate-in slide-in-from-bottom-8 fade-in duration-1000 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            <h1 className="font-mono text-4xl sm:text-5xl md:text-7xl lg:text-[90px] xl:text-[110px] leading-[1.05] md:leading-[0.9] tracking-tight text-foreground font-medium break-words">
              Opportunities<br />Portal
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-[#c6c6c0] max-w-2xl mx-auto leading-relaxed break-words animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            The internal cockpit for managing public roles. Create, review, and confidently publish opportunities to the Larkin2 careers site.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-14 px-8 rounded-full font-mono uppercase tracking-wider text-xs bg-primary text-[#080a0c] hover:bg-[#ff8d57] border border-primary group">
                Sign In to Portal
                <ArrowRight className="ml-3 w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full h-14 px-8 rounded-full font-mono uppercase tracking-wider text-xs border-white/20 text-[#f4f1ed] hover:bg-white hover:text-[#080a0c] hover:border-white transition-colors">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-[10px] font-mono uppercase tracking-widest text-[#85898a] z-10 break-words px-4">
        &copy; {new Date().getFullYear()} 60Forty Films. Official Larkin2 opportunities.
      </footer>
    </div>
  );
}
