// Daily.co server helpers — rooms + short-lived meeting tokens for 1:1 tutor
// video calls. The API key never leaves the server; clients only ever receive
// a room URL plus a scoped token. Null when unconfigured (routes answer 501),
// mirroring the Stripe/OpenAI graceful-degradation pattern.

const API = 'https://api.daily.co/v1';

export function dailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY);
}

async function daily(path, body) {
  const res = await fetch(`${API}${path}`, {
    signal: AbortSignal.timeout(15000),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.info || data?.error || `Daily ${path} failed (${res.status})`);
  return data;
}

// Create (or fetch, on name conflict) the private room for a tutoring session.
// Expires 2h after the scheduled end so stale links die on their own.
// maxParticipants defaults to 2 (1:1 callers unchanged); group rooms pass
// capacity + 1 for the tutor.
export async function ensureRoom({ name, endsAt, maxParticipants = 2 }) {
  const exp = Math.floor(new Date(endsAt).getTime() / 1000) + 2 * 3600;
  try {
    return await daily('/rooms', {
      name,
      privacy: 'private',
      properties: {
        exp,
        max_participants: Math.max(2, Math.round(maxParticipants)),
        enable_screenshare: true,
        enable_chat: true,
        eject_at_room_exp: true,
      },
    });
  } catch (err) {
    if (/already exists/i.test(err.message)) {
      const res = await fetch(`${API}/rooms/${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
      });
      if (res.ok) return res.json();
    }
    throw err;
  }
}

// Room-scoped join token. Tutors get owner powers (eject, etc.); 2h validity.
export async function meetingToken({ roomName, userName, isOwner }) {
  const data = await daily('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: userName || 'Guest',
      is_owner: Boolean(isOwner),
      exp: Math.floor(Date.now() / 1000) + 2 * 3600,
    },
  });
  return data.token;
}
