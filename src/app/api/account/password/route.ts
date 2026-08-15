import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Menjava lastnega gesla. Deluje za vsakega prijavljenega uporabnika,
 * spremeni pa lahko samo svoje geslo — ne tujega.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!newPassword || String(newPassword).length < 8) {
    return NextResponse.json(
      { error: "Novo geslo mora imeti vsaj 8 znakov." },
      { status: 400 }
    );
  }

  const user = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, email))
    .get();
  if (!user) {
    return NextResponse.json({ error: "Uporabnik ne obstaja." }, { status: 404 });
  }

  // Kdor geslo že ima, mora dokazati, da ga pozna.
  if (
    user.passwordHash &&
    !bcrypt.compareSync(String(currentPassword || ""), user.passwordHash)
  ) {
    return NextResponse.json(
      { error: "Trenutno geslo ni pravilno." },
      { status: 403 }
    );
  }

  await db
    .update(tables.users)
    .set({ passwordHash: bcrypt.hashSync(String(newPassword), 10) })
    .where(eq(tables.users.id, user.id));

  return NextResponse.json({ ok: true });
}
