export interface RegistrationProgramme {
  status: string;
  category?: string;
  registrationState?: "open" | "closed" | "unconfirmed" | null;
  registrationClosesOn?: string | null;
  deadline?: string | Date | null;
}

export function validRegistrationDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

/** Visibility and registration are separate. Date-only sources do not imply a timezone. */
export function programmeRegistration(programme: RegistrationProgramme, now = new Date()) {
  let state: "open" | "closed" | "unconfirmed" = programme.status === "published" ? "open" : "closed";
  if (programme.category === "training" && programme.status === "published") {
    state = programme.registrationState ?? "unconfirmed";
    if (state === "open") {
      if (programme.deadline) {
        const deadline = new Date(programme.deadline).getTime();
        state = !Number.isFinite(deadline) ? "unconfirmed" : now.getTime() >= deadline ? "closed" : "open";
      } else if (programme.registrationClosesOn) {
        if (!validRegistrationDate(programme.registrationClosesOn)) state = "unconfirmed";
        else {
          // Across UTC offsets -12..+14, the source date can start 14 hours early
          // and end 36 hours late. Disable applications throughout this uncertain window.
          const date = Date.parse(programme.registrationClosesOn);
          if (now.getTime() >= date + 36 * 3_600_000) state = "closed";
          else if (now.getTime() >= date - 14 * 3_600_000) state = "unconfirmed";
        }
      }
    }
  }
  return {
    state,
    canApply: state === "open" && programme.status === "published",
    // A missing source date is not a provider announcement that registration is unavailable.
    // Offer the provider's form without declaring registration open; known cutoffs stay gated.
    canVisitRegistrationForm: state === "unconfirmed" && programme.category === "training"
      && programme.status === "published" && !programme.deadline && !programme.registrationClosesOn,
    label: state === "unconfirmed" ? "Course registration"
      : programme.category === "training" ? `Registration ${state}` : `Applications ${state}`,
  };
}
