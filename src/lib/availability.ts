import { db, tables } from "./db";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAllSettings } from "./settings";
import { getBusyIntervals, getBusyByDate } from "./google";
import { nowInLjubljana, weekdayOf, addDays } from "./time";

type Interval = [number, number];

// Delovni intervali za dan (upošteva izjeme: zaprto / prilagojen delovnik)
export async function getDayIntervals(date: string): Promise<Interval[]> {
  const overrides = await db
    .select()
    .from(tables.dayOverrides)
    .where(eq(tables.dayOverrides.date, date))
    .all();
  if (overrides.length > 0) {
    if (overrides.some((o) => o.closed)) return [];
    return overrides
      .filter((o) => o.startMin != null && o.endMin != null)
      .map((o) => [o.startMin!, o.endMin!] as Interval);
  }
  const wh = await db
    .select()
    .from(tables.workingHours)
    .where(eq(tables.workingHours.weekday, weekdayOf(date)))
    .all();
  return wh.map((w) => [w.startMin, w.endMin] as Interval).sort((a, b) => a[0] - b[0]);
}

export async function getBookedIntervals(date: string, bufferMin = 0): Promise<Interval[]> {
  const rows = await db
    .select()
    .from(tables.bookings)
    .where(and(eq(tables.bookings.date, date), eq(tables.bookings.status, "POTRJENO")))
    .all();
  return rows.map((b) => [b.startMin, b.endMin + bufferMin] as Interval);
}

function overlaps(aStart: number, aEnd: number, b: Interval): boolean {
  return aStart < b[1] && aEnd > b[0];
}

// Prosti začetni termini za storitev z danim trajanjem
export async function getFreeSlots(date: string, durationMin: number): Promise<number[]> {
  const s = await getAllSettings();
  const step = parseInt(s.slotStepMin) || 30;
  const buffer = parseInt(s.bufferMin) || 0;
  const minNotice = parseFloat(s.minNoticeHours) || 0;
  const maxDays = parseInt(s.maxDaysAhead) || 60;

  const now = nowInLjubljana();
  if (date < now.date) return [];
  if (date > addDays(now.date, maxDays)) return [];

  const workIntervals = await getDayIntervals(date);
  if (workIntervals.length === 0) return [];

  const busy: Interval[] = [
    ...(await getBookedIntervals(date, buffer)),
    ...(await getBusyIntervals(date)),
  ];

  const earliestToday = date === now.date ? now.minutes + minNotice * 60 : 0;

  const slots: number[] = [];
  for (const [ws, we] of workIntervals) {
    for (let t = ws; t + durationMin <= we; t += step) {
      if (t < earliestToday) continue;
      if (busy.some((b) => overlaps(t, t + durationMin + buffer, b))) continue;
      slots.push(t);
    }
  }
  return Array.from(new Set(slots)).sort((a, b) => a - b);
}

// Ali je natančen slot še prost? (preverba tik pred potrditvijo)
export async function isSlotFree(date: string, startMin: number, durationMin: number): Promise<boolean> {
  const slots = await getFreeSlots(date, durationMin);
  return slots.includes(startMin);
}

