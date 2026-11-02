# Alumni Career Network

A tool that helps high school students find graduates working in the career they're curious about, and reach out
for advice, job shadows, informational interviews and internships.

There are two versions:

| | **Claude page (prototype)** | **Hosted website (this repository)** |
| --- | --- | --- |
| Where | <https://claude.ai/artifact/87rSwKaRppnGzf2AAM1R4R> | Next.js + Supabase, deployed to Vercel (not live yet) |
| Sign-in | claude.ai account | LinkedIn, or an emailed sign-in link |
| Email | Pre-filled draft sent from the person's own email | Sent automatically through Resend |
| Message privacy | The page only shows each conversation to the people in it and staff, but anyone with edit access can read all messages | Enforced by the database: only the two people and staff |
| Sample data | Loaded from data files published with the page | Loaded from `supabase/seed.sql` |

A third, browse-only preview lives in `docs/` for GitHub Pages: the directory and internships work, sign-in and messaging are turned off.

Both use the same 5,000 made-up alumni and 33 made-up internships.

---

## Features

### Directory
- Alumni profiles with name, class year, field, specialty, job title, employer, city, college, a short description
  of their work, and contact details (email, phone, LinkedIn, preferred way to reach them).
- **Field tabs** with counts, **search** across name, title, employer, college and city, and filters for
  **what they'll help with** and **graduation decade**.
- **Sorting:** newest or oldest graduates, name, job title, most senior first, early career first.
- **Seniority levels** worked out from the job title: Student, Early career, Professional, Senior specialist,
  Manager, Executive / owner.
- **48 people per page** with Previous and Next.
- Anyone signed in can add a profile. Contact details need a consent box ticked, confirming the graduate agreed
  to share them with students.

### Industries
Healthcare & Medicine, Engineering, Business, Finance, Law, Journalism, Media & Communications, Architecture,
Performing Arts, Hospitality, and Politics & Government. Real profiles can also use Technology & Computing,
Education, Science & Research, Arts & Design, Military, Skilled Trades, Nonprofit & Social Impact,
Sports & Recreation and Other.

### Accounts
- Messaging, posting and claiming profiles require an account. On the hosted site, the whole site requires one.
- On first sign-in, people say whether they're a **current student**, a **graduate** or **teacher/staff**, plus
  their graduation year and an optional LinkedIn URL.
- **LinkedIn sign-in** (hosted site) fills in name and photo. LinkedIn only shares name, email and photo; job title,
  employer and education are limited to LinkedIn's approved partners, so they can't be imported.

### Claim this profile
- A graduate can claim the profile that describes them, so messages to it reach them and they can keep it current.
- **Hosted site:** a 6-digit code is emailed to the address on the profile. Codes are stored hashed, expire after
  15 minutes and allow 5 tries. If someone signs in with the same verified email that's on the profile, it links
  automatically.
- **Claude page:** graduates link their profile when they join the network. Profiles can't be verified by email.
- Staff can release a claim made by the wrong person.

### Messaging
- Private conversations between a member and an alumni profile, with live updates and unread counts.
- **Hosted site:** every message is also emailed to the other person. If the graduate hasn't joined yet, the email
  invites them to sign in and reply. Replying to the email itself isn't collected; the email links back to the site.
- **Claude page:** an "Email" option opens a pre-written draft to send from your own email, and "I sent it" saves
  a copy in the conversation.
- Staff can read every conversation for student safety, but can't reply in other people's.
- Limit of 40 messages per person per hour (hosted site) so the email feature can't be used for spam.

### Internships
- A **news box** at the top of the directory shows the 3 newest open internships. The **Internships** tab shows
  all of them.
- Each posting has: **company**, **internship title**, **who posted it** (with their role, class year and a link
  to their profile), a **short description** of the work, a **sign-up link**, **how many interns** they'll take,
  **who can apply** (grade levels, minimum GPA, experience or skills), and **paid or unpaid** (with optional pay
  details). Also location, field and an application deadline.
