import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { exchangeCodeAndStore } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const redirectUri = `${url.origin}/api/admin/google/callback`;
    try {
      await exchangeCodeAndStore(code, redirectUri);
    } catch {
      return NextResponse.redirect(`${url.origin}/admin/nastavitve?google=error`);
    }
  }
  return NextResponse.redirect(`${url.origin}/admin/nastavitve?google=ok`);
}
