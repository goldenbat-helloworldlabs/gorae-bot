import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "gorae_session";
const STATE_COOKIE = "gorae_oauth_state";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
const STATE_MAX_AGE_SEC = 60 * 10; // 10 minutes

function sign(payload: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("hex");
}

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const found = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export function createSessionCookie(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const value = `${encoded}.${sign(encoded)}`;
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readSession(
  cookieHeader: string | undefined
): { uid: string } | null {
  const value = getCookie(cookieHeader, SESSION_COOKIE);
  if (!value) return null;

  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) return null;

  const expected = sign(encoded);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export function createStateCookie(state: string): string {
  return `${STATE_COOKIE}=${state}; HttpOnly; Secure; Path=/; Max-Age=${STATE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE}=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readStateCookie(cookieHeader: string | undefined): string | null {
  return getCookie(cookieHeader, STATE_COOKIE);
}
