# Golf Stats — private score entry, public viewing

This is a simple mobile-friendly golf stats web service built from your existing workbook. It has:
- public stats/leaderboard/round history
- admin login for you only
- admin-only score entry
- Supabase Postgres database
- existing Belhus and Cranham data imported into `supabase.sql`

## Free setup

### 1. Create Supabase
Create a free project at https://supabase.com. The free plan currently includes a Postgres database, Auth, 500 MB database storage and 50,000 monthly active users.

### 2. Create your admin user
In Supabase: Authentication → Users → Add user. Create your email/password account. Copy that user's UUID.

### 3. Create the database
Open SQL Editor in Supabase. Open `supabase.sql`. Replace every `YOUR_ADMIN_USER_UUID` with your actual user UUID. Run the SQL. This creates the rounds table, security policies and imports the workbook data.

### 4. Get the Supabase keys
In Supabase open Project Settings → API. Copy the Project URL and the anon/public key.

Open `app.js` and change:

    const SUPABASE_URL="YOUR_SUPABASE_URL";
    const SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY";

Do NOT put a service-role/secret key in the website.

### 5. Test it
Open `index.html` in a browser. The stats should load. Click Admin and sign in. Add a test round.

### 6. Put it online free
Recommended: Netlify. Create a free account, then use Netlify's drag-and-drop deployment and upload this folder. Netlify currently lists a $0 Free plan and supports drag-and-drop deployments.

Your site will get a free Netlify URL such as `something.netlify.app`. You can later connect a custom domain if you buy one.

## Important
The public site can view the scores, but Supabase Row Level Security only permits the UUID you put into the policies to insert/update/delete rounds.

## Future upgrades
- player profile pages
- score trends
- hole-by-hole averages
- course leaderboards
- head-to-head stats
- handicap/net scoring
- editing/deleting rounds from admin
- invite-only viewer login if you want the site private
