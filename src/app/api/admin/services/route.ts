import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const cats = await db.select().from(tables.categories).orderBy(asc(tables.categories.order)).all();
  const svcs = await db.select().from(tables.services).orderBy(asc(tables.services.order)).all();
  return NextResponse.json({ categories: cats, services: svcs });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.name || !b.categoryId || !b.durationMin || b.price == null) {
    return NextResponse.json({ error: "Manjkajo podatki (ime, kategorija, trajanje, cena)." }, { status: 400 });
  }
  const row = await db
    .insert(tables.services)
    .values({
      name: b.name,
      description: b.description || "",
      durationMin: parseInt(b.durationMin),
      price: parseFloat(b.price),
      image: b.image || null,
      active: b.active !== false,
      order: b.order ?? 999,
      categoryId: b.categoryId,
    })
    .returning()
    .get();
  return NextResponse.json({ service: row });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Manjka id." }, { status: 400 });
  const patch: any = {};
  for (const k of ["name", "description", "categoryId", "image"]) if (k in b) patch[k] = b[k];
  if ("durationMin" in b) patch.durationMin = parseInt(b.durationMin);
  if ("price" in b) patch.price = parseFloat(b.price);
  if ("active" in b) patch.active = Boolean(b.active);
  if ("order" in b) patch.order = parseInt(b.order);
  const row = await db.update(tables.services).set(patch).where(eq(tables.services.id, b.id)).returning().get();
  return NextResponse.json({ service: row });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { id } = await req.json();
  await db.delete(tables.services).where(eq(tables.services.id, id));
  return NextResponse.json({ ok: true });
}
