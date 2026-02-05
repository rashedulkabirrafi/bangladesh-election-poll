import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import pg from "pg";
import { fileURLToPath } from "url";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 8080,
  SESSION_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  ALLOWED_ORIGIN,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_REGION = "auto",
  R2_URL_TTL = "300",
  AUTH_BYPASS = "0",
  REQUIRE_ORIGIN = "1",
  VOTE_TOKEN_SECRET,
  VOTE_TOKEN_TTL_MS = "300000",
  VOTE_REQUIRE_AUTH = "0",
  DATABASE_URL,
  DATABASE_SSL = "1",
  ADMIN_EMAILS = "",
} = process.env;

if (!SESSION_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.error("Missing required env vars. See README for setup.");
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing Cloudflare R2 config. See README for setup.");
  process.exit(1);
}

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "1mb" }));

app.set("trust proxy", 1);

// Serve candidate assets statically
app.use("/candidatess", express.static(path.join(__dirname, "public", "candidatess")));

app.use(
  cors({
    origin: ALLOWED_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  })
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      done(null, {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails || [],
      });
    }
  )
);

const allowedOrigins = (ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const adminEmails = ADMIN_EMAILS.split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const getUserEmails = (user) => {
  if (!user) return [];
  const emails = Array.isArray(user.emails) ? user.emails : [];
  return emails
    .map((entry) => (typeof entry === "string" ? entry : entry?.value))
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
};

const isAdminUser = (user) => {
  if (adminEmails.length === 0) return false;
  const emails = getUserEmails(user);
  return emails.some((email) => adminEmails.includes(email));
};

const isAllowedOrigin = (value) => {
  if (!value) return false;
  return allowedOrigins.some((origin) => value.startsWith(origin));
};

const ensureOrigin = (req, res, next) => {
  if (REQUIRE_ORIGIN !== "1") return next();
  const origin = req.get("Origin");
  const referer = req.get("Referer");
  if (isAllowedOrigin(origin) || isAllowedOrigin(referer)) {
    return next();
  }
  return res.status(403).json({ error: "Forbidden" });
};

const ensureAuth = (req, res, next) => {
  if (AUTH_BYPASS === "1") {
    return next();
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

const ensureAdmin = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};

const ensureVoteAuth = (req, res, next) => {
  if (VOTE_REQUIRE_AUTH === "1") {
    return ensureAuth(req, res, next);
  }
  return next();
};

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const voteTokenSecret = VOTE_TOKEN_SECRET || SESSION_SECRET;
const voteTokenTtlMs = Math.max(60_000, Number(VOTE_TOKEN_TTL_MS) || 300_000);
const GLOBAL_REFERENDUM_KEY = "__GLOBAL__";

const partyGroups = [
  {
    label: "বিএনপি জোট",
    parties: [
      "বাংলাদেশ জাতীয়তাবাদী দল",
      "বাংলাদেশ জাতীয় পার্টি",
      "জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন",
      "জমিয়তে উলামায়ে ইসলাম বাংলাদেশ",
      "গণঅধিকার পরিষদ",
      "গণসংহতি আন্দোলন",
      "বাংলাদেশের বিপ্লবী ওয়ার্কার্স পার্টি",
      "নাগরিক ঐক্য",
      "ন্যাশনাল পিপলস পার্টি",
      "ইসলামী ঐক্যজোট",
    ],
  },
  {
    label: "এগারো দলীয় নির্বাচনি ঐক্য",
    parties: [
      "বাংলাদেশ জামায়াতে ইসলামী",
      "জাতীয় নাগরিক পার্টি",
      "বাংলাদেশ খেলাফত মজলিস",
      "বাংলাদেশ খেলাফত আন্দোলন",
      "খেলাফত মজলিস",
      "বাংলাদেশ নেজামে ইসলাম পার্টি",
      "বাংলাদেশ ডেভেলপমেন্ট পার্টি",
      "জাতীয় গণতান্ত্রিক পার্টি (জাগপা)",
      "লিবারেল ডেমোক্রেটিক পার্টি",
      "আমার বাংলাদেশ পার্টি (এবি পার্টি)",
      "বাংলাদেশ লেবার পার্টি",
    ],
  },
  {
    label: "গণতান্ত্রিক যুক্তফ্রন্ট",
    parties: [
      "বাংলাদেশের কমিউনিস্ট পার্টি",
      "বাংলাদেশের সমাজতান্ত্রিক দল–বাসদ",
      "বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)",
      "বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল",
    ],
  },
  {
    label: "বৃহত্তর সুন্নী জোট",
    parties: [
      "বাংলাদেশ ইসলামী ফ্রন্ট",
      "ইসলামিক ফ্রন্ট বাংলাদেশ",
      "বাংলাদেশ সুপ্রিম পার্টি",
    ],
  },
  {
    label: "জাতীয় গণতান্ত্রিক ফ্রন্ট",
    parties: [
      "জাতীয় পার্টি (এরশাদ) (একাংশ)",
      "বাংলাদেশ সাংস্কৃতিক মুক্তিজোট",
      "জাতীয় পার্টি–জেপি(মঞ্জু)",
      "বাংলাদেশ মুসলিম লীগ-বিএমএল",
    ],
  },
  {
    label: "অন্যান্য দলসমূহ",
    parties: [
      "ইসলামী আন্দোলন বাংলাদেশ",
      "জাতীয় পার্টি (এরশাদ)",
      "ইনসানিয়াত বিপ্লব বাংলাদেশ",
      "জাতীয় সমাজতান্ত্রিক দল-জেএসডি",
      "গণফোরাম",
    ],
  },
];

const normalizePartyName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/[().\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/জাতীয়/g, "জাতীয়")
    .replace(/ইসলামী/g, "ইসলামী")
    .replace(/জামায়াতে/g, "জামায়াতে")
    .replace(/বি\.?এন\.?পি/g, "বিএনপি")
    .replace(/এল\.?ডি\.?পি/g, "এলডিপি")
    .replace(/এবি পার্টি/g, "এবি পার্টি")
    .replace(/এনসিপি/g, "এনসিপি")
    .trim();

const partyCoalitionMap = new Map();
partyGroups.forEach((group) => {
  group.parties.forEach((party) => {
    const normalized = normalizePartyName(party);
    if (normalized) {
      partyCoalitionMap.set(normalized, group.label);
    }
  });
});

const getCoalitionLabel = (party = "") => {
  const normalized = normalizePartyName(party);
  if (!normalized) return "স্বতন্ত্র";
  return partyCoalitionMap.get(normalized) || "অন্যান্য দলসমূহ";
};
const { Pool } = pg;
const votePool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL === "1" ? { rejectUnauthorized: false } : false,
});

