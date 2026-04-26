import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  ASSETS: R2Bucket;
  SESSION_SECRET: string;
  VOTE_TOKEN_SECRET: string;
  ADMIN_TOKEN?: string;
  ALLOWED_ORIGIN: string;
  REQUIRE_ORIGIN: string;
  VOTE_TOKEN_TTL_MS: string;
  VOTE_IP_COOLDOWN_MS: string;
  VOTE_POW_DIFFICULTY: string;
  VOTE_POW_TTL_MS: string;
  ADMIN_AUTH_ENABLED: string;
};

type VoteCountRow = {
  constituency_key: string;
  candidate_name: string;
  party: string;
  coalition: string;
  vote_count: number;
};

type ReferendumCountRow = {
  constituency_key: string;
  vote: 'yes' | 'no';
  vote_count: number;
};

const app = new Hono<{ Bindings: Bindings }>();
type AppContext = Context<{ Bindings: Bindings }>;

const GLOBAL_REFERENDUM_KEY = '__GLOBAL__';

const partyGroups = [
  {
    label: 'বিএনপি জোট',
    parties: [
      'বাংলাদেশ জাতীয়তাবাদী দল',
      'বাংলাদেশ জাতীয় পার্টি',
      'জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন',
      'জমিয়তে উলামায়ে ইসলাম বাংলাদেশ',
      'গণঅধিকার পরিষদ',
      'গণসংহতি আন্দোলন',
      'বাংলাদেশের বিপ্লবী ওয়ার্কার্স পার্টি',
      'নাগরিক ঐক্য',
      'ন্যাশনাল পিপলস পার্টি',
      'ইসলামী ঐক্যজোট',
    ],
  },
  {
    label: 'এগারো দলীয় নির্বাচনি ঐক্য',
    parties: [
      'বাংলাদেশ জামায়াতে ইসলামী',
      'জাতীয় নাগরিক পার্টি',
      'বাংলাদেশ খেলাফত মজলিস',
      'বাংলাদেশ খেলাফত আন্দোলন',
      'খেলাফত মজলিস',
      'বাংলাদেশ নেজামে ইসলাম পার্টি',
      'বাংলাদেশ ডেভেলপমেন্ট পার্টি',
      'জাতীয় গণতান্ত্রিক পার্টি (জাগপা)',
      'লিবারেল ডেমোক্রেটিক পার্টি',
      'আমার বাংলাদেশ পার্টি (এবি পার্টি)',
      'বাংলাদেশ লেবার পার্টি',
    ],
  },
  {
    label: 'গণতান্ত্রিক যুক্তফ্রন্ট',
    parties: [
      'বাংলাদেশের কমিউনিস্ট পার্টি',
      'বাংলাদেশের সমাজতান্ত্রিক দল–বাসদ',
      'বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)',
      'বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল',
    ],
  },
  {
    label: 'বৃহত্তর সুন্নী জোট',
    parties: [
      'বাংলাদেশ ইসলামী ফ্রন্ট',
      'ইসলামিক ফ্রন্ট বাংলাদেশ',
      'বাংলাদেশ সুপ্রিম পার্টি',
    ],
  },
  {
    label: 'জাতীয় গণতান্ত্রিক ফ্রন্ট',
    parties: [
      'জাতীয় পার্টি (এরশাদ) (একাংশ)',
      'বাংলাদেশ সাংস্কৃতিক মুক্তিজোট',
      'জাতীয় পার্টি–জেপি(মঞ্জু)',
      'বাংলাদেশ মুসলিম লীগ-বিএমএল',
    ],
  },
  {
    label: 'অন্যান্য দলসমূহ',
    parties: [
      'ইসলামী আন্দোলন বাংলাদেশ',
      'জাতীয় পার্টি (এরশাদ)',
      'ইনসানিয়াত বিপ্লব বাংলাদেশ',
      'জাতীয় সমাজতান্ত্রিক দল-জেএসডি',
      'গণফোরাম',
    ],
  },
];

const partyCoalitionMap = new Map<string, string>();

