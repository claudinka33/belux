import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { setSetting } from "@/lib/settings";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  await setSetting("gcalRefreshToken", "");
  return NextResponse.json({ ok: true });
}