const ensureVoteTable = async () => {
  await votePool.query(`
    CREATE TABLE IF NOT EXISTS vote_locks (
      fingerprint_hash TEXT PRIMARY KEY,
      voted_at BIGINT NOT NULL,
      ip_hash TEXT,
      ua_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_vote_locks_voted_at ON vote_locks(voted_at);
    
    CREATE TABLE IF NOT EXISTS constituency_votes (
      id SERIAL PRIMARY KEY,
      constituency_key TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      party TEXT,
      voted_at BIGINT NOT NULL,
      fingerprint_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_constituency_votes_key ON constituency_votes(constituency_key);

    CREATE TABLE IF NOT EXISTS constituency_candidate_counts (
      constituency_key TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      party TEXT NOT NULL DEFAULT '',
      coalition TEXT NOT NULL DEFAULT '',
      vote_count INT NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
      PRIMARY KEY (constituency_key, candidate_name, party)
    );
    
    CREATE TABLE IF NOT EXISTS referendum_votes (
      id SERIAL PRIMARY KEY,
      vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
      voted_at BIGINT NOT NULL,
      fingerprint_hash TEXT
    );

    ALTER TABLE referendum_votes
      ADD COLUMN IF NOT EXISTS constituency_key TEXT;

    CREATE TABLE IF NOT EXISTS constituency_referendum_counts (
      constituency_key TEXT NOT NULL,
      vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
      vote_count INT NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_constituency_referendum_counts_key
      ON constituency_referendum_counts(constituency_key, vote);

    CREATE OR REPLACE VIEW constituency_vote_totals AS
      SELECT constituency_key, SUM(vote_count) AS total_votes
      FROM constituency_candidate_counts
      GROUP BY constituency_key;

    CREATE OR REPLACE VIEW global_vote_total AS
      SELECT COALESCE(SUM(vote_count), 0) AS total_votes
      FROM constituency_candidate_counts;

    CREATE OR REPLACE VIEW party_coalition_totals AS
      SELECT constituency_key, party, coalition, SUM(vote_count) AS vote_count
      FROM constituency_candidate_counts
      GROUP BY constituency_key, party, coalition;

    CREATE OR REPLACE VIEW global_party_coalition_totals AS
      SELECT party, coalition, SUM(vote_count) AS vote_count
      FROM constituency_candidate_counts
      GROUP BY party, coalition;
  `);
};

