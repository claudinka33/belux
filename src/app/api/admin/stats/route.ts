import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { nowInLjubljana } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { date: today } = nowInLjubljana();

  const rows = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      status: tables.bookings.status,
      paid: tables.bookings.paid,
      clientId: tables.bookings.clientId,
      createdAt: tables.bookings.createdAt,
      serviceName: tables.services.name,
      durationMin: tables.services.durationMin,
      price: tables.services.price,
      categoryId: tables.services.categoryId,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .all();

  const cats = await db.select().from(tables.categories).all();
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Ostalo";

  const done = rows.filter((r) => r.status !== "PREKLICANO" && r.date <= today);
  const cancelled = rows.filter((r) => r.status === "PREKLICANO");

  /* Promet po mesecih (zadnjih 12) */
  const months: Record<string, { revenue: number; count: number }> = {};
  for (const r of done) {
    const m = r.date.slice(0, 7);
    (months[m] ??= { revenue: 0, count: 0 });
    months[m].revenue += r.price;
    months[m].count += 1;
  }
  const monthly = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, ...v }));

  /* Najbolj prodajane storitve */
  const svcMap: Record<string, { count: number; revenue: number }> = {};
  for (const r of done) {
    (svcMap[r.serviceName] ??= { count: 0, revenue: 0 });
    svcMap[r.serviceName].count += 1;
    svcMap[r.serviceName].revenue += r.price;
  }
  const topServices = Object.entries(svcMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  /* Po kategorijah */
  const catMap: Record<string, number> = {};
  for (const r of done) {
    const n = catName(r.categoryId);
    catMap[n] = (catMap[n] ?? 0) + r.price;
  }
  const byCategory = Object.entries(catMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  /* Nove vs. stalne stranke */
  const perClient: Record<string, number> = {};
  for (const r of done) if (r.clientId) perClient[r.clientId] = (perClient[r.clientId] ?? 0) + 1;
  const counts = Object.values(perClient);
  const returning = counts.filter((n) => n > 1).length;
  const oneTime = counts.filter((n) => n === 1).length;

  /* Zasedenost po dnevih v tednu (0 = ponedeljek) */
  const weekday = Array(7).fill(0) as number[];
  for (const r of done) {
    const d = new Date(`${r.date}T00:00:00Z`);
    weekday[(d.getUTCDay() + 6) % 7] += 1;
  }

  const unpaid = rows.filter((r) => r.status !== "PREKLICANO" && r.date <= today && !r.paid);

  return NextResponse.json({
    totals: {
      bookings: done.length,
      revenue: done.reduce((s, r) => s + r.price, 0),
      clients: Object.keys(perClient).length,
      cancelled: cancelled.length,
      hours: Math.round(done.reduce((s, r) => s + r.durationMin, 0) / 60),
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((s, r) => s + r.price, 0),
      avgTicket: done.length ? done.reduce((s, r) => s + r.price, 0) / done.length : 0,
    },
    monthly,
    topServices,
    byCategory,
    clientMix: { returning, oneTime },
    weekday,
  });
}
