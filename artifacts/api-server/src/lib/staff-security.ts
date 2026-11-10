import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export class StaffAuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const same = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export function staffConfig(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.SESSION_SECRET ?? "";
  let origin: URL;
  try { origin = new URL(env.STAFF_AUTH_ORIGIN ?? ""); }
  catch { throw new StaffAuthError(503, "Staff sign-in is not configured. Contact your administrator."); }
  const local = env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  if (secret.length < 32 || (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))
    || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new StaffAuthError(503, "Staff sign-in is not configured. Contact your administrator.");
  }
  return { secret, origin: origin.origin };
}
export const csrfFor = (hash: string) => createHmac("sha256", staffConfig().secret).update(`csrf:${hash}`).digest("base64url");
export function mailToken(id: string, nonce: string, secret = staffConfig().secret) {
  return createHmac("sha256", secret).update(`staff-link:${id}:${nonce}`).digest("base64url");
}
let running = 0;
const waiting: Array<() => void> = [];
async function derive(password: string, salt: string): Promise<Buffer> {
  if (running >= 2) {
    if (waiting.length >= 8) throw new StaffAuthError(429, "Sign-in is busy. Please try again shortly.");
    await new Promise<void>(resolve => waiting.push(resolve));
  } else running++;
  try {
    // OWASP scrypt option N=2^16,r=8,p=2; ~64 MiB per operation, at most two.
    return await new Promise((resolve, reject) => scrypt(password, salt, 64,
      { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 },
      (err, key) => err ? reject(err) : resolve(key)));
  } finally {
    const next = waiting.shift();
    if (next) next(); else running--;
  }
}
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new StaffAuthError(400, "Use a password between 12 and 128 characters.");
  const salt = randomBytes(16).toString("base64url");
  return `scrypt-65536-8-2$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  const match = encoded?.match(/^scrypt-65536-8-2\$([A-Za-z0-9_-]{22})\$([a-f0-9]{128})$/);
  const actual = await derive(password, match?.[1] ?? "0000000000000000000000");
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && Boolean(match);
}