const backfillCountsIfEmpty = async () => {
  const countsResult = await votePool.query(
    "SELECT COUNT(*) AS count FROM constituency_candidate_counts"
  );
  const countsTotal = Number(countsResult.rows[0]?.count || 0);
  if (countsTotal === 0) {
    const rawCount = await votePool.query(
      "SELECT COUNT(*) AS count FROM constituency_votes"
    );
    const rawTotal = Number(rawCount.rows[0]?.count || 0);
    if (rawTotal > 0) {
      await votePool.query(
        `INSERT INTO constituency_candidate_counts (constituency_key, candidate_name, party, coalition, vote_count)
         SELECT constituency_key,
                candidate_name,
                COALESCE(party, '') AS party,
                '' AS coalition,
                COUNT(*) AS vote_count
         FROM constituency_votes
         GROUP BY constituency_key, candidate_name, COALESCE(party, '')`
      );
      const rows = await votePool.query(
        "SELECT constituency_key, candidate_name, party FROM constituency_candidate_counts"
      );
      for (const row of rows.rows) {
        const normalizedParty = normalizePartyName(row.party || "");
        const coalition = getCoalitionLabel(normalizedParty);
        await votePool.query(
          `UPDATE constituency_candidate_counts
           SET coalition = $1
           WHERE constituency_key = $2 AND candidate_name = $3 AND party = $4`,
          [coalition, row.constituency_key, row.candidate_name, row.party]
        );
      }
    }
  }

  await votePool.query(
    "UPDATE referendum_votes SET constituency_key = $1 WHERE constituency_key IS NULL",
    [GLOBAL_REFERENDUM_KEY]
  );

  const referendumTotals = await votePool.query(
    "SELECT SUM(vote_count) AS total FROM constituency_referendum_counts"
  );
  const referendumTotal = Number(referendumTotals.rows[0]?.total || 0);
  if (referendumTotal === 0) {
    await votePool.query("TRUNCATE constituency_referendum_counts");
    await votePool.query(
      `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
       SELECT COALESCE(constituency_key, $1) AS constituency_key,
              vote,
              COUNT(*) AS vote_count
       FROM referendum_votes
       GROUP BY COALESCE(constituency_key, $1), vote`,
      [GLOBAL_REFERENDUM_KEY]
    );
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
};

const hashValue = (value) => {
  return crypto
    .createHmac("sha256", voteTokenSecret)
    .update(value || "")
    .digest("hex");
};

const createVoteToken = (fingerprintHash, ipHash, uaHash) => {
  const expiresAt = Date.now() + voteTokenTtlMs;
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${fingerprintHash}.${ipHash}.${uaHash}.${expiresAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", voteTokenSecret)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
};

const verifyVoteToken = (token, fingerprintHash, ipHash, uaHash) => {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [hash, tokenIpHash, tokenUaHash, expiresAt, nonce, signature] = decoded.split(".");
    if (!hash || !tokenIpHash || !tokenUaHash || !expiresAt || !nonce || !signature) {
      return { ok: false, reason: "invalid_token" };
    }
    if (hash !== fingerprintHash) {
      return { ok: false, reason: "fingerprint_mismatch" };
    }
    if (tokenIpHash !== ipHash || tokenUaHash !== uaHash) {
      return { ok: false, reason: "device_mismatch" };
    }
    if (Number(expiresAt) < Date.now()) {
      return { ok: false, reason: "token_expired" };
    }
    const payload = `${hash}.${tokenIpHash}.${tokenUaHash}.${expiresAt}.${nonce}`;
    const expected = crypto
      .createHmac("sha256", voteTokenSecret)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return { ok: false, reason: "invalid_signature" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "invalid_token" };
  }
};

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    const redirectTo = String(req.query.state || "").trim();
    const fallback = allowedOrigins[0] || "/";
    if (!redirectTo) {
      return res.redirect(fallback);
    }
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return res.redirect(redirectTo);
    }
    if (isAllowedOrigin(redirectTo)) {
      return res.redirect(redirectTo);
    }
    return res.redirect(fallback);
  }
);

