import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, tables } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { isSlotFree } from "@/lib/availability";
import { createCalendarEvent } from "@/lib/google";
import { sendBookingEmail, gcalLink } from "@/lib/email";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Moje rezervacije (prijavljen uporabnik)
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId;
  if (!userId) return NextResponse.json({ bookings: [] });
  const rows = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      endMin: tables.bookings.endMin,
      status: tables.bookings.status,
      cancelToken: tables.bookings.cancelToken,
      serviceName: tables.services.name,
      price: tables.services.price,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(eq(tables.bookings.userId, userId))
    .orderBy(desc(tables.bookings.date))
    .all();
  return NextResponse.json({ bookings: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { serviceId, date, startMin, firstName, lastName, email, phone, note } = body;
  if (!serviceId || !date || startMin == null || !firstName || !lastName || !email) {
    return NextResponse.json({ error: "Manjkajo podatki." }, { status: 400 });
  }
  const svc = await db.select().from(tables.services).where(eq(tables.services.id, serviceId)).get();
  if (!svc || !svc.active) return NextResponse.json({ error: "Storitev ni na voljo." }, { status: 404 });

  // KLJUČNO: zadnja preverba, da termin še ni zaseden (avtomatska blokada prekrivanj)
  const free = await isSlotFree(date, startMin, svc.durationMin);
  if (!free) {
    return NextResponse.json(
      { error: "Ta termin je bil žal pravkar zaseden. Izberite drugega." },
      { status: 409 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId ?? null;

  const endMin = startMin + svc.durationMin;
  const inserted = await db
    .insert(tables.bookings)
    .values({
      serviceId,
      date,
      startMin,
      endMin,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).toLowerCase().trim(),
      phone: phone || "",
      note: note || "",
      userId,
    })
    .returning()
    .get();

  // Google Koledar (če je povezan)
  const gcalEventId = await createCalendarEvent({
    date, startMin, endMin,
    serviceName: svc.name,
    firstName: inserted.firstName,
    lastName: inserted.lastName,
    email: inserted.email,
    phone: inserted.phone,
    note: inserted.note,
  });
  if (gcalEventId) {
    await db.update(tables.bookings).set({ gcalEventId }).where(eq(tables.bookings.id, inserted.id));
  }

  const baseUrl = new URL(req.url).origin;
  const info = {
    id: inserted.id,
    date, startMin, endMin,
    firstName: inserted.firstName,
    email: inserted.email,
    cancelToken: inserted.cancelToken,
    serviceName: svc.name,
    price: svc.price,
  };
  await sendBookingEmail(info, baseUrl);

  const s = await getAllSettings();
  return NextResponse.json({
    ok: true,
    booking: {
      ...info,
      addToCalendarUrl: gcalLink(info, s.studioName, s.address),
      cancelUrl: `${baseUrl}/preklic/${inserted.cancelToken}`,
    },
  });
}
