import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { createStateCookie } from "../../lib/session";
import { baseUrl } from "../../lib/http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${baseUrl(req)}/api/auth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "openid profile",
    redirect_uri: redirectUri,
    state,
  });

  res.setHeader("Set-Cookie", createStateCookie(state));
  res.writeHead(302, {
    Location: `https://slack.com/openid/connect/authorize?${params.toString()}`,
  });
  res.end();
}