app.get("/auth/failure", (req, res) => {
  res.status(401).send("Authentication failed");
});

app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

app.get("/api/me", ensureAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/vote/init", ensureOrigin, ensureVoteAuth, voteLimiter, async (req, res) => {
  const { fingerprintHash } = req.body || {};
  if (!fingerprintHash || typeof fingerprintHash !== "string") {
    return res.status(400).json({ error: "Invalid fingerprint" });
  }
  try {
    const result = await votePool.query(
      "SELECT fingerprint_hash FROM vote_locks WHERE fingerprint_hash = $1",
      [fingerprintHash]
    );
    if (result.rowCount > 0) {
      return res.json({ allowed: false, reason: "already_voted" });
    }
    const ipHash = hashValue(getClientIp(req));
    const uaHash = hashValue(req.get("user-agent") || "");
    const token = createVoteToken(fingerprintHash, ipHash, uaHash);
    return res.json({ allowed: true, token, expiresInMs: voteTokenTtlMs });
  } catch (error) {
    console.error("Vote init error:", error);
    return res.status(500).json({ error: "vote_init_failed" });
  }
});

app.post("/api/vote/submit", ensureOrigin, ensureVoteAuth, voteLimiter, async (req, res) => {
  const { fingerprintHash, token, constituencyKey, candidateName, party } = req.body || {};
  if (!fingerprintHash || typeof fingerprintHash !== "string" || !token) {
    return res.status(400).json({ error: "Invalid request" });
  }
  if (!constituencyKey || !candidateName) {
    return res.status(400).json({ error: "Missing vote data" });
  }
  try {
    const existing = await votePool.query(
      "SELECT fingerprint_hash FROM vote_locks WHERE fingerprint_hash = $1",
      [fingerprintHash]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "already_voted" });
    }

    const ipHash = hashValue(getClientIp(req));
    const uaHash = hashValue(req.get("user-agent") || "");
    const verified = verifyVoteToken(token, fingerprintHash, ipHash, uaHash);
    if (!verified.ok) {
      return res.status(401).json({ error: verified.reason || "invalid_token" });
    }

    const votedAt = Date.now();
    
    // Insert vote lock and update counts in a transaction
    const client = await votePool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('Inserting vote lock for:', fingerprintHash);
      await client.query(
        "INSERT INTO vote_locks (fingerprint_hash, voted_at, ip_hash, ua_hash) VALUES ($1, $2, $3, $4)",
        [fingerprintHash, votedAt, ipHash, uaHash]
      );
      console.log('Vote lock inserted successfully');
      
      const normalizedParty = normalizePartyName(party || "");
      const coalition = getCoalitionLabel(normalizedParty);

      console.log('Inserting constituency vote:', { constituencyKey, candidateName, party: normalizedParty || null });
      await client.query(
        "INSERT INTO constituency_votes (constituency_key, candidate_name, party, voted_at, fingerprint_hash) VALUES ($1, $2, $3, $4, $5)",
        [constituencyKey, candidateName, normalizedParty || null, votedAt, fingerprintHash]
      );
      console.log('Constituency vote inserted successfully');

      await client.query(
        `INSERT INTO constituency_candidate_counts
          (constituency_key, candidate_name, party, coalition, vote_count)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (constituency_key, candidate_name, party)
         DO UPDATE SET vote_count = constituency_candidate_counts.vote_count + 1,
                       coalition = EXCLUDED.coalition`,
        [constituencyKey, candidateName, normalizedParty || "", coalition]
      );
      
      await client.query('COMMIT');
      console.log('Transaction committed successfully');
    } catch (e) {
      console.error('Transaction error, rolling back:', e.message);
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Vote submit error:", error);
    return res.status(500).json({ error: "vote_submit_failed" });
  }
});

