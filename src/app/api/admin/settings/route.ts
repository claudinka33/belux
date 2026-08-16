import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAllSettings, setSetting } from "@/lib/settings";
import { googleEnabled, calendarConnected } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const s = await getAllSettings();
  delete (s as any).gcalRefreshToken;
  return NextResponse.json({
    settings: s,
    googleEnabled: googleEnabled(),
    calendarConnected: await calendarConnected(),
  });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const body = await req.json();
  const allowed = [
    "studioName", "address", "phone", "email", "instagram", "facebook",
    "cancelHours", "slotStepMin", "minNoticeHours", "maxDaysAhead", "bufferMin",
    "heroTitle", "heroSubtitle", "aboutText", "gcalCalendarId", "gcalTwoWay",
    // Obveščanje po e-pošti. Brez teh se obrazec v nastavitvah da urejati,
    // shranjevanje pa jih tiho zavrže in vrednosti se vrnejo na privzete.
    "adminEmail", "emailAdminNotify", "emailReminder", "emailThanks",
    "emailFollowUp", "followUpWeeks",
    // Besedila sporočil (stran Sporočila v dashboardu)
    "mailBookingSubject", "mailBookingText",
    "mailReminderSubject", "mailReminderText",
    "mailThanksSubject", "mailThanksText",
    "mailFollowUpSubject", "mailFollowUpText",
    "mailCancelSubject", "mailCancelText",
    "mailRescheduleSubject", "mailRescheduleText",
  ];
  for (const k of allowed) {
    if (k in body) await setSetting(k, String(body[k]));
  }
  return NextResponse.json({ ok: true });
}
