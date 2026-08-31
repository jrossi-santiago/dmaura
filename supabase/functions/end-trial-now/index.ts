// Called from app/index.html by the gift-card promo widget (see
// initGiftCard() and confirmEndTrial()) — a signed-in user on an active
// trial can choose to end it immediately (and get charged today instead of
// on day 5) in exchange for the promo reward. Ends the Stripe trial right
// now, which makes Stripe generate and attempt to pay that subscription's
// first real invoice immediately.
//
// Same identity pattern as create-checkout-session / create-billing-portal-session:
// the caller sends their own Supabase session access token as the
// Authorization bearer, this function verifies it, then looks up that
// verified user's stripe_subscription_id via the service_role key — nothing
// about whose subscription to touch ever comes from the request body.
//
// Deploy: supabase functions deploy end-trial-now --project-ref <ref>
// Secrets this needs (supabase secrets set ...): STRIPE_SECRET_KEY,
// SUPABASE_SERVICE_ROLE_KEY. SUPABASE_URL and SUPABASE_ANON_KEY are
// auto-injected by the Edge Functions runtime. See README "Payments (Stripe)".
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row, error: rowErr } = await admin
      .from("paid_customers")
      .select("stripe_subscription_id, status")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (rowErr || !row?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "no subscription on this account yet — contact support" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.status !== "active") {
      return new Response(JSON.stringify({ error: "no active trial/subscription to end" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    if (sub.status === "trialing") {
      // Ending the trial "now" makes Stripe immediately generate and attempt
      // to pay that subscription's first real invoice against the card on
      // file — no separate manual invoice/charge call needed.
      await stripe.subscriptions.update(row.stripe_subscription_id, {
        trial_end: "now",
        proration_behavior: "none",
      });
    }
    // Already past trial (or trial already ended) — nothing to do, this is
    // still a success from the caller's point of view.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
