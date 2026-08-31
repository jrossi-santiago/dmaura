# DM Aura

A pricing/landing site and the tool behind it — plus an older waitlist page
that's still in the repo but no longer linked from anywhere live.

```
index.html            pricing + landing page — currently byte-identical to landing/index.html (see note below)
landing/index.html    the same pricing + landing page
waitlist/index.html   the original early-access page — waitlist capture, posts to Formspree — orphaned, nothing links here
app/                  the tool itself, a standalone static PWA
  index.html          the entire app — markup, styles, logic
  admin/index.html    trial activation dashboard (see "Admin" section below)
  sw.js               service worker, cache-first shell (bump CACHE on deploy)
  manifest.webmanifest, icon.svg, icon-*.png   paper-plane mark on cobalt
  sample-leads.csv    example import, including rows with no numeric id
scripts/tracking.js   third-party tracking scripts (DataFast), loaded by every page above
```

Both halves are static and dependency-free. Drop the folder on any host: `/`
serves the landing/pricing page, `/app/` serves the tool. Everything under
`app/` uses relative paths, so it runs from any prefix without configuration.

**File-layout note (as of the last README pass):** `index.html` and
`landing/index.html` are currently exact duplicates — same pricing copy,
same "Start free trial" buttons pointing at `/app/?plan=...`. The page that
actually does waitlist capture (Formspree, the `_gotcha` honeypot, the "join
early access" copy) now lives only at `waitlist/index.html`, which nothing
on the live site links to. If the product is still meant to be waitlist-only
before a public pricing push, point `index.html` back at the waitlist and
drop the duplicate; if pricing is meant to be the front door now, delete one
of the two identical copies and redirect the other. Either is a five-minute
fix — it just hasn't been made yet, so right now a visitor to `/` lands on
a page that sends them straight into Stripe Checkout.

## The waitlist page

Signups POST to Formspree (`https://formspree.io/f/xnpqanrz`) over `fetch`, so
the page never navigates away. It handles the states a real form needs: field
validation before submit, a busy button, server-side errors surfaced in the
copy Formspree returns, and a success panel that echoes the address it captured.
A hidden `_gotcha` field catches bots.

Two plates: cream paper for the pitch and the form, navy for the product. The
headline is Instrument Sans at 700, broken by one word set in Instrument Serif
italic — a grotesk/editorial-serif switch rather than a single didone doing
both jobs. A flowing gradient ribbon (cobalt → green → orange → pink) draws in
behind the hero on load, and halftone dot clusters sit in the corners of both
plates as texture. IBM Plex Mono carries the marginalia and the lab-notebook
numbering (`No. 001`, `01–03`, `Fig. 01`) that runs the length of the page; the
reading copy is Instrument Sans, the same face the tool uses. All three faces
load from Google Fonts with `display=swap`, so nothing blocks first paint.

Every colour pair was checked rather than eyeballed: cobalt text and marks
against the cream ground clear AA comfortably, and the one places opacity is
used for de-emphasis (labels, timestamps) stay well clear of the 4.5:1 floor
for body-sized text.

The navy plate is a mockup of the outbox — three sent DMs and the day's tally,
built from real markup rather than a screenshot, so it stays sharp and re-flows
on a phone. **The names and handles in it are invented**, and the plate is
labelled `Sample` and `names are fictional` on its own face. Replace it with
genuine sends when there are some worth showing.

There is no social-proof row. Inventing customer logos for an unreleased tool
would be fabricating endorsements, so the slot holds product claims that are
true instead.

---

# The tool

The tool and the site are one brand: the same paper-plane mark, the same
cream, cobalt, ink. Both now share the exact same accent (`#2C4CDB`) and the
exact same type system (Instrument Sans, Instrument Serif italic for the
wordmark's "Aura", IBM Plex Mono for figures) — there is no longer a
deliberate divergence between the two the way there was under the old
vermilion brand.

It was called Reach until the rename. A store saved under the old
`reach.v1.default` key is migrated to `dmaura.v1.default` on first load, so
nobody loses their leads.

## The one thing that matters: numeric user IDs

X can prefill a DM only if it knows the recipient's **numeric account id**:

```
https://x.com/messages/compose?recipient_id=44196397&text=Hey%20Elon…
```

There is no equivalent link that works from a handle. So:

| Your CSV has | What the button does |
| --- | --- |
| A numeric id (`id`, `rest_id`, `user_id`) | Opens the DM thread, message already typed. One tap. |
| Only a handle or profile URL | Copies the message, opens the profile. Tap **Message**, paste, send. |

Most scrapers (Apify, PhantomBuster, TweetScout, most Selenium exports) include
the id — keep that column. The **Needs ID** filter shows you which leads are
missing one, and you can paste it into any lead under *Info*.

## Running it

One static HTML file, no build step, no dependencies.

```bash
python3 -m http.server 8000
# http://localhost:8000       waitlist page
# http://localhost:8000/app/  the tool
```

On iPhone, open the deployed `/app/` URL in Safari → Share → **Add to Home
Screen**. It installs as a standalone app and works offline; DMs still open the
X app.

## Importing

Drop a CSV, or paste rows straight into the box. A bare column of profile links
works too:

```
https://x.com/naval
https://x.com/patio11
@dhh
```

Columns are auto-matched by header (`screen_name`, `followers_count`,
`description`, `rest_id`, …) and you can correct any of them before importing.
Re-importing is safe: leads are matched on numeric id first, then handle.
Existing rows get gaps filled in — including a missing id, which upgrades them
to one-tap — and nothing you have typed is overwritten. `sample-leads.csv` in
this repo is a working example, including the awkward cases.

## Messages

Templates use two kinds of braces:

- **Tokens** pull from the lead or your settings:
  `{first}` `{name}` `{handle}` `{bio}` `{bioshort}` `{topic}` `{followers}`
  `{location}` `{me}` `{company}` `{pitch}` `{question}`
- **Spintax** rotates at random: `{Hey|Hi|Yo}` — so no two DMs go out
  word-for-word identical, which is what pattern-matching spam filters look for.

`{topic}` is derived from the first clause of the person's bio. It is a decent
first guess, not a good one — read every message before you send it. That is the
point of the tool.

Edit any message inline before sending; edits are kept per-lead until sent.

## Not getting your account limited

X throttles new and aggressive accounts well below the official ~500/day. In
*Settings*:

- **Daily goal** — what you're aiming for (drives the ring and the streak).
- **Daily cap** — warns at 80% and again when you hit it.
- **Seconds between DMs** — shows a cooldown in focus mode. 30–60s is sane for a
  cold list; 0 turns it off.

## Metrics

- **Streak** — consecutive days with at least one DM. It survives until a whole
  day passes empty, so "today, nothing yet" doesn't break yesterday's chain.
- **Daily goal ring**, 30-day bar chart, 18-week contribution heatmap.
- **Funnel** — imported → DM'd → replied → booked.
- **Per-template reply rate** in the templates screen, so you can tell which
  opener actually works.

Replies are marked by hand — X has no API that would tell the app. Set a lead to
*Replied* or *Booked* from the status row in their sheet, or select several and
set them in bulk.

## CRM

A separate mode from sending: nothing in it opens X or logs a DM. It's for
managing leads *after* the first message — the **Sending / CRM** switch at
the top of the app swaps the whole screen between the two, so it's never
ambiguous which one you're looking at.

- **Calendar** — a month grid of every lead's follow-up date. A day with a
  pending follow-up that's due today or overdue turns red; tap a day to
  filter the list below to just that day's leads, tap again to clear it.
- **Follow-up date & note**, per lead — set from the CRM list or from a
  lead's *Info* tab in the regular sheet. The date is what puts them on the
  calendar; there's no separate "responded" flag — marking a lead
  **Replied** (in the CRM list or the status row) *is* the responded state,
  so it can't drift out of sync with the funnel or the reply-rate stats.
- **Re-add to campaign** — puts a contacted lead back to *Queued* and
  clears its follow-up date and draft, so it shows up in the sending queue
  again as if it were never messaged. The DM history itself is untouched.

## Where the data lives

`localStorage` on that device is always the write-through cache — the app
works with no network, on a train, offline entirely.

With no Supabase project configured (the default), that's the whole story:
single device, nothing uploaded, exactly the original behavior. **Settings →
Backup → Download** writes a JSON file with everything, and *Restore* reads
it back. Export also writes a CSV of whatever the current filter shows.

With a Supabase project configured (below), the app also gates itself behind
email/password sign-in and every `save()` pushes to Postgres, keyed by
`auth.uid()`. Row Level Security means every user only ever sees their own
rows — strangers can sign up, upload their own CSV, and never see anyone
else's leads.

---

## Multi-user setup (Supabase)

### 1. Create the project

1. [supabase.com](https://supabase.com) → New project. Pick any name/region,
   save the database password somewhere (you won't need it again for this).
   Takes ~2 minutes to provision.
2. Project → **Authentication → Providers → Email** → turn **Confirm email**
   **off**. This is the "no reconfirm" step — without it, Supabase makes new
   users click a link in their inbox before they get a session, which is the
   right call for production and annoying for testing right now.
3. Project → **Settings → API** → copy the **Project URL** and the **anon
   public** key. (Not the `service_role` key — that one bypasses RLS and must
   never go in client-side code.)

### 2. Run the SQL

Project → **SQL Editor → New query**, paste this in, click **Run**. It's
idempotent (`if not exists` everywhere) so re-running it is harmless.

```sql
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists templates (
  id         uuid primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id         uuid primary key,
  user_id    uuid not null references auth.users on delete cascade,
  xid        text default '',          -- numeric X account id
  handle     text default '',
  name       text default '',
  bio        text default '',
  avatar     text default '',
  website    text default '',
  location   text default '',
  followers  int  default 0,
  following  int  default 0,
  tweets     int  default 0,
  verified   bool default false,
  status     text default 'queued',    -- queued|sent|replied|booked|no|skip
  tags       text[] default '{}',
  list_name  text default '',
  note       text default '',
  follow_up  date,                     -- CRM screen: user-set reminder date, shown on its calendar
  draft      text default '',
  tpl_id     uuid,
  dms        jsonb not null default '[]'::jsonb,   -- the send log, embedded per lead
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Dedupe on the same keys the client merges on.
create unique index if not exists leads_user_xid    on leads (user_id, xid)    where xid <> '';
create unique index if not exists leads_user_handle on leads (user_id, lower(handle)) where handle <> '';
create index if not exists leads_user_status on leads (user_id, status);

-- Older leads tables predate follow_up; this adds it without touching
-- anything else if the column is already there.
alter table leads add column if not exists follow_up date;

-- One row per deleted lead/template so a delete on one device reaches every
-- other signed-in device instead of getting silently re-created by whichever
-- device pushes its (stale, pre-delete) local copy next.
create table if not exists tombstones (
  id         uuid not null,
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null check (kind in ('lead','template')),
  deleted_at timestamptz not null default now(),
  primary key (id, kind)
);

-- Every table is per-user; one policy shape covers all of them.
alter table profiles   enable row level security;
alter table templates  enable row level security;
alter table leads      enable row level security;
alter table tombstones enable row level security;

drop policy if exists own_profiles   on profiles;
drop policy if exists own_templates  on templates;
drop policy if exists own_leads      on leads;
drop policy if exists own_tombstones on tombstones;
create policy own_profiles   on profiles   for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy own_templates  on templates  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_leads      on leads      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_tombstones on tombstones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

(This is a simpler shape than an earlier draft of this section: DMs live as
a `jsonb` column on `leads` instead of their own table, matching how the
client already nests them under each lead — one row per lead to upsert,
instead of keeping a second table in sync.)

If you ran the SQL from an earlier version of this README (no `tombstones`
table), just run the block above again — every statement is `if not exists`
or `drop ... ; create ...`, so it adds what's missing without touching your
existing rows.

### 2b. Admin: trial activation dashboard

`app/admin/` is a separate one-page dashboard (not part of the main app) that
shows, per signed-up user: signup date, last login, whether they've imported
a list, DM count, and whether they hit **20 DMs within 48 hours of signup**
(the activation bar — see `app/admin/index.html` to change the threshold).

It reads through one Postgres function instead of querying `leads`/`auth.users`
directly, because RLS normally walls every user off from every other user's
rows — this function is the one deliberate exception, aggregating across all
users. It checks the caller's own logged-in email against an allowlist before
returning anything, so being signed in isn't enough — you have to be signed in
*as an admin*. Run this once in the SQL Editor, after the block above:

```sql
create or replace function admin_trial_activation()
returns table (
  user_id          uuid,
  email            text,
  signed_up_at     timestamptz,
  last_login_at    timestamptz,
  first_import_at  timestamptz,
  first_dm_at      timestamptz,
  dm_count         bigint,
  dms_in_48h       bigint,
  activated        boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Add more admin emails to this array as needed, then re-run this block.
  if auth.email() is null or auth.email() <> all (array['jrossi@preemptglobal.com']) then
    raise exception 'not authorized';
  end if;

  return query
  with dm_events as (
    select l.user_id, (dm->>'at')::bigint as at_ms
    from leads l, jsonb_array_elements(l.dms) as dm
    where jsonb_typeof(l.dms) = 'array' and dm ? 'at'
  ),
  per_user_dm as (
    select user_id, count(*) as dm_count, min(to_timestamp(at_ms / 1000.0)) as first_dm_at
    from dm_events
    group by user_id
  ),
  first_import as (
    select user_id, min(created_at) as first_import_at
    from leads
    group by user_id
  ),
  signup as (
    select id as user_id, email, created_at as signed_up_at, last_sign_in_at as last_login_at
    from auth.users
  ),
  dms_48h as (
    select d.user_id, count(*) as dms_in_48h
    from dm_events d
    join signup s on s.user_id = d.user_id
    where to_timestamp(d.at_ms / 1000.0) <= s.signed_up_at + interval '48 hours'
    group by d.user_id
  )
  select
    s.user_id, s.email, s.signed_up_at, s.last_login_at,
    fi.first_import_at, pd.first_dm_at,
    coalesce(pd.dm_count, 0) as dm_count,
    coalesce(d48.dms_in_48h, 0) as dms_in_48h,
    coalesce(d48.dms_in_48h, 0) >= 20 as activated
  from signup s
  left join first_import fi on fi.user_id = s.user_id
  left join per_user_dm pd on pd.user_id = s.user_id
  left join dms_48h d48 on d48.user_id = s.user_id
  order by s.signed_up_at desc;
end;
$$;

-- Only signed-in users may even attempt to call it; the email check above
-- then filters that down to admins only. Anonymous callers are rejected
-- before the query runs at all.
revoke all on function admin_trial_activation() from public;
grant execute on function admin_trial_activation() to authenticated;
```

`security definer` means the function runs with the privileges of the user
who created it (you, the project owner), bypassing RLS on purpose — that's
what lets one query see every user's row. It only returns the aggregated
columns above, never raw leads, drafts, or message content. `auth.email()`
reads from the caller's own JWT, so it can't be spoofed by editing anything
in the browser — a non-admin gets a Postgres-level rejection no matter what
the page's JS does.

**The "password" is just your Supabase login.** `app/admin/` now shows a
sign-in form (same email/password auth as the main app) instead of data.
Sign in with an account whose email is in the allowlist above and the
dashboard loads; any other account — or staying signed out — gets "not
authorized." Nothing new to store in Vercel or anywhere else: the anon key
stays public as designed, and the real gate lives in Postgres, keyed to
your email, not a shared secret sitting in client-side JS.

### 3. Point the app at it

Edit `app/config.js`:

```js
window.DMAURA_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

That's the only file that needs your project's details. Leave both blank and
the app stays in local-only mode with no login screen at all.

### 4. Run it

```bash
python3 -m http.server 8000
# http://localhost:8000/app/
```

Open it, hit **Create account** with any email/password (6+ chars) — since
email confirmation is off, that logs you straight in, no inbox check. Anyone
else who does the same gets their own empty sheet; RLS keeps every user's
leads, templates, and settings walled off from everyone else's at the
database level, not just in the UI.

**Forgot password:** on the **Sign in** tab, "Reset it" calls
`sb.auth.resetPasswordForEmail()`, which emails a link through Supabase's
built-in email sending (works even with email confirmation off — that
setting only affects signup, not password recovery). Clicking the link
brings someone back to the app with a recovery session; the app detects
Supabase's `PASSWORD_RECOVERY` auth event and shows a "set a new password"
screen instead of dropping them straight into whatever account that link's
session belongs to.

**One thing that does need configuring, and won't error — it'll just send
people to the wrong place:** Supabase only honors `resetPasswordForEmail`'s
`redirectTo` if it matches **Authentication → URL Configuration → Redirect
URLs** in the dashboard; otherwise it silently falls back to whatever **Site
URL** is set to, which defaults to `http://localhost:3000` on a fresh
project. On this repo's project that default was still in place — every
reset link pointed at `localhost:3000` until it got fixed via the
Management API (`PATCH /v1/projects/{ref}/config/auth` with `site_url` and
`uri_allow_list`). Doing it from the dashboard instead: **Site URL** →
`https://yourdomain.com/app/`; **Redirect URLs** → add
`https://yourdomain.com/app/**` (and `http://localhost:8000/**` if you test
locally per "Running it" above). No code change needed either way — this is
purely a Supabase project setting, separate from anything in this repo.

Existing local (pre-login) data on a device is **not** auto-migrated into a
new cloud account — sign in first on a fresh browser/profile, or use
**Settings → Backup → Restore** to bring an old JSON export into the
now-signed-in account.

### How the sync works

- `save()` (already the single write path for every mutation) debounces a
  push to Postgres ~900ms later — a full upsert of `leads` + `templates` +
  the `profiles` settings row for the signed-in user. A lead or template you
  delete locally is deleted from its table in the same push, and stamped
  into `tombstones` so every other signed-in device removes it too.
- Sign-in pulls `leads`, `templates`, `profiles`, and `tombstones` for that
  user and merges into the local copy: newer `updated_at` wins per row, and
  any row with a tombstone newer than its local `updated` gets removed
  locally instead of resurrected.
- While the app is open and signed in, it also pulls on **tab focus**
  (switching back to the tab) and every **45 seconds** in the background —
  so a lead added on your phone shows up on your laptop without a manual
  reload, typically within under a minute.
- Offline, or before the SQL above has been run (so the `tombstones` table
  doesn't exist yet), pushes/pulls just fail silently and the app keeps
  working off `localStorage` — nothing blocks on the network.
- Not real-time: two devices editing the *same* lead within the same
  ~45-second window still resolve by last-write-wins on `updated_at`, so the
  later save wins and the earlier one is overwritten. Fine for one person
  moving between their own phone and laptop; a true multi-editor tool would
  want Supabase Realtime subscriptions instead of polling.

---

## Payments (Stripe)

**Status: live.** Steps 1–7 below have already been run against this repo's
Supabase project (`fkregyidgjovkzujcslw`) — the two Prices, the
`paid_customers` table, all three Edge Functions (checkout, webhook, billing
portal), and the webhook are deployed. `STRIPE_SECRET_KEY` on that project
is a **live** key (`sk_live_...`), confirmed by a smoke-tested Checkout
session — this is *not* the test-mode setup an earlier version of this
README described, so double-check in the Stripe dashboard that the webhook
endpoint from step 7 is registered under **Live mode**, not Test mode, and
that the two Prices from step 1 are the live-mode ones. Re-run these steps
as-is if you ever need to point this at a different Supabase or Stripe
project, or to add a second Test-mode setup for local development (a
separate Stripe test key + a second webhook endpoint + `supabase secrets
set --env-file` per environment, or just a second Supabase project).

**Both plans include a 5-day free trial that auto-charges the card
collected at checkout when the trial ends.** Stripe only supports trials on
recurring Prices, not one-time "payment mode" charges — so `Lifetime`'s
Price in step 1 must be **recurring**, not one-time, even though the
customer is only ever meant to pay once. `create-checkout-session` starts
*both* plans as a subscription Checkout session with `trial_period_days: 5`;
for `lifetime`, `stripe-webhook` cancels that subscription itself right
after its one real invoice pays, so it never renews. If you already have a
one-time `Lifetime` Price from before this change, add a new **recurring**
Price to that same product (interval doesn't matter — it's canceled before
any renewal) and update `STRIPE_PRICE_LIFETIME` to the new Price id; the old
one-time Price can stay around unused. Expect Stripe's dashboard to show a
lifetime purchase as a subscription that went trialing → active → canceled
after one invoice — that's expected, not a failed payment.

The landing page's two pricing buttons (`landing/index.html`, and currently
the identical `index.html` — see the file-layout note up top) are plain
links to `app/?plan=monthly` or `app/?plan=lifetime` — checkout never starts
anonymously. The app signs the person up (or in) first, and once they're
authenticated it shows a paywall screen — instead of the leads sheet — to
any signed-in account that hasn't paid, then immediately continues to
Stripe Checkout for whichever plan they picked on the landing page
(`requestedPlan` in `app/index.html`). Requires the Supabase project from
the section above; the paid/unpaid flag lives in Postgres, not in the
browser, so it can't be spoofed from devtools.

**The paid flag is keyed off the signed-in account's Supabase user id, not
its email.** Earlier this matched on whatever email ended up on the Stripe
Checkout session — but Stripe lets a customer edit that email right on its
own payment page (a pre-filled field isn't a locked one), so someone who
fixed a typo or used a different email there could pay successfully and
never see their own account unlock. `create-checkout-session` now requires
the caller's real Supabase session token (not the anon key) in
`Authorization`, verifies it server-side, and stamps the verified user id
onto the Checkout session as `client_reference_id`. The webhook reads that
back and keys `paid_customers.user_id` off it — see the SQL and both
functions' source comments for the full explanation.

How it fits together: the browser never talks to Stripe's secret API
directly. Three Supabase **Edge Functions** (`supabase/functions/`) do the
server-side work: `create-checkout-session` starts a Checkout session,
`stripe-webhook` is what Stripe calls when money actually moves — which is
what flips the account to paid — and `create-billing-portal-session` opens
Stripe's self-serve billing portal (update card, see invoices, cancel) for
an already-paid account, from **Settings → Billing → Manage** in the app.

`startCheckoutFromApp` also forwards the `datafast_visitor_id` and
`datafast_session_id` cookies (set by `scripts/tracking.js`) to
`create-checkout-session`, which puts them in the Checkout session's
`metadata` — that's all DataFast needs to attribute the resulting revenue
back to a marketing channel, no webhook required. If you change
`create-checkout-session`, redeploy it (step 6) for this to take effect.

**Crash reporting:** uncaught JS errors and rejected promises in
`app/index.html` get inserted into a `client_errors` table (see the SQL
below) instead of only showing up in one customer's console where nobody
ever sees them — capped at 5 per pageload so a repeating error can't spam
it. Nothing reads that table back through the API (insert-only RLS); check
it from the SQL Editor, or swap in a real error tracker (Sentry etc.) later
if volume grows past what a table can comfortably show you.

### 1. Create the products in Stripe

Stripe dashboard → **Product catalog → Add product**, twice:

| Product | Price | Billing |
| --- | --- | --- |
| DM Aura — Monthly | $9.00 | Recurring, monthly |
| DM Aura — Lifetime | $99.00 | Recurring (any interval — see note above; canceled after the first charge so it never actually renews) |

Both need **"Recurring"** selected in Stripe, even Lifetime — trials only
exist on recurring Prices. Open each product and copy its **Price ID**
(`price_...`, not the product id `prod_...`) — you'll need both in step 3.

### 2. Get your API keys

Dashboard → **Developers → API keys** → copy the **Secret key**
(`sk_live_...` or `sk_test_...` while testing). Never put this one in
`config.js` or anything served to the browser — it only ever goes into
Supabase's server-side function secrets, below.

### 3. Install the Supabase CLI and link your project

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # the xxxx in xxxx.supabase.co
```

### 4. Set the function secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_PRICE_MONTHLY=price_xxx \
  STRIPE_PRICE_LIFETIME=price_xxx \
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`SUPABASE_SERVICE_ROLE_KEY` is under **Settings → API** next to the anon
key — this is the one the README's other section warns you to keep out of
client code; here it's server-side only, inside the webhook function, so
that's fine. `STRIPE_WEBHOOK_SECRET` gets added in step 6, after Stripe
hands it to you.

### 5. Run the SQL

Same place as the multi-user setup above — **SQL Editor → New query**:

```sql
create table if not exists paid_customers (
  email                   text primary key,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text not null check (plan in ('monthly','lifetime')),
  status                  text not null default 'active' check (status in ('active','canceled','past_due')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- The actual account link — see "The paid flag is keyed off..." above.
-- `email` stays purely informational (who to look up in Stripe/support);
-- it's no longer what access is gated on.
alter table paid_customers add column if not exists user_id uuid references auth.users on delete cascade;

-- One-time backfill for rows written before this column existed.
update paid_customers pc
set user_id = u.id
from auth.users u
where pc.user_id is null and lower(pc.email) = lower(u.email);

alter table paid_customers drop constraint if exists paid_customers_user_id_key;
alter table paid_customers add constraint paid_customers_user_id_key unique (user_id);

alter table paid_customers enable row level security;

-- A signed-in user may read only their own row, by user id (falls back to
-- the old email match for any row a webhook redeploy hasn't touched yet —
-- harmless once every row has a user_id, which the backfill above ensures).
-- Only the webhook (via the service_role key, which bypasses RLS) ever
-- writes here.
drop policy if exists own_paid_status on paid_customers;
create policy own_paid_status on paid_customers
  for select using (auth.uid() = user_id or lower(email) = lower(auth.email()));

-- Client-side crash reports (see "Crash reporting" above). Insert-only:
-- the app can write its own error, nobody can read anyone's back out
-- through the API — check this table from the SQL Editor instead.
create table if not exists client_errors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete set null,
  email      text,
  message    text,
  stack      text,
  url        text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table client_errors enable row level security;
drop policy if exists insert_client_errors on client_errors;
create policy insert_client_errors on client_errors for insert with check (true);
```

### 6. Deploy the functions

```bash
supabase functions deploy create-checkout-session --project-ref <your-project-ref>
supabase functions deploy stripe-webhook --project-ref <your-project-ref> --no-verify-jwt
supabase functions deploy create-billing-portal-session --project-ref <your-project-ref>
supabase functions deploy end-trial-now --project-ref <your-project-ref>
```

`--no-verify-jwt` on the webhook matters — Stripe calls it directly with a
`stripe-signature` header, not a Supabase auth token, so the default
JWT check would reject every event with 401 before your code ever runs.
The others keep the default check, but unlike an earlier version of this
setup, that check alone isn't what identifies the caller — the app now
sends each signed-in user's *own* session token (not the anon key) as
`Authorization`, and each function verifies it and reads the user id off the
verified session, never off anything the request body claims. No new
secrets to set for the billing portal or end-trial-now functions — both
reuse `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from step 4, plus
`SUPABASE_URL`/`SUPABASE_ANON_KEY`, which the Edge Functions runtime injects
into every function automatically. `end-trial-now` only needs deploying if
you're using the gift-card promo widget — see "Gift-card promo" below.

Each deploy prints the function's URL, shaped like:

```
https://<your-project-ref>.supabase.co/functions/v1/create-checkout-session
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
https://<your-project-ref>.supabase.co/functions/v1/create-billing-portal-session
https://<your-project-ref>.supabase.co/functions/v1/end-trial-now
```

Nothing in this repo needs editing for those URLs — every client-side
caller builds them from `SUPABASE_URL` in `config.js`, which is already
set.

### 7. Point Stripe at the webhook

Dashboard → **Developers → Webhooks → Add endpoint**:

- **Endpoint URL**: the `stripe-webhook` URL printed in step 6.
- **Events to send**: `checkout.session.completed`,
  `invoice.payment_succeeded`, `invoice.payment_failed`, and
  `customer.subscription.deleted` — respectively: grants access as soon as
  checkout completes (trial or not); settles-and-cancels a `lifetime`
  subscription right after its one real charge, and clears any `past_due`
  flag a prior failed renewal left behind; flags the account `past_due` (see
  the "Failed renewals" note below — access isn't cut off yet, just
  flagged) the moment a renewal charge fails; and revokes access when a
  `monthly` subscription actually gets canceled (a `lifetime` cancellation
  triggered by the settle-and-cancel step above is recognized via its
  `lifetime_settled` metadata and ignored). **If this project's webhook
  endpoint already existed before `invoice.payment_failed` was added here,
  go back and add that one event to it** — the code won't see failed
  renewals until Stripe is told to send them.

After creating it, open the endpoint and copy its **Signing secret**
(`whsec_...`), then add the piece from step 4 that was still missing:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 8. Test it

**On this project, `STRIPE_SECRET_KEY` is already a live key** (see the
Status note up top) — [Stripe's test cards](https://docs.stripe.com/testing)
will simply be declined against it, they don't work against a live key.
Don't try to force a test purchase through here. To test the full flow
safely:

- **Easiest:** temporarily `supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx`
  (and matching test-mode `STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_LIFETIME`,
  `STRIPE_WEBHOOK_SECRET` for a test-mode webhook endpoint), redeploy the
  three functions, test with `4242 4242 4242 4242`/any future expiry/any
  CVC, then set the live values back and redeploy again.
- **Or:** point a second Supabase project at Stripe test mode entirely (repeat
  steps 1–7 there with `sk_test_...`) and use that for all future testing,
  leaving this project's functions permanently on the live key.

Whichever way you test: click a pricing button on `landing/index.html` — it
takes you to `app/`, where you sign up (or sign in) first, then checkout
starts on its own for the plan you picked. Complete it (Stripe still asks
for a card even though $0 is due today — that's expected, it's what gets
charged automatically when the trial ends) and you should land back on
`app/`, where the paywall clears within a couple of seconds (it retries a
few times right after a `?checkout=success` redirect, since the webhook can
lag slightly behind Stripe's own redirect) and the onboarding screen from
the section below runs once before the leads sheet. Check
**Developers → Webhooks → (your endpoint) → recent deliveries** in Stripe
if it doesn't; a failed delivery there means the URL, `--no-verify-jwt`, or
`STRIPE_WEBHOOK_SECRET` is off.

To test the billing portal: **Settings → Billing → Manage** in the app, once
signed in on a paid account — it should open Stripe's hosted portal for that
account's own subscription, where update-card/cancel/view-invoices all work
without you touching the Stripe dashboard.

To test the trial actually converting to a charge without waiting 5 real
days, use a [Stripe test clock](https://docs.stripe.com/test-mode/test-clocks):
create one in **Developers → Test clocks**, attach the Customer that
checkout created to it, then advance the clock past 5 days. Watch
**Developers → Webhooks → recent deliveries** for `invoice.payment_succeeded`
(and, for the `lifetime` plan, a follow-up `customer.subscription.deleted`
that should *not* touch `paid_customers` — confirm the row's `status` is
still `active` afterward) and check the subscription's status in the
dashboard: `monthly` should read `active`, `lifetime` should read
`canceled` with exactly one paid invoice.

### Failed renewals (past_due)

A `monthly` renewal charge can fail (expired card, insufficient funds) —
Stripe doesn't cancel the subscription right away, it retries on its own
schedule (Smart Retries) for days first. `stripe-webhook` now listens for
`invoice.payment_failed` and flags the row `paid_customers.status =
'past_due'` the moment that happens; `isPaidAccount()` in `app/index.html`
still treats `past_due` as paid (access isn't cut off — only an actual
`customer.subscription.deleted` does that), but a thin banner appears at
the top of the app ("Your last payment failed — Update your card") that
opens the billing portal from **Settings → Billing → Manage**. If a retry
lands (or the customer updates their card and Stripe bills again),
`invoice.payment_succeeded` flips the row back to `active` and the banner
disappears next time the app loads.

To test: with a test clock (see above), attach a test card known to fail
(e.g. `4000 0000 0000 0341`, which succeeds at initial checkout but fails
on the next charge) or just call `stripe.subscriptions.update` /
`invoices.pay` against a real failing card in test mode, then check
**Developers → Webhooks → recent deliveries** for `invoice.payment_failed`
and confirm `paid_customers.status` flips to `past_due` and the app shows
the banner on next load.

### Gift-card promo (optional)

`app/index.html` has a small floating widget (top-right, wide viewports
only, see `.giftcard` / `initGiftCard()`) offering a gift card in exchange
for feedback. It only ever renders once someone is inside `.app`, which —
see `enterApp()`/`revealApp()` above — already requires a `paid_customers`
row with `status: 'active'`, i.e. a trial already started with a card on
file. Claiming it goes one step further: a confirmation step
(`confirmEndTrial()`) makes the person explicitly acknowledge that
submitting ends their trial and charges their card **today**, then calls
the `end-trial-now` Edge Function (deployed in step 6 above) to actually do
that via `stripe.subscriptions.update(..., { trial_end: "now" })`, before
posting their email to [Formspree](https://formspree.io/) (set
`GIFT_CARD_FORM_URL` in `config.js` to your form's endpoint — the widget
never renders if it's blank).

To turn this off entirely, leave `GIFT_CARD_FORM_URL` blank in
`config.js` — no other code changes needed, and `end-trial-now` never
gets called.

---

## Known issues / planned improvements

Things a review of the payment and account flow turned up. Two are now
fixed (kept here, struck through, so the history of what was wrong isn't
lost); two are still open.

- ~~**Failed renewals have no dunning and no visible signal.**~~ **Fixed.**
  `stripe-webhook` now handles `invoice.payment_failed` (flags
  `paid_customers.status = 'past_due'`) and clears it back to `active` on
  the next successful `invoice.payment_succeeded`; the app shows a banner
  pointing at **Settings → Billing → Manage** while `past_due`. See
  "Failed renewals (past_due)" above. Requires `invoice.payment_failed` to
  actually be added to the Stripe webhook endpoint's subscribed events
  (step 7) — added to these instructions, but **an existing webhook
  endpoint from before this fix won't pick it up on its own; add the event
  to it by hand in the Stripe dashboard.**
- ~~**`isPaidAccount()` can't tell "confirmed unpaid" from "couldn't
  check."**~~ **Fixed.** It now returns `"active" | "past_due" | "unpaid" |
  "error"` instead of a boolean, and only the *last* retry's outcome
  decides `"error"` vs `"unpaid"` — a `showPaywall("error")` state shows a
  distinct "we couldn't check your payment status" message with a **Try
  again** button instead of the normal pick-a-plan paywall, so a
  currently-paying customer hitting a transient Supabase blip never sees
  something that reads like "you haven't paid."
- **No protection against repeated free trials.** Cancel, sign up again with
  a fresh email (a `+alias@gmail.com` costs nothing), get another 5-day
  trial. **Left alone for now, on purpose** — low priority pre-launch;
  worth Stripe's `subscription_data.trial_settings` (or an "have they ever
  had a subscription" check before granting a trial) before any real
  marketing push.
- **The `index.html` / `landing/index.html` / `waitlist/index.html`
  situation** described at the top of this file — pick one live story
  (waitlist-only, or pricing/checkout live) and delete the duplicate.
