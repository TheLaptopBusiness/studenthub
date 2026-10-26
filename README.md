# Laptop Business Mastery – Student Hub

An automated fulfillment system for your students. Students don't need a Claude account; the AI runs on your Anthropic API key.

## What it does

**For students** (your site, e.g. `hub.yourdomain.com`)
- **Three ways to sign in:** Continue with Google, email + password, or a one-time email link (always there as the backup, and for forgotten passwords). Only students you enroll can get in, whichever way they use.
- **My Dashboard.** Created the moment a student is enrolled: your 21-step enrollment checklist in 6 sections (Welcome · Business name + domain · Legal setup · Logo + website · eBay + Facebook Marketplace · Sourcing prep). Every step has a due date and turns red when it's late. Students tick steps and type the answer where one is needed (partner, business name, domain, tier, brand, goal). Step 5 is the **brand survey**, filled in right in the Hub: their business name (they must confirm it's verified before they can send it), whether they have a logo (link to it) or, if not, their colours and style, and the contact details to show on their new website. Sending it ticks the step, starts the 5-business-day logo clock, and emails the answers to the team. They comment on any step to ask a question, and see messages from their coaches. No uploads. Our team's steps (logo, then a newly built website) show when they're due. Students only ever see Moses and Cynthia as their coaches; anything Abdi posts shows as "Your coaching team".
- **Their next step** is always on Home, with one button to go straight to it.
- **AI Coach**: 24/7 answers from your playbook. It knows each student's checklist progress, tier, brand and weekly target.
- **Auction Analysis**: paste a GovDeals, Public Surplus or other surplus auction link (plus optional description text and screenshots). The hub reads the listing and returns a verdict (Strong / Worth a look / Pass), every model in the lot with specs, Windows 11 support and an estimated resale range, auction terms, red flags, missing details and questions to send the seller. One click sends the numbers to the Deal Analyzer for the max bid.
- **Deal Analyzer**, **Listing Builder**, **Playbook**: profit math, listings, and your SOPs.
- **Weekly Check-in**: next-week plan, and the report is saved for you automatically.

