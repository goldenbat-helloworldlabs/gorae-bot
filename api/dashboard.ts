import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readSession } from "../lib/session";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const session = readSession(req.headers.cookie);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(session ? dashboardPage() : loginPage());
}

function loginPage(): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>칭찬고래 대시보드</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${sharedStyles()}</style>
</head>
<body>
  <div class="login-box">
    <div class="whale">🐋</div>
    <h1>칭찬고래 대시보드</h1>
    <p>관리자만 볼 수 있어요. Slack 계정으로 로그인해주세요.</p>
    <a class="btn" href="/api/auth/login">Slack으로 로그인</a>
  </div>
</body>
</html>`;
}

function dashboardPage(): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>칭찬고래 대시보드</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${sharedStyles()}</style>
</head>
<body>
  <header>
    <h1>🐋 칭찬고래 대시보드</h1>
    <div class="controls">
      <button id="prevMonth" aria-label="이전 달">◀</button>
      <input type="month" id="monthPicker" />
      <button id="nextMonth" aria-label="다음 달">▶</button>
      <a class="logout" href="/api/auth/logout">로그아웃</a>
    </div>
  </header>

  <main>
    <section class="board">
      <h2>보낸 고래 랭킹</h2>
      <ol id="sentList" class="ranking"></ol>
    </section>
    <section class="board">
      <h2>받은 고래 랭킹</h2>
      <ol id="receivedList" class="ranking"></ol>
    </section>
  </main>

  <p id="empty" class="empty" hidden>이 달엔 기록된 고래가 없어요.</p>

<script>
const monthPicker = document.getElementById('monthPicker');
const sentList = document.getElementById('sentList');
const receivedList = document.getElementById('receivedList');
const emptyNotice = document.getElementById('empty');

function currentMonthValue() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 7);
}

function shiftMonth(value, delta) {
  const [y, m] = value.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function renderList(el, rows) {
  el.innerHTML = '';
  if (rows.length === 0) return;
  for (const [i, row] of rows.entries()) {
    const li = document.createElement('li');
    const name = row.profile ? row.profile.name : row.user;
    const avatar = row.profile && row.profile.avatarUrl
      ? \`<img class="avatar" src="\${row.profile.avatarUrl}" alt="" />\`
      : '<div class="avatar avatar-fallback">🐋</div>';
    li.innerHTML = \`
      <span class="rank">\${i + 1}</span>
      \${avatar}
      <span class="name">\${escapeHtml(name)}</span>
      <span class="count">\${row.total}개</span>
    \`;
    el.appendChild(li);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadMonth(month) {
  const res = await fetch(\`/api/ranking?month=\${month}\`);
  if (res.status === 401) {
    location.href = '/dashboard';
    return;
  }
  const data = await res.json();
  renderList(sentList, data.sent);
  renderList(receivedList, data.received);
  emptyNotice.hidden = data.sent.length > 0 || data.received.length > 0;
}

monthPicker.value = currentMonthValue();
loadMonth(monthPicker.value);

monthPicker.addEventListener('change', () => loadMonth(monthPicker.value));
document.getElementById('prevMonth').addEventListener('click', () => {
  monthPicker.value = shiftMonth(monthPicker.value, -1);
  loadMonth(monthPicker.value);
});
document.getElementById('nextMonth').addEventListener('click', () => {
  monthPicker.value = shiftMonth(monthPicker.value, 1);
  loadMonth(monthPicker.value);
});
</script>
</body>
</html>`;
}

function sharedStyles(): string {
  return `
  :root {
    color-scheme: light dark;
    --bg: #f7f8fa;
    --card: #ffffff;
    --text: #1a1d23;
    --muted: #6b7280;
    --accent: #1264a3;
    --border: #e5e7eb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #16181d;
      --card: #202329;
      --text: #f2f3f5;
      --muted: #9ca3af;
      --accent: #4fa3e3;
      --border: #33363d;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", sans-serif;
  }
  .login-box {
    max-width: 360px;
    margin: 15vh auto;
    text-align: center;
    padding: 32px;
    background: var(--card);
    border-radius: 16px;
    border: 1px solid var(--border);
  }
  .whale { font-size: 48px; }
  .btn {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }
  header h1 { font-size: 20px; margin: 0; }
  .controls { display: flex; align-items: center; gap: 8px; }
  .controls button {
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
  }
  .controls input[type="month"] {
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    border-radius: 8px;
    padding: 6px 10px;
  }
  .logout {
    margin-left: 8px;
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
  }
  main {
    max-width: 900px;
    margin: 24px auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 640px) {
    main { grid-template-columns: 1fr; }
  }
  .board {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
  }
  .board h2 { font-size: 15px; margin: 0 0 12px; color: var(--muted); }
  .ranking { list-style: none; margin: 0; padding: 0; }
  .ranking li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--border);
  }
  .ranking li:last-child { border-bottom: none; }
  .rank {
    width: 22px;
    text-align: center;
    font-weight: 700;
    color: var(--muted);
  }
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--border);
  }
  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .name { flex: 1; }
  .count { font-weight: 600; color: var(--accent); }
  .empty {
    text-align: center;
    color: var(--muted);
    margin-top: 40px;
  }
  `;
}
