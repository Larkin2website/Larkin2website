type ApplicationFields = {
  applicationEmail?: string | null;
  applicationUrl?: string | null;
  applicationClosingDate?: string | null;
  applicationClosingTime?: string | null;
};

/** Cross-field rules complement the generated field validators. No defaults or inferred dates. */
export function roleProfileValidationError(input: ApplicationFields): string | undefined {
  if (input.applicationEmail && input.applicationUrl) return "Choose an agreed email address or an external platform URL, not both";
  if (input.applicationUrl) {
    try {
      if (!["https:", "http:"].includes(new URL(input.applicationUrl).protocol)) return "Application URL must use http or https";
    } catch { return "Enter a valid application URL"; }
  }
  if (input.applicationClosingDate) {
    const date = new Date(`${input.applicationClosingDate}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.applicationClosingDate) return "Enter a valid application closing date";
  }
  if (input.applicationClosingTime && !input.applicationClosingDate) return "Enter an application closing date with the closing time";
  return undefined;
}