function normalizePartyName(value = '') {
  let normalized = String(value || '')
    .trim()
    .replace(/[().\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/জাতীয়/g, 'জাতীয়')
    .replace(/ইসলামী/g, 'ইসলামী')
    .replace(/জামায়াতে/g, 'জামায়াতে')
    .replace(/সুপ্রীম/g, 'সুপ্রিম')
    .replace(/বি\s*এন\s*পি/g, 'বিএনপি')
    .replace(/এল\s*ডি\s*পি/g, 'এলডিপি')
    .replace(/এন\s*সি\s*পি/g, 'এনসিপি')
    .replace(/এন\s*পি\s*পি/g, 'এনপিপি')
    .replace(/এন\s*ডি\s*এম/g, 'এনডিএম')
    .replace(/বি\s*এস\s*পি/g, 'বিএসপি')
    .replace(/বি\s*জে\s*পি/g, 'বিজেপি')
    .replace(/বি\s*এম\s*এল/g, 'বিএমএল')
    .replace(/বি\s*আর\s*পি/g, 'বিআরপি')
    .replace(/বি\s*এন\s*এফ/g, 'বিএনএফ')
    .replace(/বি\s*ই\s*পি/g, 'বিইপি')
    .replace(/বি\s*এম\s*জে\s*পি/g, 'বিএমজেপি')
    .replace(/এবি পার্টি/g, 'এবি পার্টি')
    .replace(/এনসিপি/g, 'এনসিপি')
    .replace(/জিওপি/g, 'জিওপি')
    .replace(/এনপিপি/g, 'এনপিপি')
    .replace(/এনডিএম/g, 'এনডিএম')
    .replace(/বিএসপি/g, 'বিএসপি')
    .replace(/বিজেপি/g, 'বিজেপি')
    .replace(/জাসদ/g, 'জাসদ')
    .trim();

  normalized = normalized
    .replace(/বাংলাদেশ জাতীয়তাবাদী দল বিএনপি$/g, 'বাংলাদেশ জাতীয়তাবাদী দল')
    .replace(/লিবারেল ডেমোক্রেটিক পার্টি এলডিপি$/g, 'লিবারেল ডেমোক্রেটিক পার্টি')
    .replace(/জাতীয় নাগরিক পার্টি এনসিপি$/g, 'জাতীয় নাগরিক পার্টি')
    .replace(/গণঅধিকার পরিষদ জিওপি$/g, 'গণঅধিকার পরিষদ')
    .replace(/ন্যাশনাল পিপলস পার্টি এনপিপি$/g, 'ন্যাশনাল পিপলস পার্টি')
    .replace(/জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন এনডিএম$/g, 'জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন')
    .replace(/বাংলাদেশ সাংস্কৃতিক মুক্তিজোট মুক্তিজোট$/g, 'বাংলাদেশ সাংস্কৃতিক মুক্তিজোট')
    .replace(/বাংলাদেশ সুপ্রিম পার্টি বিএসপি$/g, 'বাংলাদেশ সুপ্রিম পার্টি')
    .replace(/বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল বাংলাদেশ জাসদ$/g, 'বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল')
    .replace(/বাংলাদেশ জাতীয় পার্টি বিজেপি$/g, 'বাংলাদেশ জাতীয় পার্টি')
    .replace(/জাতীয় পার্টি জেপি$/g, 'জাতীয় পার্টি জেপি মঞ্জু');

  return normalized.trim();
}

for (const group of partyGroups) {
  for (const party of group.parties) {
    const normalized = normalizePartyName(party);
    if (normalized) {
      partyCoalitionMap.set(normalized, group.label);
    }
  }
}

function getCoalitionLabel(party = '') {
  const normalized = normalizePartyName(party);
  if (!normalized) return 'স্বতন্ত্র';
  return partyCoalitionMap.get(normalized) || 'অন্যান্য দলসমূহ';
}

function getAllowedOrigins(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return false;
  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
}

function getHeader(c: AppContext, name: string) {
  return c.req.header(name) || '';
}

function getClientIp(c: AppContext) {
  return getHeader(c, 'CF-Connecting-IP') || getHeader(c, 'x-forwarded-for') || '';
}

function readDeviceId(body: Record<string, unknown>, c: AppContext) {
  const fromBody = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  const fromHeader = getHeader(c, 'x-device-id').trim();
  return fromBody || fromHeader || crypto.randomUUID();
}

function sanitizeAssetKey(rawPath: string) {
  if (!rawPath.startsWith('/candidatess/')) return null;
  const key = rawPath.replace(/^\/+/, '');
  if (!key || key.includes('..')) return null;
  return key;
}

async function hashValue(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value || ''));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function encodeBase64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4));
}

