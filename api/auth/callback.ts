import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createSessionCookie,
  clearStateCookie,
  readStateCookie,
} from "../../lib/session";
import { getAdminIds } from "../../lib/slack";
import { baseUrl } from "../../lib/http";

interface TokenResponse {
  ok: boolean;
  access_token?: string;
}

interface UserInfoResponse {
  "https://slack.com/user_id"?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const expectedState = readStateCookie(req.headers.cookie);

  if (!code || !state || state !== expectedState) {
    res.status(400).send("로그인 검증에 실패했어요. 다시 시도해주세요.");
    return;
  }

  const redirectUri = `${baseUrl(req)}/api/auth/callback`;
  const tokenRes = (await fetch(
    "https://slack.com/api/openid.connect.token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    }
  ).then((r) => r.json())) as TokenResponse;

  if (!tokenRes.ok || !tokenRes.access_token) {
    res.status(401).send("Slack 인증에 실패했어요.");
    return;
  }

  const userInfo = (await fetch(
    "https://slack.com/api/openid.connect.userInfo",
    { headers: { Authorization: `Bearer ${tokenRes.access_token}` } }
  ).then((r) => r.json())) as UserInfoResponse;

  const slackUserId = userInfo["https://slack.com/user_id"];

  if (!slackUserId || !getAdminIds().includes(slackUserId)) {
    res.setHeader("Set-Cookie", clearStateCookie());
    res.status(403).send("관리자만 접근할 수 있어요.");
    return;
  }

  res.setHeader("Set-Cookie", [
    createSessionCookie(slackUserId),
    clearStateCookie(),
  ]);
  res.writeHead(302, { Location: "/dashboard" });
  res.end();
}
