"use client";

import { useEffect, useState } from "react";

export default function Nastavitve() {
  const [s, setS] = useState<Record<string, string> | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      setS(d.settings);
      setGoogleEnabled(d.googleEnabled);
      setCalendarConnected(d.calendarConnected);
    });
  }, []);

  if (!s) return <p className="text-sm text-ink/40">Nalagam …</p>;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setS({ ...s, [k]: e.target.value });

  async function save() {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function disconnectGoogle() {
    if (!confirm("Prekinem povezavo z Google Koledarjem?")) return;
    await fetch("/api/admin/google/disconnect", { method: "POST" });
    setCalendarConnected(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Nastavitve</h1>

      <section className="card mt-6">
        <h2 className="font-semibold text-belux-700">Podatki studia</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Ime studia</label><input className="input" value={s.studioName} onChange={set("studioName")} /></div>
          <div><label className="label">Telefon</label><input className="input" value={s.phone} onChange={set("phone")} /></div>
          <div className="sm:col-span-2"><label className="label">Naslov</label><input className="input" value={s.address} onChange={set("address")} /></div>
          <div><label className="label">E-naslov</label><input className="input" value={s.email} onChange={set("email")} /></div>
          <div><label className="label">Instagram (povezava)</label><input className="input" value={s.instagram} onChange={set("instagram")} /></div>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="font-semibold text-belux-700">Obveščanje po e-pošti</h2>
        <p className="mt-1 text-xs text-ink/50">
          Opomniki, zahvale in vabila se pošljejo samodejno enkrat dnevno.
        </p>
        <div className="mt-4">
          <label className="label">Moj e-naslov za obvestila</label>
          <input className="input" placeholder="anita@belux.si" value={s.adminEmail ?? ""} onChange={set("adminEmail")} />
        </div>
        <div className="mt-4 space-y-1">
          <Toggle s={s} setS={setS} k="emailAdminNotify" label="Obvesti me ob vsaki novi rezervaciji" />
          <Toggle s={s} setS={setS} k="emailReminder" label="Opomnik stranki dan pred terminom" />
          <Toggle s={s} setS={setS} k="emailThanks" label="Zahvala stranki po opravljeni storitvi" />
          <Toggle s={s} setS={setS} k="emailFollowUp" label="Vabilo na korekcijo, če se stranka dolgo ni naročila" />
        </div>
        <div className="mt-4 max-w-xs">
          <label className="label">Vabilo na korekcijo po (tednih)</label>
          <input type="number" min={1} max={12} className="input" value={s.followUpWeeks ?? "3"} onChange={set("followUpWeeks")} />
          <p className="mt-1 text-xs text-ink/50">Pošlje se samo strankam, ki še nimajo naslednjega termina.</p>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="font-semibold text-belux-700">Besedila na strani</h2>
        <div className="mt-4 space-y-4">
          <div><label className="label">Naslov (hero)</label><input className="input" value={s.heroTitle} onChange={set("heroTitle")} /></div>
          <div><label className="label">Podnaslov (hero)</label><textarea className="input" value={s.heroSubtitle} onChange={set("heroSubtitle")} /></div>
          <div><label className="label">O meni</label><textarea className="input min-h-[110px]" value={s.aboutText} onChange={set("aboutText")} /></div>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="font-semibold text-belux-700">Pravila naročanja</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Preklic možen do (ur pred terminom)</label>
            <input type="number" className="input" value={s.cancelHours} onChange={set("cancelHours")} />
          </div>
          <div>
            <label className="label">Razmik med termini (minut)</label>
            <select className="input" value={s.slotStepMin} onChange={set("slotStepMin")}>
              {[15, 30, 45, 60].map((v) => <option key={v} value={v}>{v} min</option>)}
            </select>
          </div>
          <div>
            <label className="label">Najmanj ur vnaprej za rezervacijo</label>
            <input type="number" className="input" value={s.minNoticeHours} onChange={set("minNoticeHours")} />
          </div>
          <div>
            <label className="label">Naročanje največ dni vnaprej</label>
            <input type="number" className="input" value={s.maxDaysAhead} onChange={set("maxDaysAhead")} />
          </div>
          <div>
            <label className="label">Odmor med terminoma (minut)</label>
            <input type="number" className="input" value={s.bufferMin} onChange={set("bufferMin")} />
          </div>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="font-semibold text-belux-700">Google Koledar</h2>
        {!googleEnabled && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Google povezava še ni nastavljena na strežniku (GOOGLE_CLIENT_ID in GOOGLE_CLIENT_SECRET).
            Ko bosta dodana, se tukaj prikaže gumb za povezavo tvojega koledarja.
          </p>
        )}
        {googleEnabled && !calendarConnected && (
          <div className="mt-3">
            <p className="text-sm text-ink/60">Poveži svoj Google Koledar — rezervacije se bodo samodejno vpisovale vanj.</p>
            <a href="/api/admin/google/connect" className="btn-primary mt-3">Poveži Google Koledar</a>
          </div>
        )}
        {googleEnabled && calendarConnected && (
          <div className="mt-3 space-y-3">
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">✓ Google Koledar je povezan.</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.gcalTwoWay === "1"}
                onChange={(e) => setS({ ...s, gcalTwoWay: e.target.checked ? "1" : "0" })}
              />
              Dogodki v mojem koledarju blokirajo termine na strani (dvosmerna sinhronizacija)
            </label>
            <button className="text-sm text-red-600 underline" onClick={disconnectGoogle}>Prekini povezavo</button>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 mt-8 flex items-center justify-end gap-3">
        {saved && <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">Shranjeno ✓</span>}
        <button className="btn-primary shadow-lg" onClick={save}>Shrani nastavitve</button>
      </div>
    </div>
  );
}

function Toggle({
  s, setS, k, label,
}: {
  s: Record<string, string>;
  setS: (v: Record<string, string>) => void;
  k: string;
  label: string;
}) {
  const on = (s[k] ?? "1") !== "0";
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-sm hover:bg-belux-50/60">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setS({ ...s, [k]: on ? "0" : "1" })}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-belux-500" : "bg-belux-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
