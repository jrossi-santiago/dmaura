# DM Aura

A waitlist site and the tool behind it.

```
index.html            the early-access page — waitlist capture, posts to Formspree
fonts/                self-hosted variable faces (Bodoni Moda, Newsreader, DM Mono)
                      — the landing page only; the tool uses system faces
app/                  the tool itself, a standalone static PWA
  index.html          the entire app — markup, styles, logic
  sw.js               service worker, cache-first shell (bump CACHE on deploy)
  manifest.webmanifest, icon.svg, icon-*.png   envelope mark on vermilion
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

Two plates: vermilion for the pitch and the form, near-black for the product.
Display type is Bodoni Moda, switching between roman and italic mid-phrase as a
system rather than as an accent on one word. DM Mono carries the marginalia,
Newsreader the reading copy. All three are self-hosted — no render-blocking
third-party request, and no reader's IP goes to a font CDN to load a signup page.

Every colour pair on the vermilion was checked rather than eyeballed: ink at 72%
opacity over that orange is only 3.2:1, so body copy, marginalia and labels are
all solid ink, and reduced opacity is left to the rules.

The black plate is a mockup of the outbox — three sent DMs and the day's tally,
built from real markup rather than a screenshot, so it stays sharp and re-flows
on a phone. **The names and handles in it are invented**, and the plate is
labelled `SAMPLE` and `names are fictional` on its own face. Replace it with
genuine sends when there are some worth showing.

There is no social-proof row. Inventing customer logos for an unreleased tool
would be fabricating endorsements, so the slot holds product claims that are
true instead.

---

# The tool

The tool and the site are one brand: the same envelope mark, the same
vermilion, bone and ink. Two deliberate differences. The tool's vermilion is
`#D8460F` rather than the landing's `#F2521C`, because the accent is used as
*text* there and `#F2521C` is only 3.7:1 on a light surface. And the tool sets
its figures in the system mono, not DM Mono, whose zero is slashed with no
plain alternate — fine for a timestamp on a poster, bad in an app whose main
screen is counts and streaks.

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
the id — keep that column. The **One-tap** and **Needs ID** filters show you
where you stand, and you can paste a missing id into any lead under *Info*.

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

## Where the data lives

`localStorage`, in the browser, on that device. Nothing is uploaded anywhere.

That also means: clearing site data wipes it. **Settings → Backup → Download**
writes a JSON file with everything, and *Restore* reads it back. Export also
writes a CSV of whatever the current filter shows.

---

## Next: Supabase (multi-user)

The store is already shaped for it. Every record carries `updated`, every
deletion leaves a tombstone in `deleted` / `deletedDms`, and all writes funnel
through `save()` — so sync is last-write-wins against these tables, and
`save()` is the single place to call an upsert from.

```sql
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  me          text default '',
  company     text default '',
  pitch       text default '',
  question    text default '',
  daily_goal  int  default 20,
  daily_cap   int  default 60,
  pace_seconds int default 0,
  settings    jsonb default '{}'::jsonb,
  updated_at  timestamptz default now()
);

create table leads (
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
  draft      text default '',
  tpl_id     uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Dedupe on the same keys the client merges on.
create unique index leads_user_xid    on leads (user_id, xid)    where xid <> '';
create unique index leads_user_handle on leads (user_id, lower(handle)) where handle <> '';
create index leads_user_status on leads (user_id, status);

create table dms (
  id       uuid primary key,
  lead_id  uuid not null references leads on delete cascade,
  user_id  uuid not null references auth.users on delete cascade,
  sent_at  timestamptz not null default now(),
  text     text default '',
  tpl_id   uuid,
  via      text default 'link'         -- 'prefill' | 'manual'
);
create index dms_user_sent on dms (user_id, sent_at desc);

create table templates (
  id         uuid primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  body       text not null,
  updated_at timestamptz default now()
);

-- Every table is per-user; one policy shape covers all of them.
alter table profiles  enable row level security;
alter table leads     enable row level security;
alter table dms       enable row level security;
alter table templates enable row level security;

create policy own_profiles  on profiles  for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy own_leads     on leads     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_dms       on dms       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_templates on templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

To wire it up: add the supabase-js bundle and a `config.js` holding the project
URL and anon key, gate the app behind Google OAuth, key the cache on the user id
(`KEY_PREFIX + user.id`, already a one-line change in `cacheKey()`), and push
from `save()` / pull on boot. Keeping `localStorage` as the write-through cache
is what makes the app still work on a train.
