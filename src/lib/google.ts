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

/**
 * Nastavitve koledarja, ki jih klicatelj po navadi že ima pri roki.
 *
 * Brez tega je vsak pogled v koledar sprožil tri ločene poizvedbe v bazo —
 * ali je sinhronizacija vklopljena, žeton in kateri koledar. Ker baza teče na
 * drugem strežniku, je to ob vsakem kliku na dan stalo dodatne desetinke
 * sekunde.
 */
export type GcalOpts = {
  twoWay?: string;
  calendarId?: string;
  refreshToken?: string;
};

async function calendarClient(refreshToken?: string) {
  const token = refreshToken ?? (await getSetting("gcalRefreshToken"));
  if (!googleEnabled() || !token) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: token });
  return calendarApi({ version: "v3", auth: client });
}

type Busy = Array<[number, number]>;
type BusyCache = { from: string; to: string; at: number; data: Record<string, Busy> };

/**
 * Kratkotrajen spomin na zasedenost.
 *
 * Ko stranka odpre koledar, po zasedenost odidemo enkrat za cel mesec. Vsak
 * naslednji klik na posamezen dan se v naslednji minuti postreže iz tega
 * spomina, brez novega klica h Googlu — prav ti klici so bili razlog, da se je
 * seznam ur nalagal po dve sekundi.
 *
 * Cena je do minuta zamika: če si Anita pravkar vpisala dogodek v svoj koledar,
 * ga stran upošteva najkasneje čez minuto. Ob rezervaciji ali preklicu se
 * spomin izprazni takoj.
 */
const BUSY_TTL_MS = 60_000;
const cacheHolder = globalThis as unknown as { __beluxBusy?: BusyCache };

function fromCache(dates: string[]): Record<string, Busy> | null {
  const c = cacheHolder.__beluxBusy;
  if (!c) return null;
  if (Date.now() - c.at > BUSY_TTL_MS) return null;
  if (dates[0] < c.from || dates[dates.length - 1] > c.to) return null;
  const out: Record<string, Busy> = {};
  for (const d of dates) if (c.data[d]) out[d] = c.data[d];
  return out;
}

/**
 * Zasedeni intervali iz Anitinega koledarja za več dni naenkrat, z eno samo
 * poizvedbo h Googlu. Rezultat je po dnevih razrezan v minute od polnoči.
 */
export async function getBusyByDate(
  dates: string[],
  opts: GcalOpts = {}
): Promise<Record<string, Busy>> {
  const out: Record<string, Busy> = {};
  try {
    if (dates.length === 0) return out;

    const twoWay = opts.twoWay ?? (await getSetting("gcalTwoWay"));
    if (twoWay !== "1") return out;

    const cached = fromCache(dates);
    if (cached) return cached;

    const cal = await calendarClient(opts.refreshToken);
    if (!cal) return out;
    const calendarId = opts.calendarId || (await getSetting("gcalCalendarId")) || "primary";

    const from = dates[0];
    const to = dates[dates.length - 1];
    const res = await cal.freebusy.query({
      requestBody: {
        timeMin: ljubljanaToUtcIso(from, 0),
        timeMax: ljubljanaToUtcIso(to, 24 * 60),
        items: [{ id: calendarId }],
      },
    });
    const busy = res.data.calendars?.[calendarId]?.busy ?? [];

    for (const date of dates) {
      const dayStart = new Date(ljubljanaToUtcIso(date, 0)).getTime();
      const dayEnd = new Date(ljubljanaToUtcIso(date, 24 * 60)).getTime();
      const spans: Busy = [];
      for (const b of busy) {
        if (!b.start || !b.end) continue;
        const s = new Date(b.start).getTime();
        const e = new Date(b.end).getTime();
        if (e <= dayStart || s >= dayEnd) continue;
        spans.push([
          Math.max(0, Math.round((s - dayStart) / 60000)),
          Math.min(24 * 60, Math.round((e - dayStart) / 60000)),
        ]);
      }
      if (spans.length > 0) out[date] = spans;
    }

    cacheHolder.__beluxBusy = { from, to, at: Date.now(), data: out };
  } catch {
    /* koledar ni kritičen — brez njega se stran nič ne podre */
  }
  return out;
}

/** Zasedeni intervali za en dan. */
export async function getBusyIntervals(date: string, opts: GcalOpts = {}): Promise<Busy> {
  const map = await getBusyByDate([date], opts);
  return map[date] ?? [];
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
    cacheHolder.__beluxBusy = undefined; // zasedenost se je spremenila
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
    cacheHolder.__beluxBusy = undefined;
  } catch {
    /* ignore */
  }
}
