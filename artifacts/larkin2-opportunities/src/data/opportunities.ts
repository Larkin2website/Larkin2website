export type OpportunityLink = {
  label: string;
  href: string;
};

export type OpportunityBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "links"; items: OpportunityLink[] };

export type OpportunitySection = {
  heading: string;
  blocks: OpportunityBlock[];
};

export type Opportunity = {
  id: string;
  num: string;
  cardTitle: string;
  cardCopy: string;
  cardCta: string;
  image: string;
  title: string;
  shortDescription: string;
  applicationStatus: "Open" | "Closed";
  applicationLink: string;
  location: string;
  sections: OpportunitySection[];
};

export const OPPORTUNITIES: Record<string, Opportunity> = {
  "first-credit": {
    id: "first-credit",
    num: "01",
    cardTitle: "Never worked in film or TV",
    cardCopy: "The First Credit Work Experience Programme has been designed to provide meaningful first industry experience for people who have had little or no opportunity to access the Film & Television industry.",
    cardCta: "Learn about First Credit",
    image: "first-credit-camera.webp",
    title: "First Credit Work Experience",
    shortDescription: "The First Credit Work Experience Programme has been designed to provide meaningful first industry experience for people who have had little or no opportunity to access the Film & Television industry.",
    applicationStatus: "Closed",
    applicationLink: "https://airtable.com/appfRovuxXYAc1ALL/pagOCOXepUDQCaqD6/form",
    location: "In person (studio base in North London, with location filming across Greater London)",
    sections: [
      {
        heading: "About the Programme",
        blocks: [
          { type: "paragraph", text: "The First Credit Work Experience Programme has been designed to provide meaningful first industry experience for people who have had little or no opportunity to access the Film & Television industry." },
          { type: "paragraph", text: "Delivered on Season 2 of a returning 60Forty Films production, the initiative offers participants the opportunity to gain practical experience within a High-End Television (HETV) drama production, whilst developing the confidence, knowledge and professional networks needed to take the next step in their career." },
          { type: "paragraph", text: "Whether you’re a recent graduate, school leaver, career changer or looking to transfer skills from another industry, First Credit has been designed to support you as you begin your journey into Film & Television." },
          { type: "paragraph", text: "Through structured training, supported placements and ongoing alumni activities, participants are given the opportunity to build both the practical experience and professional confidence needed to begin a career in Film & Television." },
          { type: "paragraph", text: "First Credit is about setting people up to succeed before they arrive on placement, supporting them throughout their time on production, and continuing to invest in their development long after their placement has ended." }
        ]
      },
      {
        heading: "Who Can Apply?",
        blocks: [
          { type: "paragraph", text: "The programme is open to applicants who:" },
          { type: "list", items: [
            "Are aged 18 or over.",
            "Have the right to live and work in the UK.",
            "Have no previous professional experience within the Film & Television industry.",
            "Are not currently in full-time education."
          ] },
          { type: "paragraph", text: "We particularly welcome applications from individuals from groups currently underrepresented within the UK Film & Television industry." }
        ]
      },
      {
        heading: "Training & Development",
        blocks: [
          { type: "paragraph", text: "Before beginning their placement, successful participants will take part in a three-day Training & Development programme designed to prepare them for working within a High-End Television production." },
          { type: "paragraph", text: "Topics may include, but are not limited to:" },
          { type: "list", items: [
            "Production Orientation",
            "Working on Set",
            "Health & Safety",
            "Professional Behaviour",
            "Inclusive Working Practices",
            "CV & Career Development",
            "Freelancing & Personal Finances",
            "Networking & Peer Learning Opportunities",
            "Industry Guest Speakers"
          ] },
          { type: "paragraph", text: "The training programme also provides participants with the opportunity to build relationships with fellow cohort members before stepping onto production. By learning alongside others beginning their careers in Film & Television, participants are able to develop a professional support network, share experiences and build confidence together before their placement begins." },
          { type: "paragraph", text: "Where appropriate, a small number of additional applicants may also be invited to attend the Training & Development programme, even where they are not offered a placement on this occasion. This enables us to continue supporting promising emerging talent whilst preparing individuals for future opportunities within the industry." }
        ]
      },
      {
        heading: "Work Experience Placement",
        blocks: [
          { type: "paragraph", text: "Following the Training & Development programme, participants will undertake a paid work experience placement lasting between one and two weeks (department dependent). Longlisted candidates will be informed of the placement length during the recruitment process." },
          { type: "paragraph", text: "Each participant will be supported by a dedicated Placement Supervisor within their department, alongside the Training & Development team, who will provide ongoing guidance and support throughout the placement." },
          { type: "paragraph", text: "Participants will also complete the programme as part of a wider cohort, creating opportunities to continue learning alongside one another, build professional networks and share their experiences throughout the placement." },
          { type: "paragraph", text: "Information on the departments available for Round 1 of The First Credit Work Experience programme are linked below:" },
          { type: "links", items: [
            { label: "Production", href: "https://docs.google.com/document/d/18X-h_yyvBX4Ncibl6-OA6wtzb3hu4-0A/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Locations", href: "https://docs.google.com/document/d/1CIwpvWVE5vc7xBA0gWYjEUgRrnHkV2Be/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Assistant Directors", href: "https://docs.google.com/document/d/1Ug49-616G4LH5HJ-FHp2YyJHqvBlFHJy/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Sustainability", href: "https://docs.google.com/document/d/1E7cSeEfuA0RralV2tBIdW0fV5wc42H8G/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Art", href: "https://docs.google.com/document/d/1cw0kleq5sEz9zAMdtZwWPLGiCjnLeTV1/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Costume", href: "https://docs.google.com/document/d/13B4IL9OwZgj3rRhhGM0iysAbnvN4JDh0/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Camera", href: "https://docs.google.com/document/d/185ozJVky7Oji6WeUz6Pa-UsVmWK7N8Hb/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" },
            { label: "Electric / Sparks", href: "https://docs.google.com/document/d/1DQ1HbjHdn-aomtX5WtHAflidtSN9vSbf/edit?usp=drive_link&ouid=111438882804408216156&rtpof=true&sd=true" }
          ] },
          { type: "paragraph", text: "Note: First Credit Work Experience Programme will run three times throughout the production. Each round will offer placements across a range of production departments. Please note that participating departments may vary between rounds depending on production requirements." },
          { type: "paragraph", text: "You can register your interest in future application windows. Email alerts are not currently enabled." }
        ]
      },
      {
        heading: "Alumni Activities",
        blocks: [
          { type: "paragraph", text: "Support doesn’t end when the placement finishes." },
          { type: "paragraph", text: "Following the programme, participants become part of the First Credit alumni network, where they will continue to receive guidance, industry updates and access to future development opportunities." },
          { type: "paragraph", text: "Over the following six months, participants will be invited to a series of monthly masterclasses designed to continue their professional development. Sessions will explore different areas of the Film & Television industry, build practical knowledge and respond to the needs identified by the cohort, ensuring participants continue to develop beyond their initial placement." }
        ]
      },
      {
        heading: "Programme Timeline & Structure",
        blocks: [
          { type: "paragraph", text: "Below is the timeline for Round 1 of The First Credit Work Experience Programme:" },
          { type: "list", items: [
            "Sunday 19 July: Application Deadline",
            "Monday 20 July – Friday 7 August: Stage 1 Review Period",
            "Monday 10 – Wednesday 26 August: Stage 2 Review Period",
            "Wednesday 9 – Friday 11 September: First Credit Training Course",
            "Monday 14 – Friday 18 September: Work Experience Placement Week #1",
            "Monday 28 September – Friday 2 October: Work Experience Placement Week #2"
          ] },
          { type: "paragraph", text: "Note: Dates are subject to change at the discretion of the production." },
          { type: "paragraph", text: "Below is some key information pertaining to the timeline:" },
          { type: "list", items: [
            "During the Stage 1 Review Period, you may be contacted by the production’s Training & Development team for a short pre-screening conversation to discuss your application. Please ensure your contact details are accurate and that you regularly check your emails and phone during this period. Incorrect contact details or an inability to reach you may affect your application.",
            "During the Stage 2 Review Period, you may be invited to attend an interview by the department you have applied for.",
            "Placement lengths vary by department, with some participants completing a one-week placement and others completing two weeks."
          ] }
        ]
      },
      {
        heading: "How to Apply",
        blocks: [
          { type: "paragraph", text: "To apply, complete the online application form linked below and upload the required supporting documents." },
          { type: "paragraph", text: "Applicants are welcome to apply for more than one department. However, a separate application must be submitted for each department." },
          { type: "paragraph", text: "Applications for Round 1 of the First Credit Work Experience Programme are now closed." },
          { type: "paragraph", text: "Note: As a reminder, due to the anticipated volume of applications, we’re unfortunately unable to provide individual feedback to unsuccessful applicants. If you have not been contacted by Wednesday 26 August 2026, please assume that you have been unsuccessful on this occasion." }
        ]
      }
    ]
  },
  "director-pathway": {
    id: "director-pathway",
    num: "02",
    cardTitle: "Already directing, want to move into HETV",
    cardCopy: "The Creative Leadership Shadowing Programme: Director Pathway is designed for experienced directors who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama.",
    cardCta: "Learn about the Director Pathway",
    image: "director-pathway-control-room.webp",
    title: "Creative Leadership Shadowing Programme: Director Pathway",
    shortDescription: "The Creative Leadership Shadowing Programme is designed for experienced directors who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama.",
    applicationStatus: "Closed",
    applicationLink: "https://airtable.com/appE9uXkUrlrYyd27/paghj2syKZ1yjn2ct/form",
    location: "In person (studio base in North London, with location filming across Greater London)",
    sections: [
      {
        heading: "About the Programme",
        blocks: [
          { type: "paragraph", text: "The Creative Leadership Shadowing Programme is designed for experienced directors who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama." },
          { type: "paragraph", text: "Delivered on Season 2 of 60Forty Films new Production, the programme provides a unique opportunity for participants to gain first-hand insight into the realities of creating large-scale television drama. Through extended shadowing placements, participants will observe and support the creative and practical decision-making that takes place across prep, production and post-production, gaining exposure to the pace, complexity and collaboration required to direct a HETV drama production." },
          { type: "paragraph", text: "The programme is intended to help participants bridge the gap between their existing experience and the demands of working at the scale of a high-end television drama production. Through direct exposure to senior creative leadership, participants will gain a deeper understanding of how large-scale drama productions are developed, shaped and delivered in practice." },
          { type: "paragraph", text: "Each Director Shadow will undertake a six-week placement aligned to a specific production block. This placement is a paid opportunity." }
        ]
      },
      {
        heading: "Who Can Apply?",
        blocks: [
          { type: "paragraph", text: "The Director Pathway is open to applicants who:" },
          { type: "list", items: [
            "Are aged 18 or over.",
            "Are a freelance director",
            "Have a clear ambition to build a long-term directing career in High-End Television drama.",
            "Demonstrate a strong and distinctive directorial voice through previous scripted work.",
            "Have experience working collaboratively with writers, producers, cast and crew.",
            "Have at least one directing (or 2nd unit directing) credit on either a distributed Feature OR High-End TV Drama. Please note, previous shadowing experience does not qualify."
          ] },
          { type: "paragraph", text: "We particularly welcome applications from individuals from groups currently underrepresented within the UK Film & Television industry." }
        ]
      },
      {
        heading: "Training & Development",
        blocks: [
          { type: "paragraph", text: "As part of the shadowing placement, the selected participant will have the opportunity to take part in selected training and development activities to support their transition into creative leadership roles within High-End Television drama. Topics may include:" },
          { type: "list", items: [
            "Production orientation",
            "Inclusive leadership and management within HETV productions",
            "Personal goal setting",
            "Networking and peer learning opportunities with fellow programme participants"
          ] }
        ]
      },
      {
        heading: "Programme Timeline & Structure",
        blocks: [
          { type: "list", items: [
            "Sunday 26th July: Application Deadline",
            "Wednesday 5th & Thursday 6th August: Interviews",
            "Thursday 6th – Friday 7th August: Offers and onboarding",
            "Monday 10th August onwards: Director Shadowing Placement (6 non-consecutive weeks across pre-production, shoot and post-production)*"
          ] },
          { type: "paragraph", text: "* Exact weeks to be determined with the final participant." },
          { type: "paragraph", text: "Note: Dates are subject to change at the discretion of the production." }
        ]
      },
      {
        heading: "How to Apply",
        blocks: [
          { type: "paragraph", text: "To apply, please complete the online application form linked below and upload the required supporting documents." },
          { type: "paragraph", text: "Applications for the Creative Leadership Shadowing Programme: Director Pathway are now closed." },
          { type: "paragraph", text: "Note: As a reminder, due to the anticipated volume of applications, we’re unfortunately unable to provide individual feedback to unsuccessful applicants. If you have not been contacted by Wednesday 5th August, please assume that you have been unsuccessful on this occasion." }
        ]
      }
    ]
  },
  "producer-pathway": {
    id: "producer-pathway",
    num: "03",
    cardTitle: "Already producing, want to move into HETV",
    cardCopy: "The Creative Leadership Shadowing Programme: Producer Pathway is designed for experienced producers who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama.",
    cardCta: "Learn about the Producer Pathway",
    image: "producer-pathway-monitor.webp",
    title: "Creative Leadership Shadowing Programme: Producer Pathway",
    shortDescription: "The Creative Leadership Shadowing Programme is designed for experienced producers who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama.",
    applicationStatus: "Closed",
    applicationLink: "https://airtable.com/appgIOIHfQbmkRFVT/paghj2syKZ1yjn2ct/form",
    location: "In person (studio base in North London, with location filming across Greater London)",
    sections: [
      {
        heading: "About the Programme",
        blocks: [
          { type: "paragraph", text: "The Creative Leadership Shadowing Programme is designed for experienced producers who have established their craft through scripted film and television and are seeking to progress their careers within High-End Television (HETV) drama." },
          { type: "paragraph", text: "Delivered on Season 2 of 60Forty Films new Production, the programme provides a unique opportunity for participants to gain first-hand insight into the realities of creating large-scale television drama. Through extended shadowing placements, participants will observe and support the creative and practical decision-making that takes place across prep, production and post-production, gaining exposure to the pace, complexity and collaboration required to deliver a HETV drama production." },
          { type: "paragraph", text: "The programme is intended to help participants bridge the gap between their existing experience and the demands of working at the scale of a high-end television drama production. Through direct exposure to senior creative leadership, participants will gain a deeper understanding of how large-scale drama productions are developed, shaped and delivered in practice." },
          { type: "paragraph", text: "The Producer Shadow will undertake an extended placement of up to 14 weeks. This placement is a paid opportunity." }
        ]
      },
      {
        heading: "Who Can Apply?",
        blocks: [
          { type: "paragraph", text: "The Producer Pathway is open to applicants who:" },
          { type: "list", items: [
            "Are aged 18 or over.",
            "Have the right to work in the UK.",
            "Are a freelance producer (not currently employed in an in-house producing role).",
            "Are able to evidence industry recognition through festival selections, awards, commissions, broadcast credits.",
            "Have a clear ambition to move into High-End Television (HETV) drama producing.",
            "Can demonstrate a strong interest in story development, script development, and the creative producing process.",
            "Have experience working collaboratively with writers, directors, and other creative stakeholders in a Producer capacity*"
          ] },
          { type: "paragraph", text: "Eligible applicants must have at least three credits producing narrative content, which may include:" },
          { type: "list", items: [
            "Scripted short films (they must have been screened at one or more BIFA recognised festivals)",
            "Independent features (that have been distributed)",
            "Documentary features (with a strong narrative focus)",
            "Scripted television (excluding high-end television)"
          ] },
          { type: "paragraph", text: "* For the purpose of this programme, relevant producer capacities include: Producer, Associate Producer, Co-Producer and Development Executive/Producer." },
          { type: "paragraph", text: "Applicants must not be currently working in a producing capacity (Producer, Associate Producer, Co-Producer) on a high-end television drama production. Applicants who have previously held producing roles in HETV may still be eligible where they have not worked in a producing capacity on a HETV drama production within the last 10 years and can demonstrate that the placement would support their return to the sector." },
          { type: "paragraph", text: "We particularly welcome applications from individuals from groups currently underrepresented within the UK Film & Television industry." }
        ]
      },
      {
        heading: "Training & Development",
        blocks: [
          { type: "paragraph", text: "As part of the shadowing placement, the selected participant will have the opportunity to take part in selected training and development activities to support their transition into creative leadership roles within High-End Television drama. Topics may include:" },
          { type: "list", items: [
            "Production orientation",
            "Inclusive leadership and management within HETV productions",
            "Personal goal setting",
            "Introduction to key production documents, including budgets and schedules",
            "Networking and peer learning opportunities with fellow programme participants"
          ] }
        ]
      },
      {
        heading: "Programme Timeline & Structure",
        blocks: [
          { type: "list", items: [
            "Sunday 26th July: Application Deadline",
            "Wednesday 5th & Thursday 6th August: Interviews",
            "Thursday 6th – Friday 7th August: Offers and onboarding",
            "Monday 10th August onwards (14 non-consecutive weeks)*: Producer Shadowing Placement"
          ] },
          { type: "paragraph", text: "* Exact weeks to be determined with the final participant." },
          { type: "paragraph", text: "Note: Dates are subject to change at the discretion of the production." }
        ]
      },
      {
        heading: "How to Apply",
        blocks: [
          { type: "paragraph", text: "To apply, please complete the online application form linked below and upload the required supporting documents." },
          { type: "paragraph", text: "Applications for the Creative Leadership Shadowing Programme: Producer Pathway are now closed." },
          { type: "paragraph", text: "Note: As a reminder, due to the anticipated volume of applications, we’re unfortunately unable to provide individual feedback to unsuccessful applicants. If you have not been contacted by Wednesday 5th August, please assume that you have been unsuccessful on this occasion." }
        ]
      }
    ]
  }
};