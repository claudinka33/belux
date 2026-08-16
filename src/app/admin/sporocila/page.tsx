"use client";

import { useEffect, useState } from "react";

type Nast = Record<string, string>;

/** Šest sporočil, ki jih stranke prejmejo samodejno. */
const SPOROCILA = [
  {
    kljuc: "Booking",
    naslov: "Potrditev termina",
    kdaj: "Takoj, ko se stranka naroči.",
    oznake: ["ime", "storitev", "datum", "ura", "cena", "naslov", "telefon", "ure"],
    dodatek: "Pod besedilom se samodejno izpišejo podatki o terminu, gumb za Google Koledar in povezava za preklic.",
  },
  {
    kljuc: "Reminder",
    naslov: "Opomnik dan pred terminom",
    kdaj: "Dan prej, samodejno ob 18:00.",
    oznake: ["ime", "storitev", "datum", "ura", "naslov", "telefon"],
    dodatek: "Pod besedilom se izpišejo podatki o terminu in povezava za preklic.",
  },
  {
    kljuc: "Thanks",
    naslov: "Zahvala po obisku",
    kdaj: "Dan po opravljeni storitvi.",
    oznake: ["ime", "storitev", "telefon"],
    dodatek: "Pod besedilom je gumb za rezervacijo naslednjega termina.",
  },
  {
    kljuc: "FollowUp",
    naslov: "Vabilo na korekcijo",
    kdaj: "Ko od zadnjega obiska mine nastavljeno število tednov.",
    oznake: ["ime", "tedni", "telefon"],
    dodatek: "Pod besedilom je gumb za izbiro prostega termina.",
  },
  {
    kljuc: "Cancel",
    naslov: "Odpoved termina",
    kdaj: "Ko termin odpoveš ti.",
    oznake: ["ime", "storitev", "datum", "ura", "telefon"],
    dodatek: "Pod besedilom je gumb za izbiro novega termina.",
  },
  {
    kljuc: "Reschedule",
    naslov: "Prestavljen termin",
    kdaj: "Ko termin prestaviš na drug dan ali uro.",
    oznake: ["ime", "storitev", "starDatum", "staraUra", "novDatum", "novaUra", "naslov", "telefon"],
    dodatek: "Pod besedilom se izpiše stari in novi termin ter gumb za koledar.",
  },
];

export default function Sporocila() {
  const [tab, setTab] = useState<"samodejna" | "novicke">("samodejna");
  const [s, setS] = useState<Nast | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setS(d.settings));
  }, []);

  async function save() {
    if (!s) return;
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!s) return <p className="text-sm text-ink/40">Nalagam …</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Sporočila</h1>
      <p className="mt-1 text-sm text-ink/50">
        Kaj stranke prejmejo po e-pošti — in kaj jim lahko pošlješ sama.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("samodejna")}
          className={tab === "samodejna" ? "btn-primary !py-2.5" : "btn-secondary !py-2.5"}
        >
          Samodejna sporočila
        </button>
        <button
          onClick={() => setTab("novicke")}
          className={tab === "novicke" ? "btn-primary !py-2.5" : "btn-secondary !py-2.5"}
        >
          Novičke
        </button>
      </div>

      {tab === "samodejna" ? (
        <>
          <div className="card mt-6 bg-belux-50/60">
            <p className="text-sm text-ink/70">
              V besedilu lahko uporabiš <strong>oznake v zavitih oklepajih</strong> — ob pošiljanju
              se zamenjajo s pravimi podatki. Prazna vrstica pomeni nov odstavek.
            </p>
            <p className="mt-2 text-sm text-ink/70">
              Roza ovojnica, tabela s podatki in gumbi so vedno enaki in jih ni treba pisati —
              sestavijo se sami, da sporočilo ne more razpasti.
            </p>
          </div>

          {SPOROCILA.map((m) => (
            <section key={m.kljuc} className="card mt-6">
              <h2 className="font-semibold text-belux-700">{m.naslov}</h2>
              <p className="mt-1 text-xs text-ink/50">{m.kdaj}</p>

              <div className="mt-4">
                <label className="label">Zadeva</label>
                <input
                  className="input"
                  value={s[`mail${m.kljuc}Subject`] ?? ""}
                  onChange={(e) => setS({ ...s, [`mail${m.kljuc}Subject`]: e.target.value })}
                />
              </div>

              <div className="mt-4">
                <label className="label">Besedilo</label>
                <textarea
                  className="input min-h-[130px]"
                  value={s[`mail${m.kljuc}Text`] ?? ""}
                  onChange={(e) => setS({ ...s, [`mail${m.kljuc}Text`]: e.target.value })}
                />
              </div>

              <p className="mt-3 text-xs text-ink/50">Na voljo:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.oznake.map((o) => (
                  <code
                    key={o}
                    className="rounded-md bg-belux-50 px-2 py-1 text-xs text-belux-700"
                  >
                    {`{${o}}`}
                  </code>
                ))}
              </div>
              <p className="mt-3 text-xs italic text-ink/40">{m.dodatek}</p>
            </section>
          ))}

          <div className="sticky bottom-4 mt-8 flex items-center justify-end gap-3">
            {saved && (
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                Shranjeno ✓
              </span>
            )}
            <button className="btn-primary shadow-lg" onClick={save}>Shrani besedila</button>
          </div>
        </>
      ) : (
        <Novicke />
      )}
    </div>
  );
}

