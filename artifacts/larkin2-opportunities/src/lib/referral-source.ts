export const referralSources = [
  { value: "instagram", label: "Instagram", prompt: "Which Instagram account or post?" },
  { value: "linkedin", label: "LinkedIn", prompt: "Which person, page, or post on LinkedIn?" },
  { value: "whatsapp_group", label: "WhatsApp group", prompt: "What is the group called? Please do not share private group content." },
  { value: "facebook_group", label: "Facebook group", prompt: "What is the group called?" },
  { value: "industry_network", label: "Industry organisation/network", prompt: "Which industry organisation or network?" },
  { value: "recommendation", label: "Recommendation / word of mouth", prompt: "Who recommended us? A name is optional." },
  { value: "other", label: "Other", prompt: "Where did you see or hear about us?" },
] as const;

export type ReferralSource = typeof referralSources[number]["value"];

export function isReferralSource(value: string): value is ReferralSource {
  return referralSources.some(source => source.value === value);
}

export function referralPrompt(value: string) {
  return referralSources.find(source => source.value === value)?.prompt ?? "Add any detail you would like to share.";
}