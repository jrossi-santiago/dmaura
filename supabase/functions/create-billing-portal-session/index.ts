// Called from app/index.html (Settings → Billing → Manage) by a signed-in,
// paid user who wants to update their card, see invoices, or cancel — all
// self-serve, none of it needing you to touch the Stripe dashboard by hand.
//
// Same identity pattern as create-checkout-session: the caller sends their
// own Supabase session access token as the Authorization bearer, this
// function verifies it, and only then looks up that verified user's
// stripe_customer_id — via the service_role key, since paid_customers' RLS
// only grants a user SELECT on their own row and this still needs to work
// even if it didn't. Nothing about which Stripe customer to open ever comes
// from the request body.
//
// Deploy: supabase functions deploy create-billing-portal-session --project-ref <ref>
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

    const { returnUrl } = await req.json();
    if (!returnUrl) {
      return new Response(JSON.stringify({ error: "missing returnUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row, error: rowErr } = await admin
      .from("paid_customers")
      .select("stripe_customer_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (rowErr || !row?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "no billing record for this account yet — contact support" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: returnUrl,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
