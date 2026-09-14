import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readSession } from "../lib/session";
import { kstNow, kstMonth, getSentRanking, getReceivedRanking } from "../lib/db";
import { getUserProfiles } from "../lib/users";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const session = readSession(req.headers.cookie);
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const month = (req.query.month as string) || kstMonth(kstNow());
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "invalid month" });
    return;
  }

  const [sent, received] = await Promise.all([
    getSentRanking(month),
    getReceivedRanking(month),
  ]);

  const profiles = await getUserProfiles([
    ...sent.map((r) => r.user),
    ...received.map((r) => r.user),
  ]);

  res.status(200).json({
    month,
    sent: sent.map((r) => ({ ...r, profile: profiles[r.user] ?? null })),
    received: received.map((r) => ({ ...r, profile: profiles[r.user] ?? null })),
  });
}
