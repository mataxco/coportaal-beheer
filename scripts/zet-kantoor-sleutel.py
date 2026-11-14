"""Zet de service-sleutel van een kantoor in de Vault van de beheer-omgeving.

Gebruik (vanuit de map coportaal-beheer):
    python scripts/zet-kantoor-sleutel.py <project-ref van het kantoor>

De sleutel wordt rechtstreeks van Supabase opgehaald en doorgezet; hij komt
nergens op het scherm of in een bestand.
"""
import json, subprocess, sys

print("Sleutel ophalen en opslaan… (kan een halve minuut duren)", flush=True)

if len(sys.argv) != 2 or not sys.argv[1].isalnum():
    sys.exit("Gebruik: python scripts/zet-kantoor-sleutel.py <project-ref>")
ref = sys.argv[1]
naam = f"kantoor_{ref}_service_key"

r = subprocess.run(f"npx supabase projects api-keys --project-ref {ref} -o json",
                   shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=120)
if r.returncode != 0:
    sys.exit("Sleutels ophalen mislukt: " + r.stderr.strip()[-300:])
sleutels = json.loads(r.stdout[r.stdout.index("["):])
sleutel = next((k.get("api_key") for k in sleutels if k.get("name") == "service_role" or k.get("id") == "service_role"), None)
if not sleutel:
    sys.exit("Geen service_role-sleutel gevonden voor dit project.")
if "'" in sleutel:
    sys.exit("Onverwacht teken in de sleutel.")

sql = (f"delete from vault.secrets where name = '{naam}'; "
       f"select vault.create_secret('{sleutel}', '{naam}', 'Service-sleutel kantoor {ref}') is not null as opgeslagen;")
r = subprocess.run(["npx", "supabase", "db", "query", "--linked", "--yes", sql],
                   shell=(sys.platform == "win32"), capture_output=True, text=True, encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL, timeout=120)
if r.returncode != 0 or "opgeslagen" not in r.stdout:
    sys.exit("Opslaan mislukt: " + (r.stderr or r.stdout).strip()[-300:].replace(sleutel, "***"))
print(f"✓ Sleutel voor {ref} staat in de Vault als {naam}.")
