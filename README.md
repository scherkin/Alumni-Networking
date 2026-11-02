# Alumni Network

A members-only website where students find graduates of their high school by career field and message them.
Messages appear on the site in real time and are emailed to the other person at the same time.

- **Sign in** with LinkedIn (graduates) or an emailed sign-in link (students and staff without LinkedIn).
- **Directory** of alumni with field tabs, search, filters, and sorting by class year, name, job title or seniority.
- **Messaging**: private conversations between a member and an alumni profile. Each message is also emailed to
  the other side. If the graduate hasn't joined yet, the email invites them to sign in and reply.
- **Claim this profile**: a graduate proves a profile is theirs with a 6-digit code emailed to the address on the
  profile. If they signed in with that same verified email (for example through LinkedIn), it links automatically.
- **Internships**: a news box on the home page shows the latest open internships, with a full board at
  `/internships`. Each posting shows the company, who posted it, a short description, the sign-up link, how many
  interns they'll take, who can apply (grade levels, minimum GPA, experience) and whether it's paid. Graduates
  and staff can post; students can browse and filter by pay, grade and field. Postings close automatically after
  their deadline, and posters can close them early.
- **Staff review**: staff can read every conversation, release wrong claims and delete profiles.

Stack: Next.js 14 (App Router), Supabase (Postgres, Auth, Realtime), Resend for email. Hosting on Vercel.

## What LinkedIn sign-in provides

LinkedIn's "Sign In with LinkedIn using OpenID Connect" shares only **name, email address and profile photo**.
Job title, employer and education are limited to LinkedIn partner programs, so they are not imported. The site
uses the name and photo for the member's account, and the verified email to match and auto-claim their alumni
profile. Members can paste their LinkedIn profile URL in their account settings.

## Privacy and safety

- The whole site, including messaging, requires an account. Signed-out visitors go to the sign-in page, where
  either sign-in option also creates a new account. Contact details are visible only to signed-in members.
- Only graduates and staff can post internships, and only the poster or staff can edit or delete one.
- Row level security in Postgres enforces the rules, not just the pages:
  - Conversations and messages are readable only by the two people in them and by staff.
  - Members can't make themselves staff or set who owns a profile. Claims go through the verified server flow.
  - Claim codes are stored hashed, expire after 15 minutes, allow 5 attempts, and are readable only by the server.
- Each member can send up to 40 messages an hour, which limits email spam.
- The site never emails sample profiles or `example.com` addresses.
- Email replies are not collected. Emails link back to the site to reply.

## Setup

You need accounts with Supabase, LinkedIn Developers, Resend and Vercel. All have free tiers that are enough to start.

### 1. Supabase

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_internships.sql`,
   then `supabase/seed.sql` to load the 300 made-up
   sample profiles (skip the seed if you don't want them).
3. From **Project Settings → API**, copy the project URL, the `anon` key and the `service_role` key.
4. In **Authentication → URL Configuration**, set **Site URL** to your site address (for example
   `https://alumni.your-school.org`) and add `https://alumni.your-school.org/auth/callback` and
   `http://localhost:3000/auth/callback` to **Redirect URLs**.

### 2. LinkedIn sign-in

1. At <https://www.linkedin.com/developers/apps> create an app. LinkedIn requires a company page to associate it
   with, such as the school's.
2. Under **Products**, add **Sign In with LinkedIn using OpenID Connect**.
3. Under **Auth**, add this redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase **Authentication → Providers → LinkedIn (OIDC)**, turn it on and paste the ID and secret.

### 3. Email (Resend)

1. At <https://resend.com>, add and verify the school's sending domain, then create an API key.
2. In Supabase **Project Settings → Authentication → SMTP Settings**, turn on custom SMTP with Resend
   (host `smtp.resend.com`, port `465`, user `resend`, password = the API key) so sign-in links come from your
   domain and aren't limited by Supabase's built-in email quota.

### 4. Run it locally

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then:

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>.

### 5. Deploy to Vercel

1. Push this folder to a GitHub repository and import it at <https://vercel.com/new>.
2. Add every variable from `.env.example` in **Settings → Environment Variables**, with
   `NEXT_PUBLIC_SITE_URL` set to the live address.
3. Deploy, then add the live `/auth/callback` URL in Supabase (step 1.4) if you haven't already.

### Staff accounts

Anyone whose sign-in email is listed in `STAFF_EMAILS` becomes staff when they next save their account details
(on first join, or via **Edit** in the header). You can also run this in the Supabase SQL Editor:

```sql
update public.members set is_staff = true where id = (select id from auth.users where email = 'person@school.org');
```

### Removing the sample profiles before launch

```sql
delete from public.alumni_profiles where is_sample;
```

## Project layout

| Path | What it does |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Tables, row level security, realtime, unread counter |
| `supabase/seed.sql` | 300 made-up sample alumni (medicine, engineering, finance) |
| `src/app/actions.ts` | Server actions: joining, claiming, profiles, sending messages and emails |
| `src/lib/email.ts` | Resend emails for messages and claim codes |
| `src/app/messages/` and `src/components/Thread.tsx` | Inbox and live conversation view |
| `src/app/alumni/[id]/` | Profile, claim flow and edit form |
| `supabase/migrations/0002_internships.sql` | Internship board table and posting rules |
| `src/app/internships/` and `src/components/Internship*.tsx` | Internship board, news box cards, posting form |
| `src/app/staff/` | Staff review |
