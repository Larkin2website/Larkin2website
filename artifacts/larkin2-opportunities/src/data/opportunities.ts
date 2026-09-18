export type Opportunity = {
  id: string;
  num: string;
  cardTitle: string;
  cardCopy: string;
  cardCta: string;
  image: string;
  title: string;
  shortDescription: string;
  applicationStatus: string;
  location: string;
  about: string[];
  placement: string[];
  training: string[];
  eligibility: string[];
  timeline: string[];
  applicationGuidance: string[];
};

export const OPPORTUNITIES: Record<string, Opportunity> = {
  "first-credit": {
    id: "first-credit",
    num: "01",
    cardTitle: "Never worked in film or TV",
    cardCopy: "Three days of training, a paid production placement and six months of alumni masterclasses. No experience or industry contacts required.",
    cardCta: "Learn about First Credit",
    image: "first-credit-camera.webp",
    title: "First Credit Work Experience",
    shortDescription: "The First Credit Work Experience Programme provides individuals with little or no industry access an entry point into Film & Television. The initiative supports graduates, school leavers, and career changers by combining structured training with practical, on-set experience on a High-End Television (HETV) drama production.",
    applicationStatus: "Closed",
    location: "In person (studio base in North London, with location filming across Greater London)",
    about: [
      "The programme is designed to provide meaningful first industry experience for those with little or no previous access to the Film & Television sector.",
      "Delivered on a returning major HETV production, the initiative builds practical skills, professional networks, and confidence through structured training and supported placements.",
      "The programme includes ongoing alumni support, such as monthly masterclasses for six months, to assist with long-term professional development after the placement concludes."
    ],
    placement: [
      "Paid work experience placement lasting between one and two weeks, depending on the department.",
      "Participants are assigned a dedicated Placement Supervisor and receive ongoing support from the Training & Development team.",
      "Placements cover various departments including Production, Locations, Assistant Directors, Sustainability, Art, Costume, Camera, and Electric/Sparks."
    ],
    training: [
      "A three-day Training & Development course precedes the placement, covering topics such as production orientation, working on set, health & safety, professional behaviour, inclusive working practices, and CV development.",
      "The training fosters peer networking and helps participants build support systems before starting their placements."
    ],
    eligibility: [
      "Aged 18 or over",
      "Right to live and work in the UK",
      "No previous professional experience within the Film & Television industry",
      "Not currently in full-time education"
    ],
    timeline: [
      "Application Deadline: Sunday 19 July",
      "Stage 1 Review Period: Monday 20 July – Friday 7 August",
      "Stage 2 Review Period: Monday 10 – Wednesday 26 August",
      "Training Course: Wednesday 9 – Friday 11 September",
      "Placement Week #1: Monday 14 – Friday 18 September",
      "Placement Week #2: Monday 28 September – Friday 2 October"
    ],
    applicationGuidance: [
      "Complete the online application form and upload supporting documents.",
      "Multiple applications are allowed, but a separate application must be submitted for each department.",
      "If not contacted by Wednesday 26 August 2026, applicants should assume they have been unsuccessful."
    ]
  },
  "director-pathway": {
    id: "director-pathway",
    num: "02",
    cardTitle: "Already directing, want to move into HETV",
    cardCopy: "A paid six-week placement across prep, shoot and post for freelance directors with a qualifying screen credit.",
    cardCta: "Learn about the Director Pathway",
    image: "director-pathway-control-room.webp",
    title: "Creative Leadership Shadowing Programme: Director Pathway",
    shortDescription: "A development programme for experienced directors transitioning into High-End Television (HETV) drama through extended shadowing on a major HETV production.",
    applicationStatus: "Closed",
    location: "In-person at a studio base in North London, with location filming across Greater London",
    about: [
      "The programme enables experienced directors to observe and support creative decision-making across prep, production, and post-production on a major HETV drama.",
      "It aims to bridge the gap between existing experience and the specific scale and complexity requirements of high-end television production."
    ],
    placement: [
      "Six-week paid placement aligned with a specific production block.",
      "Placement occurs over 6 non-consecutive weeks covering pre-production, shoot, and post-production stages."
    ],
    training: [
      "Production orientation",
      "Inclusive leadership and management within HETV",
      "Personal goal setting",
      "Networking and peer learning"
    ],
    eligibility: [
      "Aged 18 or over",
      "Freelance director",
      "Clear ambition for a career in HETV drama",
      "Strong and distinctive directorial voice",
      "Proven experience working collaboratively with cast and crew",
      "At least one directing or 2nd unit directing credit on a distributed Feature or HETV drama (shadowing experience excluded)",
      "Applications from underrepresented groups in the UK film/TV industry are particularly welcomed"
    ],
    timeline: [
      "Sunday 26th July: Application Deadline",
      "Wednesday 5th & Thursday 6th August: Interviews",
      "Thursday 6th – Friday 7th August: Offers and onboarding",
      "Monday 10th August onwards: Placement start (dates subject to change)"
    ],
    applicationGuidance: [
      "Submit an online application form with required supporting documents.",
      "No individual feedback available for unsuccessful applicants.",
      "If not contacted by Wednesday 5th August, applicants are considered unsuccessful."
    ]
  },
  "producer-pathway": {
    id: "producer-pathway",
    num: "03",
    cardTitle: "Already producing, want to move into HETV",
    cardCopy: "A paid placement of up to fourteen weeks across prep, production and post for experienced freelance producers.",
    cardCta: "Learn about the Producer Pathway",
    image: "producer-pathway-monitor.webp",
    title: "Creative Leadership Shadowing Programme: Producer Pathway",
    shortDescription: "A shadowing programme for experienced producers seeking to progress into High-End Television (HETV) drama through an extended, paid placement on a major HETV production.",
    applicationStatus: "Closed",
    location: "North London (studio base) with location filming across Greater London",
    about: [
      "The programme enables experienced scripted film and television producers to observe and support creative and practical decision-making across prep, production, and post-production.",
      "It aims to bridge the gap between participants' existing experience and the specific scale and complexity demands of HETV drama by offering direct exposure to senior creative leadership.",
      "Participants gain insight into the pace, collaboration, and delivery of large-scale productions."
    ],
    placement: [
      "Paid shadowing placement lasting up to 14 weeks.",
      "The 14 weeks are non-consecutive, with exact timing to be determined with the final participant."
    ],
    training: [
      "Production orientation",
      "Inclusive leadership and management in HETV",
      "Personal goal setting",
      "Introduction to key production documents (budgets and schedules)",
      "Networking and peer learning opportunities"
    ],
    eligibility: [
      "Aged 18 or over and have the right to work in the UK.",
      "Must be a freelance producer (not currently in an in-house role) and not currently working on an HETV drama.",
      "Evidence of at least three credits in narrative content (short films, features, or non-HETV TV), plus industry recognition through awards, festivals, or commissions.",
      "Demonstrable ambition to work in HETV, interest in story/script development, and experience collaborating with writers and directors.",
      "Previous HETV producers may be eligible if they have not worked in that capacity for 10 years.",
      "Applications from underrepresented groups in the UK industry are welcomed."
    ],
    timeline: [
      "Sunday 26th July: Application Deadline",
      "Wednesday 5th & Thursday 6th August: Interviews",
      "Thursday 6th – Friday 7th August: Offers and onboarding",
      "Monday 10th August onwards: Placement begins"
    ],
    applicationGuidance: [
      "Complete the online application form and upload required supporting documents.",
      "Due to high volume, individual feedback is not provided.",
      "If not contacted by Wednesday 5th August, applicants should assume they were unsuccessful."
    ]
  }
};
