// Vsi časi so lokalni (Europe/Ljubljana) — datumi kot "YYYY-MM-DD", ure kot minute od polnoči.

export const TZ = "Europe/Ljubljana";

export function nowInLjubljana(): { date: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.format(new Date()); // "2026-08-11 18:45"
  const [d, t] = parts.split(" ");
  const [h, m] = t.split(":").map(Number);
  return { date: d, minutes: h * 60 + m };
}

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function formatPrice(p: number): string {
  return `${p.toFixed(2).replace(".", ",")} €`;
}

const DAYS = ["ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota", "nedelja"];
const DAYS_SHORT = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
const MONTHS = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

export { DAYS, DAYS_SHORT, MONTHS };

// weekday: 0 = ponedeljek … 6 = nedelja
export function weekdayOf(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00Z");
  return (d.getUTCDay() + 6) % 7;
}

export function formatDateSl(dateStr: string, withDay = true): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = `${d}. ${MONTHS[m - 1]} ${y}`;
  return withDay ? `${DAYS[weekdayOf(dateStr)]}, ${base}` : base;
}

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Za Google Calendar / ICS: lokalni čas v UTC ISO string
export function ljubljanaToUtcIso(dateStr: string, minutes: number): string {
  const naive = new Date(`${dateStr}T${minToHHMM(minutes)}:00Z`);
  // ugotovi zamik časovne cone na ta dan
  const probe = new Date(naive);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const [pd, pt] = fmt.format(probe).split(" ");
  const localAsUtc = new Date(`${pd}T${pt}:00Z`);
  const offsetMs = localAsUtc.getTime() - probe.getTime();
  return new Date(naive.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function gcalDatesParam(dateStr: string, startMin: number, endMin: number): string {
  const s = ljubljanaToUtcIso(dateStr, startMin).replace(/[-:]/g, "");
  const e = ljubljanaToUtcIso(dateStr, endMin).replace(/[-:]/g, "");
  return `${s}/${e}`;
}
