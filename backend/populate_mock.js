import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from current directory
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : false
});

async function populate() {
  console.log('Connecting to database...');
  let client;
  try {
    client = await pool.connect();
    
    console.log('Cleaning up old counts...');
    await client.query('TRUNCATE constituency_candidate_counts RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE constituency_referendum_counts RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE referendum_votes RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE constituency_votes RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE vote_locks RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE device_locks RESTART IDENTITY CASCADE');

    const constituenciesPath = path.join(__dirname, '../frontend/src/assets/constituencies.json');
    const candidatesPath = path.join(__dirname, '../frontend/src/assets/candidates_new.json');
    
    const constituencies = JSON.parse(fs.readFileSync(constituenciesPath, 'utf8'));
    const candidatesData = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));

    console.log(`Populating ${constituencies.length} constituencies...`);

    const partyGroups = [
      { label: 'বিএনপি জোট', parties: ['বাংলাদেশ জাতীয়তাবাদী দল'] },
      { label: 'এগারো দলীয় নির্বাচনি ঐক্য', parties: ['বাংলাদেশ জামায়াতে ইসলামী'] },
      { label: 'গণতান্ত্রিক যুক্তফ্রন্ট', parties: ['বাংলাদেশের কমিউনিস্ট পার্টি'] },
      { label: 'বৃহত্তর সুন্নী জোট', parties: ['বাংলাদেশ ইসলামী ফ্রন্ট'] },
      { label: 'জাতীয় গণতান্ত্রিক ফ্রন্ট', parties: ['জাতীয় পার্টি (এরশাদ)'] },
      { label: 'অন্যান্য দলসমূহ', parties: ['ইসলামী আন্দোলন বাংলাদেশ'] }
    ];

    for (const seat of constituencies) {
      const key = `${seat.division}||${seat.district}||${seat.constituency}`;
      const candidates = candidatesData[key] || [];
      
      if (candidates.length === 0) continue;

      // Distribute random votes
      const totalVotes = Math.floor(Math.random() * 200) + 100;
      
      // Give one party a lead
      const winnerIndex = Math.floor(Math.random() * candidates.length);
      
      let remaining = totalVotes;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        let voteCount = 0;
        
        if (i === winnerIndex) {
          voteCount = Math.floor(remaining * (Math.random() * 0.4 + 0.3));
        } else if (i === candidates.length - 1) {
          voteCount = remaining;
        } else {
          voteCount = Math.floor(remaining * (Math.random() * 0.3));
        }
        
        remaining -= voteCount;

        if (voteCount > 0) {
          const party = candidate.party || '';
          let coalition = 'অন্যান্য / স্বতন্ত্র';
          for (const group of partyGroups) {
            if (group.parties.some(p => party.includes(p) || p.includes(party))) {
              coalition = group.label;
              break;
            }
          }

          await client.query(
            `INSERT INTO constituency_candidate_counts 
             (constituency_key, candidate_name, party, coalition, vote_count)
             VALUES ($1, $2, $3, $4, $5)`,
            [key, candidate.name, party, coalition, voteCount]
          );
        }
      }

      // Random referendum votes
      const refYes = Math.floor(Math.random() * totalVotes);
      const refNo = totalVotes - refYes;

      await client.query(
        `INSERT INTO constituency_referendum_counts (constituency_key, vote, vote_count)
         VALUES ($1, 'yes', $2), ($1, 'no', $3)`,
        [key, refYes, refNo]
      );
    }

    console.log('Successfully populated random data!');
  } catch (err) {
    console.error('Error during population:', err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

populate();