async function createVoteToken(
  fingerprintHash: string,
  ipHash: string,
  uaHash: string,
  secret: string,
  ttlMs: number
) {
  const expiresAt = Date.now() + ttlMs;
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const payload = `${fingerprintHash}.${ipHash}.${uaHash}.${expiresAt}.${nonce}`;
  const signature = await hashValue(payload, secret);
  return encodeBase64Url(`${payload}.${signature}`);
}

async function verifyVoteToken(
  token: string,
  fingerprintHash: string,
  ipHash: string,
  uaHash: string,
  secret: string
) {
  try {
    const decoded = decodeBase64Url(token);
    const [hash, tokenIpHash, tokenUaHash, expiresAt, nonce, signature] = decoded.split('.');
    if (!hash || !tokenIpHash || !tokenUaHash || !expiresAt || !nonce || !signature) {
      return { ok: false, reason: 'invalid_token' };
    }
    if (hash !== fingerprintHash) return { ok: false, reason: 'fingerprint_mismatch' };
    if (tokenIpHash !== ipHash || tokenUaHash !== uaHash) {
      return { ok: false, reason: 'device_mismatch' };
    }
    if (Number(expiresAt) < Date.now()) return { ok: false, reason: 'token_expired' };

    const payload = `${hash}.${tokenIpHash}.${tokenUaHash}.${expiresAt}.${nonce}`;
    const expected = await hashValue(payload, secret);
    if (expected !== signature) return { ok: false, reason: 'invalid_signature' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid_token' };
  }
}

async function createPowChallenge(secret: string, ttlMs: number) {
  const expiresAt = Date.now() + ttlMs;
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const payload = `${expiresAt}.${nonce}`;
  const signature = await hashValue(payload, secret);
  return encodeBase64Url(`${payload}.${signature}`);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPow(
  challenge: string | undefined,
  nonce: string | undefined,
  difficulty: number,
  secret: string
) {
  if (difficulty <= 0) return { ok: true };
  if (!challenge || !nonce) return { ok: false, reason: 'missing_pow' };
  try {
    const decoded = decodeBase64Url(challenge);
    const [expiresAt, seed, signature] = decoded.split('.');
    if (!expiresAt || !seed || !signature) return { ok: false, reason: 'invalid_pow' };
    if (Number(expiresAt) < Date.now()) return { ok: false, reason: 'pow_expired' };
    const payload = `${expiresAt}.${seed}`;
    const expected = await hashValue(payload, secret);
    if (expected !== signature) return { ok: false, reason: 'invalid_pow' };
    const digest = await sha256Hex(`${payload}.${nonce}`);
    if (!digest.startsWith('0'.repeat(difficulty))) {
      return { ok: false, reason: 'invalid_pow' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid_pow' };
  }
}

async function requireAdmin(c: AppContext) {
  const enabled = c.env.ADMIN_AUTH_ENABLED === '1';
  if (!enabled) return true;
  const expected = (c.env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const auth = getHeader(c, 'Authorization');
  const actual = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return actual !== '' && actual === expected;
}

function adminUnauthorized(c: AppContext) {
  return c.json({ error: 'Unauthorized' }, 401);
}

app.use('*', async (c, next) => {
  const allowedOrigins = getAllowedOrigins(c.env.ALLOWED_ORIGIN);
  const origin = c.req.header('Origin') || '';
  const corsMiddleware = cors({
    origin: origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  });
  await corsMiddleware(c, next);
});

app.use('/api/*', async (c, next) => {
  if (c.env.REQUIRE_ORIGIN !== '1') {
    await next();
    return;
  }
  const allowedOrigins = getAllowedOrigins(c.env.ALLOWED_ORIGIN);
  const origin = c.req.header('Origin') || undefined;
  const referer = c.req.header('Referer') || undefined;
  if (isAllowedOrigin(origin, allowedOrigins) || isAllowedOrigin(referer, allowedOrigins)) {
    await next();
    return;
  }
  return c.json({ error: 'Forbidden' }, 403);
});

app.get('/health', (c) => c.json({ ok: true }));

app.get('/api/files/exists', async (c) => {
  const rawPath = String(c.req.query('path') || '');
  const key = sanitizeAssetKey(rawPath);
  if (!key) return c.json({ error: 'Invalid path' }, 400);
  const object = await c.env.ASSETS.head(key);
  return c.json({ exists: !!object });
});

app.get('/api/files', async (c) => {
  const rawPath = String(c.req.query('path') || '');
  const key = sanitizeAssetKey(rawPath);
  if (!key) return c.json({ error: 'Invalid path' }, 400);

  const object = await c.env.ASSETS.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  const candidateName = String(c.req.query('candidateName') || '');
  const docType = String(c.req.query('docType') || '');
  const originalName = key.split('/').pop() || 'download';
  const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const fileName = candidateName && docType ? `${candidateName} - ${docType}${extension}` : originalName;

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'no-store');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  return new Response(object.body, { headers });
});

app.post('/api/vote/init', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fingerprintHash = typeof body.fingerprintHash === 'string' ? body.fingerprintHash.trim() : '';
  const deviceId = readDeviceId(body, c);

  if (!fingerprintHash) return c.json({ error: 'Invalid fingerprint' }, 400);

  const ipHash = await hashValue(getClientIp(c), c.env.VOTE_TOKEN_SECRET);
  const uaHash = await hashValue(getHeader(c, 'User-Agent'), c.env.VOTE_TOKEN_SECRET);
  const cooldownMs = Math.max(0, Number(c.env.VOTE_IP_COOLDOWN_MS) || 0);
  const powDifficulty = Math.max(0, Number(c.env.VOTE_POW_DIFFICULTY) || 0);
  const powTtlMs = Math.max(60_000, Number(c.env.VOTE_POW_TTL_MS) || 300_000);

  if (cooldownMs > 0) {
    const cooldown = await c.env.DB.prepare(
      'SELECT last_vote_at FROM vote_cooldowns WHERE ip_hash = ? AND ua_hash = ?'
    )
      .bind(ipHash, uaHash)
      .first<{ last_vote_at: number }>();
    if (cooldown) {
      const elapsed = Date.now() - Number(cooldown.last_vote_at || 0);
      if (elapsed < cooldownMs) {
        return c.json({ error: 'cooldown', retryAfterMs: cooldownMs - elapsed, deviceId }, 429);
      }
    }
  }

  const fingerprintLock = await c.env.DB.prepare(
    'SELECT fingerprint_hash FROM vote_locks WHERE fingerprint_hash = ?'
  )
    .bind(fingerprintHash)
    .first();
  if (fingerprintLock) {
    return c.json({ allowed: false, reason: 'already_voted', deviceId });
  }

  const deviceLock = await c.env.DB.prepare('SELECT device_id FROM device_locks WHERE device_id = ?')
    .bind(deviceId)
    .first();
  if (deviceLock) {
    return c.json({ allowed: false, reason: 'already_voted', deviceId });
  }

  const ttlMs = Math.max(60_000, Number(c.env.VOTE_TOKEN_TTL_MS) || 300_000);
  const token = await createVoteToken(fingerprintHash, ipHash, uaHash, c.env.VOTE_TOKEN_SECRET, ttlMs);
  const pow =
    powDifficulty > 0
      ? {
          challenge: await createPowChallenge(c.env.VOTE_TOKEN_SECRET, powTtlMs),
          difficulty: powDifficulty,
        }
      : null;

  return c.json({ allowed: true, token, expiresInMs: ttlMs, deviceId, pow });
});

app.post('/api/vote/submit', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fingerprintHash = typeof body.fingerprintHash === 'string' ? body.fingerprintHash.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const constituencyKey = typeof body.constituencyKey === 'string' ? body.constituencyKey.trim() : '';
  const candidateName = typeof body.candidateName === 'string' ? body.candidateName.trim() : '';
  const deviceId = readDeviceId(body, c);
  const party = normalizePartyName(typeof body.party === 'string' ? body.party : '');
  const powChallenge = typeof body.powChallenge === 'string' ? body.powChallenge : undefined;
  const powNonce = typeof body.powNonce === 'string' ? body.powNonce : undefined;

  if (!fingerprintHash || !token || !constituencyKey || !candidateName || !deviceId) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const ipHash = await hashValue(getClientIp(c), c.env.VOTE_TOKEN_SECRET);
  const uaHash = await hashValue(getHeader(c, 'User-Agent'), c.env.VOTE_TOKEN_SECRET);
  const cooldownMs = Math.max(0, Number(c.env.VOTE_IP_COOLDOWN_MS) || 0);
  const powDifficulty = Math.max(0, Number(c.env.VOTE_POW_DIFFICULTY) || 0);

  if (cooldownMs > 0) {
    const cooldown = await c.env.DB.prepare(
      'SELECT last_vote_at FROM vote_cooldowns WHERE ip_hash = ? AND ua_hash = ?'
    )
      .bind(ipHash, uaHash)
      .first<{ last_vote_at: number }>();
    if (cooldown) {
      const elapsed = Date.now() - Number(cooldown.last_vote_at || 0);
      if (elapsed < cooldownMs) {
        return c.json({ error: 'cooldown', retryAfterMs: cooldownMs - elapsed }, 429);
      }
    }
  }

  const verified = await verifyVoteToken(
    token,
    fingerprintHash,
    ipHash,
    uaHash,
    c.env.VOTE_TOKEN_SECRET
  );
  if (!verified.ok) return c.json({ error: verified.reason || 'invalid_token' }, 401);

  const powCheck = await verifyPow(powChallenge, powNonce, powDifficulty, c.env.VOTE_TOKEN_SECRET);
  if (!powCheck.ok) return c.json({ error: powCheck.reason || 'invalid_pow' }, 401);

  const votedAt = Date.now();
  const coalition = getCoalitionLabel(party);

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO vote_locks (fingerprint_hash, voted_at, ip_hash, ua_hash) VALUES (?, ?, ?, ?)'
      ).bind(fingerprintHash, votedAt, ipHash, uaHash),
      c.env.DB.prepare(
        'INSERT INTO device_locks (device_id, voted_at, fingerprint_hash, ip_hash, ua_hash) VALUES (?, ?, ?, ?, ?)'
      ).bind(deviceId, votedAt, fingerprintHash, ipHash, uaHash),
      c.env.DB.prepare(
        'INSERT INTO constituency_votes (constituency_key, candidate_name, party, voted_at, fingerprint_hash) VALUES (?, ?, ?, ?, ?)'
      ).bind(constituencyKey, candidateName, party || null, votedAt, fingerprintHash),
      c.env.DB.prepare(
        `INSERT INTO constituency_candidate_counts
          (constituency_key, candidate_name, party, coalition, vote_count)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT (constituency_key, candidate_name, party)
         DO UPDATE SET vote_count = vote_count + 1, coalition = excluded.coalition`
      ).bind(constituencyKey, candidateName, party || '', coalition),
      c.env.DB.prepare(
        `INSERT INTO vote_cooldowns (ip_hash, ua_hash, last_vote_at)
         VALUES (?, ?, ?)
         ON CONFLICT (ip_hash, ua_hash)
         DO UPDATE SET last_vote_at = excluded.last_vote_at`
      ).bind(ipHash, uaHash, votedAt),
    ]);
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'already_voted' }, 409);
    }
    return c.json({ error: 'vote_submit_failed' }, 500);
  }
});