// Get vote counts for a specific constituency
app.get("/api/votes/constituency/:key", ensureOrigin, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await votePool.query(
      `SELECT candidate_name, party, vote_count
       FROM constituency_candidate_counts
       WHERE constituency_key = $1
       ORDER BY vote_count DESC`,
      [key]
    );

    const votes = {};
    result.rows.forEach(row => {
      const label = `${row.candidate_name} (${row.party || 'স্বতন্ত্র'})`;
      votes[label] = parseInt(row.vote_count, 10);
    });

    return res.json({ constituency: key, votes });
  } catch (error) {
    console.error("Error fetching constituency votes:", error);
    return res.status(500).json({ error: "fetch_failed" });
  }
});

// Get vote counts for all constituencies
app.get("/api/votes/all", ensureOrigin, async (req, res) => {
  try {
    const result = await votePool.query(
      `SELECT constituency_key, candidate_name, party, vote_count
       FROM constituency_candidate_counts
       ORDER BY constituency_key, vote_count DESC`
    );

    const votesByConstituency = {};
    result.rows.forEach(row => {
      const key = row.constituency_key;
      if (!votesByConstituency[key]) {
        votesByConstituency[key] = {};
      }
      const label = `${row.candidate_name} (${row.party || 'স্বতন্ত্র'})`;
      votesByConstituency[key][label] = parseInt(row.vote_count, 10);
    });

    return res.json({ votes: votesByConstituency });
  } catch (error) {
    console.error("Error fetching all votes:", error);
    return res.status(500).json({ error: "fetch_failed" });
  }
});

// Submit referendum vote
app.post("/api/referendum/submit", ensureOrigin, ensureVoteAuth, voteLimiter, async (req, res) => {
  const { fingerprintHash, vote } = req.body || {};
  if (!fingerprintHash || !vote || !['yes', 'no'].includes(vote)) {
    return res.status(400).json({ error: "Invalid request" });
  }
  
  try {
    // Check if already voted
    const existing = await votePool.query(
      "SELECT id FROM referendum_votes WHERE fingerprint_hash = $1",
      [fingerprintHash]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "already_voted" });
    }
    
    const votedAt = Date.now();
    const constituencyKey = req.body?.constituencyKey || GLOBAL_REFERENDUM_KEY;
    await votePool.query(
      "INSERT INTO referendum_votes (vote, voted_at, fingerprint_hash, constituency_key) VALUES ($1, $2, $3, $4)",
      [vote, votedAt, fingerprintHash, constituencyKey]
    );

    await votePool.query(
      `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (constituency_key, vote)
       DO UPDATE SET vote_count = constituency_referendum_counts.vote_count + 1`,
      [constituencyKey, vote]
    );
    
    return res.json({ ok: true });
  } catch (error) {
    console.error("Referendum vote error:", error);
    return res.status(500).json({ error: "vote_submit_failed" });
  }
});

// Get referendum vote counts
app.get("/api/referendum/counts", ensureOrigin, async (req, res) => {
  try {
    const result = await votePool.query(
      `SELECT vote, SUM(vote_count) as count
       FROM constituency_referendum_counts
       GROUP BY vote`
    );

    const counts = { yes: 0, no: 0 };
    result.rows.forEach(row => {
      counts[row.vote] = parseInt(row.count, 10);
    });

    return res.json(counts);
  } catch (error) {
    console.error("Error fetching referendum counts:", error);
    return res.status(500).json({ error: "fetch_failed" });
  }
});

// ========================================
// ADMIN ROUTES (Google allowlist only)
// ========================================

app.get("/api/admin/me", ensureOrigin, ensureAdmin, (req, res) => {
  res.json({ ok: true, email: getUserEmails(req.user)[0] || null });
});

app.get("/api/admin/constituency", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    const constituencyKey = String(req.query.constituencyKey || "").trim();
    if (!constituencyKey) {
      return res.status(400).json({ error: "constituency_required" });
    }
    const result = await votePool.query(
      `SELECT candidate_name, party, coalition, vote_count
       FROM constituency_candidate_counts
       WHERE constituency_key = $1
       ORDER BY vote_count DESC`,
      [constituencyKey]
    );
    const refResult = await votePool.query(
      `SELECT vote, vote_count
       FROM constituency_referendum_counts
       WHERE constituency_key = $1`,
      [constituencyKey]
    );
    const referendum = { yes: 0, no: 0 };
    (refResult.rows || []).forEach((row) => {
      referendum[row.vote] = Number(row.vote_count) || 0;
    });
    res.json({ constituencyKey, rows: result.rows, referendum });
  } catch (error) {
    console.error("Admin constituency error:", error);
    res.status(500).json({ error: "fetch_failed" });
  }
});

