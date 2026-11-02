export type EmailFailureCode = "daily_limit" | "monthly_limit" | "rate_limited" | "unconfigured" | "unavailable" | "stale" | "unknown";
const messages: Record<EmailFailureCode, string> = {
  daily_limit: "Daily sending capacity is exhausted or reserved for essential mail. Upgrade your Resend plan to send more now, or wait for the allowance to reset.",
  monthly_limit: "Monthly sending capacity is exhausted or reserved for essential mail. Upgrade your Resend plan to send more now, or wait for the allowance to reset.",
  rate_limited: "Resend is temporarily rate limiting requests. Sending will resume after a short wait; a plan upgrade is not necessarily required.",
  unconfigured: "Email configuration is incomplete or its permissions are invalid. An administrator must check the approved Resend settings.",
  unavailable: "Resend is unavailable. Sending is paused until account usage and delivery can be checked safely.",
  stale: "Email usage is out of date. Sending is paused until the account allowance can be confirmed.",
  unknown: "Email acceptance is uncertain. Check the provider record before retrying; automatic sending is paused for this message.",
};
export class EmailDeliveryError extends Error {
  constructor(public code: EmailFailureCode, public retryAt?: Date, public uncertain = false) {
    super(messages[code]);
    this.name = "EmailDeliveryError";
  }
}
