import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { isSlotFree } from "@/lib/availability";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const conds = [] as any[];
  if (from) conds.push(gte(tables.bookings.date, from));
  if (to) conds.push(lte(tables.bookings.date, to));
  const rows = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      endMin: tables.bookings.endMin,
      status: tables.bookings.status,
      firstName: tables.bookings.firstName,
      lastName: tables.bookings.lastName,
      email: tables.bookings.email,
      phone: tables.bookings.phone,
      note: tables.bookings.note,
      createdAt: tables.bookings.createdAt,
      serviceName: tables.services.name,
      price: tables.services.price,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(tables.bookings.date), asc(tables.bookings.startMin))
    .all();
  return NextResponse.json({ bookings: rows });
}

// Ročno dodajanje rezervacije (Anita)
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  const svc = await db.select().from(tables.services).where(eq(tables.services.id, b.serviceId)).get();
  if (!svc) return NextResponse.json({ error: "Izberi storitev." }, { status: 400 });
  if (!b.date || b.startMin == null) return NextResponse.json({ error: "Izberi datum in uro." }, { status: 400 });

  if (!b.force) {
    const free = await isSlotFree(b.date, b.startMin, svc.durationMin);
    if (!free) {
      return NextResponse.json(
        { error: "Termin se prekriva ali je izven delovnega časa.", canForce: true },
        { status: 409 }
      );
    }
  }
  const endMin = b.startMin + svc.durationMin;
  const row = await db
    .insert(tables.bookings)
    .values({
      serviceId: svc.id,
      date: b.date,
      startMin: b.startMin,
      endMin,
      firstName: b.firstName || "Stranka",
      lastName: b.lastName || "",
      email: b.email || "",
      phone: b.phone || "",
      note: b.note || "",
    })
    .returning()
    .get();
  const gcalEventId = await createCalendarEvent({
    date: b.date, startMin: b.startMin, endMin,
    serviceName: svc.name, firstName: row.firstName, lastName: row.lastName,
    email: row.email, phone: row.phone, note: row.note,
  });
  if (gcalEventId) await db.update(tables.bookings).set({ gcalEventId }).where(eq(tables.bookings.id, row.id));
  return NextResponse.json({ booking: row });
}

// Preklic / sprememba statusa
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, b.id)).get();
  if (!existing) return NextResponse.json({ error: "Ne obstaja." }, { status: 404 });
  if (b.status === "PREKLICANO" && existing.gcalEventId) {
    await deleteCalendarEvent(existing.gcalEventId);
  }
  const row = await db
    .update(tables.bookings)
    .set({ status: b.status })
    .where(eq(tables.bookings.id, b.id))
    .returning()
    .get();
  return NextResponse.json({ booking: row });
}
