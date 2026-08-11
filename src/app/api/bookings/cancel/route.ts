import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSetting } from "@/lib/settings";
import { nowInLjubljana } from "@/lib/time";
import { deleteCalendarEvent } from "@/lib/google";

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Manjka žeton." }, { status: 400 });
  const booking = await db
    .select()
    .from(tables.bookings)
    .where(eq(tables.bookings.cancelToken, token))
    .get();
  if (!booking) return NextResponse.json({ error: "Rezervacija ne obstaja." }, { status: 404 });
  if (booking.status === "PREKLICANO") return NextResponse.json({ ok: true, already: true });

  const cancelHours = parseFloat(await getSetting("cancelHours")) || 24;
  const now = nowInLjubljana();
  const nowAbs = new Date(now.date + "T00:00:00Z").getTime() / 60000 + now.minutes;
  const bookingAbs = new Date(booking.date + "T00:00:00Z").getTime() / 60000 + booking.startMin;
  if (bookingAbs - nowAbs < cancelHours * 60) {
    return NextResponse.json(
      { error: `Termin je mogoče preklicati najkasneje ${cancelHours} h prej. Pokličite studio.` },
      { status: 403 }
    );
  }

  await db.update(tables.bookings).set({ status: "PREKLICANO" }).where(eq(tables.bookings.id, booking.id));
  if (booking.gcalEventId) await deleteCalendarEvent(booking.gcalEventId);
  return NextResponse.json({ ok: true });
}
