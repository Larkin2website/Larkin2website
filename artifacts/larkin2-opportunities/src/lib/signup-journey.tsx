import { createContext, useContext, useState, type ReactNode } from "react";

type SignupDraft = { name: string; email: string };
type SignupJourney = {
  draft: SignupDraft | null;
  setDraft: (draft: SignupDraft | null) => void;
};

const SignupJourneyContext = createContext<SignupJourney | null>(null);

export function SignupJourneyProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SignupDraft | null>(null);
  return <SignupJourneyContext.Provider value={{ draft, setDraft }}>{children}</SignupJourneyContext.Provider>;
}

export function useSignupJourney() {
  const journey = useContext(SignupJourneyContext);
  if (!journey) throw new Error("SignupJourneyProvider is missing");
  return journey;
}