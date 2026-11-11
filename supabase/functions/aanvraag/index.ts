// Aanvraag vanaf coportaal.nl → tabel aanvragen in het beheerproject.
// Publiek bereikbaar (verify_jwt = false); honeypot en eenvoudige validatie.
import { createClient } from "jsr:@supabase/supabase-js@2";

const TOEGESTAAN = ["https://coportaal.nl", "https://www.coportaal.nl", "http://localhost:4321"];

function cors(origin: string | null) {
  const o = origin && TOEGESTAAN.includes(origin) ? origin : TOEGESTAAN[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST verwacht" }), { status: 405, headers });

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return new Response(JSON.stringify({ error: "Geen geldige JSON" }), { status: 400, headers }); }

  // Honeypot: echte bezoekers laten 'website' leeg
  if (typeof b.website === "string" && b.website.trim() !== "") return new Response(JSON.stringify({ ok: true }), { headers });

  const s = (k: string, max = 500) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : null);
  const n = (k: string) => { const v = Number(b[k]); return Number.isFinite(v) && v > 0 ? Math.round(v) : null; };
  const kantoor = s("kantoor", 200); const email = s("email", 200);
  if (!kantoor || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Kantoornaam en een geldig e-mailadres zijn verplicht" }), { status: 400, headers });
  }
  const pakket = s("pakket", 20);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await sb.from("aanvragen").insert({
    kantoor, email,
    kvk: s("kvk", 20), naam: s("naam", 200), telefoon: s("telefoon", 50),
    gebruikers: n("gebruikers"), klanten: n("klanten"),
    pakket: pakket === "all" || pakket === "compleet" ? pakket : null,
    boekhoudpakket: s("boekhoudpakket", 200), opmerking: s("opmerking", 4000),
    bron: "site",
  });
  if (error) return new Response(JSON.stringify({ error: "Opslaan mislukt" }), { status: 500, headers });
  return new Response(JSON.stringify({ ok: true }), { headers });
});
