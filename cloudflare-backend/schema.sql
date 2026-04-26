CREATE TABLE IF NOT EXISTS vote_locks (
  fingerprint_hash TEXT PRIMARY KEY,
  voted_at INTEGER NOT NULL,
  ip_hash TEXT,
  ua_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_vote_locks_voted_at
ON vote_locks(voted_at);

CREATE TABLE IF NOT EXISTS device_locks (
  device_id TEXT PRIMARY KEY,
  voted_at INTEGER NOT NULL,
  fingerprint_hash TEXT,
  ip_hash TEXT,
  ua_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_locks_voted_at
ON device_locks(voted_at);

CREATE TABLE IF NOT EXISTS vote_cooldowns (
  ip_hash TEXT NOT NULL,
  ua_hash TEXT NOT NULL,
  last_vote_at INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, ua_hash)
);

CREATE TABLE IF NOT EXISTS constituency_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  constituency_key TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  party TEXT,
  voted_at INTEGER NOT NULL,
  fingerprint_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_constituency_votes_key
ON constituency_votes(constituency_key);

CREATE TABLE IF NOT EXISTS constituency_candidate_counts (
  constituency_key TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  party TEXT NOT NULL DEFAULT '',
  coalition TEXT NOT NULL DEFAULT '',
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  PRIMARY KEY (constituency_key, candidate_name, party)
);

CREATE TABLE IF NOT EXISTS referendum_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
  voted_at INTEGER NOT NULL,
  fingerprint_hash TEXT,
  constituency_key TEXT,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS constituency_referendum_counts (
  constituency_key TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  PRIMARY KEY (constituency_key, vote)
);
