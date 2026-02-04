import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cors from "cors";
import path from "path";
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

app.get("/api/files", ensureOrigin, ensureAuth, (req, res) => {
  const rawPath = String(req.query.path || "");
  if (!rawPath.startsWith("/candidatess/")) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const key = path.posix.normalize(rawPath.replace(/^\//, ""));
  if (key.includes("..")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const expiresIn = Math.max(60, Number(R2_URL_TTL) || 300);
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  getSignedUrl(r2, command, { expiresIn })
    .then((url) => {
      res.setHeader("Cache-Control", "no-store");
      res.redirect(url);
    })
    .catch((err) => {
      console.error("Signed URL error:", err);
      res.status(404).json({ error: "Not found" });
    });
});

app.get("/api/files/exists", ensureOrigin, ensureAuth, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