app.post("/api/admin/candidate-count", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    const { constituencyKey, candidateName, party, count } = req.body || {};
    if (!constituencyKey || !candidateName) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const voteCount = Number(count);
    if (!Number.isFinite(voteCount) || voteCount < 0) {
      return res.status(400).json({ error: "invalid_count" });
    }
    const normalizedParty = normalizePartyName(party || "");
    const coalition = getCoalitionLabel(normalizedParty);
    await votePool.query(
      `INSERT INTO constituency_candidate_counts
        (constituency_key, candidate_name, party, coalition, vote_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (constituency_key, candidate_name, party)
       DO UPDATE SET vote_count = EXCLUDED.vote_count,
                     coalition = EXCLUDED.coalition`,
      [constituencyKey, candidateName, normalizedParty, coalition, voteCount]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Admin candidate count error:", error);
    res.status(500).json({ error: "update_failed" });
  }
});

app.delete("/api/admin/candidate-count", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    const { constituencyKey, candidateName, party } = req.body || {};
    if (!constituencyKey || !candidateName) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const normalizedParty = normalizePartyName(party || "");
    await votePool.query(
      `DELETE FROM constituency_candidate_counts
       WHERE constituency_key = $1 AND candidate_name = $2 AND party = $3`,
      [constituencyKey, candidateName, normalizedParty]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Admin candidate delete error:", error);
    res.status(500).json({ error: "delete_failed" });
  }
});

app.post("/api/admin/referendum-count", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    const { constituencyKey, vote, count } = req.body || {};
    if (!constituencyKey) {
      return res.status(400).json({ error: "constituency_required" });
    }
    if (!["yes", "no"].includes(vote)) {
      return res.status(400).json({ error: "invalid_vote" });
    }
    const voteCount = Number(count);
    if (!Number.isFinite(voteCount) || voteCount < 0) {
      return res.status(400).json({ error: "invalid_count" });
    }
    await votePool.query(
      `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (constituency_key, vote)
       DO UPDATE SET vote_count = EXCLUDED.vote_count`,
      [constituencyKey, vote, voteCount]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Admin referendum count error:", error);
    res.status(500).json({ error: "update_failed" });
  }
});

