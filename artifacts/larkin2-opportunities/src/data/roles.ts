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
  url: string;
};

export const ROLES: Role[] = [
  {
    id: "access-coordinator",
    title: "Access Coordinator",
    deadlineExtended: true,
    featured: true,
    urgent: true,
    status: "Open",
    date: "August 26, 2026",
    department: "Accessibility",
    roleType: "Temporary",
    url: "https://larkin2opportunities.com/job/access-coordinator/"
  },
  {
    id: "1st-assistant-accountant",
    title: "1st Assistant Accountant",
    status: "Filled",
    date: "July 10, 2026",
    department: "Accounts",
    roleType: "Full Time",
    url: "https://larkin2opportunities.com/job/1st-assistant-accountant/"
  },
  {
    id: "camera-trainee",
    title: "Camera Trainee",
    status: "Filled",
    date: "July 3, 2026",
    department: "Camera",
    roleType: "Full Time",
    url: "https://larkin2opportunities.com/job/camera-trainee/"
  },
  {
    id: "trainee-assistant-editor",
    title: "Trainee Assistant Editor",
    status: "Filled",
    date: "June 22, 2026",
    department: "Post Production",
    roleType: "Full Time",
    url: "https://larkin2opportunities.com/job/trainee-assistant-editor/"
  },
  {
    id: "blocks-13-2nd-assistant-editor",
    title: "Blocks 1&3 2nd Assistant Editor",
    status: "Filled",
    date: "June 19, 2026",
    department: "Post Production",
    roleType: "Full Time",
    url: "https://larkin2opportunities.com/job/blocks-13-2nd-assistant-editor/"
  },
  {
    id: "costume-coordinator",
    title: "Costume Coordinator",
    status: "Filled",
    date: "June 10, 2026",
    department: "Costume",
    roleType: "Full Time",
    url: "https://larkin2opportunities.com/job/costume-coordinator/"
  }
];
