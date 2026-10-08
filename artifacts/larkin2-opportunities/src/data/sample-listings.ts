import type { Role } from "./roles";

export const SAMPLE_ROLE_ID = "sample-round-2-role";

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
