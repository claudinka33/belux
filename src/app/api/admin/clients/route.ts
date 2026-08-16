import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { listClients, clientHistory, clientKey } from "@/lib/clients";
import { nowInLjubljana } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);

  /**
   * Iskanje po kartoteki za šepetalnik v obrazcu »Ročno dodaj termin«.
   * Anita natipka nekaj črk imena, priimka, e-naslova ali telefona in izbere
   * obstoječo stranko, namesto da bi podatke vpisovala znova — tako se termin
   * pripne k pravi kartoteki in se zgodovina obiskov ne razcepi.
   */
  const q = url.searchParams.get("q");
  if (q !== null) {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return NextResponse.json({ clients: [] });
    const all = await db.select().from(tables.clients).all();
    const hits = all
      .filter((c) =>
        `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(term)
      )
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "sl"))
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
      }));
    return NextResponse.json({ clients: hits });
  }

  const id = url.searchParams.get("id");
  if (id) {
    const client = await db.select().from(tables.clients).where(eq(tables.clients.id, id)).get();
    if (!client) return NextResponse.json({ error: "Stranka ne obstaja." }, { status: 404 });
    return NextResponse.json({ client, history: await clientHistory(id) });
  }

  const { date } = nowInLjubljana();
  return NextResponse.json({ clients: await listClients(date) });
}

/** Ročno dodajanje stranke (npr. tista, ki se naroča samo po telefonu). */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();

  const key = clientKey(b.email || "", b.phone || "");
  if (!key) {
    return NextResponse.json({ error: "Vpiši e-mail ali telefonsko številko." }, { status: 400 });
  }
  const existing = await db.select().from(tables.clients).where(eq(tables.clients.key, key)).get();
  if (existing) {
    return NextResponse.json({ error: "Stranka s tem e-mailom ali telefonom že obstaja." }, { status: 409 });
  }
  const row = await db
    .insert(tables.clients)
    .values({
      key,
      firstName: (b.firstName || "").trim(),
      lastName: (b.lastName || "").trim(),
      email: (b.email || "").trim(),
      phone: (b.phone || "").trim(),
      note: (b.note || "").trim(),
    })
    .returning()
    .get();
  return NextResponse.json({ client: row });
}

/** Urejanje podatkov in Anitine beležke. */
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Manjka id." }, { status: 400 });

  const patch: Record<string, string> = {};
  for (const f of ["firstName", "lastName", "email", "phone", "note"] as const) {
    if (typeof b[f] === "string") patch[f] = b[f].trim();
  }
  const row = await db
    .update(tables.clients)
    .set(patch)
    .where(eq(tables.clients.id, b.id))
    .returning()
    .get();
  return NextResponse.json({ client: row });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Manjka id." }, { status: 400 });
  // rezervacije ostanejo, samo povezava na kartoteko se odveže
  await db.update(tables.bookings).set({ clientId: null }).where(eq(tables.bookings.clientId, id));
  await db.delete(tables.clients).where(eq(tables.clients.id, id));
  return NextResponse.json({ ok: true });
}
