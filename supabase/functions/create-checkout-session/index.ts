// Called from landing/index.html (anonymous) and app/index.html (signed in but
// unpaid) to start a Stripe Checkout session. The client only ever picks a
// plan name ("monthly" | "lifetime") — the actual Stripe Price id is resolved
// here from an env var, so nobody can tamper with the request to pay less.
//
// Both plans run through Checkout's subscription mode with a 5-day free
// trial (Stripe requires a recurring Price for trials — there's no trial on
// a one-time "payment" mode session). For "lifetime", STRIPE_PRICE_LIFETIME
// must therefore point at a *recurring* Price in Stripe, not a one-time one;
// the webhook cancels that subscription right after its first real charge so
// it never renews. See README "Payments (Stripe)" for the full explanation.
//
// Deploy: supabase functions deploy create-checkout-session --project-ref <ref>
// Secrets this needs (supabase secrets set ...): STRIPE_SECRET_KEY,
// STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME. See README "Payments (Stripe)".
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

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
    const { plan, email, successUrl, cancelUrl, datafastVisitorId, datafastSessionId } = await req.json();
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
      customer_email: email || undefined,
      client_reference_id: email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Card is always collected up front (Checkout's default for
      // subscription mode) even though $0 is due today — that saved card is
      // what Stripe charges automatically the moment the trial ends.
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 5,
        // Read back by the webhook: "lifetime" subscriptions get canceled
        // right after their one real invoice pays so they never renew;
        // "monthly" ones are left alone to keep billing normally.
        metadata: { plan },
      },
      // datafast_visitor_id/datafast_session_id (from the DataFast cookies,
      // forwarded by the client) are how DataFast attributes this revenue
      // back to a marketing channel — see README "Payments (Stripe)".
      metadata: {
        plan,
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
