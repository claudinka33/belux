import { calendar as calendarApi, auth as googleAuth } from "@googleapis/calendar";
import { getSetting, setSetting } from "./settings";
import { ljubljanaToUtcIso, TZ, minToHHMM } from "./time";

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function calendarConnected(): Promise<boolean> {
  return googleEnabled() && Boolean(await getSetting("gcalRefreshToken"));
}

function oauthClient(redirectUri?: string) {
  return new googleAuth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function calendarAuthUrl(redirectUri: string): string {
  return oauthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
}

export async function exchangeCodeAndStore(code: string, redirectUri: string) {
  const client = oauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (tokens.refresh_token) await setSetting("gcalRefreshToken", tokens.refresh_token);
}

async function calendarClient() {
  const refreshToken = await getSetting("gcalRefreshToken");
  if (!googleEnabled() || !refreshToken) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return calendarApi({ version: "v3", auth: client });
}

// Vrne zasedene intervale [startMin, endMin] iz Anitinega koledarja za dan
export async function getBusyIntervals(date: string): Promise<Array<[number, number]>> {
  try {
    if ((await getSetting("gcalTwoWay")) !== "1") return [];
    const cal = await calendarClient();
    if (!cal) return [];
    const calendarId = (await getSetting("gcalCalendarId")) || "primary";
    const timeMin = ljubljanaToUtcIso(date, 0);
    const timeMax = ljubljanaToUtcIso(date, 24 * 60);
    const res = await cal.freebusy.query({
      requestBody: { timeMin, timeMax, items: [{ id: calendarId }] },
    });
    const busy = res.data.calendars?.[calendarId]?.busy ?? [];
    const dayStartUtc = new Date(timeMin).getTime();
    return busy.map((b) => {
      const s = Math.max(0, Math.round((new Date(b.start!).getTime() - dayStartUtc) / 60000));
      const e = Math.min(24 * 60, Math.round((new Date(b.end!).getTime() - dayStartUtc) / 60000));
      return [s, e] as [number, number];
    });
  } catch {
    return [];
  }
}

export async function createCalendarEvent(booking: {
  date: string; startMin: number; endMin: number;
  serviceName: string; firstName: string; lastName: string; email: string; phone: string; note: string;
}): Promise<string | null> {
  try {
    const cal = await calendarClient();
    if (!cal) return null;
    const calendarId = (await getSetting("gcalCalendarId")) || "primary";
    const res = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: `${booking.serviceName} — ${booking.firstName} ${booking.lastName}`,
        description: `Rezervacija prek spletne strani Be.Lux\nStranka: ${booking.firstName} ${booking.lastName}\nE-mail: ${booking.email}\nTelefon: ${booking.phone}${booking.note ? `\nOpomba: ${booking.note}` : ""}`,
        start: { dateTime: `${booking.date}T${minToHHMM(booking.startMin)}:00`, timeZone: TZ },
        end: { dateTime: `${booking.date}T${minToHHMM(booking.endMin)}:00`, timeZone: TZ },
      },
    });
    return res.data.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const cal = await calendarClient();
    if (!cal) return;
    const calendarId = (await getSetting("gcalCalendarId")) || "primary";
    await cal.events.delete({ calendarId, eventId });
  } catch {
    /* ignore */
  }
}