app.post("/api/admin/constituency-batch", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    const { constituencyKey, candidates, referendum } = req.body || {};
    if (!constituencyKey || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    let total = 0;
    const normalized = candidates.map((row) => {
      const candidateName = String(row.candidateName || "").trim();
      const party = normalizePartyName(row.party || "");
      const count = Number(row.count);
      if (!candidateName || !Number.isFinite(count) || count < 0) {
        throw new Error("invalid_candidate");
      }
      total += count;
      return {
        candidateName,
        party,
        coalition: getCoalitionLabel(party),
        count,
      };
    });

    const yes = Number(referendum?.yes);
    const no = Number(referendum?.no);
    if (!Number.isFinite(yes) || !Number.isFinite(no) || yes < 0 || no < 0) {
      return res.status(400).json({ error: "invalid_referendum" });
    }
    if (yes + no !== total) {
      return res.status(400).json({ error: "referendum_mismatch" });
    }

    const client = await votePool.connect();
    try {
      await client.query("BEGIN");

      // Replace counts for this constituency
      await client.query(
        "DELETE FROM constituency_candidate_counts WHERE constituency_key = $1",
        [constituencyKey]
      );

      for (const row of normalized) {
        await client.query(
          `INSERT INTO constituency_candidate_counts
            (constituency_key, candidate_name, party, coalition, vote_count)
           VALUES ($1, $2, $3, $4, $5)`,
          [constituencyKey, row.candidateName, row.party, row.coalition, row.count]
        );
      }

      await client.query(
        `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
         VALUES ($1, 'yes', $2), ($1, 'no', $3)
         ON CONFLICT (constituency_key, vote)
         DO UPDATE SET vote_count = EXCLUDED.vote_count`,
        [constituencyKey, yes, no]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Admin batch error:", error);
    if (error.message === "invalid_candidate") {
      return res.status(400).json({ error: "invalid_candidate" });
    }
    return res.status(500).json({ error: "batch_failed" });
  }
});

app.post("/api/admin/rebuild-counts", ensureOrigin, ensureAdmin, async (req, res) => {
  try {
    await votePool.query("BEGIN");

    await votePool.query("TRUNCATE constituency_candidate_counts");

    await votePool.query(
      `INSERT INTO constituency_candidate_counts (constituency_key, candidate_name, party, coalition, vote_count)
       SELECT constituency_key,
              candidate_name,
              COALESCE(party, '') AS party,
              '' AS coalition,
              COUNT(*) AS vote_count
       FROM constituency_votes
       GROUP BY constituency_key, candidate_name, COALESCE(party, '')`
    );

    const rows = await votePool.query(
      `SELECT constituency_key, candidate_name, party FROM constituency_candidate_counts`
    );

    for (const row of rows.rows) {
      const normalizedParty = normalizePartyName(row.party || "");
      const coalition = getCoalitionLabel(normalizedParty);
      await votePool.query(
        `UPDATE constituency_candidate_counts
         SET coalition = $1
         WHERE constituency_key = $2 AND candidate_name = $3 AND party = $4`,
        [coalition, row.constituency_key, row.candidate_name, row.party]
      );
    }

    await votePool.query("TRUNCATE constituency_referendum_counts");
    await votePool.query(
      `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
       SELECT COALESCE(constituency_key, $1) AS constituency_key,
              vote,
              COUNT(*) AS vote_count
       FROM referendum_votes
       GROUP BY COALESCE(constituency_key, $1), vote`,
      [GLOBAL_REFERENDUM_KEY]
    );

    await votePool.query("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    await votePool.query("ROLLBACK");
    console.error("Admin rebuild error:", error);
    res.status(500).json({ error: "rebuild_failed" });
  }
});

app.get("/api/candidates/:constituency", (req, res) => {
  try {
    const candidateFilePath = path.join(__dirname, "public", "candidates.json");
    const fs = require("fs");
    if (fs.existsSync(candidateFilePath)) {
      const data = JSON.parse(fs.readFileSync(candidateFilePath, "utf-8"));
      const { constituency } = req.params;
      const candidates = data[constituency] || [];
      return res.json({ constituency, candidates });
    }
    res.json({ constituency: req.params.constituency, candidates: [] });
  } catch (err) {
    console.error("Error fetching candidates:", err);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

const r2 = new S3Client({
  region: R2_REGION,
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

app.get("/api/files", ensureOrigin, async (req, res) => {
  const rawPath = String(req.query.path || "");
  if (!rawPath.startsWith("/candidatess/")) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const key = path.posix.normalize(rawPath.replace(/^\//, ""));
  if (key.includes("..")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  try {
    const data = await r2.send(command);
    
    // Construct filename from candidateName and docType if provided
    const candidateName = req.query.candidateName || '';
    const docType = req.query.docType || '';
    const originalFileName = path.posix.basename(key);
    const ext = path.extname(originalFileName);
    
    let fileName = originalFileName;
    if (candidateName && docType) {
      fileName = `${candidateName} - ${docType}${ext}`;
    }

    if (data.ContentType) {
      res.setHeader("Content-Type", data.ContentType);
    }
    if (data.ContentLength) {
      res.setHeader("Content-Length", data.ContentLength.toString());
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    if (data.Body && typeof data.Body.pipe === "function") {
      return data.Body.pipe(res);
    }

    return res.status(500).json({ error: "Invalid file stream" });
  } catch (err) {
    console.error("File proxy error:", err);
    return res.status(404).json({ error: "Not found" });
  }
});

app.get("/api/files/exists", ensureOrigin, async (req, res) => {
  const rawPath = String(req.query.path || "");
  if (!rawPath.startsWith("/candidatess/")) {
    return res.status(400).json({ error: "Invalid path" });
  }
  const key = path.posix.normalize(rawPath.replace(/^\//, ""));
  if (key.includes("..")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    res.json({ exists: true });
  } catch (err) {
    res.json({ exists: false });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

ensureVoteTable()
  .then(() => backfillCountsIfEmpty())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize vote storage:", error);
    process.exit(1);
  });
