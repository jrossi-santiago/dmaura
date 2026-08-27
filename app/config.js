// Fill these in from your Supabase project: Settings -> API.
// The anon key is meant to be public — Row Level Security on every table
// (see the SQL in README.md) means it can only ever touch the signed-in
// user's own rows. Leave both blank to run in local-only mode: no login
// screen, no sync, exactly the original single-device behavior.
window.DMAURA_CONFIG = {
  SUPABASE_URL: "https://fkregyidgjovkzujcslw.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcmVneWlkZ2pvdmt6dWpjc2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NjM5NjQsImV4cCI6MjEwMzMzOTk2NH0.Krmq_a1uIDAaMa1pgi3gg_SAfxo2v40IjZi1xT9hhtM",
  // Optional — shown on the "where to find us" slide of the post-checkout
  // onboarding (see enterApp()/showOnboarding() in index.html). Leave a
  // link blank and that row shows "Coming soon" instead of a dead link;
  // fill it in whenever that resource actually goes live, no code change
  // needed.
  RESOURCES: {
    community: "",
    docs: "",
    support: ""
  }
};
