import { db, tables } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * Normaliziran ključ stranke: e-mail (male črke) ali samo števke telefona.
 * Prepreči podvajanje iste osebe ob vsakem novem naročilu.
 */
export function clientKey(email: string, phone: string): string | null {
  const e = (email || "").trim().toLowerCase();
  if (e) return `e:${e}`;
  const p = (phone || "").replace(/\D/g, "");
  if (p.length >= 6) return `t:${p}`;
  return null;
}

/**
 * Poišče ali ustvari stranko in vrne njen id.
 * Ob ponovnem obisku dopolni manjkajoče podatke (npr. telefon, ki ga prvič ni vpisala).
 */
export async function upsertClient(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): Promise<string | null> {
  const key = clientKey(data.email, data.phone);
  if (!key) return null;

  const existing = await db.select().from(tables.clients).where(eq(tables.clients.key, key)).get();
  if (existing) {
    const patch: Record<string, string> = {};
    if (!existing.phone && data.phone) patch.phone = data.phone;
    if (!existing.email && data.email) patch.email = data.email;
    if (!existing.firstName && data.firstName) patch.firstName = data.firstName;
    if (!existing.lastName && data.lastName) patch.lastName = data.lastName;
    if (Object.keys(patch).length) {
      await db.update(tables.clients).set(patch).where(eq(tables.clients.id, existing.id));
    }
    return existing.id;
  }

  const row = await db
    .insert(tables.clients)
    .values({
      key,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: (data.email || "").trim(),
      phone: (data.phone || "").trim(),
    })
    .returning()
    .get();
  return row.id;
}

export type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
  createdAt: string;
  visits: number;
  cancelled: number;
  lastVisit: string | null;
  nextVisit: string | null;
  totalSpent: number;
  lastService: string | null;
  daysSinceLast: number | null;
};

/** Seznam strank s povzetkom obiskov — vse izračunano iz rezervacij. */
export async function listClients(today: string): Promise<ClientRow[]> {
  const clients = await db.select().from(tables.clients).all();

  const rows = await db
    .select({
      clientId: tables.bookings.clientId,
      date: tables.bookings.date,
      status: tables.bookings.status,
      serviceName: tables.services.name,
      price: tables.services.price,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .orderBy(asc(tables.bookings.date))
    .all();

  const byClient = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.clientId) continue;
    const list = byClient.get(r.clientId) ?? [];
    list.push(r);
    byClient.set(r.clientId, list);
  }

  return clients
    .map((c) => {
      const all = byClient.get(c.id) ?? [];
      const active = all.filter((b) => b.status !== "PREKLICANO");
      const past = active.filter((b) => b.date <= today);
      const future = active.filter((b) => b.date > today);
      const lastVisit = past.length ? past[past.length - 1].date : null;
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        note: c.note,
        createdAt: c.createdAt,
        visits: past.length,
        cancelled: all.length - active.length,
        lastVisit,
        nextVisit: future.length ? future[0].date : null,
        totalSpent: past.reduce((s, b) => s + b.price, 0),
        lastService: past.length ? past[past.length - 1].serviceName : null,
        daysSinceLast: lastVisit ? daysBetween(lastVisit, today) : null,
      };
    })
    .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));
}

/** Vse rezervacije ene stranke, od najnovejše. */
export async function clientHistory(clientId: string) {
  return db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      status: tables.bookings.status,
      note: tables.bookings.note,
      paid: tables.bookings.paid,
      serviceName: tables.services.name,
      price: tables.services.price,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(eq(tables.bookings.clientId, clientId))
    .orderBy(desc(tables.bookings.date), desc(tables.bookings.startMin))
    .all();
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}
