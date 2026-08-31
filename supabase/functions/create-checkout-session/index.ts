// Called from app/index.html once someone is signed in but unpaid, to start
// a Stripe Checkout session. The client only ever picks a plan name
// ("monthly" | "lifetime") — the actual Stripe Price id is resolved here
// from an env var, so nobody can tamper with the request to pay less.
//
// Both plans run through Checkout's subscription mode with a 5-day free
// trial (Stripe requires a recurring Price for trials — there's no trial on
// a one-time "payment" mode session) — but only for an account that's never
// had a paid_customers row before; see the trial-abuse guard below. For
// "lifetime", STRIPE_PRICE_LIFETIME must therefore point at a *recurring*
// Price in Stripe, not a one-time one; the webhook cancels that
// subscription right after its first real charge so it never renews. See
// README "Payments (Stripe)" for the full explanation.
//
// Identity: the caller must send their own Supabase session access token as
// the Authorization bearer (not the anon key) — this function verifies it
// and reads the user id/email off the verified session itself, never off
// anything the client claims in the request body. That id becomes Stripe's
// client_reference_id, which the webhook uses as the *only* thing that maps
// a completed payment back to an account. Before this, the webhook matched
// on whatever email Stripe's own Checkout page had at the end — a field the
// customer can freely edit there — so a card charged under an edited email
// could pay successfully and never unlock the signed-in account it was
// meant for. A UUID typed nowhere on Stripe's page can't have that problem.
//
// Deploy: supabase functions deploy create-checkout-session --project-ref <ref>
// Secrets this needs (supabase secrets set ...): STRIPE_SECRET_KEY,
// STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME. SUPABASE_URL and
// SUPABASE_ANON_KEY are auto-injected by the Edge Functions runtime — no
// need to set those. See README "Payments (Stripe)".
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_IDS: Record<string, string> = {
  monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "",
  lifetime: Deno.env.get("STRIPE_PRICE_LIFETIME") ?? "",
};

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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const email = userData.user.email || undefined;

    // Trial-abuse guard: any paid_customers row for this user (active,
    // past_due, or canceled — status doesn't matter, existing at all is
    // the signal) means they've already had a trial once, on either plan.
    // RLS scopes this select to the caller's own row, so the same
    // user-authed client used above for identity works here with no
    // service-role key needed. A canceled account that resubscribes still
    // gets in — it's just billed immediately instead of trialing again.
    const { data: priorSubscription } = await supabase
      .from("paid_customers")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const eligibleForTrial = !priorSubscription;

    const { plan, successUrl, cancelUrl, datafastVisitorId, datafastSessionId } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "unknown plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "missing successUrl/cancelUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // The authoritative link back to the signed-in account — see the note
      // at the top of this file. Not the customer_email above, which Stripe
      // lets the customer edit on the Checkout page itself.
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Card is always collected up front (Checkout's default for
      // subscription mode) even though $0 is due today — that saved card is
      // what Stripe charges automatically the moment the trial ends.
      payment_method_collection: "always",
      subscription_data: {
        ...(eligibleForTrial ? { trial_period_days: 5 } : {}),
        // Read back by the webhook: "lifetime" subscriptions get canceled
        // right after their one real invoice pays so they never renew;
        // "monthly" ones are left alone to keep billing normally.
        metadata: { plan, user_id: userId },
      },
      // datafast_visitor_id/datafast_session_id (from the DataFast cookies,
      // forwarded by the client) are how DataFast attributes this revenue
      // back to a marketing channel — see README "Payments (Stripe)".
      metadata: {
        plan,
        user_id: userId,
        ...(datafastVisitorId ? { datafast_visitor_id: datafastVisitorId } : {}),
        ...(datafastSessionId ? { datafast_session_id: datafastSessionId } : {}),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
