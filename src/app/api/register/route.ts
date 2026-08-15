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

  /**
   * Vsak obstoječ e-naslov se zavrne, tudi če uporabnik gesla še nima.
   *
   * Prej se je zavrnil samo tisti z geslom. Kdor se je prijavil z Google računom,
   * gesla nima — zato si je lahko kdorkoli, ki je poznal njegov e-naslov, prek
   * tega obrazca nastavil geslo in prevzel njegov račun.
   */
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Uporabnik s tem e-mailom že obstaja. Prijavite se — če ste se registrirali z Google računom, uporabite gumb za prijavo z Googlom.",
      },
      { status: 409 }
    );
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await db.insert(tables.users).values({ email: mail, firstName, lastName, phone: phone || "", passwordHash });
  return NextResponse.json({ ok: true });
}
