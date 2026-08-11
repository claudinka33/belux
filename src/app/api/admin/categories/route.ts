import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "Manjka ime." }, { status: 400 });
  const row = await db
    .insert(tables.categories)
    .values({ name: b.name, parentId: b.parentId || null, order: b.order ?? 999 })
    .returning()
    .get();
  return NextResponse.json({ category: row });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Manjka id." }, { status: 400 });
  const patch: any = {};
  if ("name" in b) patch.name = b.name;
  if ("order" in b) patch.order = parseInt(b.order);
  if ("parentId" in b) patch.parentId = b.parentId || null;
  const row = await db.update(tables.categories).set(patch).where(eq(tables.categories.id, b.id)).returning().get();
  return NextResponse.json({ category: row });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await req.json();
  const svcCount = await db.select().from(tables.services).where(eq(tables.services.categoryId, id)).all();
  if (svcCount.length > 0) {
    return NextResponse.json({ error: "Kategorija vsebuje storitve — najprej jih premakni ali izbriši." }, { status: 400 });
  }
  await db.delete(tables.categories).where(eq(tables.categories.id, id));
  return NextResponse.json({ ok: true });
}
