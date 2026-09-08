import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

export const clerkBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return clerkBasePath && path.startsWith(clerkBasePath)
    ? path.slice(clerkBasePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: clerkBasePath || "/",
    logoImageUrl: `${window.location.origin}${clerkBasePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f4773f",
    colorForeground: "#f4f1ed",
    colorMutedForeground: "#a5aaab",
    colorDanger: "#ef625f",
    colorBackground: "#171b1d",
    colorInput: "#101315",
    colorInputForeground: "#f4f1ed",
    colorNeutral: "#3a4042",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.45rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[#171b1d] rounded-xl w-[440px] max-w-full overflow-hidden border border-[#303638]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f4f1ed]",
    headerSubtitle: "text-[#a5aaab]",
    socialButtonsBlockButtonText: "text-[#f4f1ed]",
    formFieldLabel: "text-[#f4f1ed]",
    footerActionLink: "text-[#f4773f]",
    footerActionText: "text-[#a5aaab]",
    dividerText: "text-[#a5aaab]",
    identityPreviewEditButton: "text-[#f4773f]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-[#f4f1ed]",
    logoBox: "h-10",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton:
      "border border-[#3a4042] bg-[#101315] text-[#f4f1ed]",
    formButtonPrimary:
      "bg-[#f4773f] text-[#101315] font-semibold hover:bg-[#ff8d57]",
    formFieldInput:
      "bg-[#101315] border-[#3a4042] text-[#f4f1ed] focus:border-[#f4773f] focus:ring-[#f4773f]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#3a4042]",
    alert: "border border-[#5b3531] bg-[#2a1918]",
    otpCodeFieldInput:
      "bg-[#101315] border-[#3a4042] text-[#f4f1ed]",
    formFieldRow: "text-[#f4f1ed]",
    main: "gap-5",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        previousUserId.current !== undefined &&
        previousUserId.current !== userId
      ) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

export function AppClerkProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${clerkBasePath}/sign-in`}
      signUpUrl={`${clerkBasePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to manage Larkin2 opportunities",
          },
        },
        signUp: {
          start: {
            title: "Request portal access",
            subtitle: "Create your account for administrator approval",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      {children}
    </ClerkProvider>
  );
}