# Render PostgreSQL Setup Guide

## Step 1: Create Postgres Database on Render

1. Go to [render.com](https://render.com) and sign in/sign up
2. Click **"New +"** button → Select **"PostgreSQL"**
3. Fill in the details:
   - **Name**: `bangladesh-election-db` (or any name)
   - **Database**: `bangladesh_election` (or any name)
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users
   - **Instance Type**: Select **Free** tier (or paid if needed)
4. Click **"Create Database"**

## Step 2: Get Connection String

After database is created:

1. On the database dashboard, scroll to **"Connections"** section
2. Copy the **"External Database URL"** - it looks like:
   ```
   postgres://username:password@host.region.render.com/database_name
   ```

Example format:
```
postgres://bd_user:ABC123xyz@dpg-abc123xyz-a.singapore-postgres.render.com/bangladesh_election_db
```

## Step 3: Update Backend .env

1. Open `/home/rafi/bangladesh-election-poll/backend/.env`
2. Replace the `DATABASE_URL` line with your actual connection string from Render
3. Save the file

Example:
```env
DATABASE_URL=postgres://bd_user:ABC123xyz@dpg-abc123xyz-a.singapore-postgres.render.com/bangladesh_election_db
```

## Step 4: Test Connection

After updating .env, restart your backend server:
```bash
cd /home/rafi/bangladesh-election-poll/backend
npm run dev
```

Check the console for:
- ✅ `Backend listening on 8080` - Server started
- ✅ No database errors - Connection successful
- ✅ `vote_locks` table auto-created

## Troubleshooting

**Error: Connection refused**
- Check if DATABASE_URL is correct
- Verify Render database is running (not paused)

**Error: SSL required**
- Render Postgres requires SSL by default
- Our code handles this automatically

**Free tier limitations**
- 90 days of inactivity → database paused
- 1GB storage limit
- Suitable for development/small production

---

## Alternative: Use Supabase (Also Free)

If you prefer Supabase:

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Project Settings** → **Database**
4. Copy **Connection String** (choose "URI" mode)
5. Paste into `DATABASE_URL` in .env

Supabase also has dashboard for viewing data.

---

## Security Note

⚠️ **Never commit .env file to git**  
Your `.env` file is already in `.gitignore` - keep it there!

For production deployment:
- Set `DATABASE_URL` in Render/Vercel environment variables
- Don't hardcode in code or config files
