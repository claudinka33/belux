import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { checkAdminSlot } from "@/lib/availability";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google";
import { sendRescheduleEmail } from "@/lib/email";
import { minToHHMM } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Prestavi VSE termine z enega dneva na drug dan, ure ostanejo iste.
 * Uporabno, ko Anita zboli ali si vzame prost dan.
 *
 * Brez `confirm` samo preveri in vrne predogled — kaj se prestavi in kje so trki.
 * Z `confirm: true` dejansko izvede; s `force: true` prestavi tudi ob trkih.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const { from, to, confirm, force, notify } = await req.json();
  if (!from || !to) return NextResponse.json({ error: "Manjka izvorni ali ciljni datum." }, { status: 400 });
  if (from === to) return NextResponse.json({ error: "Izbrala si isti dan." }, { status: 400 });

  const rows = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      firstName: tables.bookings.firstName,
      lastName: tables.bookings.lastName,
      email: tables.bookings.email,
      phone: tables.bookings.phone,
      note: tables.bookings.note,
      cancelToken: tables.bookings.cancelToken,
      gcalEventId: tables.bookings.gcalEventId,
      serviceId: tables.bookings.serviceId,
      serviceName: tables.services.name,
      durationMin: tables.services.durationMin,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(and(eq(tables.bookings.date, from), eq(tables.bookings.status, "POTRJENO")))
    .all();

  if (rows.length === 0) {
    return NextResponse.json({ error: "Na ta dan ni potrjenih terminov." }, { status: 400 });
  }

  // Predogled: preveri vsak termin posebej na ciljnem dnevu
  const plan = [];
  for (const r of rows) {
    const check = await checkAdminSlot(to, r.startMin, r.durationMin, r.id);
    plan.push({
      id: r.id,
      who: `${r.firstName} ${r.lastName}`.trim(),
      time: minToHHMM(r.startMin),
      serviceName: r.serviceName,
      ok: check.ok,
      reason: check.reason ?? null,
    });
  }
  const conflicts = plan.filter((p) => !p.ok);

  if (!confirm) {
    return NextResponse.json({ preview: true, from, to, count: rows.length, plan, conflicts: conflicts.length });
  }
  if (conflicts.length > 0 && !force) {
    return NextResponse.json(
      { error: `${conflicts.length} terminov se na ciljnem dnevu prekriva.`, plan, canForce: true },
      { status: 409 }
    );
  }

  let moved = 0;
  for (const r of rows) {
    if (r.gcalEventId) await deleteCalendarEvent(r.gcalEventId);
    const newEventId = await createCalendarEvent({
      date: to, startMin: r.startMin, endMin: r.startMin + r.durationMin,
      serviceName: r.serviceName, firstName: r.firstName, lastName: r.lastName,
      email: r.email, phone: r.phone, note: r.note,
    });
    await db
      .update(tables.bookings)
      .set({ date: to, gcalEventId: newEventId, reminderSentAt: null })
      .where(eq(tables.bookings.id, r.id));

    if (r.email && notify !== false) {
      await sendRescheduleEmail({
        firstName: r.firstName,
        email: r.email,
        serviceName: r.serviceName,
        oldDate: from,
        oldStartMin: r.startMin,
        newDate: to,
        newStartMin: r.startMin,
        cancelToken: r.cancelToken,
      });
    }
    moved++;
  }

  return NextResponse.json({ ok: true, moved, from, to });
}
