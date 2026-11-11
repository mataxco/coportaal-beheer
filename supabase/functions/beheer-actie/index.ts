// Beheeracties op een kantooromgeving, uitgevoerd met de service-sleutel van dat
// kantoor uit de Vault. Alleen voor ingelogde beheerders (tabel beheerders).
//
//   POST { kantoor_id, actie: 'licentie' | 'status' }
//   - licentie: zet kantoor_config.modules naar de modules van het pakket
//   - status:   leest kantoornaam, modules en aantal actieve gebruikers
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Content-Type": "application/json",
};
const antwoord = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers });

async function rest(ref: string, key: string, pad: string, init: RequestInit = {}) {
  const r = await fetch(`https://${ref}.supabase.co/rest/v1/${pad}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const tekst = await r.text();
  let data: unknown = null; try { data = tekst ? JSON.parse(tekst) : null; } catch { data = tekst; }
  if (!r.ok) throw new Error(`Kantooromgeving antwoordt ${r.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return { data, count: r.headers.get("content-range")?.split("/")[1] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const url = Deno.env.get("SUPABASE_URL")!;
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return antwoord({ error: "Niet ingelogd" }, 401);

  // Wie vraagt dit? Moet beheerder zijn.
  const alsGebruiker = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user } = await alsGebruiker.auth.getUser();
  const { data: isBeheerder } = await alsGebruiker.rpc("is_beheerder");
  if (!user?.user || !isBeheerder) return antwoord({ error: "Geen beheerder" }, 403);

  let body: { kantoor_id?: string; actie?: string };
  try { body = await req.json(); } catch { return antwoord({ error: "Geen geldige JSON" }, 400); }
  const { kantoor_id, actie } = body;
  if (!kantoor_id || !actie) return antwoord({ error: "kantoor_id en actie zijn verplicht" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: kantoor, error: kErr } = await admin.from("kantoren").select("*, pakketten(modules, naam)").eq("id", kantoor_id).single();
  if (kErr || !kantoor) return antwoord({ error: "Kantoor niet gevonden" }, 404);
  if (!kantoor.supabase_ref) return antwoord({ error: "Dit kantoor heeft nog geen Supabase-omgeving (supabase_ref ontbreekt)" }, 400);

  const { data: sleutel } = await admin.rpc("kantoor_sleutel", { p_ref: kantoor.supabase_ref });
  if (!sleutel) return antwoord({ error: `Geen service-sleutel in de Vault voor ${kantoor.supabase_ref}. Voeg 'kantoor_${kantoor.supabase_ref}_service_key' toe.` }, 400);

  const log = async (gelukt: boolean, melding: string, details?: unknown) => {
    await admin.from("kantoor_acties").insert({ kantoor_id, actie, gelukt, melding, details: details ?? null, uitgevoerd_door: user.user!.email });
  };

  try {
    if (actie === "licentie") {
      if (!kantoor.pakketten) throw new Error("Kantoor heeft geen pakket");
      const modules: string[] = kantoor.pakketten.modules;
      const { data } = await rest(kantoor.supabase_ref, sleutel, "kantoor_config?id=not.is.null&select=naam,modules", {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ modules }),
      });
      const rij = Array.isArray(data) ? data[0] : null;
      const check = { naam: rij?.naam, modules: rij?.modules, pakket: kantoor.pakketten.naam };
      await admin.from("kantoren").update({ laatste_check: { ...(kantoor.laatste_check || {}), ...check }, laatste_check_op: new Date().toISOString() }).eq("id", kantoor_id);
      await log(true, `Licentie gezet: ${kantoor.pakketten.naam} (${modules.join(", ")})`, check);
      return antwoord({ ok: true, ...check });
    }

    if (actie === "status") {
      const cfg = await rest(kantoor.supabase_ref, sleutel, "kantoor_config?select=naam,modules,plaats,email&limit=1");
      const prof = await rest(kantoor.supabase_ref, sleutel, "profiles?select=id&status=eq.actief", { headers: { Prefer: "count=exact", Range: "0-0" } });
      const rij = Array.isArray(cfg.data) ? cfg.data[0] : null;
      const check = { naam: rij?.naam, modules: rij?.modules, plaats: rij?.plaats, email: rij?.email, gebruikers_actief: Number(prof.count ?? 0) };
      await admin.from("kantoren").update({ laatste_check: check, laatste_check_op: new Date().toISOString() }).eq("id", kantoor_id);
      await log(true, `Status opgehaald: ${check.gebruikers_actief} actieve gebruikers, modules ${(check.modules || []).join(", ") || "geen"}`, check);
      return antwoord({ ok: true, ...check });
    }

    return antwoord({ error: `Onbekende actie: ${actie}` }, 400);
  } catch (e) {
    const melding = e instanceof Error ? e.message : String(e);
    await log(false, melding);
    return antwoord({ error: melding }, 500);
  }
});
