import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { calendarAuthUrl, googleEnabled } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  if (!googleEnabled()) {
    return NextResponse.json({ error: "Google poverilnice še niso nastavljene (GOOGLE_CLIENT_ID / SECRET)." }, { status: 400 });
  }
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/admin/google/callback`;
  return NextResponse.redirect(calendarAuthUrl(redirectUri));
}
