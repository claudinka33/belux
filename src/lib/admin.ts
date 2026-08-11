import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session as any)?.role !== "ADMIN") {
    return { ok: false as const, res: NextResponse.json({ error: "Ni dovoljenja." }, { status: 403 }) };
  }
  return { ok: true as const };
}