app.get('/api/votes/all', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT constituency_key, candidate_name, party, vote_count FROM constituency_candidate_counts ORDER BY constituency_key, vote_count DESC'
  ).all<VoteCountRow>();

  const votes: Record<string, Record<string, number>> = {};
  for (const row of result.results || []) {
    const key = row.constituency_key;
    if (!votes[key]) votes[key] = {};
    const label = `${row.candidate_name} (${row.party || 'স্বতন্ত্র'})`;
    votes[key][label] = Number(row.vote_count || 0);
  }

  return c.json({ votes });
});

app.post('/api/referendum/submit', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const vote = body.vote === 'yes' || body.vote === 'no' ? body.vote : '';
  const fingerprintHash = typeof body.fingerprintHash === 'string' ? body.fingerprintHash.trim() : '';
  const constituencyKey =
    typeof body.constituencyKey === 'string' && body.constituencyKey.trim()
      ? body.constituencyKey.trim()
      : GLOBAL_REFERENDUM_KEY;
  const deviceId = readDeviceId(body, c);
  const powChallenge = typeof body.powChallenge === 'string' ? body.powChallenge : undefined;
  const powNonce = typeof body.powNonce === 'string' ? body.powNonce : undefined;

  if (!vote || !fingerprintHash) return c.json({ error: 'Invalid request' }, 400);

  const powDifficulty = Math.max(0, Number(c.env.VOTE_POW_DIFFICULTY) || 0);
  const powCheck = await verifyPow(powChallenge, powNonce, powDifficulty, c.env.VOTE_TOKEN_SECRET);
  if (!powCheck.ok) return c.json({ error: powCheck.reason || 'invalid_pow' }, 401);

  const existingFingerprint = await c.env.DB.prepare(
    'SELECT id FROM referendum_votes WHERE fingerprint_hash = ? LIMIT 1'
  )
    .bind(fingerprintHash)
    .first();
  if (existingFingerprint) return c.json({ error: 'already_voted' }, 409);

  const existingDevice = await c.env.DB.prepare('SELECT id FROM referendum_votes WHERE device_id = ? LIMIT 1')
    .bind(deviceId)
    .first();
  if (existingDevice) return c.json({ error: 'already_voted' }, 409);

  const votedAt = Date.now();
  const ipHash = await hashValue(getClientIp(c), c.env.VOTE_TOKEN_SECRET);
  const uaHash = await hashValue(getHeader(c, 'User-Agent'), c.env.VOTE_TOKEN_SECRET);

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO referendum_votes (vote, voted_at, fingerprint_hash, constituency_key, device_id) VALUES (?, ?, ?, ?, ?)'
      ).bind(vote, votedAt, fingerprintHash, constituencyKey, deviceId),
      c.env.DB.prepare(
        `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
         VALUES (?, ?, 1)
         ON CONFLICT (constituency_key, vote)
         DO UPDATE SET vote_count = vote_count + 1`
      ).bind(constituencyKey, vote),
      c.env.DB.prepare(
        `INSERT INTO vote_cooldowns (ip_hash, ua_hash, last_vote_at)
         VALUES (?, ?, ?)
         ON CONFLICT (ip_hash, ua_hash)
         DO UPDATE SET last_vote_at = excluded.last_vote_at`
      ).bind(ipHash, uaHash, votedAt),
    ]);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'vote_submit_failed' }, 500);
  }
});

