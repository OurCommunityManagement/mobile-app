# Supabase Setup Guide
## Deploying your Community Management System as a live cloud portal

---

## Step 1 — Create a Supabase account and project

1. Go to **https://supabase.com** and click **Start your project** (free plan is fine)
2. Sign up / log in
3. Click **New Project**
4. Fill in:
   - **Organization:** your name or company
   - **Project name:** e.g. `community-cms`
   - **Database password:** choose a strong password (you won't need it in the app)
   - **Region:** pick the one closest to your users
5. Click **Create new project** — wait ~2 minutes for provisioning

---

## Step 2 — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` (in this same folder) and **copy its entire contents**
4. Paste into the SQL editor and click **Run** (green button)
5. You should see: `Success. No rows returned`

---

## Step 3 — Get your API credentials

1. In Supabase, go to **Project Settings → API** (gear icon in the sidebar)
2. Copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

---

## Step 4 — Add credentials to the app

1. Open `community_management.html` in any text editor
2. Near the top of the `<script>` section, find these two lines:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';
```

3. Replace the placeholder values with your actual URL and anon key:

```js
const SUPABASE_URL  = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

4. Save the file

---

## Step 5 — Deploy the app (choose one option)

### Option A — Netlify Drop (easiest, 2 minutes)
1. Go to **https://app.netlify.com/drop**
2. Drag and drop the `community_management.html` file onto the page
3. Netlify gives you a live URL like `https://random-name.netlify.app`
4. Done! Share community URLs with your admins

### Option B — GitHub Pages
1. Create a free GitHub account at https://github.com
2. Create a new repository (public)
3. Upload `community_management.html` — rename it to `index.html`
4. Go to **Settings → Pages → Source → main branch → / (root)**
5. Your URL will be: `https://yourusername.github.io/your-repo-name`

### Option C — Vercel
1. Go to **https://vercel.com** and sign up with GitHub
2. Click **Add New → Project → Upload** and drag the HTML file
3. Click **Deploy** — done

---

## Step 6 — First login

Once deployed, open the URL and log in with the default platform admin:

| Field    | Value               |
|----------|---------------------|
| Email    | platform@cms.com    |
| Password | Platform@123        |

> **Change this password immediately** after first login via Platform Settings.

From the platform dashboard, create your first community and share its URL with the community admin.

---

## How data is stored

| Data type         | Storage          |
|-------------------|------------------|
| Platform settings | Supabase `platform_kv` table |
| Community data    | Supabase `community_kv` table (namespaced by community ID) |
| Login sessions    | Browser localStorage (device-specific — clears on browser clear) |

All community data (owners, invoices, payments, staff, notices) is stored in Supabase and accessible from **any device** that opens the community URL.

---

## Migrating existing data

If you were using the old localStorage-only version, the app will **automatically migrate** your data to Supabase the first time it loads. You will see `[migrate] localStorage → Supabase complete` in the browser console when this completes.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Connecting to server…" hangs | Check that SUPABASE_URL and SUPABASE_ANON are filled in correctly |
| Login fails for all users | Open browser console (F12) and check for `[DB write]` or `[loadPlatformData]` errors |
| Data not appearing on another device | Make sure you're using the same deployed URL (not opening the HTML file locally) |
| Supabase policy errors or `permission denied for table ...` | Re-run `supabase-schema.sql` to recreate the RLS policies and restore the table grants for `anon` / `authenticated` |
