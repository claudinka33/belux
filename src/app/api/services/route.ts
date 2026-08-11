import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = await db.select().from(tables.categories).orderBy(asc(tables.categories.order)).all();
  const svcs = await db
    .select()
    .from(tables.services)
    .where(eq(tables.services.active, true))
    .orderBy(asc(tables.services.order))
    .all();
  return NextResponse.json({ categories: cats, services: svcs });
}
