// Supabase Edge Function: enquiry-notify
//
// Emails events@kavapyramids.com when a new row lands in `enquiries` — the
// admin previously only found out by checking /admin. Triggered by a
// Supabase Database Webhook (Database → Webhooks, created via the dashboard,
// not a migration — see supabase/README.md), not called from the app.
//
// Auth: verify_jwt is off, same convention as crowd-pov-cleanup — the caller
// is a DB webhook, not a logged-in user. Guarded instead by a shared secret
// in the x-webhook-secret header, matched against the ENQUIRY_WEBHOOK_SECRET
// edge function secret. Without this check, anyone who found the function's
// URL could spam emails through this Resend account.
//
// Secrets required: RESEND_API_KEY, ENQUIRY_WEBHOOK_SECRET (both set via
// `supabase secrets set` or Dashboard → Edge Functions → Secrets).

Deno.serve(async (req) => {
  const expected = Deno.env.get("ENQUIRY_WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const record = payload?.record;
  if (payload?.type !== "INSERT" || payload?.table !== "enquiries" || !record) {
    return new Response("ignored", { status: 200 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return new Response("RESEND_API_KEY not set", { status: 500 });

  const text = `New booking enquiry from ${record.name ?? "unknown"}

Name: ${record.name ?? "—"}
Company: ${record.company ?? "—"}
Event type: ${record.event_type ?? "—"}
Email: ${record.email ?? "—"}
Submitted: ${record.created_at ? new Date(record.created_at).toLocaleString("en-NZ") : "—"}

Message:
${record.message ?? "—"}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // ponytail: sandbox sender works for any recipient on Resend's free
      // tier without domain verification. Swap for a verified
      // kavapyramids.com sender once that domain is added in Resend.
      from: "Kava & Pyramids <onboarding@resend.dev>",
      to: ["events@kavapyramids.com"],
      reply_to: record.email,
      subject: `New booking enquiry from ${record.name ?? "unknown"}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return new Response("email failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