function Novicke() {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [prejemniki, setPrejemniki] = useState<{ email: string }[] | null>(null);
  const [odjav, setOdjav] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/novicke")
      .then((r) => r.json())
      .then((d) => {
        setPrejemniki(d.prejemniki ?? []);
        setOdjav(d.odjav ?? 0);
      });
  }, []);

  async function poslji(test: boolean) {
    setMsg(null);

    if (!test) {
      const st = prejemniki?.length ?? 0;
      if (!confirm(`Pošljem novičko ${st} strankam?\n\nTega ni mogoče preklicati.`)) return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/novicke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, text, test }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: d.error || "Pošiljanje ni uspelo." });
      } else if (test) {
        setMsg({ ok: true, text: `Preizkus poslan na ${d.naslov}. Poglej v nabiralnik.` });
      } else {
        setMsg({
          ok: true,
          text: `Poslano ${d.poslano} strankam${d.napak ? `, ${d.napak} ni uspelo` : ""}.`,
        });
        setSubject("");
        setText("");
      }
    } catch {
      setMsg({ ok: false, text: "Napaka pri povezavi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card mt-6 bg-belux-50/60">
        <p className="text-sm text-ink/70">
          Novička gre <strong>vsem strankam z vpisanim e-naslovom</strong>. Vsaka dobi svoje
          sporočilo, zato med sabo ne vidijo naslovov.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Na dnu je povezava za odjavo. Odjava velja samo za novičke — potrditve in opomnike o
          terminih stranka prejema naprej.
        </p>
      </div>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-2xl font-semibold text-belux-700">{prejemniki?.length ?? "…"}</p>
            <p className="text-xs text-ink/50">prejemnic</p>
          </div>
          {odjav > 0 && (
            <div>
              <p className="text-2xl font-semibold text-ink/40">{odjav}</p>
              <p className="text-xs text-ink/50">odjavljenih</p>
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="label">Zadeva</label>
          <input
            className="input"
            placeholder="Npr. Nova storitev v studiu Be.Lux"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="label">Besedilo</label>
          <textarea
            className="input min-h-[220px]"
            placeholder={"Pozdravljena, {ime}!\n\nV studiu imamo novost …"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-ink/50">
            Z oznako <code className="rounded bg-belux-50 px-1.5 py-0.5 text-belux-700">{"{ime}"}</code>{" "}
            vsako nagovoriš po imenu. Prazna vrstica pomeni nov odstavek. Gumb za rezervacijo se
            doda sam.
          </p>
        </div>

        {msg && (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="btn-secondary"
            disabled={busy || !subject.trim() || !text.trim()}
            onClick={() => poslji(true)}
          >
            Pošlji preizkus sebi
          </button>
          <button
            className="btn-primary"
            disabled={busy || !subject.trim() || !text.trim() || !prejemniki?.length}
            onClick={() => poslji(false)}
          >
            {busy ? "Pošiljam …" : `Pošlji ${prejemniki?.length ?? 0} strankam`}
          </button>
        </div>

        <p className="mt-4 text-xs text-ink/40">
          Preizkus vedno pošlji prvi — pride na tvoj naslov in vidiš točno to, kar bodo videle
          stranke.
        </p>
      </section>
    </>
  );
}
