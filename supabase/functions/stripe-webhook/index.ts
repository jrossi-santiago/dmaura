// Stripe calls this directly (no Supabase JWT, just a stripe-signature
// header) whenever a checkout completes or a subscription is canceled. It's
// the source of truth for the `paid_customers` table the app gates on — the
// client never gets to just declare itself paid.
//
// Deploy: supabase functions deploy stripe-webhook --project-ref <ref> --no-verify-jwt
// Then in the Stripe dashboard, add an endpoint pointing at this function's
// URL and copy its signing secret into STRIPE_WEBHOOK_SECRET.
// Secrets this needs: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. See README "Payments (Stripe)".
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// service_role bypasses RLS on purpose — this is the one writer allowed to
// touch paid_customers; everyone else only gets read-their-own-row via RLS.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    return new Response(`signature verification failed: ${err}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    if (email) {
      const { error } = await supabase.from("paid_customers").upsert(
        {
          email,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          plan: session.mode === "payment" ? "lifetime" : "monthly",
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
      if (error) console.error("paid_customers upsert failed", error);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const { error } = await supabase
      .from("paid_customers")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
    if (error) console.error("paid_customers cancel failed", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
