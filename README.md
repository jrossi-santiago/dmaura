# DM Aura

A waitlist site and the tool behind it.

```
index.html            the early-access page — waitlist capture, posts to Formspree
app/                  the tool itself, a standalone static PWA
  index.html          the entire app — markup, styles, logic
  admin/index.html    trial activation dashboard (see "Admin" section below)
  sw.js               service worker, cache-first shell (bump CACHE on deploy)
  manifest.webmanifest, icon.svg, icon-*.png   paper-plane mark on cobalt
  sample-leads.csv    example import, including rows with no numeric id
```

Both halves are static and dependency-free. Drop the folder on any host: `/`
serves the waitlist, `/app/` serves the tool. Everything under `app/` uses
relative paths, so it runs from any prefix without configuration.

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
users. Run this once in the SQL Editor, after the block above:

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
language sql
security definer
set search_path = public
as $$
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
$$;

grant execute on function admin_trial_activation() to anon, authenticated;
```

`security definer` means the function runs with the privileges of the user
who created it (you, the project owner), bypassing RLS on purpose — that's
what lets one query see every user's row. It only returns the aggregated
columns above, never raw leads, drafts, or message content.

**No password on `app/admin/` yet.** Anyone with the URL — or anyone who
calls this function directly with the project's anon key — can read every
trial user's email and activation status. Fine while the tool is unreleased
and pre-launch; before real signups arrive, gate the page (e.g. check
`auth.getUser()` against your own email, or `revoke execute ... from anon`
and require a signed-in admin session) and consider dropping `email` from
the returned columns if the dashboard doesn't need it.

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
