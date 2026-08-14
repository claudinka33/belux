"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/time";

type Stats = {
  totals: {
    bookings: number; revenue: number; clients: number; cancelled: number;
    hours: number; unpaidCount: number; unpaidAmount: number; avgTicket: number;
  };
  monthly: { month: string; revenue: number; count: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  byCategory: { name: string; revenue: number }[];
  clientMix: { returning: number; oneTime: number };
  weekday: number[];
};

const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
const DAYS = ["pon", "tor", "sre", "čet", "pet", "sob", "ned"];

// Ena barva — vsi grafikoni prikazujejo eno samo serijo (velikost), zato brez legende.
const INK = "#cf6d90";

export default function Porocila() {
  const [s, setS] = useState<Stats | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setS);
  }, []);

  if (!s) return <p className="text-sm text-ink/40">Nalagam …</p>;

  const empty = s.totals.bookings === 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Poročila</h1>
        <button className="btn-secondary !py-2.5" onClick={() => setTable(!table)}>
          {table ? "Prikaži grafe" : "Prikaži tabelo"}
        </button>
      </div>

      {empty && (
        <div className="card mt-6 text-center text-sm text-ink/50">
          Ko bo nekaj terminov za sabo, se tu pokažejo promet, najbolj prodajane storitve in zasedenost po dnevih.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Skupni promet" value={formatPrice(s.totals.revenue)} icon="💶" />
        <Tile label="Opravljenih terminov" value={String(s.totals.bookings)} icon="✅" />
        <Tile label="Strank" value={String(s.totals.clients)} icon="👥" />
        <Tile label="Povprečen termin" value={formatPrice(s.totals.avgTicket)} icon="📊" />
      </div>

      {s.totals.unpaidCount > 0 && (
        <div className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{s.totals.unpaidCount}</strong> opravljenih terminov še ni označenih kot plačanih
          (skupaj {formatPrice(s.totals.unpaidAmount)}). Označiš jih v Koledarju ali Rezervacijah.
        </div>
      )}

      {table ? (
        <DataTable s={s} />
      ) : (
        !empty && (
          <div className="mt-6 space-y-6">
            <Panel title="Promet po mesecih" subtitle="Zadnjih 12 mesecev, v evrih">
              <Columns
                data={s.monthly.map((m) => ({
                  label: MONTHS_SHORT[Number(m.month.slice(5, 7)) - 1],
                  sub: m.month.slice(2, 4),
                  value: m.revenue,
                  tip: `${m.count} terminov · ${formatPrice(m.revenue)}`,
                }))}
                format={(v) => formatPrice(v)}
              />
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Najbolj prodajane storitve" subtitle="Po ustvarjenem prometu">
                <Bars
                  data={s.topServices.slice(0, 7).map((t) => ({
                    label: t.name,
                    value: t.revenue,
                    tip: `${t.count}× · ${formatPrice(t.revenue)}`,
                  }))}
                  format={(v) => formatPrice(v)}
                />
              </Panel>

              <Panel title="Zasedenost po dnevih" subtitle="Število terminov po dnevu v tednu">
                <Columns
                  data={s.weekday.map((n, i) => ({
                    label: DAYS[i],
                    value: n,
                    tip: `${n} terminov`,
                  }))}
                  format={(v) => String(v)}
                />
              </Panel>
            </div>

            <Panel title="Stalne stranke" subtitle="Koliko strank se vrne po prvem obisku">
              <div className="flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-4xl font-semibold text-belux-600">
                    {s.clientMix.returning + s.clientMix.oneTime > 0
                      ? Math.round(
                          (s.clientMix.returning / (s.clientMix.returning + s.clientMix.oneTime)) * 100
                        )
                      : 0}
                    %
                  </p>
                  <p className="mt-1 text-sm text-ink/50">strank se vrne</p>
                </div>
                <div className="min-w-[220px] flex-1">
                  <div className="flex h-6 overflow-hidden rounded-lg bg-belux-50">
                    <div
                      style={{ width: `${pct(s.clientMix.returning, s.clientMix.returning + s.clientMix.oneTime)}%` }}
                      className="bg-belux-500"
                      title={`${s.clientMix.returning} stalnih`}
                    />
                    <div className="w-[2px] shrink-0 bg-white" />
                  </div>
                  <div className="mt-2 flex gap-5 text-sm text-ink/60">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-belux-500" /> Stalne: {s.clientMix.returning}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-belux-100" /> Enkratne: {s.clientMix.oneTime}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )
      )}
    </div>
  );
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

function Tile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-belux-100 text-2xl">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold">{value}</p>
        <p className="text-xs text-ink/50">{label}</p>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mb-5 mt-0.5 text-xs text-ink/50">{subtitle}</p>}
      {children}
    </section>
  );
}

