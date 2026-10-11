export type Role = {
  id: string;
  title: string;
  deadlineExtended?: boolean;
  featured?: boolean;
  urgent?: boolean;
  status: "Open" | "Filled" | "Closed";
  date: string;
  department: string;
  roleType: string;
  summary: string;
  responsibilities: string[];
  essential?: string[];
  desired?: string[];
  details: Array<{ label: string; value: string }>;
  applicationDeadline: string;
  responseDate?: string;
  applicationUrl?: string | null;
  accountableTo?: string | null;
  contractDatesHours?: string | null;
  workArrangement?: "in_person" | "hybrid" | "work_from_home" | null;
  worksCloselyWith?: string[];
  additionalInformation?: string | null;
  applicationEmail?: string | null;
  applicationClosingDate?: string | null;
  applicationClosingTime?: string | null;
  applicationInstructions?: string | null;
  trainingApplicationInstructions?: string | null;
};

const commonEligibility = "Applicants must be aged 18 or over, have the right to work in the UK, and be able to provide evidence of that right if selected.";

export const ROLES: Role[] = [
  {
    id: "access-coordinator",
    title: "Access Coordinator",
    deadlineExtended: true,
    featured: true,
    urgent: true,
    status: "Closed",
    date: "August 26, 2026",
    department: "Accessibility",
    roleType: "Part Time",
    summary: "Support disabled, deaf and neurodivergent cast and crew, advise production on access requirements, and help make the Larkin2 set and shoot inclusive.",
    responsibilities: [
      "Provide access-coordinator support for disclosing individuals, report back to production, and oversee agreed adjustments.",
      "Advise production on how to make sets, locations and shoots accessible.",
      "Support heads of department when recruiting diverse, disabled, deaf and neurodivergent crew.",
      "Attend production meetings and technical recces to anticipate access requirements for scenes and locations.",
      "Advise on accessible wording for call sheets and other production documents."
    ],
    essential: [
      "Lived experience of disability, deafness or neurodivergence.",
      "Experience working in a high-end television production environment.",
      "An understanding of television-production departments, responsibilities and hierarchies.",
      "Experience working alongside HR or people-and-culture teams on a high-end television production."
    ],
    desired: [
      "Experience working in a small department or as a consultant.",
      "Experience creating Easy Read documents.",
      "Confidence documenting access requirements and preparing memos and reports.",
      "A flexible schedule that can accommodate occasional nights and weekends on set."
    ],
    details: [
      { label: "Start date", value: "September 2026" },
      { label: "Location", value: "Hybrid / work from home" },
      { label: "Contract", value: "Part-time" },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Sunday 6 September 2026 at 23:59.",
    responseDate: "Shortlisted applicants will be contacted. If you have not heard by Friday 2 October 2026, please assume your application was unsuccessful."
  },
  {
    id: "1st-assistant-accountant",
    title: "1st Assistant Accountant",
    status: "Filled",
    date: "July 10, 2026",
    department: "Accounts",
    roleType: "Full Time",
    summary: "Support the production accounts team with cast payroll, payment information and the day-to-day resolution of accounts queries.",
    responsibilities: [
      "Process Equity payrolls.",
      "Produce cast information sheets, including residuals.",
      "Liaise with agents so cast payments can be made promptly and accurately.",
      "Help manage the accounts team, resolve queries and process urgent payments.",
      "Bring previous experience as a 1st Assistant Accountant or Cast/Stunts Payroll Accountant."
    ],
    details: [
      { label: "Start date", value: "July 2026" },
      { label: "Location", value: "Office based at the North London studio, with location filming across Greater London." },
      { label: "Contract", value: "Three days per week, ideally Monday to Wednesday, across prep, shoot and wrap." },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Friday 17 July 2026 at 12:00.",
    responseDate: "Only shortlisted applicants were contacted. The published outcome date was Monday 3 August 2026."
  },
  {
    id: "camera-trainee",
    title: "Camera Trainee",
    status: "Filled",
    date: "July 3, 2026",
    department: "Camera",
    roleType: "Full Time",
    summary: "Join the camera department on set and support its daily calls, equipment movements, battery management and production reporting.",
    responsibilities: [
      "Distribute call sheets, sides and cast lists to the department at the start of each day.",
      "Manage battery distribution and charging throughout the working day.",
      "Help move equipment to and from the camera truck and around sets.",
      "Manage food and drinks for camera-department colleagues who cannot leave set.",
      "Complete camera report sheets at the end of the day and send them to post production."
    ],
    details: [
      { label: "Dates", value: "July 2026 onwards" },
      { label: "Location", value: "In person on set, based at the North London studio with location filming across Greater London." },
      { label: "Contract", value: "Full time" },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Wednesday 8 July 2026 at 09:00.",
    responseDate: "Only shortlisted applicants were contacted. The published outcome date was Friday 31 July 2026."
  },
  {
    id: "trainee-assistant-editor",
    title: "Trainee Assistant Editor",
    status: "Filled",
    date: "June 22, 2026",
    department: "Post Production",
    roleType: "Full Time",
    summary: "Learn within the editorial team while supporting supervised media preparation, logging, exports and the safe operation of the edit suite.",
    responsibilities: [
      "Complete supervised labelling, logging and file-preparation tasks accurately.",
      "Practise the safe handling of drives, media and contributor materials.",
      "Assist with trainee-level logs, exports and review preparation when delegated.",
      "Learn edit-suite etiquette, confidentiality protocols and inclusive working practices.",
      "Record learning milestones with the 1st Assistant Editor and Training Manager.",
      "Contribute to the final trainee continuing-professional-development report at wrap."
    ],
    details: [
      { label: "Dates", value: "27 July 2026 to 30 July 2027, with a possible extension to 1 October 2027." },
      { label: "Location", value: "In person at the North London studio, with location filming across Greater London." },
      { label: "Working hours", value: "Standard 10-hour working day plus one hour." },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Monday 29 June 2026 at 12:00.",
    responseDate: "Only shortlisted applicants were contacted. The published outcome date was Friday 17 July 2026."
  },
  {
    id: "blocks-13-2nd-assistant-editor",
    title: "Blocks 1&3 2nd Assistant Editor",
    status: "Filled",
    date: "June 19, 2026",
    department: "Post Production",
    roleType: "Full Time",
    summary: "Support the editorial team with organised projects, media preparation, exports, turnovers and day-to-day technical checks.",
    responsibilities: [
      "Maintain tidy, clearly labelled projects and make sure backups are completed.",
      "Support media preparation for viewing copies, assemblies and director’s cuts.",
      "Prepare and update sequences as directed by the 1st Assistant Editor or Editor.",
      "Generate reference exports, cut notes and continuity logs for reviews.",
      "Troubleshoot basic technical issues or escalate them, and check turnovers before circulation.",
      "Help prepare turnovers for sound, visual effects and online, including AAFs, EDLs and reference QuickTimes."
    ],
    details: [
      { label: "Dates", value: "27 July 2026 to 30 July 2027, with a possible extension to 1 October 2027." },
      { label: "Location", value: "In person at the North London studio, with location filming across Greater London." },
      { label: "Working hours", value: "Standard 10-hour working day plus one hour." },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Monday 29 June 2026 at 12:00.",
    responseDate: "Only shortlisted applicants were contacted. The published outcome date was Friday 17 July 2026."
  },
  {
    id: "costume-coordinator",
    title: "Costume Coordinator",
    status: "Filled",
    date: "June 10, 2026",
    department: "Costume",
    roleType: "Full Time",
    summary: "Coordinate the Costume Office’s logistics, administration, costs and facilities while supporting the Supervisor and Design Team.",
    responsibilities: [
      "Take responsibility for office- and prep-based logistics and administration.",
      "Help the Supervisor track costs and support the Design Team’s transport and facilities requirements.",
      "Support the department’s daily logistics, including the Costume Driver route.",
      "Support the Costume Office workflow and provide senior cover when the Costume Supervisor is absent."
    ],
    details: [
      { label: "Dates", value: "Late June 2026 to February or March 2027, during office hours." },
      { label: "Location", value: "In person at the North London studio, with location filming across Greater London." },
      { label: "Contract", value: "Full time" },
      { label: "Eligibility", value: commonEligibility }
    ],
    applicationDeadline: "Applications closed Thursday 18 June 2026 at 09:00.",
    responseDate: "Only shortlisted applicants were contacted. The published outcome date was Friday 3 July 2026."
  }
];

export const ROLES_BY_ID = Object.fromEntries(ROLES.map((role) => [role.id, role])) as Record<string, Role>;