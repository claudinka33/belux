import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { and, eq, isNull, lte } from "drizzle-orm";
import { nowInLjubljana, addDays } from "@/lib/time";
import { getAllSettings, setSetting } from "@/lib/settings";
import { sendReminderEmail, sendThankYouEmail, sendFollowUpEmail } from "@/lib/email";
import { listClients, daysBetween } from "@/lib/clients";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dnevna avtomatika. Kliče jo Vercel Cron enkrat dnevno (gl. vercel.json).
 * Zaščiteno s CRON_SECRET — Vercel pošlje Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Neavtoriziran dostop." }, { status: 401 });
    }
  }

  const { date: today } = nowInLjubljana();
  const s = await getAllSettings();
  const out = { reminders: 0, thanks: 0, followUps: 0 };

  /* --- 1. Opomniki za jutrišnje termine --- */
  const tomorrow = addDays(today, 1);
  const upcoming = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      firstName: tables.bookings.firstName,
      email: tables.bookings.email,
      cancelToken: tables.bookings.cancelToken,
      serviceName: tables.services.name,
      price: tables.services.price,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(
      and(
        eq(tables.bookings.date, tomorrow),
        eq(tables.bookings.status, "POTRJENO"),
        isNull(tables.bookings.reminderSentAt)
      )
    )
    .all();

  for (const b of upcoming) {
    if (!b.email) continue;
    if (await sendReminderEmail(b)) {
      await db
        .update(tables.bookings)
        .set({ reminderSentAt: today })
        .where(eq(tables.bookings.id, b.id));
      out.reminders++;
    }
  }

  /* --- 2. Zahvale za včerajšnje opravljene termine --- */
  const yesterday = addDays(today, -1);
  const done = await db
    .select({
      id: tables.bookings.id,
      firstName: tables.bookings.firstName,
      email: tables.bookings.email,
      serviceName: tables.services.name,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(
      and(
        eq(tables.bookings.date, yesterday),
        eq(tables.bookings.status, "POTRJENO"),
        isNull(tables.bookings.followupSentAt)
      )
    )
    .all();

  for (const b of done) {
    if (!b.email) continue;
    if (await sendThankYouEmail(b)) {
      await db
        .update(tables.bookings)
        .set({ followupSentAt: today })
        .where(eq(tables.bookings.id, b.id));
      out.thanks++;
    }
  }

  /* --- 3. Vabila na korekcijo --- */
  /**
   * Ta korak se sme opraviti največ enkrat na dan.
   *
   * Opomnik in zahvala si v bazo zapišeta, da sta bila poslana, in se ob
   * ponovnem zagonu preskočita. Vabilo take oznake ni imelo — pogoj je bil
   * samo, da je od zadnjega obiska minilo točno toliko tednov. Če se je
   * avtomatika isti dan sprožila dvakrat (Vercel po napaki poskusi znova),
   * je stranka isto vabilo dobila dvakrat.
   *
   * Datum zadnjega zagona zapišemo pred pošiljanjem, ne po njem: raje kakšno
   * vabilo izpustimo, kot da stranko nadlegujemo z istim sporočilom.
   */
  const followUpDone = s.followUpLastRun === today;
  if (s.emailFollowUp !== "0" && !followUpDone) {
    await setSetting("followUpLastRun", today);
    const weeks = Math.max(1, parseInt(s.followUpWeeks || "3", 10));
    const targetDays = weeks * 7;
    const clients = await listClients(today);
    for (const c of clients) {
      // natanko na dan cilja — da ne pošiljamo vsak dan znova
      if (c.daysSinceLast !== targetDays) continue;
      if (!c.email) continue;
      if (c.nextVisit) continue; // že ima naslednji termin, ne nadleguj
      if (await sendFollowUpEmail({ firstName: c.firstName, email: c.email, weeks })) {
        out.followUps++;
      }
    }
  }

  return NextResponse.json({ ok: true, date: today, ...out });
}
