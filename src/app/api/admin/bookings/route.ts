import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { isSlotFree, checkAdminSlot } from "@/lib/availability";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google";
import { upsertClient } from "@/lib/clients";
import { sendBookingEmail, sendCancellationEmail, sendRescheduleEmail } from "@/lib/email";

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
      clientId: tables.bookings.clientId,
      paid: tables.bookings.paid,
      paymentMethod: tables.bookings.paymentMethod,
      serviceName: tables.services.name,
      durationMin: tables.services.durationMin,
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
  const email = String(b.email || "").toLowerCase().trim();

  const clientId = await upsertClient({
    firstName: b.firstName || "",
    lastName: b.lastName || "",
    email,
    phone: b.phone || "",
  });

  /**
   * Če stranka na strani že ima račun, termin povežemo z njim. Termini se
   * v »Moji termini« sicer najdejo tudi po e-naslovu, tako pa je vez trdna
   * tudi, če si stranka pozneje spremeni e-naslov.
   */
  const account = email
    ? await db.select().from(tables.users).where(eq(tables.users.email, email)).get()
    : null;

  const row = await db
    .insert(tables.bookings)
    .values({
      serviceId: svc.id,
      date: b.date,
      startMin: b.startMin,
      endMin,
      firstName: b.firstName || "Stranka",
      lastName: b.lastName || "",
      email,
      phone: b.phone || "",
      note: b.note || "",
      clientId,
      userId: account?.id ?? null,
    })
    .returning()
    .get();

  const gcalEventId = await createCalendarEvent({
    date: b.date, startMin: b.startMin, endMin,
    serviceName: svc.name, firstName: row.firstName, lastName: row.lastName,
    email: row.email, phone: row.phone, note: row.note,
  });
  if (gcalEventId) await db.update(tables.bookings).set({ gcalEventId }).where(eq(tables.bookings.id, row.id));

  /**
   * Potrditev stranki, kadar Anita tako izbere.
   *
   * Pri ročnem vnosu ni vedno zaželena — stara rezervacija, termin dogovorjen
   * po telefonu pred tedni, popravek pomote. Zato o tem odloči kljukica v
   * obrazcu, ne koda. Sporočilo je enako tistemu ob spletni rezervaciji, skupaj
   * z gumbom za Google Koledar in povezavo za preklic.
   */
  let notified = false;
  if (b.notify && row.email) {
    await sendBookingEmail(
      {
        id: row.id,
        date: row.date,
        startMin: row.startMin,
        endMin: row.endMin,
        firstName: row.firstName,
        email: row.email,
        cancelToken: row.cancelToken,
        serviceName: svc.name,
        price: svc.price,
      },
      new URL(req.url).origin
    );
    notified = true;
  }

  return NextResponse.json({ booking: row, notified });
}

// Preklic, sprememba statusa, označitev plačila, opomba
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, b.id)).get();
  if (!existing) return NextResponse.json({ error: "Ne obstaja." }, { status: 404 });
  if (b.status === "PREKLICANO" && existing.gcalEventId) {
    await deleteCalendarEvent(existing.gcalEventId);
  }
  const patch: Record<string, unknown> = {};
  if (typeof b.status === "string") patch.status = b.status;
  if (typeof b.paid === "boolean") patch.paid = b.paid;
  if (typeof b.paymentMethod === "string") patch.paymentMethod = b.paymentMethod;
  if (typeof b.note === "string") patch.note = b.note;

  /* --- Prestavljanje termina (drug dan, druga ura, druga storitev) --- */
  const wantsMove =
    (typeof b.date === "string" && b.date !== existing.date) ||
    (typeof b.startMin === "number" && b.startMin !== existing.startMin) ||
    (typeof b.serviceId === "string" && b.serviceId !== existing.serviceId);

  if (wantsMove) {
    const svcId = b.serviceId || existing.serviceId;
    const svc = await db.select().from(tables.services).where(eq(tables.services.id, svcId)).get();
    if (!svc) return NextResponse.json({ error: "Storitev ne obstaja." }, { status: 400 });

    const newDate = b.date ?? existing.date;
    const newStart = b.startMin ?? existing.startMin;
    const newEnd = newStart + svc.durationMin;

    if (!b.force) {
      const check = await checkAdminSlot(newDate, newStart, svc.durationMin, existing.id);
      if (!check.ok) {
        return NextResponse.json({ error: check.reason, canForce: true }, { status: 409 });
      }
    }

    patch.date = newDate;
    patch.startMin = newStart;
    patch.endMin = newEnd;
    patch.serviceId = svcId;
    patch.reminderSentAt = null; // opomnik naj se pošlje znova za novi datum

    // Google Koledar: star dogodek stran, nov na njegovo mesto
    if (existing.gcalEventId) await deleteCalendarEvent(existing.gcalEventId);
    const newEventId = await createCalendarEvent({
      date: newDate, startMin: newStart, endMin: newEnd,
      serviceName: svc.name, firstName: existing.firstName, lastName: existing.lastName,
      email: existing.email, phone: existing.phone, note: existing.note,
    });
    patch.gcalEventId = newEventId;

    if (existing.email && b.notify !== false) {
      await sendRescheduleEmail({
        firstName: existing.firstName,
        email: existing.email,
        serviceName: svc.name,
        oldDate: existing.date,
        oldStartMin: existing.startMin,
        newDate,
        newStartMin: newStart,
        cancelToken: existing.cancelToken,
      });
    }
  }

  if (!Object.keys(patch).length) return NextResponse.json({ booking: existing });

  const row = await db
    .update(tables.bookings)
    .set(patch)
    .where(eq(tables.bookings.id, b.id))
    .returning()
    .get();

  // preklic s strani Anite — obvestimo stranko
  if (b.status === "PREKLICANO" && existing.status !== "PREKLICANO" && row.email) {
    const svc = await db.select().from(tables.services).where(eq(tables.services.id, row.serviceId)).get();
    await sendCancellationEmail({
      date: row.date,
      startMin: row.startMin,
      firstName: row.firstName,
      email: row.email,
      serviceName: svc?.name ?? "termin",
    });
  }
  return NextResponse.json({ booking: row });
}

/**
 * Trajen izbris termina.
 *
 * Preklic (PUT s statusom PREKLICANO) termin obdrži v zgodovini in poročilih —
 * to je običajna pot. Izbris je za pomote: napačno vnesen termin, testni vpis,
 * podvojena rezervacija. Zapisa po izbrisu ni več nikjer, zato ga tudi poročila
 * ne štejejo.
 */
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Manjka id." }, { status: 400 });

  const existing = await db.select().from(tables.bookings).where(eq(tables.bookings.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Ne obstaja." }, { status: 404 });

  // Termin izgine tudi iz Anitinega Google Koledarja
  if (existing.gcalEventId) await deleteCalendarEvent(existing.gcalEventId);

  await db.delete(tables.bookings).where(eq(tables.bookings.id, id));
  return NextResponse.json({ ok: true });
}
