import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Larkin2Wordmark } from "@/components/brand";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#080a0c] flex flex-col relative overflow-hidden text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Cinematic noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")`
      }} />

      <header className="absolute top-0 w-full h-24 flex items-center px-8 lg:px-16 z-20">
        <Larkin2Wordmark />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 mt-16">
        <div className="w-full max-w-4xl space-y-12">
          <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-3">
              <span className="w-8 h-[1px] bg-primary"></span>
              Internal Tooling
              <span className="w-8 h-[1px] bg-primary"></span>
            </div>
            <h1 className="font-mono text-5xl md:text-7xl lg:text-[110px] leading-[0.9] tracking-tight text-foreground font-medium">
              Opportunities<br />Portal
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-[#c6c6c0] max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            The internal cockpit for managing public roles. Create, review, and confidently publish opportunities to the Larkin2 careers site.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 fill-mode-both ease-[cubic-bezier(0.23,1,0.32,1)]">
            <Link href="/sign-in">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full font-mono uppercase tracking-wider text-xs bg-primary text-[#080a0c] hover:bg-[#ff8d57] border border-primary group">
                Sign In to Portal
                <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full font-mono uppercase tracking-wider text-xs border-white/20 text-[#f4f1ed] hover:bg-white hover:text-[#080a0c] hover:border-white transition-colors">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-[10px] font-mono uppercase tracking-widest text-[#85898a] z-10">
        &copy; {new Date().getFullYear()} 60Forty Films. Official Larkin2 opportunities.
      </footer>
    </div>
  );
}