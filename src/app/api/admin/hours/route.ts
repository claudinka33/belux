import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const hours = await db.select().from(tables.workingHours).orderBy(asc(tables.workingHours.weekday), asc(tables.workingHours.startMin)).all();
  const overrides = await db.select().from(tables.dayOverrides).orderBy(asc(tables.dayOverrides.date)).all();
  return NextResponse.json({ hours, overrides });
}

// Zamenja celoten tedenski urnik naenkrat
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { hours } = await req.json(); // [{weekday, startMin, endMin}]
  if (!Array.isArray(hours)) return NextResponse.json({ error: "Napačni podatki." }, { status: 400 });
  for (const h of hours) {
    if (h.startMin >= h.endMin) return NextResponse.json({ error: "Začetek mora biti pred koncem." }, { status: 400 });
  }
  await db.delete(tables.workingHours);
  for (const h of hours) {
    await db.insert(tables.workingHours).values({ weekday: h.weekday, startMin: h.startMin, endMin: h.endMin });
  }
  return NextResponse.json({ ok: true });
}
