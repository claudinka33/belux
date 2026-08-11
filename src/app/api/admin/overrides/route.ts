import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.date && !(b.dateFrom && b.dateTo)) return NextResponse.json({ error: "Manjka datum." }, { status: 400 });

  const dates: string[] = [];
  if (b.date) dates.push(b.date);
  else {
    let d = b.dateFrom;
    let guardCount = 0;
    while (d <= b.dateTo && guardCount < 366) {
      dates.push(d);
      const nd = new Date(d + "T12:00:00Z");
      nd.setUTCDate(nd.getUTCDate() + 1);
      d = nd.toISOString().slice(0, 10);
      guardCount++;
    }
  }
  for (const date of dates) {
    await db.delete(tables.dayOverrides).where(eq(tables.dayOverrides.date, date));
    await db.insert(tables.dayOverrides).values({
      date,
      closed: b.closed !== false,
      startMin: b.startMin ?? null,
      endMin: b.endMin ?? null,
      note: b.note || "",
    });
  }
  return NextResponse.json({ ok: true, count: dates.length });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await req.json();
  await db.delete(tables.dayOverrides).where(eq(tables.dayOverrides.id, id));
  return NextResponse.json({ ok: true });
}