/** Navpični stolpci. Ena serija, ena barva, vrednost samo nad najvišjim. */
function Columns({
  data, format,
}: { data: { label: string; sub?: string; value: number; tip: string }[]; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <div>
      {/* risalna ploskev ima fiksno višino, da se odstotki razrešijo */}
      <div className="relative flex h-44 gap-[2px]">
        {/* recesivna osnovnica */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-belux-100" />
        {data.map((d, i) => (
          <div
            key={i}
            className="relative flex-1"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {(i === peak || hover === i) && d.value > 0 && (
              <span
                style={{ bottom: `calc(${(d.value / max) * 100}% + 6px)` }}
                className="absolute inset-x-0 z-10 text-center text-[11px] font-semibold text-ink/70"
              >
                {format(d.value)}
              </span>
            )}
            <div
              style={{ height: `${(d.value / max) * 100}%`, background: INK }}
              className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[24px] rounded-t transition ${
                hover === i ? "opacity-80" : ""
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="mt-2 block text-[11px] text-ink/50">{d.label}</span>
            {d.sub && <span className="block text-[10px] text-ink/30">{d.sub}</span>}
          </div>
        ))}
      </div>
      {hover !== null && (
        <p className="mt-3 text-center text-xs text-ink/60">
          <span className="font-medium text-ink/80">{data[hover].label}</span> · {data[hover].tip}
        </p>
      )}
    </div>
  );
}

/** Vodoravni stolpci z vrednostjo na konici. */
function Bars({
  data, format,
}: { data: { label: string; value: number; tip: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} title={d.tip}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink/70">{d.label}</span>
            <span className="shrink-0 text-sm font-semibold text-ink/70">{format(d.value)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-belux-50">
            <div
              style={{ width: `${(d.value / max) * 100}%`, background: INK }}
              className="h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ s }: { s: Stats }) {
  return (
    <div className="mt-6 space-y-6">
      <Panel title="Promet po mesecih">
        <Table
          head={["Mesec", "Terminov", "Promet"]}
          rows={s.monthly.map((m) => [m.month, String(m.count), formatPrice(m.revenue)])}
        />
      </Panel>
      <Panel title="Storitve">
        <Table
          head={["Storitev", "Število", "Promet"]}
          rows={s.topServices.map((t) => [t.name, String(t.count), formatPrice(t.revenue)])}
        />
      </Panel>
      <Panel title="Po kategorijah">
        <Table
          head={["Kategorija", "Promet"]}
          rows={s.byCategory.map((c) => [c.name, formatPrice(c.revenue)])}
        />
      </Panel>
      <Panel title="Zasedenost po dnevih">
        <Table head={["Dan", "Terminov"]} rows={s.weekday.map((n, i) => [DAYS[i], String(n)])} />
      </Panel>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-sm text-ink/40">Ni podatkov.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-belux-100 text-left text-xs uppercase tracking-wide text-ink/50">
            {head.map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-belux-50">
              {r.map((c, j) => <td key={j} className="py-2 pr-4">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
