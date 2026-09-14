import { sql } from "@vercel/postgres";

export interface SlackProfile {
  id: string;
  name: string;
  avatarUrl: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getUserProfiles(
  ids: string[]
): Promise<Record<string, SlackProfile>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return {};

  const { rows: cached } = await sql.query<{
    id: string;
    name: string;
    avatar_url: string;
    updated_at: string;
  }>(
    `SELECT id, name, avatar_url, updated_at FROM user_profiles WHERE id = ANY($1)`,
    [unique]
  );

  const now = Date.now();
  const result: Record<string, SlackProfile> = {};
  const stale: string[] = [];

  for (const id of unique) {
    const row = cached.find((r) => r.id === id);
    if (row && now - new Date(row.updated_at).getTime() < CACHE_TTL_MS) {
      result[id] = { id, name: row.name, avatarUrl: row.avatar_url };
    } else {
      stale.push(id);
    }
  }

  await Promise.all(
    stale.map(async (id) => {
      const profile = (await fetchSlackUser(id)) ?? {
        id,
        name: id,
        avatarUrl: "",
      };
      result[id] = profile;
      await sql`
        INSERT INTO user_profiles (id, name, avatar_url, updated_at)
        VALUES (${profile.id}, ${profile.name}, ${profile.avatarUrl}, now())
        ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = now()
      `;
    })
  );

  return result;
}

interface SlackUsersInfoResponse {
  ok: boolean;
  user?: {
    name: string;
    profile?: {
      display_name?: string;
      real_name?: string;
      image_72?: string;
    };
  };
}

async function fetchSlackUser(id: string): Promise<SlackProfile | null> {
  const res = (await fetch(
    `https://slack.com/api/users.info?user=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  ).then((r) => r.json())) as SlackUsersInfoResponse;

  if (!res.ok || !res.user) return null;

  const profile = res.user?.profile ?? {};
  return {
    id,
    name: profile.display_name || profile.real_name || res.user.name || id,
    avatarUrl: profile.image_72 || "",
  };
}
