import { createHmac, timingSafeEqual } from "crypto";
import type { IncomingMessage } from "http";

export async function getRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function verifySlackSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
  signingSecret: string
): boolean {
  if (!timestamp || !signature) return false;

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number(timestamp) < fiveMinutesAgo) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hex = createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const computed = `v0=${hex}`;

  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function postEphemeral(
  botToken: string,
  channel: string,
  user: string,
  text: string
): Promise<void> {
  await fetch("https://slack.com/api/chat.postEphemeral", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ channel, user, text }),
  });
}

export async function postToResponseUrl(
  responseUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

export function extractMentions(text: string, sender: string): string[] {
  const matches = [...text.matchAll(/<@([A-Z0-9]+)(?:\|[^>]+)?>/g)].map(
    (m) => m[1]
  );
  const unique = Array.from(new Set(matches));
  return unique.filter((id) => id !== sender);
}

export function countWhaleEmoji(text: string): number {
  const unicode = text.match(/\u{1F40B}/gu) || [];
  const shortcode = text.match(/:whale:/g) || [];
  return unicode.length + shortcode.length;
}

export function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
