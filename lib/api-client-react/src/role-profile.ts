/** Fixed production-wide reference copy from the Bailey Role Profile template. */
export const PRODUCTION_CULTURE = [
  "This production recognises itself as a workplace as well as a creative endeavour. Our approach is practical, collaborative and grounded in the realities of high-end TV.",
  "We take a production support–led approach to culture. That means we actively plan for accessibility, career development, inclusion, sustainability and welfare. We put clear structures in place so support is embedded from the outset.",
  "Leadership is expected at every level and for it to be curious, accountable and human. Everyone—regardless of role or seniority—has a part to play in maintaining a respectful, safe and collaborative working environment.",
  "We ask people to bring their skill, their perspective and their responsibility to the production, and in return we commit to building an environment where everyone can thrive, grow and do work they’re proud of.",
  "This is a living approach to our productions that evolves from show to show, shaped by the people working on it. We’ve implemented this way of working across multiple productions and continue to learn from what works, what needs refining, and what our crews tell us matters most.",
] as const;
export const PRODUCTION_COMMITMENTS = [
  "Work in ways that support accessibility, including being open to reasonable adjustments and inclusive ways of working.",
  "Support others and look at opportunities for your own career development and progression, particularly where you are working with or managing others.",
  "Act in a way that reflects our commitment to diversity, equity and inclusion, both within your team and across the wider production.",
  "Take a responsible approach to sustainability, in line with production guidance and day-to-day practices.",
  "Treat welfare, including wellbeing and mental health as a shared responsibility, helping to create a respectful and supportive working environment.",
] as const;

/** Only permit agreed email or HTTP(S) destinations; never execute arbitrary schemes. */
export function roleApplicationTarget(role: { applicationEmail?: string | null; applicationUrl?: string | null }): string | undefined {
  if (role.applicationEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(role.applicationEmail)) {
    return `mailto:${role.applicationEmail}`;
  }
  if (!role.applicationUrl) return undefined;
  try {
    const url = new URL(role.applicationUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
