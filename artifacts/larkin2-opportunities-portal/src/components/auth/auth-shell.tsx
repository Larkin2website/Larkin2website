import type { ReactNode } from "react";
import { Larkin2Wordmark } from "@/components/brand";
import productionImage from "@/assets/sign-in-production.webp";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] flex flex-col lg:flex-row bg-[#e9e5df] relative font-sans lg:overflow-hidden">
      <div className="flex-1 lg:flex-none lg:w-[45%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-24 border-b lg:border-b-0 lg:border-r border-black/20 relative z-10 shrink-0 overflow-hidden lg:overflow-y-auto lg:h-full min-h-[540px]">
        <img
          src={productionImage}
          alt="A production operator working at a live video control desk"
          className="absolute inset-0 h-full w-full object-cover object-[45%_center] sm:object-[48%_center]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[#080a0c]/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080a0c]/55 via-[#080a0c]/15 to-[#080a0c]/80" />

        <div className="relative z-10 animate-in slide-in-from-left-4 fade-in duration-700">
          <Larkin2Wordmark className="text-[#f4f1ed]" dotClassName="bg-[#f4773f]" />
        </div>

        <div className="relative z-10 mt-16 mb-12 lg:my-auto max-w-xl animate-in slide-in-from-left-4 fade-in duration-700 delay-150">
          <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tighter leading-[1.05] text-[#f4f1ed] mb-8 font-medium">
            Publish with<br />
            <span className="text-[#f4773f] tracking-tight">assurance.</span>
          </h1>
          <p className="text-[#f4f1ed]/80 text-base sm:text-lg lg:text-xl leading-[1.6] max-w-md font-sans">
            The central cockpit for managing public job roles, curating roles, and guiding candidates through the Larkin2 ecosystem.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[#f4f1ed]/65 font-mono text-[10px] uppercase tracking-widest animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
          <span>© {new Date().getFullYear()} Larkin2</span>
          <span>Authorized Personnel Only</span>
        </div>
      </div>

      <div className="flex-1 lg:flex-none lg:w-[55%] flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 xl:p-24 relative bg-[#f4f1ed] z-10 min-h-0 lg:overflow-y-auto lg:h-full">
        <div className="w-full max-w-[420px] animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200 py-12 lg:py-24 my-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export const authLabel = "font-mono text-[10px] uppercase tracking-[0.1em] text-[#625d58]";
export const authInput = "h-14 rounded-none border-[#c7c2bc] bg-[#e9e5df] px-4 font-mono text-sm text-[#1d2020]";
export const authPrimary = "h-14 w-full rounded-none bg-[#f4773f] font-mono text-xs font-bold uppercase tracking-wider text-[#080a0c] hover:bg-[#ff8d57]";
export const authLink = "font-mono text-[11px] uppercase tracking-widest text-[#b4501f] hover:text-[#1d2020] underline-offset-4 hover:underline";

export function AuthHeading({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-3xl tracking-tight text-[#1d2020]">{title}</h2>
      <p className="mt-3 text-base text-[#625d58]">{detail}</p>
    </div>
  );
}

export function AuthNotice({ tone, title, children, testId }: { tone: "error" | "success" | "info"; title?: string; children: ReactNode; testId?: string }) {
  const styles = {
    error: "border-[#ef625f] bg-[#ef625f]/10 text-[#9f2d2a]",
    success: "border-[#4f7a5a] bg-[#4f7a5a]/10 text-[#2f5238]",
    info: "border-[#c7c2bc] bg-[#e9e5df] text-[#1d2020]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} data-testid={testId} className={`border p-4 text-sm leading-relaxed ${styles}`}>
      {title && <p className="font-mono text-xs uppercase tracking-wider font-bold mb-1">{title}</p>}
      {children}
    </div>
  );
}