app.get('/api/referendum/counts', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT vote, SUM(vote_count) AS vote_count FROM constituency_referendum_counts GROUP BY vote'
  ).all<{ vote: 'yes' | 'no'; vote_count: number }>();

  const counts = { yes: 0, no: 0 };
  for (const row of result.results || []) {
    if (row.vote === 'yes' || row.vote === 'no') {
      counts[row.vote] = Number(row.vote_count || 0);
    }
  }

  return c.json(counts);
});

app.get('/api/admin/me', async (c) => {
  if (!(await requireAdmin(c))) return adminUnauthorized(c);
  return c.json({ ok: true, email: 'admin@token' });
});

app.get('/api/admin/constituency', async (c) => {
  if (!(await requireAdmin(c))) return adminUnauthorized(c);

  const constituencyKey = String(c.req.query('constituencyKey') || '').trim();
  if (!constituencyKey) return c.json({ error: 'constituency_required' }, 400);

  const result = await c.env.DB.prepare(
    `SELECT candidate_name, party, coalition, vote_count
     FROM constituency_candidate_counts
     WHERE constituency_key = ?
     ORDER BY vote_count DESC`
  ).bind(constituencyKey).all<{
    candidate_name: string;
    party: string;
    coalition: string;
    vote_count: number;
  }>();

  const rows = (result.results || []).map((row) => {
    const coalition = getCoalitionLabel(row.party || '');
    return { ...row, coalition, vote_count: Number(row.vote_count || 0) };
  });

  const refResult = await c.env.DB.prepare(
    `SELECT vote, vote_count
     FROM constituency_referendum_counts
     WHERE constituency_key = ?`
  ).bind(constituencyKey).all<ReferendumCountRow>();

  const referendum = { yes: 0, no: 0 };
  for (const row of refResult.results || []) {
    if (row.vote === 'yes' || row.vote === 'no') {
      referendum[row.vote] = Number(row.vote_count || 0);
    }
  }

  return c.json({ constituencyKey, rows, referendum });
});