- Postings close automatically after their deadline, and posters can close them early.
- Students can filter by paid or unpaid, grade level and field, and choose to show closed postings.
- **Only graduates and staff can post.** Only the poster or staff can edit or delete a posting. On the hosted
  site the database enforces this; on the Claude page, the page enforces the graduate/staff rule.

### Staff
- Staff are set by email address (`STAFF_EMAILS`) on the hosted site, or by Editor access on the Claude page.
- Staff can review all conversations, release claims, delete profiles and edit or remove any internship.

---

## Sample data

All sample data is **made up** and labeled "Sample" everywhere it appears.

- **5,000 alumni**, about 455 in each of the 11 industries.
- **Ages 19 to 66,** spread evenly within every field. Jobs match age, from students and early-career roles to
  executives, partners, judges, mayors and artistic directors. No retired people.
- People 38 and older in mid-level roles have "Senior" titles, so seniority sorting has a realistic spread.
- **1 in 25** lists what they'll help with, such as mentoring, job shadowing or résumé review.
- **Emails use `example.com`** and **phones use 555-0100 to 555-0199**. Both are reserved for fiction and can't
  reach anyone. The site never emails sample profiles.
- **33 internships**, about 3 per industry, with a mix of paid and unpaid, grade levels and GPA requirements.
  3 are already closed. Each is credited to a made-up graduate in that field, and sign-up links go to `example.org`.
- Generated by `scripts/generate_seed.py`. Edit it and run `python3 scripts/generate_seed.py` to change the mix.

To remove all sample data before launch (hosted site):

```sql
delete from public.internships where is_sample;
delete from public.alumni_profiles where is_sample;
```

---

## Privacy and safety

- Contact details are visible only to signed-in members. Adding someone's contact details requires confirming
  they agreed to share them.
- Profiles are never filled in from scraped LinkedIn data. LinkedIn's terms forbid it, and the people listed
  wouldn't have agreed to it.
- On the hosted site, database row level security enforces who can read and change what:
  - Conversations and messages: only the two people in them, plus staff.
  - Members can't make themselves staff or take over a profile without verifying.
  - Students can read internships but can't post them. Nobody can change who a posting is credited to.
  - Sign-up links must be normal web addresses.
- Staff review exists so adults' conversations with students can be checked.

These rules were tested against a real Postgres database with pretend students, graduates and staff.

---

## Hosted site: setup

Full steps are in `README.md`. In short:

1. **Supabase:** create a project, run `supabase/migrations/0001` to `0003` in order, then load
   `supabase/seed.sql` with `psql` (it's about 1.5 MB, too big for the SQL Editor).
2. **LinkedIn:** create an app at LinkedIn Developers (it needs a company page, such as the school's), add
   "Sign In with LinkedIn using OpenID Connect", and paste its ID and secret into Supabase's LinkedIn provider.
3. **Resend:** verify the school's email domain and create an API key. Also set it as Supabase's email sender so
   sign-in links come from the school.
4. **Vercel:** import the repository and add the settings from `.env.example`.

### Project layout

| Path | What it does |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Members, alumni profiles, conversations, messages, claim codes, access rules |
| `supabase/migrations/0002_internships.sql` | Internship board and posting rules |
| `supabase/migrations/0003_directory_search.sql` | Seniority levels, paged search, field counts |
| `supabase/seed.sql` | 5,000 sample alumni and 33 sample internships |
| `scripts/generate_seed.py` | Regenerates the sample data |
| `src/app/actions.ts` | Server actions: joining, claiming, profiles, messages, internships, emails |
| `src/app/` | Pages: directory, profiles, claim, messages, internships, staff, sign-in |
| `src/components/` | Directory, conversation view, internship cards and forms, profile form |
| `src/lib/email.ts` | Message and claim-code emails |

---

## Open items

- **Push the code to GitHub.** It currently lives only in a temporary workspace.
- **Not yet tested with real accounts:** LinkedIn sign-in, email delivery and live message updates. They need the
  real Supabase, LinkedIn and Resend accounts.
- **Possible next steps:**
  - Fill in a profile from a LinkedIn "Save to PDF" export.
  - Let alumni reply to message emails directly.
  - Show sample internships until real ones exist, then hide them.
  - Remove the sample data before launch.
