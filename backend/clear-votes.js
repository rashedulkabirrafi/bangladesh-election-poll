import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: false } : false,
});

async function clearVotes() {
  try {
    const client = await pool.connect();
    
    console.log('Clearing referendum_votes...');
    await client.query('DELETE FROM referendum_votes');
    
    console.log('Clearing constituency_votes...');
    await client.query('DELETE FROM constituency_votes');
    
    console.log('Clearing vote_locks...');
    await client.query('DELETE FROM vote_locks');
    
    console.log('✓ All votes cleared successfully');
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error clearing votes:', error.message);
    process.exit(1);
  }
}

clearVotes();
