import { sql } from "@vercel/postgres";

export function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export function kstDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function kstMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export async function getDailySent(
  sender: string,
  date: string
): Promise<number> {
  const { rows } = await sql<{ used: number }>`
    SELECT COALESCE(SUM(count), 0) AS used
    FROM whale_events
    WHERE sender = ${sender} AND event_date = ${date}
  `;
  return Number(rows[0]?.used ?? 0);
}

export async function recordWhales(params: {
  sender: string;
  recipients: string[];
  countEach: number;
  channel: string;
  messageTs: string;
  now: Date;
}): Promise<void> {
  const date = kstDate(params.now);
  const month = kstMonth(params.now);

  for (const recipient of params.recipients) {
    await sql`
      INSERT INTO whale_events
        (sender, recipient, count, message_ts, channel, event_date, event_month)
      VALUES
        (${params.sender}, ${recipient}, ${params.countEach}, ${params.messageTs}, ${params.channel}, ${date}, ${month})
      ON CONFLICT (message_ts, recipient) DO NOTHING
    `;
  }
}

export interface RankRow {
  user: string;
  total: number;
}

export async function getSentRanking(month: string): Promise<RankRow[]> {
  const { rows } = await sql<{ user: string; total: number }>`
    SELECT sender AS user, SUM(count) AS total
    FROM whale_events
    WHERE event_month = ${month}
    GROUP BY sender
    ORDER BY total DESC
  `;
  return rows.map((r) => ({ user: r.user, total: Number(r.total) }));
}

export async function getReceivedRanking(month: string): Promise<RankRow[]> {
  const { rows } = await sql<{ user: string; total: number }>`
    SELECT recipient AS user, SUM(count) AS total
    FROM whale_events
    WHERE event_month = ${month}
    GROUP BY recipient
    ORDER BY total DESC
  `;
  return rows.map((r) => ({ user: r.user, total: Number(r.total) }));
}
