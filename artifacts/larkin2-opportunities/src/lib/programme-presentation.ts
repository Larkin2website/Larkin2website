/** The two approved development pathways; training has its own explicit category. */
export const DEVELOPMENT_SLUGS = ["director-pathway", "producer-pathway"];

/** Target only the approved development-detail notes, not the general FAQ or stored records. */
export function developmentDetailContent(slug: string, content: string): string {
  if (!DEVELOPMENT_SLUGS.includes(slug)) return content;
  return content
    .replace(/(?:Note:\s*)?As a reminder, due to the anticipated volume of applications, we[’']re unfortunately unable to provide individual feedback to unsuccessful applicants\.\s*/gi, "")
    .replace(/No individual feedback available for unsuccessful applicants\.?\s*/gi, "")
    .replace(/Due to high volume, individual feedback is not provided\.\s*/gi, "")
    .replace(/(?:We[’']re|We are|We will be|We are unfortunately|We[’']re unfortunately)\s+(?:unable to|not able to)\s+provide individual feedback(?: to unsuccessful applicants)?\.\s*/gi, "")
    .trim();
}

export function splitPublicProgrammes<T extends { status: string }>(programmes: T[]) {
  return {
    current: programmes.filter((programme) => programme.status === "published"),
    previous: programmes.filter((programme) => programme.status === "closed"),
  };
}

import { useEffect, useState } from "react";
import { programmeRegistration } from "@workspace/programme-content/registration";

/** Clock that ticks so date cutoffs update in an already-open page. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const LIVE_QUERY_OPTIONS = { staleTime: 60_000, retry: 2, refetchInterval: 5 * 60_000, refetchOnWindowFocus: true } as const;

type Registerable = Parameters<typeof programmeRegistration>[0];

/** Live (published/closed) records grouped by true registration state. Draft/archived never shown. */
export function groupByRegistration<T extends Registerable>(programmes: T[], now: Date) {
  const groups = { open: [] as T[], unconfirmed: [] as T[], closed: [] as T[] };
  for (const programme of programmes) {
    if (programme.status !== "published" && programme.status !== "closed") continue;
    groups[programmeRegistration(programme, now).state].push(programme);
  }
  return groups;
}

export function isTraining(programme: { category?: string }) {
  return programme.category === "training";
}
