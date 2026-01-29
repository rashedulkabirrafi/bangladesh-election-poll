import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const app = express();

app.set('trust proxy', true);
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voted_ips (
      ip TEXT PRIMARY KEY,
      voted_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      division TEXT NOT NULL,
      district TEXT NOT NULL,
      constituency TEXT NOT NULL,
      candidate TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (division, district, constituency, candidate)
    );
  `);
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'db_error' });
  }
});

app.get('/api/status', async (req, res) => {
  const ip = getClientIp(req);
  try {
    const result = await pool.query('SELECT 1 FROM voted_ips WHERE ip = $1', [ip]);
    res.json({ voted: result.rowCount > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

app.post('/api/vote', async (req, res) => {
  const { division, district, constituency, candidate } = req.body || {};
  if (!division || !district || !constituency || !candidate) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const ip = getClientIp(req);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertIp = await client.query(
      'INSERT INTO voted_ips (ip) VALUES ($1) ON CONFLICT DO NOTHING RETURNING ip',
      [ip]
    );

    if (insertIp.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Already voted' });
    }

    await client.query(
      `
        INSERT INTO votes (division, district, constituency, candidate, count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (division, district, constituency, candidate)
        DO UPDATE SET count = votes.count + 1
      `,
      [division, district, constituency, candidate]
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'db_error' });
  } finally {
    client.release();
  }
});

app.get('/api/results', async (req, res) => {
  const { division, district, constituency } = req.query;

  if (!division || !district) {
    return res.status(400).json({ error: 'division and district required' });
  }

  try {
    let rows;
    if (constituency) {
      const result = await pool.query(
        `
          SELECT division, district, constituency, candidate, count
          FROM votes
          WHERE division = $1 AND district = $2 AND constituency = $3
        `,
        [division, district, constituency]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `
          SELECT division, district, constituency, candidate, count
          FROM votes
          WHERE division = $1 AND district = $2
        `,
        [division, district]
      );
      rows = result.rows;
    }

    const map = new Map();
    rows.forEach((row) => {
      const key = `${row.division}||${row.district}||${row.constituency}`;
      if (!map.has(key)) {
        map.set(key, {
          division: row.division,
          district: row.district,
          constituency: row.constituency,
          votes: {}
        });
      }
      map.get(key).votes[row.candidate] = row.count;
    });

    res.json({ items: Array.from(map.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema', err);
    process.exit(1);
  });
