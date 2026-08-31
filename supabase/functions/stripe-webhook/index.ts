// Stripe calls this directly (no Supabase JWT, just a stripe-signature
// header) whenever a checkout completes, an invoice is paid, or a
// subscription is canceled. It's the source of truth for the
// `paid_customers` table the app gates on — the client never gets to just
// declare itself paid.
//
// Both "monthly" and "lifetime" are Checkout subscriptions with a 5-day
// trial (see create-checkout-session). For "lifetime" there should only
// ever be one real charge, so once its first post-trial invoice pays, this
// function cancels that subscription itself — stamping
// metadata.lifetime_settled = "true" on it first so the resulting
// customer.subscription.deleted event (Stripe always fires one on
// cancellation) is recognized as expected and doesn't revoke the access
// that invoice just paid for. A subscription that never got that stamp
// (trial ended with a failed/absent charge, or a real "monthly" cancel)
// still flips the row to canceled as before.
//
// checkout.session.completed keys the paid_customers row off
// session.client_reference_id — the Supabase user id create-checkout-session
// stamped onto the session before redirecting to Stripe — not off
// session.customer_details.email. Stripe lets the customer edit that email
// on its own Checkout page, so matching on it could grant a payment to the
// wrong account or, worse, lose it if what they typed doesn't match any
// signed-in account at all. A session from before this change (or one
// somehow missing client_reference_id) falls back to the old email match so
// nothing in flight during the rollout breaks.
//
// invoice.payment_failed flips the row to status: 'past_due' instead of
// leaving it 'active' with no signal — Stripe's own retries can take days
// before it gives up and fires customer.subscription.deleted, and until
// then the app has no way to know a renewal is failing. The app shows a
// small "update your card" banner for a past_due account (see
// app/index.html, renderApp()/PAST_DUE banner). A later successful invoice
// (a retry that lands, or a manually updated card) flips it back to
// 'active' via invoice.payment_succeeded below, so this isn't a one-way trip.
//
// Deploy: supabase functions deploy stripe-webhook --project-ref <ref> --no-verify-jwt
// Then in the Stripe dashboard, add an endpoint pointing at this function's
// URL and copy its signing secret into STRIPE_WEBHOOK_SECRET. Events to
// send: checkout.session.completed, invoice.payment_succeeded,
// invoice.payment_failed, customer.subscription.deleted — see README
// "Payments (Stripe)" step 7.
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
    const userId = session.client_reference_id || session.metadata?.user_id || null;
    const plan = session.metadata?.plan === "lifetime" ? "lifetime" : "monthly";
    const row = {
      email,
      user_id: userId,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
      plan,
      status: "active",
      updated_at: new Date().toISOString(),
    };
    // Prefer keying on the verified Supabase user id (see the note at the
    // top of this file). Only a session with no client_reference_id at all
    // — which shouldn't happen post-rollout — falls back to matching by
    // whatever email ended up on the Checkout session.
    const { error } = userId
      ? await supabase.from("paid_customers").upsert(row, { onConflict: "user_id" })
      : email
      ? await supabase.from("paid_customers").upsert(row, { onConflict: "email" })
      : { error: new Error("checkout.session.completed had neither client_reference_id nor an email") };
    if (error) console.error("paid_customers upsert failed", error);
  }

  // Fires for every paid invoice on a subscription, including the $0 invoice
  // Stripe generates when a trial starts — amount_paid > 0 filters that out
  // so this only reacts to the real post-trial charge.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (subscriptionId && invoice.amount_paid > 0) {
      // A real charge landed — clear any past_due a previous failed
      // attempt on this same subscription left behind. No-op if the row
      // was already active.
      const { error: activeErr } = await supabase
        .from("paid_customers")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);
      if (activeErr) console.error("paid_customers reactivate failed", activeErr);

      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.metadata?.plan === "lifetime" && sub.status !== "canceled") {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { ...sub.metadata, lifetime_settled: "true" },
          });
          await stripe.subscriptions.cancel(subscriptionId);
        }
      } catch (err) {
        console.error("lifetime settle-and-cancel failed", err);
      }
    }
  }

  // A renewal charge failed. Stripe will keep retrying on its own schedule
  // for days before it finally gives up and fires customer.subscription.deleted
  // — this is the only signal in between. Flip the row to past_due (an
  // already-supported status, see the SQL in README) instead of leaving it
  // silently 'active' with no way for anyone to know the card is dying.
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (subscriptionId) {
      const { error } = await supabase
        .from("paid_customers")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);
      if (error) console.error("paid_customers past_due failed", error);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.metadata?.lifetime_settled === "true") {
      // We canceled this ourselves right after its one real charge so a
      // "lifetime" plan never renews — not an actual cancellation, so leave
      // the paid_customers row alone.
    } else {
      const { error } = await supabase
        .from("paid_customers")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);
      if (error) console.error("paid_customers cancel failed", error);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
