"use client";

import { useEffect, useState, useCallback } from "react";
import { DAYS, minToHHMM, hhmmToMin, formatDateSl } from "@/lib/time";

type Interval = { weekday: number; startMin: number; endMin: number };
type Override = { id: string; date: string; closed: boolean; startMin: number | null; endMin: number | null; note: string };

export default function Urnik() {
  const [hours, setHours] = useState<Interval[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/hours").then((r) => r.json()).then((d) => {
      setHours(d.hours.map((h: any) => ({ weekday: h.weekday, startMin: h.startMin, endMin: h.endMin })));
      setOverrides(d.overrides);
    });
  }, []);
  useEffect(load, [load]);

  async function saveHours() {
    setError("");
    const res = await fetch("/api/admin/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Napaka."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setIv(wd: number, idx: number, field: "startMin" | "endMin", value: string) {
    setHours((hs) => {
      const list = hs.filter((h) => h.weekday === wd);
      const target = list[idx];
      return hs.map((h) => (h === target ? { ...h, [field]: hhmmToMin(value) } : h));
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Delovni čas</h1>
      <p className="mt-1 text-sm text-ink/50">Tedenski urnik — lahko imaš tudi več terminov na dan (npr. dopoldne in popoldne).</p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="card mt-6 space-y-4">
        {DAYS.map((day, wd) => {
          const list = hours.filter((h) => h.weekday === wd);
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 border-b border-belux-50 pb-4 last:border-0 last:pb-0">
              <p className="w-28 font-medium capitalize">{day}</p>
              {list.length === 0 && <span className="rounded-full bg-belux-50 px-3 py-1 text-xs text-ink/40">zaprto</span>}
              {list.map((iv, idx) => (
                <span key={idx} className="flex items-center gap-1.5 rounded-xl bg-belux-50 px-3 py-2">
                  <input type="time" className="bg-transparent text-sm" value={minToHHMM(iv.startMin)} onChange={(e) => setIv(wd, idx, "startMin", e.target.value)} />
                  –
                  <input type="time" className="bg-transparent text-sm" value={minToHHMM(iv.endMin)} onChange={(e) => setIv(wd, idx, "endMin", e.target.value)} />
                  <button
                    className="ml-1 text-red-500"
                    onClick={() => setHours((hs) => hs.filter((h) => h !== hours.filter((x) => x.weekday === wd)[idx]))}
                    title="Odstrani"
                  >×</button>
                </span>
              ))}
              <button
                className="rounded-full border border-dashed border-belux-300 px-3 py-1 text-xs text-belux-600 hover:bg-belux-50"
                onClick={() => setHours((hs) => [...hs, { weekday: wd, startMin: 8 * 60, endMin: 16 * 60 }])}
              >
                + dodaj interval
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-sm font-medium text-green-600">Shranjeno ✓</span>}
          <button className="btn-primary" onClick={saveHours}>Shrani delovni čas</button>
        </div>
      </div>

      <OverridesSection overrides={overrides} onChanged={load} />
    </div>
  );
}

function OverridesSection({ overrides, onChanged }: { overrides: Override[]; onChanged: () => void }) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" });
  const [mode, setMode] = useState<"closed" | "custom">("closed");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");

  async function add() {
    await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateFrom, dateTo,
        closed: mode === "closed",
        startMin: mode === "custom" ? hhmmToMin(start) : null,
        endMin: mode === "custom" ? hhmmToMin(end) : null,
        note,
      }),
    });
    setNote("");
    onChanged();
  }
  async function remove(id: string) {
    await fetch("/api/admin/overrides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onChanged();
  }

  const upcoming = overrides.filter((o) => o.date >= today);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold">Izjeme — dopust in posebni dnevi</h2>
      <p className="mt-1 text-sm text-ink/50">Označi dneve, ko NE delaš, ali dneve s prilagojenim delovnim časom.</p>

      <div className="card mt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Od</label>
            <input type="date" className="input !w-auto" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (dateTo < e.target.value) setDateTo(e.target.value); }} />
          </div>
          <div>
            <label className="label">Do</label>
            <input type="date" className="input !w-auto" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Tip</label>
            <select className="input !w-auto" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="closed">Ne delam (zaprto)</option>
              <option value="custom">Prilagojen delovni čas</option>
            </select>
          </div>
          {mode === "custom" && (
            <div className="flex items-end gap-2">
              <div><label className="label">Od</label><input type="time" className="input !w-auto" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><label className="label">Do</label><input type="time" className="input !w-auto" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          )}
          <div className="min-w-40 flex-1">
            <label className="label">Opomba</label>
            <input className="input" placeholder="npr. dopust 🌴" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={add}>Dodaj</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-ink/40">Ni prihajajočih izjem.</p>}
        {upcoming.map((o) => (
          <div key={o.id} className="card flex items-center justify-between !py-3">
            <div>
              <p className="font-medium">{formatDateSl(o.date)}</p>
              <p className="text-sm text-ink/50">
                {o.closed ? "🚫 Zaprto" : `🕐 ${minToHHMM(o.startMin!)} – ${minToHHMM(o.endMin!)}`}
                {o.note && ` · ${o.note}`}
              </p>
            </div>
            <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100" onClick={() => remove(o.id)}>
              Odstrani
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