app.post('/api/admin/constituency-batch', async (c) => {
  if (!(await requireAdmin(c))) return adminUnauthorized(c);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const constituencyKey = typeof body.constituencyKey === 'string' ? body.constituencyKey.trim() : '';
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const referendum = typeof body.referendum === 'object' && body.referendum ? body.referendum : {};

  if (!constituencyKey || candidates.length === 0) {
    return c.json({ error: 'invalid_payload' }, 400);
  }

  const normalizedCandidates = [];
  let totalVotes = 0;

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      return c.json({ error: 'invalid_candidate' }, 400);
    }
    const candidateName = String((candidate as Record<string, unknown>).candidateName || '').trim();
    const party = normalizePartyName(String((candidate as Record<string, unknown>).party || ''));
    const count = Number((candidate as Record<string, unknown>).count);
    if (!candidateName || !Number.isFinite(count) || count < 0) {
      return c.json({ error: 'invalid_candidate' }, 400);
    }
    totalVotes += count;
    normalizedCandidates.push({
      candidateName,
      party,
      coalition: getCoalitionLabel(party),
      count,
    });
  }

  const yes = Number((referendum as Record<string, unknown>).yes);
  const no = Number((referendum as Record<string, unknown>).no);
  if (!Number.isFinite(yes) || !Number.isFinite(no) || yes < 0 || no < 0) {
    return c.json({ error: 'invalid_referendum' }, 400);
  }
  if (yes + no !== totalVotes) {
    return c.json({ error: 'referendum_mismatch' }, 400);
  }

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('DELETE FROM constituency_candidate_counts WHERE constituency_key = ?').bind(constituencyKey),
    c.env.DB.prepare('DELETE FROM constituency_referendum_counts WHERE constituency_key = ?').bind(constituencyKey),
  ];

  for (const row of normalizedCandidates) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO constituency_candidate_counts
          (constituency_key, candidate_name, party, coalition, vote_count)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(constituencyKey, row.candidateName, row.party, row.coalition, row.count)
    );
  }

  statements.push(
    c.env.DB.prepare(
      'INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count) VALUES (?, ?, ?)'
    ).bind(constituencyKey, 'yes', yes)
  );
  statements.push(
    c.env.DB.prepare(
      'INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count) VALUES (?, ?, ?)'
    ).bind(constituencyKey, 'no', no)
  );

  try {
    await c.env.DB.batch(statements);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'batch_failed' }, 500);
  }
});

export default app;