// Kateri dnevi v mesecu imajo vsaj en prost termin (za koledar)
export async function getMonthAvailability(
  year: number,
  month: number, // 1–12
  durationMin: number
): Promise<Record<string, boolean>> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: Record<string, boolean> = {};
  const now = nowInLjubljana();
  const s = await getAllSettings();
  const buffer = parseInt(s.bufferMin) || 0;
  const step = parseInt(s.slotStepMin) || 30;
  const maxDate = addDays(now.date, parseInt(s.maxDaysAhead) || 60);

  /**
   * Dnevi, ki jih je sploh vredno računati. Za te potem z eno poizvedbo
   * pridobimo zasedenost iz Google Koledarja.
   *
   * Prej mesečni pogled Googla ni upošteval, prav tako ne odmora med termini,
   * dnevni seznam ur pa oboje — zato je znal biti dan v koledarju zelen, ob
   * kliku pa je pisalo, da prostih terminov ni.
   */
  const candidates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (date < now.date || date > maxDate) {
      out[date] = false;
      continue;
    }
    candidates.push(date);
  }

  if (candidates.length === 0) return out;

  /**
   * Vse za cel mesec s tremi poizvedbami namesto z dvema na vsak dan.
   *
   * Prej je bilo pri 31 dneh okoli 60 zaporednih poizvedb v bazo. Ker Turso
   * teče na drugem strežniku in vsaka poizvedba stane svojih ~70 ms, se je
   * koledar nalagal pet sekund. Zdaj so tri poizvedbe, ostalo se izračuna
   * iz pomnilnika.
   */
  const from = candidates[0];
  const to = candidates[candidates.length - 1];

  const [allHours, overrideRows, bookingRows, busyByDate] = await Promise.all([
    db.select().from(tables.workingHours).all(),
    db
      .select()
      .from(tables.dayOverrides)
      .where(and(gte(tables.dayOverrides.date, from), lte(tables.dayOverrides.date, to)))
      .all(),
    db
      .select()
      .from(tables.bookings)
      .where(
        and(
          eq(tables.bookings.status, "POTRJENO"),
          gte(tables.bookings.date, from),
          lte(tables.bookings.date, to)
        )
      )
      .all(),
    getBusyByDate(candidates),
  ]);

  const dayIntervalsOf = (date: string): Interval[] => {
    const ov = overrideRows.filter((o) => o.date === date);
    if (ov.length > 0) {
      if (ov.some((o) => o.closed)) return [];
      return ov
        .filter((o) => o.startMin != null && o.endMin != null)
        .map((o) => [o.startMin!, o.endMin!] as Interval);
    }
    return allHours
      .filter((w) => w.weekday === weekdayOf(date))
      .map((w) => [w.startMin, w.endMin] as Interval)
      .sort((a, b) => a[0] - b[0]);
  };

  for (const date of candidates) {
    const workIntervals = dayIntervalsOf(date);
    if (workIntervals.length === 0) {
      out[date] = false;
      continue;
    }
    const busy: Interval[] = [
      ...bookingRows
        .filter((b) => b.date === date)
        .map((b) => [b.startMin, b.endMin + buffer] as Interval),
      ...(busyByDate[date] ?? []),
    ];
    const earliest = date === now.date ? now.minutes + (parseFloat(s.minNoticeHours) || 0) * 60 : 0;
    let free = false;
    for (const [ws, we] of workIntervals) {
      for (let t = ws; t + durationMin <= we && !free; t += step) {
        if (t < earliest) continue;
        // enak izračun kot v getFreeSlots, vključno z odmorom
        if (!busy.some((b) => overlaps(t, t + durationMin + buffer, b))) free = true;
      }
      if (free) break;
    }
    out[date] = free;
  }
  return out;
}

/**
 * Preverba termina za Anito (dashboard).
 * Drugačna od javne: ne omejuje z razmikom med termini, najavnim rokom
 * ali koliko dni vnaprej — lastnica sme postaviti termin kamorkoli.
 * Preverja samo tisto, kar bi res naredilo škodo: prekrivanje in delovni čas.
 * `excludeBookingId` izpusti termin, ki ga prestavljamo, da sam sebi ne nagaja.
 */
export async function checkAdminSlot(
  date: string,
  startMin: number,
  durationMin: number,
  excludeBookingId?: string
): Promise<{ ok: boolean; reason?: string }> {
  const endMin = startMin + durationMin;
  const s = await getAllSettings();
  const buffer = parseInt(s.bufferMin) || 0;

  const rows = await db
    .select()
    .from(tables.bookings)
    .where(and(eq(tables.bookings.date, date), eq(tables.bookings.status, "POTRJENO")))
    .all();

  for (const b of rows) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (overlaps(startMin, endMin + buffer, [b.startMin, b.endMin + buffer])) {
      return {
        ok: false,
        reason: `Prekriva se s terminom ${b.firstName} ${b.lastName} ob ${String(Math.floor(b.startMin / 60)).padStart(2, "0")}:${String(b.startMin % 60).padStart(2, "0")}.`,
      };
    }
  }

  for (const g of await getBusyIntervals(date)) {
    if (overlaps(startMin, endMin, g)) {
      return { ok: false, reason: "Prekriva se z dogodkom v tvojem Google Koledarju." };
    }
  }

  const work = await getDayIntervals(date);
  if (work.length === 0) {
    return { ok: false, reason: "Ta dan po urniku ne delaš." };
  }
  if (!work.some(([ws, we]) => startMin >= ws && endMin <= we)) {
    return { ok: false, reason: "Termin je izven delovnega časa za ta dan." };
  }

  return { ok: true };
}