**For you** (`/admin.html`)
- **Coach Knowledge**: teach the AI Coach your methods. Paste YouTube transcripts (timestamps are cleaned out for you), drop in caption files (.srt / .vtt) in bulk, add documents, your rules and numbers, or write verified Q&A answers. The Coach follows, in order: your verified answers → your videos and documents → the playbook → general knowledge (and says when it's using general knowledge). Answers that draw on a video end with "From: <video title>".
- **Questions to review**: students tap "👍 Yes" or "👎 Not quite" under every Coach answer. Answers marked wrong land here with the student's note. Write the right answer once and it becomes a verified answer the Coach uses for everyone. Your daily email tells you when something's waiting.
- **Enroll a student** with name, email and mobile, and pick their owner (Moses Confidence or Cynthia Nweze). Moses, Cynthia and Abdi all have the same full access. Or let GoHighLevel do it (see below).
- **Students list**: owner, stage, checklist %, next step, and flags: comments to answer, our logo/website late, overdue steps, quiet 14+ days, never signed in. Filters for each, plus "Everyone's students" / one owner. Students waiting on us sort to the top.
- **Student page**: their brand survey answers, their full checklist. Tick any step for them, deliver the logo or website (paste the link and they get an email and text), reply to comments, move a due date (for our steps, tick "Tell the student" to post a heads-up), post on their message board, change owner, pause reminders, plus auctions, check-ins and private notes.

**What happens automatically**

| When | What goes out |
|---|---|
| Student enrolled | Fresh dashboard + welcome email and text + a welcome message from their coach pointing to the brand survey |
| Brand survey sent | The answers are emailed to the whole team; the logo clock starts |
| A section is finished | Congratulations email + text (once per section) |
| Our team delivers the logo or website | "Your logo is ready" email + text |
| A coach replies to a comment or posts a message | Email + text |
| Every box checked | "You're cleared to buy" email + text + message board post |
| A step goes past its due date | One email + text per step |
| Quiet 3 days / 5 days | Text / email with their next step |
| Never signed in | Reminder every 3 days (up to 3) |
| Monday | Focus text with this week's step |
| Sunday | Check-in reminder email + text |
| Friday 6pm MT / Saturday 5pm MT | Coaching call reminders: email the day before, text an hour before (with `CALL_LINK`) |
| Every morning | **Team summary** to everyone in `TEAM`: our late logos/websites first, comments to answer, students 3 and 7+ days late, quiet students, at-risk, never signed in, and the day's wins |

Texts are capped at 1 a day and 4 a week per student (call reminders don't count), so nobody gets spammed. Texts go out through your GoHighLevel workflow; students who reply STOP are handled there.

Each student can make **40 AI requests a day** (change with `AI_DAILY_LIMIT`), so costs stay predictable.

---

## Setup (about 45 minutes, no coding)

You'll create four free or low-cost accounts. Keep a note open to paste keys into.

### 1. Anthropic (the AI)
1. Go to **console.anthropic.com**, create an account, add billing and some credits.
2. Set a monthly **spend limit**.
3. Under **API Keys**, create a key → this is `ANTHROPIC_API_KEY`.

### 2. Supabase (student database and sign-in)
1. Go to **supabase.com**, create a free account and a **New project** (pick the region closest to your students; save the database password somewhere).
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, click **Run**. (Already set up from an earlier version? Run it again: it only adds what is new and keeps your data.)
3. Open **Project Settings → API**. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY` (keep this private; never put it in a web page)
4. Open **Authentication → Providers → Email** and set the **email OTP / link expiry** to `86400` seconds (24 hours) so welcome links last a day.
5. You'll come back after step 4 to add your site address (see step 5).

### 3. Resend (sending emails)
1. Go to **resend.com**, create an account.
2. Under **Domains**, add your domain (e.g. `yourdomain.com`) and add the DNS records it shows you at your domain provider. Wait until it says **Verified**.
3. Under **API Keys**, create a key → `RESEND_API_KEY`.
4. Your sender is `EMAIL_FROM`, e.g. `Laptop Business Mastery <coach@yourdomain.com>`.

### 4. GitHub + Vercel (the website)
1. On **github.com**, create a **private** repository named `student-hub` and upload everything in this folder (keep the folder structure).
2. On **vercel.com**, **Add New → Project**, import `student-hub`, Framework Preset **Other**.
3. Add these **Environment Variables** before deploying:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | from step 1 |
| `SUPABASE_URL` | from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
| `RESEND_API_KEY` | from step 3 |
| `EMAIL_FROM` | from step 3 |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → the **anon / publishable** key. Safe to share with browsers; switches on password sign-in |
| `GOOGLE_SIGNIN` | `on` to show "Continue with Google" (after step 5b) |
| `TEAM` | your team, `Name=email` separated by `;`, e.g. `Moses Confidence=moses@yourdomain.com; Cynthia Nweze=cynthia@yourdomain.com; Abdi Hassan=abdi@yourdomain.com`. Everyone here can open the coach dashboard and gets the morning summary |
| `STUDENT_COACHES` | optional, the coaches students see and who can own students. Default `Moses Confidence, Cynthia Nweze`. Anyone else in `TEAM` has full access but appears to students as "Your coaching team" |
| `DEFAULT_OWNER` | optional, who owns new students. Default: the first name in `STUDENT_COACHES` |
| `ADMIN_EMAILS` | optional, extra coach-dashboard logins that aren't in `TEAM` |
| `GHL_WEBHOOK_URL` | your GoHighLevel inbound webhook link, for texts (step 7) |
| `ENROLL_SECRET` | any long random password; GoHighLevel sends it when it enrolls a student (step 8) |
| `CALL_LINK` | the join link for the Saturday coaching call |
| `CALL_DAY` / `CALL_HOUR` / `CALL_TZ` | optional, default `Sat` / `18` / `America/Denver` (6pm MT) |
| `DAILY_HOUR` | optional, hour the daily reminders and summary go out, default `9` |
| `SITE_URL` | your site address, e.g. `https://hub.yourdomain.com` (no slash at the end) |
| `CRON_SECRET` | any long random password; Vercel uses it to run the hourly reminder job |
| `TIMEZONE` | optional, default `America/Los_Angeles` |
| `PROGRAM_NAME` | optional, default `Laptop Business Mastery` |
| `CLAUDE_MODEL` | optional, default `claude-sonnet-5-5` |
| `AI_DAILY_LIMIT` | optional, default `40` |
| `COACH_MODEL` | optional, a different model just for the AI Coach (e.g. a more capable one) |
| `KNOWLEDGE_MAX_CHARS` | optional, default `200000` (≈33,000 words). Up to this size the Coach reads your whole library on every question; above it, it reads the parts most relevant to each question |
| `AUCTION_DOMAINS_EXTRA` | optional, extra auction sites the hub may read, comma-separated (e.g. `bidcal.com,localauction.com`) |

4. Click **Deploy**. Then **Settings → Domains** to add `hub.yourdomain.com`, and make sure `SITE_URL` matches it.

### 5. Connect sign-in to your site
In Supabase → **Authentication → URL Configuration**:
- **Site URL**: your `SITE_URL`
- **Redirect URLs**: add `https://hub.yourdomain.com/**`

### 5b. Turn on Google sign-in (optional, about 10 minutes, free)
1. Go to **console.cloud.google.com**, create a project (e.g. "Student Hub").
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name ("Laptop Business Mastery"), your support email, and publish it.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - Under **Authorized redirect URIs**, add `https://<your-project>.supabase.co/auth/v1/callback` (your `SUPABASE_URL` + `/auth/v1/callback`).
4. Copy the **Client ID** and **Client secret**.
5. In Supabase → **Authentication → Providers → Google**: switch it on and paste both.
6. In Vercel, set `GOOGLE_SIGNIN` to `on` and redeploy.

Leave "Allow new users to sign up" switched **on** in Supabase. Someone who isn't enrolled can still create a login with Google, but the hub refuses them ("This account isn't enrolled"). Students must use the Google account with the same email you enrolled them with.

**Passwords** need no extra setup beyond `SUPABASE_ANON_KEY`. Students sign in with an email link the first time, then set a password under **Account & password** (the Home screen nudges them). Forgot it? "Email me a sign-in link", then set a new one. You can set your own password from the **Password** button on the coach dashboard.

### 6. Test it
1. Go to `https://hub.yourdomain.com/admin.html`, enter your email, and click the link you receive.
2. Enroll yourself as a test student with a second email address and your mobile. Open the welcome email, sign in, tick a few steps and leave a comment.
3. Back on the coach dashboard, open yourself, reply to the comment and post a message. You should get emails (and texts once step 7 is done).
4. In Vercel → your project → **Settings → Cron Jobs**, click **Run** next to `/api/cron`. It runs every hour; the reminders and summary go out once a day at `DAILY_HOUR`.

### 7. Texts through GoHighLevel (about 20 minutes)
1. In GoHighLevel → **Automation → Workflows → Create workflow**, trigger **Inbound Webhook**. Copy its URL into `GHL_WEBHOOK_URL` in Vercel and redeploy.
2. Run a test from the coach dashboard (post a message to your test student) so GoHighLevel sees a sample.
3. Add action **Create/Update Contact**: map `email`, `phone`, `first_name`, `last_name`.
4. Add action **Send SMS** with the message `{{inboundWebhookRequest.sms}}`. Every text is already written by the hub; GoHighLevel just sends it.
5. Optional: add **If/Else** on `event` (`enrolled`, `section_complete`, `overdue`, `call_reminder`, `gate_open`, …) to tag contacts or move them through a pipeline.
6. US texting needs **A2P 10DLC registration** in GoHighLevel (LC Phone). Do it early: approval can take a few days.

### 8. Enroll automatically from GoHighLevel (optional)
In the workflow that runs when someone signs your agreement or pays, add a **Custom Webhook** action: method `POST`, URL `https://hub.yourdomain.com/api/enroll?secret=YOUR_ENROLL_SECRET`, body with `first_name`, `last_name`, `email`, `phone`. The student gets their dashboard, welcome email and text within seconds. Sending the same contact twice is safe.

The brand survey lives in the Hub, so there's no form to connect. (If a student ever sends their brand details another way, a coach can tick the step on their student page.)

---

## Making the Coach smarter

1. **Add your video transcripts first.** Start with the 10–20 videos students ask about most. On YouTube: open the video → **…more** → **Show transcript** → copy → paste into Coach Knowledge with the video's title and link. For many videos, download caption files from **YouTube Studio → Subtitles** and drag them in together.
2. **Add your rules and numbers** as "My rules & numbers": max price per model, models you avoid, your grading standards, preferred suppliers. Short and direct works best.
3. **Check "Questions to review" a few times a week.** Every correction makes the Coach right for every student from then on.
4. **Cost:** the Coach's instructions and library are cached by Anthropic for a few minutes, so questions asked close together cost much less. A bigger library means each question costs more; above `KNOWLEDGE_MAX_CHARS` the Coach only reads the relevant parts, which keeps costs flat.

## About auction links

The hub opens links only from known auction sites: GovDeals, Public Surplus, GSA Auctions, AllSurplus, Municibid, HiBid, BidSpotter, PropertyRoom, Liquidation.com, Purple Wave, Proxibid and eBay, plus any you add in `AUCTION_DOMAINS_EXTRA`.

Some of these sites build their pages with JavaScript, so the hub may only see part of the listing. When that happens, the analysis says what's missing and shows a note asking the student to paste the description or add screenshots. Screenshots of the listing and photos always work.

## Running it with Skool

Skool can't run the hub inside it, so Skool is the front door:
- Put the hub link in a **Classroom resource link** and your **group card links**.
- Enroll from GoHighLevel (step 8) or the coach dashboard. That one step triggers everything else.

## What sign-in costs

Nothing extra. Google sign-in and passwords are free in Supabase, and they don't send emails, so they don't use up Resend's free 3,000 emails a month (100 a day). Email links are only sent for first sign-ins, forgotten passwords and new devices.

## Day-to-day

- **Every morning**: read the team summary. Answer comments, deliver late logos/websites, then message quiet students.
- **New student**: GoHighLevel enrolls them, or enroll on `/admin.html`. Done.
- **Student left or refunded**: open them and click **Pause access**.
- **Edit your SOPs**: edit `public/playbook.js` on GitHub. The playbook page, AI Coach, deal reviews and listings update automatically.
- **Change the checklist**: edit `lib/checklist.js` (and copy it to `public/checklist.js`). New steps are added to every student's dashboard the next time it loads.
- **Errors**: Vercel → project → **Logs**.

## What's still manual (next phases)

- Deals, sales and wins tracking, and the Facebook Marketplace version of each listing (Phase 2).
- Today / Pipeline / Broadcast views for the team (Phase 3).
- Coaching-call prep summaries and post-call follow-ups, which need call recordings or transcripts.
- QC testing workflow, inventory tracking and condition-grading from photos.
