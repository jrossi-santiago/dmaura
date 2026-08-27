# DM Aura — App Mechanics (for AI context)

This file exists to brief an AI assistant on how DM Aura works and what it's
for, so it doesn't have to re-derive the mechanics from the code. It
complements `README.md` (which covers setup, design rationale, and the
Supabase SQL) rather than replacing it — for wiring up the app, read that.
This one is about *what the app does and why*.

## What this is

DM Aura is a personal cold-outreach tool for X (Twitter). You import a list
of leads (from a scraper, a CSV, or pasted profile links), write message
templates, and work through the list one lead at a time sending DMs — with
the tool tracking what's been sent, what got a reply, and how the effort is
paced day to day so the account doesn't get flagged for spammy behavior.

It is not a bot: it never sends anything itself. Every send is the user
tapping X's own "message" button with the text pre-filled or pre-copied.
The tool's job is prep, tracking, and pacing — not automation.

## Why it exists (the core constraint)

X can only pre-fill a DM's recipient if the app knows their **numeric account
id**, not just their @handle. There's a direct-compose URL
(`x.com/messages/compose?recipient_id=<numeric id>`) but no equivalent that
works from a handle. So the entire UX branches on one fact per lead: do we
have their numeric id or not?

- **Have it (`one-tap`)**: button opens the DM thread with the message
  already typed in. One tap to send.
- **Don't have it (`needs ID`)**: button copies the message to the clipboard
  and opens the person's profile. The user taps Message, pastes, sends.

Most scraper exports (Apify, PhantomBuster, TweetScout, Selenium-based
scrapers) include the numeric id in some column (`id`, `rest_id`,
`user_id`) — the CSV importer looks for it. Missing ids can be filled in by
hand per lead.

## The core loop

1. **Import** — paste/drop a CSV or a list of profile URLs/handles. Columns
   auto-map to fields by header name; the user can correct the mapping.
   Re-importing the same list is safe (dedupes on numeric id, then handle;
   never overwrites what the user has already typed; fills in gaps like a
   newly-discovered id).
2. **Write templates** — reusable message bodies with token placeholders
   (`{first}`, `{handle}`, `{bio}`, `{topic}`, `{company}`, `{pitch}`, …) and
   optional spintax (`{Hey|Hi|Yo}`) so repeated sends aren't textually
   identical to each other.
3. **Work the queue** — the default filtered view shows unsent leads,
   one-tap-ready ones surfaced first. For each lead the app renders the
   template with that lead's data, the user reads/edits it, then sends
   (opens the compose link / copies + opens profile).
4. **Mark outcomes by hand** — X has no API to tell the app a reply
   happened, so the user flips a lead's status themselves: queued → sent →
   replied → booked (or no/skip). Can be done one at a time or in bulk.
5. **Watch pace, not just volume** — daily goal, daily cap with warnings,
   and an optional cooldown timer between sends, because X throttles
   accounts that send too fast or too much, especially new ones (well
   below its nominal ~500/day ceiling).

## Data model (per lead)

Each lead is roughly: numeric id (`xid`, optional), handle, name, bio,
avatar, website, location, follower/following/tweet counts, verified flag,
**status** (`queued|sent|replied|booked|no|skip`), tags, list name, a free
note, a draft message, which template it's tied to, and an embedded array
of DMs actually sent to them (each with text, timestamp, and how it was
sent). Templates are separate reusable records. Settings (daily goal, cap,
cooldown, sender's own name/company/pitch used as tokens) are stored
per-user, not per-lead.

## Filters / views

Queue (unsent), One-tap (unsent + has numeric id), Needs ID (no numeric
id), Sent, Follow up (sent but no reply after N days), Replied, Booked,
All. The default sort within a filter puts untouched, one-tap-ready leads
first — that's meant to be the order someone actually works through.

## Metrics the app tracks

- **Streak** — consecutive days with ≥1 DM sent (a whole empty day breaks
  it; "haven't sent today yet" alone doesn't).
- **Daily goal ring**, a 30-day bar chart, and an 18-week contribution
  heatmap (GitHub-style), all derived from send timestamps.
- **Funnel** — imported → DM'd → replied → booked.
- **Per-template reply rate**, so the user can see which opener actually
  performs and iterate on wording.

## Where data lives

- **Local-only mode (default)**: everything lives in the browser's
  `localStorage`. No login, no network dependency, single device. Manual
  JSON export/import covers backup and moving devices.
- **Multi-device mode (optional)**: if a Supabase project is configured,
  the app adds email/password login and syncs leads/templates/settings to
  Postgres behind Row Level Security (each user only ever sees their own
  rows). `localStorage` stays the always-on write-through cache, so the
  app still works offline; it just also pushes/pulls when online. This is
  optional infrastructure, not the point of the app — it's included so the
  same person can work from phone and laptop, not for multi-tenant SaaS use.

Sync is last-write-wins per row on a timestamp, polled every ~45s and on
tab focus — not real-time collaboration. Deletes are tracked with
tombstones so a delete on one device doesn't get resurrected by another
device's stale local copy.

## Platform / packaging

Single static HTML file for the whole app (`app/index.html`) plus a service
worker for offline/installable behavior (PWA — "Add to Home Screen" on
iOS). No build step, no framework, no backend required to run it. A
separate top-level `index.html` is an unrelated waitlist/landing page for
the product, not part of the app itself.

## What the user is trying to achieve

Run effective, personalized cold outreach on X at a sustainable pace,
without: (a) getting the account rate-limited or suspended for
spam-pattern behavior, (b) sending obviously templated/identical messages,
and (c) losing track of who's been contacted, who replied, and what
actually converts — while keeping every message a deliberate human send,
never an automated one.

## Explicitly out of scope

No X API integration, no automated sending, no scraping built into the
tool itself (leads come from external scrapers or manual entry), no
analytics/tracking beyond what's described above, no multi-tenant admin
surface — Supabase sync is for one person's own devices, gated by RLS, not
a hosted product for other customers.
