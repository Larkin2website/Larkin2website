import type { PublicProgramme } from "@workspace/api-client-react";
import type { Role } from "./roles";

export const SAMPLE_ROLE_ID = "sample-round-2-role";
export const SAMPLE_PROGRAMME_SLUG = "sample-round-2-programme";

export const SAMPLE_ROLE: Role = {
  id: SAMPLE_ROLE_ID,
  title: "Example production role",
  status: "Closed",
  date: "Example listing",
  department: "Production",
  roleType: "Example role type",
  summary: "This development preview demonstrates how a role listing and its details may appear.",
  responsibilities: [
    "Example responsibility shown for layout and review purposes only.",
  ],
  essential: ["Example requirement shown for layout and review purposes only."],
  details: [{ label: "Example detail", value: "Illustrative content only" }],
  applicationDeadline: "No application deadline — this is not a real opening.",
  applicationUrl: null,
};

export const SAMPLE_PROGRAMME: PublicProgramme = {
  id: "sample-round-2-programme-id",
  slug: SAMPLE_PROGRAMME_SLUG,
  num: "EXAMPLE",
  cardTitle: "Example programme",
  cardCopy: "An illustrative programme card for the development preview.",
  cardCta: "View example programme",
  image: "first-credit-camera.webp",
  title: "Example HETV development programme",
  shortDescription: "Illustrative programme content for preview and review only. This is not an application opportunity.",
  status: "closed",
  applicationStatus: "Example only — not accepting applications",
  location: "Example location",
  applicationUrl: null,
  applicationDeadline: null,
  deadline: null,
  featured: false,
  displayOrder: 0,
  about: ["Example programme information shown for layout and review purposes only."],
  placement: [],
  training: ["Example training information."],
  eligibility: [],
  timeline: [],
  applicationGuidance: ["This sample is not a real programme and has no application link."],
};