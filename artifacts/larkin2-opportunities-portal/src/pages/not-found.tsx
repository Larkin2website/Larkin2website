import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Larkin2Wordmark } from "@/components/brand";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#080a0c] p-6 relative text-foreground">
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")`
      }} />

      <div className="z-10 text-center max-w-md w-full p-12 bg-[#171b1d] border border-[#2a2f31]">
        <AlertCircle className="w-12 h-12 text-[#ef625f] mx-auto mb-6" />
        <h1 className="font-mono text-3xl font-medium tracking-tight mb-4">Page Not Found</h1>
        <p className="text-[#85898a] text-sm leading-relaxed mb-10">
          The requested portal page could not be located. It may have been moved or you may not have access to it.
        </p>

        <Link href="/">
          <Button variant="outline" className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider border-[#2a2f31] hover:bg-[#101315] hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>

      <div className="absolute bottom-8 z-10">
        <Larkin2Wordmark className="opacity-50" />
      </div>
    </div>
  );
}