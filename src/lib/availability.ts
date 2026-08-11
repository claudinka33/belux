import { db, tables } from "./db";
import { and, eq } from "drizzle-orm";
import { getAllSettings } from "./settings";
import { getBusyIntervals } from "./google";
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
  const maxDate = addDays(now.date, parseInt(s.maxDaysAhead) || 60);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (date < now.date || date > maxDate) {
      out[date] = false;
      continue;
    }
    // hitro: brez Google poizvedb za cel mesec — samo delovni čas + rezervacije
    const workIntervals = await getDayIntervals(date);
    if (workIntervals.length === 0) {
      out[date] = false;
      continue;
    }
    const busy = await getBookedIntervals(date, parseInt(s.bufferMin) || 0);
    const step = parseInt(s.slotStepMin) || 30;
    const earliest = date === now.date ? now.minutes + (parseFloat(s.minNoticeHours) || 0) * 60 : 0;
    let free = false;
    for (const [ws, we] of workIntervals) {
      for (let t = ws; t + durationMin <= we && !free; t += step) {
        if (t < earliest) continue;
        if (!busy.some((b) => overlaps(t, t + durationMin, b))) free = true;
      }
      if (free) break;
    }
    out[date] = free;
  }
  return out;
}
