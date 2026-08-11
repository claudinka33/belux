import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { email, password, firstName, lastName, phone } = await req.json();
  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Izpolnite vsa obvezna polja." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Geslo mora imeti vsaj 6 znakov." }, { status: 400 });
  }
  const mail = String(email).toLowerCase().trim();
  const existing = await db.select().from(tables.users).where(eq(tables.users.email, mail)).get();
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "Uporabnik s tem e-mailom že obstaja. Prijavite se." }, { status: 409 });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  if (existing) {
    await db
      .update(tables.users)
      .set({ passwordHash, firstName, lastName, phone: phone || "" })
      .where(eq(tables.users.id, existing.id));
  } else {
    await db.insert(tables.users).values({ email: mail, firstName, lastName, phone: phone || "", passwordHash });
  }
  return NextResponse.json({ ok: true });
}
