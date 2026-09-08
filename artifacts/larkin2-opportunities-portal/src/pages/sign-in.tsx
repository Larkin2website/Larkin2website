import { SignIn } from "@clerk/react";
import { clerkBasePath } from "@/lib/clerk";
import { Larkin2Wordmark } from "@/components/brand";

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#080a0c] p-6 relative">
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")`
      }} />

      <div className="mb-10 text-center z-10 animate-in slide-in-from-bottom-4 fade-in duration-700">
        <Larkin2Wordmark className="mb-4" />
        <p className="text-[#85898a] font-mono text-[10px] uppercase tracking-widest mt-3">Internal Operations</p>
      </div>

      <div className="z-10 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
        <SignIn
          path={`${clerkBasePath}/sign-in`}
          routing="path"
          signUpUrl={`${clerkBasePath}/sign-up`}
          fallbackRedirectUrl={`${clerkBasePath}/dashboard`}
        />
      </div>
    </div>
  );
}