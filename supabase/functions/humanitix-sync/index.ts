// Supabase Edge Function: humanitix-sync
//
// Manually-triggered (not a webhook) pull sync: for every event with a
// humanitix_event_id set, fetch its orders from the Humanitix Public API
// and upsert each buyer into mailing_list.
//
// Auth: requires a valid authenticated Supabase user — this touches a
// third-party API key and real PII, so anonymous invocation is rejected.
//
// Secrets required: HUMANITIX_API_KEY (set via `supabase secrets set`),
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// by the Supabase Edge Functions runtime.

import { createClient } from "npm:@supabase/supabase-js@2";

const HUMANITIX_BASE_URL = "https://api.humanitix.com/v1";
const PAGE_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchAllOrders(eventId: string, apiKey: string) {
  const orders: any[] = [];
  let page = 1;

  while (true) {
    const url = `${HUMANITIX_BASE_URL}/events/${encodeURIComponent(eventId)}/orders?page=${page}&pageSize=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Humanitix API error (${res.status}) for event ${eventId}: ${text || res.statusText}`);
    }

    const data = await res.json();
    const pageOrders = Array.isArray(data.orders) ? data.orders : [];
    orders.push(...pageOrders);

    const total = typeof data.total === "number" ? data.total : orders.length;
    if (orders.length >= total || pageOrders.length === 0) break;
    page += 1;
  }

  return orders;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header — this function requires an authenticated caller." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("HUMANITIX_API_KEY");

    if (!apiKey) {
      return jsonResponse({ error: "HUMANITIX_API_KEY secret is not set on this function." }, 500);
    }

    // Client scoped to the caller's JWT — used only to verify they're a real authenticated user.
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized — a valid authenticated session is required to run this sync." }, 401);
    }

    // Service-role client for the actual reads/writes against events and mailing_list.
    const db = createClient(supabaseUrl, serviceRoleKey);

    const { data: events, error: eventsError } = await db
      .from("events")
      .select("id, title, humanitix_event_id")
      .not("humanitix_event_id", "is", null);

    if (eventsError) {
      return jsonResponse({ error: `Failed to load events: ${eventsError.message}` }, 500);
    }

    const summary = {
      events_checked: events?.length ?? 0,
      attendees_fetched: 0,
      inserted: 0,
      updated: 0,
      skipped_unsubscribed: 0,
      errors: [] as string[],
    };

    for (const event of events ?? []) {
      let orders: any[] = [];
      try {
        orders = await fetchAllOrders(event.humanitix_event_id, apiKey);
      } catch (err) {
        summary.errors.push(err instanceof Error ? err.message : String(err));
        continue;
      }

      summary.attendees_fetched += orders.length;

      for (const order of orders) {
        const email = (order.email ?? "").trim().toLowerCase();
        const firstName = (order.firstName ?? "").trim();
        const lastName = (order.lastName ?? "").trim();
        const orderId = order._id ?? null;

        if (!email || !firstName || !lastName) {
          summary.errors.push(`Order ${order._id ?? "unknown"} on event ${event.title} is missing name/email — skipped.`);
          continue;
        }

        // Respect the buyer's own opt-in choice at checkout, when Humanitix reports it.
        const wantsList = order.organiserMailListOptIn !== false;

        const { data: existing, error: lookupError } = await db
          .from("mailing_list")
          .select("id, subscribed")
          .ilike("email", email)
          .maybeSingle();

        if (lookupError) {
          summary.errors.push(`Lookup failed for ${email}: ${lookupError.message}`);
          continue;
        }

        if (!existing) {
          const { error: insertError } = await db.from("mailing_list").insert({
            first_name: firstName,
            last_name: lastName,
            email,
            source: "humanitix",
            event_title: event.title,
            subscribed: wantsList,
            order_id: orderId,
          });
          if (insertError) {
            summary.errors.push(`Insert failed for ${email}: ${insertError.message}`);
            continue;
          }
          summary.inserted += 1;
          continue;
        }

        // Existing contact: never resubscribe or overwrite someone who has unsubscribed.
        if (!existing.subscribed) {
          summary.skipped_unsubscribed += 1;
          continue;
        }

        const { error: updateError } = await db
          .from("mailing_list")
          .update({
            first_name: firstName,
            last_name: lastName,
            source: "humanitix",
            event_title: event.title,
            order_id: orderId,
          })
          .eq("id", existing.id);

        if (updateError) {
          summary.errors.push(`Update failed for ${email}: ${updateError.message}`);
          continue;
        }
        summary.updated += 1;
      }
    }

    return jsonResponse(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("humanitix-sync failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
