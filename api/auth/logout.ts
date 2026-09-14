import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookie } from "../../lib/session";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.writeHead(302, { Location: "/dashboard" });
  res.end();
}
