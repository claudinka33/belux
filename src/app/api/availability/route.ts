import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getFreeSlots, getMonthAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId");
  if (!serviceId) return NextResponse.json({ error: "serviceId manjka" }, { status: 400 });
  const svc = await db.select().from(tables.services).where(eq(tables.services.id, serviceId)).get();
  if (!svc) return NextResponse.json({ error: "Storitev ne obstaja" }, { status: 404 });

  const date = url.searchParams.get("date");
  if (date) {
    const slots = await getFreeSlots(date, svc.durationMin);
    return NextResponse.json({ slots });
  }
  const year = parseInt(url.searchParams.get("year") || "");
  const month = parseInt(url.searchParams.get("month") || "");
  if (year && month) {
    const days = await getMonthAvailability(year, month, svc.durationMin);
    return NextResponse.json({ days });
  }
  return NextResponse.json({ error: "Podaj date ali year+month" }, { status: 400 });
}
