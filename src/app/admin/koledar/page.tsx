"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, formatDateSl, minToHHMM, formatPrice } from "@/lib/time";

type B = {
  id: string; date: string; startMin: number; endMin: number; status: string;
  firstName: string; lastName: string; email: string; phone: string; note: string;
  paid: boolean; serviceName: string; durationMin: number; price: number;
};

const DAYS = ["PON", "TOR", "SRE", "ČET", "PET", "SOB", "NED"];
const MONTHS = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

/** YYYY-MM-DD brez časovnih pasti (vse računamo v UTC polnoči). */
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parse(s: string) {
  return new Date(`${s}T00:00:00Z`);
}
/** Ponedeljek tedna, v katerem je dani datum. */
function mondayOf(s: string) {
  const d = parse(s);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = ponedeljek
  return ymd(new Date(d.getTime() - dow * 86400000));
}

export default function Koledar() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" });
  const [view, setView] = useState<"mesec" | "teden">("mesec");
  const [anchor, setAnchor] = useState(today); // katerikoli dan v prikazanem obdobju
  const [bookings, setBookings] = useState<B[] | null>(null);
  const [selected, setSelected] = useState<B | null>(null);
  const [moveDay, setMoveDay] = useState(false);

  // obdobje za nalaganje — z rezervo, da so vidni tudi robni dnevi mreže
  const range = useMemo(() => {
    if (view === "teden") {
      const from = mondayOf(anchor);
      return { from, to: addDays(from, 6) };
    }
    const d = parse(anchor);
    const first = ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    const last = ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    return { from: addDays(mondayOf(first), 0), to: addDays(last, 7) };
  }, [anchor, view]);

  const load = useCallback(() => {
    setBookings(null);
    fetch(`/api/admin/bookings?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []));
  }, [range.from, range.to]);
  useEffect(load, [load]);

  const byDate = useMemo(() => {
    const m: Record<string, B[]> = {};
    for (const b of bookings ?? []) {
      if (b.status === "PREKLICANO") continue;
      (m[b.date] ??= []).push(b);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.startMin - b.startMin);
    return m;
  }, [bookings]);

  function step(dir: number) {
    if (view === "teden") {
      setAnchor(addDays(anchor, dir * 7));
    } else {
      const d = parse(anchor);
      setAnchor(ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1))));
    }
  }

  const d = parse(anchor);
  const title =
    view === "teden"
      ? `${formatDateSl(mondayOf(anchor), false)} – ${formatDateSl(addDays(mondayOf(anchor), 6), false)}`
      : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Koledar</h1>
        <div className="flex gap-2">
          <button className={tab(view === "mesec")} onClick={() => setView("mesec")}>Mesec</button>
          <button className={tab(view === "teden")} onClick={() => setView("teden")}>Teden</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="btn-secondary !px-4 !py-2" onClick={() => step(-1)}>‹</button>
        <button className="btn-secondary !px-4 !py-2" onClick={() => setAnchor(today)}>Danes</button>
        <button className="btn-secondary !px-4 !py-2" onClick={() => step(1)}>›</button>
        <p className="ml-3 text-lg font-semibold capitalize">{title}</p>
        {bookings === null && <span className="text-sm text-ink/40">nalagam …</span>}
        <button className="btn-secondary !ml-auto !py-2.5" onClick={() => setMoveDay(true)}>
          🔀 Prestavi cel dan
        </button>
      </div>

      {view === "mesec" ? (
        <MonthGrid anchor={anchor} today={today} byDate={byDate} onPick={setSelected} />
      ) : (
        <WeekGrid anchor={anchor} today={today} byDate={byDate} onPick={setSelected} />
      )}

      {selected && (
        <BookingDialog b={selected} onClose={() => setSelected(null)} onChanged={() => { load(); setSelected(null); }} />
      )}
      {moveDay && (
        <MoveDayDialog
          today={today}
          onClose={() => setMoveDay(false)}
          onDone={() => { load(); setMoveDay(false); }}
        />
      )}
    </div>
  );
}

type Plan = { id: string; who: string; time: string; serviceName: string; ok: boolean; reason: string | null };

function MoveDayDialog({ today, onClose, onDone }: { today: string; onClose: () => void; onDone: () => void }) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 1));
  const [notify, setNotify] = useState(true);
  const [plan, setPlan] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/bookings/premakni-dan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, notify, ...body }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Napaka.");
      if (d.plan) setPlan(d.plan);
      return null;
    }
    return d;
  }

  async function preview() {
    const d = await call({});
    if (d) setPlan(d.plan);
  }

  async function execute(force: boolean) {
    const d = await call({ confirm: true, force });
    if (d?.ok) onDone();
  }

  const conflicts = (plan ?? []).filter((p) => !p.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Prestavi cel dan</h2>
            <p className="mt-0.5 text-sm text-ink/50">Vsi termini se preselijo, ure ostanejo iste.</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-ink/40 hover:text-ink">×</button>
        </div>

        <div className="card mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Iz dneva</label>
              <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPlan(null); }} />
            </div>
            <div>
              <label className="label">Na dan</label>
              <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPlan(null); }} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Obvesti vse stranke po e-pošti
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
        )}

        {plan && (
          <div className="card mt-4">
            <h3 className="font-semibold">
              {plan.length} terminov{conflicts > 0 && <span className="text-amber-700"> · {conflicts} s težavo</span>}
            </h3>
            <div className="mt-3 space-y-2">
              {plan.map((p) => (
                <div key={p.id} className="flex items-start gap-3 border-b border-belux-50 pb-2 text-sm last:border-0">
                  <span className={`mt-0.5 ${p.ok ? "text-emerald-600" : "text-amber-600"}`}>{p.ok ? "✓" : "!"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.time} · {p.who}</p>
                    <p className="truncate text-xs text-ink/50">{p.serviceName}</p>
                    {p.reason && <p className="mt-0.5 text-xs text-amber-700">{p.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="btn-secondary !py-2.5" onClick={onClose}>Prekliči</button>
          {!plan ? (
            <button className="btn-primary !py-2.5" disabled={busy} onClick={preview}>
              {busy ? "Preverjam …" : "Preveri"}
            </button>
          ) : conflicts === 0 ? (
            <button className="btn-primary !py-2.5" disabled={busy} onClick={() => execute(false)}>
              {busy ? "Prestavljam …" : `Prestavi ${plan.length} terminov`}
            </button>
          ) : (
            <button className="btn-primary !py-2.5" disabled={busy} onClick={() => execute(true)}>
              {busy ? "Prestavljam …" : "Vseeno prestavi vse"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const tab = (active: boolean) =>
  `rounded-xl px-4 py-2 text-sm font-medium transition ${
    active ? "bg-belux-500 text-white" : "bg-white text-ink/60 hover:bg-belux-50"
  }`;

function MonthGrid({
  anchor, today, byDate, onPick,
}: { anchor: string; today: string; byDate: Record<string, B[]>; onPick: (b: B) => void }) {
  const d = parse(anchor);
  const first = ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const start = mondayOf(first);
  const month = d.getUTCMonth();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  // odrežemo zadnjo vrstico, če je cela iz naslednjega meseca
  let lastIdx = 0;
  cells.forEach((c, i) => { if (parse(c).getUTCMonth() === month) lastIdx = i; });
  const weeks = Math.ceil((lastIdx + 1) / 7);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-belux-100 bg-white">
      <div className="grid grid-cols-7 border-b border-belux-100 bg-belux-50/60">
        {DAYS.map((n) => (
          <div key={n} className="px-2 py-2.5 text-center text-[11px] font-semibold tracking-wide text-belux-700">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.slice(0, weeks * 7).map((day) => {
          const list = byDate[day] ?? [];
          const other = parse(day).getUTCMonth() !== month;
          return (
            <div
              key={day}
              className={`min-h-[104px] border-b border-r border-belux-100 p-1.5 ${other ? "bg-belux-50/30" : ""}`}
            >
              <p className={`mb-1 text-right text-xs ${
                day === today ? "inline-block w-full font-bold text-belux-600" : other ? "text-ink/25" : "text-ink/40"
              }`}>
                {day === today ? (
                  <span className="float-right rounded-md bg-belux-500 px-1.5 py-0.5 text-white">{Number(day.slice(8))}</span>
                ) : (
                  Number(day.slice(8))
                )}
              </p>
              <div className="space-y-1">
                {list.slice(0, 3).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onPick(b)}
                    className="block w-full truncate rounded-md bg-belux-100 px-1.5 py-1 text-left text-[11px] leading-tight text-belux-900 transition hover:bg-belux-200"
                  >
                    <span className="font-semibold">{minToHHMM(b.startMin)}</span>{" "}
                    {b.firstName} {b.lastName}
                  </button>
                ))}
                {list.length > 3 && (
                  <p className="px-1 text-[11px] text-ink/40">+{list.length - 3} več</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor, today, byDate, onPick,
}: { anchor: string; today: string; byDate: Record<string, B[]>; onPick: (b: B) => void }) {
  const start = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const all = days.flatMap((d) => byDate[d] ?? []);
  const minH = all.length ? Math.min(...all.map((b) => b.startMin)) : 8 * 60;
  const maxH = all.length ? Math.max(...all.map((b) => b.endMin)) : 18 * 60;
  const from = Math.floor(Math.min(minH, 8 * 60) / 60) * 60;
  const to = Math.ceil(Math.max(maxH, 18 * 60) / 60) * 60;
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60);
  const PX = 1.1; // px na minuto

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-belux-100 bg-white">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-belux-100 bg-belux-50/60">
          <div />
          {days.map((d, i) => (
            <div key={d} className={`px-2 py-2.5 text-center text-[11px] font-semibold ${d === today ? "text-belux-600" : "text-belux-700"}`}>
              {DAYS[i]} <span className="text-ink/40">{Number(d.slice(8))}.</span>
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: 60 * PX }} className="border-b border-belux-50 pr-2 text-right text-[11px] text-ink/40">
                {minToHHMM(h)}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l border-belux-100">
              {hours.map((h) => (
                <div key={h} style={{ height: 60 * PX }} className="border-b border-belux-50" />
              ))}
              {(byDate[d] ?? []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => onPick(b)}
                  style={{
                    top: (b.startMin - from) * PX,
                    height: Math.max(22, (b.endMin - b.startMin) * PX - 2),
                  }}
                  className="absolute inset-x-1 overflow-hidden rounded-lg bg-belux-200/80 px-1.5 py-1 text-left text-[11px] leading-tight text-belux-900 transition hover:bg-belux-300"
                >
                  <span className="font-semibold">{minToHHMM(b.startMin)}</span> {b.firstName} {b.lastName}
                  <span className="block truncate text-belux-800/70">{b.serviceName}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingDialog({ b, onClose, onChanged }: { b: B; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(b.date);
  const [time, setTime] = useState(minToHHMM(b.startMin));
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState("");
  const [canForce, setCanForce] = useState(false);

  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, ...patch }),
    });
    setBusy(false);
    onChanged();
  }

  async function move(force = false) {
    setBusy(true);
    setError("");
    const [h, m] = time.split(":").map(Number);
    const res = await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, date, startMin: h * 60 + m, notify, force }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Prestavitev ni uspela.");
      setCanForce(Boolean(d.canForce));
      return;
    }
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-cream p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{b.firstName} {b.lastName}</h2>
            <p className="mt-0.5 text-sm text-ink/50">{formatDateSl(b.date)} · {minToHHMM(b.startMin)}–{minToHHMM(b.endMin)}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-ink/40 hover:text-ink">×</button>
        </div>

        <div className="card mt-4 space-y-2 text-sm">
          <Row label="Storitev" value={b.serviceName} />
          <Row label="Cena" value={formatPrice(b.price)} />
          {b.phone && <Row label="Telefon" value={b.phone} href={`tel:${b.phone.replace(/\s/g, "")}`} />}
          {b.email && <Row label="E-mail" value={b.email} href={`mailto:${b.email}`} />}
          {b.note && <Row label="Opomba" value={b.note} />}
        </div>

        {moving ? (
          <div className="card mt-4">
            <h3 className="font-semibold">Prestavi termin</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Novi datum</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Nova ura</label>
                <input type="time" step={300} className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Obvesti stranko po e-pošti
            </label>

            {error && (
              <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {error}
                {canForce && (
                  <button onClick={() => move(true)} className="mt-2 block font-semibold underline">
                    Vseeno prestavi
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary !py-2.5" onClick={() => { setMoving(false); setError(""); }}>
                Nazaj
              </button>
              <button className="btn-primary !py-2.5" disabled={busy} onClick={() => move(false)}>
                {busy ? "Prestavljam …" : "Prestavi"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary !py-2.5" disabled={busy} onClick={() => setMoving(true)}>
              📅 Prestavi termin
            </button>
            <button
              className={b.paid ? "btn-secondary !py-2.5" : "btn-secondary !py-2.5"}
              disabled={busy}
              onClick={() => update({ paid: !b.paid })}
            >
              {b.paid ? "✓ Plačano — odznači" : "Označi kot plačano"}
            </button>
            <button
              className="btn-secondary !py-2.5 !text-red-600"
              disabled={busy}
              onClick={() => {
                if (confirm("Res prekličem ta termin? Stranka bo obveščena po e-pošti.")) {
                  update({ status: "PREKLICANO" });
                }
              }}
            >
              Prekliči
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-ink/50">{label}</span>
      {href ? (
        <a href={href} className="truncate text-right font-medium text-belux-600 underline-offset-4 hover:underline">{value}</a>
      ) : (
        <span className="truncate text-right font-medium">{value}</span>
      )}
    </div>
  );
}
