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
    
    CREATE TABLE IF NOT EXISTS referendum_votes (
      id SERIAL PRIMARY KEY,
      vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
      voted_at BIGINT NOT NULL,
      fingerprint_hash TEXT
    );
  `);
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
    const redirectTo = req.query.state || "/";
    res.redirect(redirectTo);
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
    
    // Insert vote lock and actual vote in a transaction
    const client = await votePool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('Inserting vote lock for:', fingerprintHash);
      await client.query(
        "INSERT INTO vote_locks (fingerprint_hash, voted_at, ip_hash, ua_hash) VALUES ($1, $2, $3, $4)",
        [fingerprintHash, votedAt, ipHash, uaHash]
      );
      console.log('Vote lock inserted successfully');
      
      console.log('Inserting constituency vote:', { constituencyKey, candidateName, party: party || null });
      await client.query(
        "INSERT INTO constituency_votes (constituency_key, candidate_name, party, voted_at, fingerprint_hash) VALUES ($1, $2, $3, $4, $5)",
        [constituencyKey, candidateName, party || null, votedAt, fingerprintHash]
      );
      console.log('Constituency vote inserted successfully');
      
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
      `SELECT candidate_name, party, COUNT(*) as vote_count 
       FROM constituency_votes 
       WHERE constituency_key = $1 
       GROUP BY candidate_name, party 
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
      `SELECT constituency_key, candidate_name, party, COUNT(*) as vote_count 
       FROM constituency_votes 
       GROUP BY constituency_key, candidate_name, party 
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
    
    await votePool.query(
      "INSERT INTO referendum_votes (vote, voted_at, fingerprint_hash) VALUES ($1, $2, $3)",
      [vote, Date.now(), fingerprintHash]
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
      `SELECT vote, COUNT(*) as count FROM referendum_votes GROUP BY vote`
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
// ADMIN ROUTES
// ========================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Hardcoded admin credentials (CHANGE THESE!)
    if (username === 'admin' && password === 'CannotWorkWithThis5!') {
      const token = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(`${username}-${Date.now()}`)  // ✅ Fixed - parentheses around backticks
        .digest('hex');
      
      return res.json({ token });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify admin token
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  // Simple token validation (you should enhance this)
  if (token.length > 10) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get statistics
app.get('/api/admin/stats', ensureOrigin, authenticateAdmin, async (req, res) => {
  try {
    const constituencyCount = await votePool.query('SELECT COUNT(DISTINCT constituency_key) FROM constituency_votes');
    const referendumCount = await votePool.query('SELECT COUNT(*) FROM referendum_votes');
    const totalVotes = await votePool.query('SELECT COUNT(*) FROM constituency_votes');
    
    res.json({
      totalConstituencies: parseInt(constituencyCount.rows[0].count),
      totalReferendums: parseInt(referendumCount.rows[0].count),
      totalVotesCast: parseInt(totalVotes.rows[0].count || 0)
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get constituency votes with pagination
app.get('/api/admin/constituency-votes', ensureOrigin, authenticateAdmin, async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const result = await votePool.query(
      `SELECT constituency_key, candidate_name, party, COUNT(*) as vote_count, 
              MAX(voted_at) as last_vote_at
       FROM constituency_votes 
       WHERE candidate_name ILIKE $1 OR party ILIKE $1 OR constituency_key ILIKE $1
       GROUP BY constituency_key, candidate_name, party
       ORDER BY vote_count DESC 
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );
    
    const countResult = await votePool.query(
      `SELECT COUNT(DISTINCT (constituency_key, candidate_name, party)) 
       FROM constituency_votes 
       WHERE candidate_name ILIKE $1 OR party ILIKE $1 OR constituency_key ILIKE $1`,
      [`%${search}%`]
    );
    
    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Constituency votes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get referendum votes
app.get('/api/admin/referendum-votes', ensureOrigin, authenticateAdmin, async (req, res) => {
  try {
    const result = await votePool.query(
      `SELECT vote, COUNT(*) as count FROM referendum_votes GROUP BY vote`
    );
    
    const votes = { yes: 0, no: 0 };
    result.rows.forEach(row => {
      votes[row.vote] = parseInt(row.count, 10);
    });
    
    res.json(votes);
  } catch (error) {
    console.error('Referendum votes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vote locks
app.get('/api/admin/vote-locks', ensureOrigin, authenticateAdmin, async (req, res) => {
  try {
    const result = await votePool.query(
      `SELECT fingerprint_hash, voted_at, ip_hash, ua_hash 
       FROM vote_locks 
       ORDER BY voted_at DESC 
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Vote locks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete constituency vote (example admin action)
app.delete('/api/admin/constituency-votes/:constituency/:candidate', ensureOrigin, authenticateAdmin, async (req, res) => {
  const { constituency, candidate } = req.params;
  
  try {
    await votePool.query(
      'DELETE FROM constituency_votes WHERE constituency_key = $1 AND candidate_name = $2',
      [constituency, candidate]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ error: error.message });
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
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize vote storage:", error);
    process.exit(1);
  });
