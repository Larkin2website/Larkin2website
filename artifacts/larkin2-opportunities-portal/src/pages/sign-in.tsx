import { SignIn } from "@clerk/react";
import { clerkBasePath } from "@/lib/clerk";
import { Larkin2Wordmark } from "@/components/brand";
import productionImage from "@/assets/sign-in-production.webp";
import { portalDemoMode, portalTestAccessLabel } from "@/lib/demo-mode";
import { useCreatePortalDemoSession, getGetPortalSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";

const paperAppearance = {
  theme: "simple" as const,
  cssLayerName: "clerk",
  options: {
    socialButtonsPlacement: "bottom" as const,
    logoPlacement: "inside" as const,
  },
  variables: {
    colorPrimary: "#f4773f",
    colorForeground: "#1d2020",
    colorMutedForeground: "#625d58",
    colorDanger: "#ef625f",
    colorBackground: "#f4f1ed",
    colorInput: "#e9e5df",
    colorInputForeground: "#1d2020",
    colorNeutral: "#c7c2bc",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-transparent rounded-none w-full max-w-full overflow-hidden shadow-none border-0",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none p-0 sm:p-0",
    headerTitle: "!text-[#1d2020] font-mono tracking-tight text-3xl",
    headerSubtitle: "!text-[#625d58] font-sans text-base mt-2",
    socialButtonsBlockButtonText: "!text-[#1d2020] font-mono text-[11px] uppercase tracking-widest",
    formFieldLabel: "text-[#625d58] font-mono text-[10px] uppercase tracking-[0.1em]",
    footerActionLink: "text-[#f4773f] hover:text-[#ff8d57]",
    footerActionText: "text-[#625d58]",
    dividerText: "text-[#625d58]",
    identityPreviewEditButton: "text-[#f4773f]",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-[#1d2020]",
    logoBox: "hidden",
    socialButtonsBlockButton: "border border-[#c7c2bc] bg-[#f4f1ed] text-[#1d2020] rounded-none h-14 hover:bg-[#e9e5df] transition-colors",
    formButtonPrimary: "bg-[#f4773f] text-[#080a0c] font-bold tracking-wider uppercase font-mono text-xs hover:bg-[#ff8d57] rounded-none h-14 transition-colors",
    formFieldInput: "bg-[#e9e5df] border-[#c7c2bc] text-[#1d2020] focus:border-[#f4773f] focus:ring-0 rounded-none h-14 font-mono text-sm px-4",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#c7c2bc]",
    alert: "border border-[#ef625f] bg-[#ef625f]/10 rounded-none text-[#ef625f]",
    otpCodeFieldInput: "bg-[#e9e5df] border-[#c7c2bc] text-[#1d2020] rounded-none font-mono h-14",
    formFieldRow: "text-[#1d2020]",
    main: "gap-8",
    header: "mb-8",
    formFieldInputShowPasswordButton: "text-[#625d58] hover:text-[#1d2020]",
    socialButtons: "gap-4",
    formField: "gap-2",
    identityPreview: "border border-[#c7c2bc] bg-[#e9e5df] text-[#1d2020] rounded-none p-4",
    identityPreviewText: "text-[#1d2020]",
  },
};

export default function SignInPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const startDemoSession = useCreatePortalDemoSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await startDemoSession.mutateAsync({ data: { email, password } });
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: getGetPortalSessionQueryKey() });
      navigate("/dashboard", { replace: true });
    } catch {
      setPassword("");
    }
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] flex flex-col lg:flex-row bg-[#e9e5df] relative font-sans lg:overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")`
      }} />

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
          <span>{portalDemoMode ? portalTestAccessLabel : "Authorized Personnel Only"}</span>
        </div>
      </div>

      <div className="flex-1 lg:flex-none lg:w-[55%] flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 xl:p-24 relative bg-[#f4f1ed] z-10 min-h-0 lg:overflow-y-auto lg:h-full">
        <div className="w-full max-w-[420px] animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200 py-12 lg:py-24 my-auto">
          {portalDemoMode ? (
            <div className="space-y-8">
              <div>
                <h2 className="font-mono text-3xl tracking-tight text-[#1d2020]">Sign in to Larkin2</h2>
                <p className="mt-3 text-base text-[#625d58]">{import.meta.env.PROD ? "Temporary public testing access. Any valid email and non-empty password grants full access to production records. This is not secure authentication." : "Temporary sign-in for testing current development records. Any valid email and non-empty password will work here; this is not secure authentication."}</p>
              </div>
              <form className="space-y-5" onSubmit={handleDemoSignIn}>
                <div className="space-y-3">
                <label htmlFor="demo-email" className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#625d58]">
                  Email address
                </label>
                <Input
                  id="demo-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="h-14 rounded-none border-[#c7c2bc] bg-[#e9e5df] px-4 font-mono text-sm text-[#1d2020]"
                />
                </div>
                <div className="space-y-3">
                  <label htmlFor="demo-password" className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#625d58]">Password</label>
                  <Input id="demo-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" required className="h-14 rounded-none border-[#c7c2bc] bg-[#e9e5df] px-4 font-mono text-sm text-[#1d2020]" />
                </div>
              <Button
                type="submit"
                disabled={startDemoSession.isPending}
                className="h-14 w-full rounded-none bg-[#f4773f] font-mono text-xs font-bold uppercase tracking-wider text-[#080a0c] hover:bg-[#ff8d57]"
              >
                {startDemoSession.isPending ? "Signing in..." : "Sign in for testing"}
              </Button>
              {startDemoSession.isError && (
                <p role="alert" className="border border-[#ef625f] bg-[#ef625f]/10 p-3 text-sm text-[#9f2d2a]">
                  The testing session could not be started. Please try again.
                </p>
              )}
              </form>
            </div>
          ) : (
            <SignIn
              path={`${clerkBasePath}/sign-in`}
              routing="path"
              signUpUrl={`${clerkBasePath}/sign-up`}
              fallbackRedirectUrl={`${clerkBasePath}/dashboard`}
              appearance={paperAppearance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
