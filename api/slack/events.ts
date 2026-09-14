import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getRawBody,
  verifySlackSignature,
  extractMentions,
  countWhaleEmoji,
  postEphemeral,
  getAdminIds,
} from "../../lib/slack";
import { kstNow, kstDate, getDailySent, recordWhales } from "../../lib/db";

export const config = {
  api: { bodyParser: false },
};

const DAILY_LIMIT = 5;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(200).send("gorae-bot is running");
    return;
  }

  const rawBody = await getRawBody(req);
  const valid = verifySlackSignature(
    rawBody,
    req.headers["x-slack-request-timestamp"] as string | undefined,
    req.headers["x-slack-signature"] as string | undefined,
    process.env.SLACK_SIGNING_SECRET!
  );
  if (!valid) {
    res.status(401).send("invalid signature");
    return;
  }

  const payload = JSON.parse(rawBody) as Record<string, any>;

  if (payload.type === "url_verification") {
    res.status(200).send(payload.challenge);
    return;
  }

  if (payload.type === "event_callback") {
    // Slack retries delivery on slow/failed acks. We ack immediately below
    // and dedupe writes on (message_ts, recipient), so a retry is a safe
    // no-op; skip reprocessing to avoid a duplicate limit-exceeded warning.
    if (req.headers["x-slack-retry-num"]) {
      res.status(200).end();
      return;
    }
    res.status(200).end();
    await processMessageEvent(payload.event);
    return;
  }

  res.status(200).end();
}

async function processMessageEvent(event: any): Promise<void> {
  if (!event || event.type !== "message") return;
  if (event.subtype) return; // ignore edits, deletes, joins, bot_message, etc.
  if (event.bot_id) return;
  if (!event.user || !event.text) return;

  const whaleCount = countWhaleEmoji(event.text);
  if (whaleCount === 0) return;

  const recipients = extractMentions(event.text, event.user);
  if (recipients.length === 0) return;

  const totalNeeded = whaleCount * recipients.length;
  const now = kstNow();
  const today = kstDate(now);
  const isAdmin = getAdminIds().includes(event.user);

  if (!isAdmin) {
    const usedToday = await getDailySent(event.user, today);
    if (usedToday + totalNeeded > DAILY_LIMIT) {
      await postEphemeral(
        process.env.SLACK_BOT_TOKEN!,
        event.channel,
        event.user,
        `🐋 하루에 보낼 수 있는 고래는 최대 ${DAILY_LIMIT}개예요. 오늘 이미 ${usedToday}개를 보냈고, 이 메시지엔 ${totalNeeded}개가 필요해서 반영되지 않았어요.`
      );
      return;
    }
  }

  await recordWhales({
    sender: event.user,
    recipients,
    countEach: whaleCount,
    channel: event.channel,
    messageTs: event.ts,
    now,
  });
}
