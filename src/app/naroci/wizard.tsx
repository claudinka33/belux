"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  minToHHMM, formatDuration, formatPrice, formatDateSl, DAYS_SHORT, MONTHS,
} from "@/lib/time";

type Category = { id: string; name: string; order: number; parentId: string | null };
type Service = {
  id: string; name: string; description: string; durationMin: number;
  price: number; image: string | null; categoryId: string;
};

const STEPS = ["Storitev", "Datum in ura", "Vaši podatki", "Potrditev"];

export default function BookingWizard() {
  const params = useSearchParams();
  const { data: session } = useSession();

  const [step, setStep] = useState(0);
  const [cats, setCats] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);

  // koledar
  const today = new Date();
  const [ym, setYm] = useState<[number, number]>([today.getFullYear(), today.getMonth() + 1]);
  const [monthDays, setMonthDays] = useState<Record<string, boolean>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  // podatki
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", note: "" });
  const [hasGoogle, setHasGoogle] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | {
    serviceName: string; date: string; startMin: number;
    addToCalendarUrl: string; cancelUrl: string; price: number;
  }>(null);

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then((d) => {
      setCats(d.categories);
      setServices(d.services);
      const pre = params.get("storitev");
      if (pre) {
        const svc = d.services.find((x: Service) => x.id === pre);
        if (svc) {
          setService(svc);
          setStep(1);
        }
      }
    });
    fetch("/api/auth/providers").then((r) => r.json()).then((p) => setHasGoogle(Boolean(p?.google))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session) {
      const s = session as any;
      const [fn, ...rest] = (session.user?.name || "").split(" ");
      setForm((f) => ({
        ...f,
        firstName: f.firstName || s.firstName || fn || "",
        lastName: f.lastName || s.lastName || rest.join(" ") || "",
        email: f.email || session.user?.email || "",
        phone: f.phone || s.phone || "",
      }));
    }
  }, [session]);

  // naloži mesec
  useEffect(() => {
    if (!service || step !== 1) return;
    setMonthLoading(true);
    fetch(`/api/availability?serviceId=${service.id}&year=${ym[0]}&month=${ym[1]}`)
      .then((r) => r.json())
      .then((d) => setMonthDays(d.days || {}))
      .finally(() => setMonthLoading(false));
  }, [service, ym, step]);

  // naloži termine za dan
  useEffect(() => {
    if (!service || !date) return;
    setSlots(null);
    setSlot(null);
    fetch(`/api/availability?serviceId=${service.id}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []));
  }, [service, date]);

  const topCats = useMemo(() => cats.filter((c) => !c.parentId), [cats]);
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Service[] }> = [];
    for (const top of topCats) {
      const direct = services.filter((s) => s.categoryId === top.id);
      if (direct.length) out.push({ label: top.name, items: direct });
      for (const sub of cats.filter((c) => c.parentId === top.id)) {
        const items = services.filter((s) => s.categoryId === sub.id);
        if (items.length) out.push({ label: `${top.name} › ${sub.name}`, items });
      }
    }
    return out;
  }, [cats, services, topCats]);

  async function submit() {
    if (!service || !date || slot == null) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, date, startMin: slot, ...form }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Prišlo je do napake.");
        if (res.status === 409) {
          setStep(1);
          setDate(date); // osveži termine
          setSlots(null);
          fetch(`/api/availability?serviceId=${service.id}&date=${date}`)
            .then((r) => r.json())
            .then((x) => setSlots(x.slots || []));
        }
        return;
      }
      setDone({ serviceName: service.name, date, startMin: slot, price: service.price, ...d.booking });
    } finally {
      setSubmitting(false);
    }
  }

  // ------- USPEŠNA REZERVACIJA -------
  if (done) {
    return (
      <Shell step={4}>
        <div className="mx-auto max-w-lg py-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">✓</div>
          <h1 className="mt-6 text-3xl font-semibold">Termin je potrjen! 🎀</h1>
          <div className="card mt-8 text-left">
            <Row k="Storitev" v={done.serviceName} />
            <Row k="Datum" v={formatDateSl(done.date)} />
            <Row k="Ura" v={minToHHMM(done.startMin)} />
            <Row k="Cena" v={formatPrice(done.price)} />
          </div>
          <a href={done.addToCalendarUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
            📅 Dodaj v Google Koledar
          </a>
          <p className="mt-4 text-sm text-ink/50">
            Če termina ne moreš obiskati, ga lahko <a className="text-belux-600 underline" href={done.cancelUrl}>prekličeš tukaj</a>.
          </p>
          <Link href="/" className="btn-secondary mt-8">← Nazaj na domačo stran</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={step}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* KORAK 1: STORITEV */}
      {step === 0 && (
        <div>
          <h1 className="text-2xl font-semibold">Izbira storitve</h1>
          <div className="mt-6 space-y-4">
            {groups.map((g) => (
              <div key={g.label} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-belux-600"
                  onClick={() => setOpenCat(openCat === g.label ? null : g.label)}
                >
                  {g.label}
                  <svg className={`h-5 w-5 transition ${openCat === g.label ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openCat === g.label && (
                  <div className="space-y-3 border-t border-belux-100 bg-belux-50/40 p-4">
                    {g.items.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => { setService(svc); setStep(1); setDate(null); setSlot(null); }}
                        className={`flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-card ring-belux-300 transition hover:ring-2 ${service?.id === svc.id ? "ring-2" : ""}`}
                      >
                        {svc.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={svc.image} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-belux-100" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-belux-100 text-xl">💅</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug">{svc.name}</p>
                          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            {formatDuration(svc.durationMin)}
                          </span>
                          {svc.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink/50">{svc.description}</p>}
                        </div>
                        <p className="shrink-0 text-lg font-semibold text-belux-600">{formatPrice(svc.price)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KORAK 2: DATUM IN URA */}
      {step === 1 && service && (
        <div>
          <h1 className="text-2xl font-semibold">Izberite datum in uro</h1>
          <p className="mt-1 text-sm text-ink/50">
            {service.name} · {formatDuration(service.durationMin)} · {formatPrice(service.price)}
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            {/* koledar */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <button className="rounded-lg p-2 hover:bg-belux-50" onClick={() => setYm(([y, m]) => (m === 1 ? [y - 1, 12] : [y, m - 1]))}>‹</button>
                <p className="font-semibold">{MONTHS[ym[1] - 1]} {ym[0]}</p>
                <button className="rounded-lg p-2 hover:bg-belux-50" onClick={() => setYm(([y, m]) => (m === 12 ? [y + 1, 1] : [y, m + 1]))}>›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink/40">
                {DAYS_SHORT.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <MonthGrid ym={ym} days={monthDays} loading={monthLoading} selected={date} onPick={setDate} />
            </div>
            {/* ure */}
            <div className="card">
              <p className="mb-3 text-center font-semibold">Ura</p>
              {!date && <p className="py-10 text-center text-sm text-belux-500">Izberite datum</p>}
              {date && slots === null && <p className="py-10 text-center text-sm text-ink/40">Nalagam termine …</p>}
              {date && slots !== null && slots.length === 0 && (
                <p className="py-10 text-center text-sm text-ink/40">Za ta dan ni prostih terminov.</p>
              )}
              {date && slots !== null && slots.length > 0 && (
                <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                  {slots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSlot(t)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                        slot === t
                          ? "border-belux-500 bg-belux-500 text-white"
                          : "border-belux-200 bg-white hover:border-belux-400"
                      }`}
                    >
                      {minToHHMM(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KORAK 3: PODATKI */}
      {step === 2 && (
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold">Izpolnite podatke</h1>
          {!session && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-belux-50 p-4 text-sm">
              <span>Že imaš račun?</span>
              <button onClick={() => signIn(undefined, { callbackUrl: "/naroci" })} className="font-semibold text-belux-600 underline underline-offset-4">
                Prijavi se
              </button>
              {hasGoogle && (
                <button onClick={() => signIn("google", { callbackUrl: "/naroci" })} className="btn-secondary !px-4 !py-2 !text-xs">
                  <GoogleIcon /> Prijava z Googlom
                </button>
              )}
              <span className="text-ink/40">ali nadaljuj kot gost ↓</span>
            </div>
          )}
          {session && (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">
              Prijavljena kot <strong>{session.user?.email}</strong> — podatki so izpolnjeni samodejno.
            </p>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Ime *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Field label="Priimek *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            <Field label="E-naslov *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Telefon" type="tel" placeholder="031 234 567" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>
          <div className="mt-4">
            <label className="label">Opomba (neobvezno)</label>
            <textarea className="input min-h-[90px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {!session && (
            <p className="mt-4 text-xs text-ink/40">
              Namig: z <Link href="/registracija" className="text-belux-600 underline">registracijo</Link> ti naslednjič ne bo treba vpisovati podatkov.
            </p>
          )}
        </div>
      )}

      {/* KORAK 4: POTRDITEV */}
      {step === 3 && service && date && slot != null && (
        <div className="max-w-lg">
          <h1 className="text-2xl font-semibold">Potrditev termina</h1>
          <div className="card mt-6">
            <Row k="Storitev" v={service.name} />
            <Row k="Trajanje" v={formatDuration(service.durationMin)} />
            <Row k="Datum" v={formatDateSl(date)} />
            <Row k="Ura" v={`${minToHHMM(slot)} – ${minToHHMM(slot + service.durationMin)}`} />
            <Row k="Ime" v={`${form.firstName} ${form.lastName}`} />
            <Row k="E-naslov" v={form.email} />
            {form.phone && <Row k="Telefon" v={form.phone} />}
            <div className="mt-3 border-t border-belux-100 pt-3">
              <Row k="Cena" v={formatPrice(service.price)} big />
            </div>
          </div>
          <p className="mt-3 text-xs text-ink/40">Plačilo poteka v studiu ob obisku.</p>
        </div>
      )}

      {/* NAVIGACIJA */}
      <div className="mt-10 flex items-center justify-between">
        {step > 0 ? (
          <button className="btn-secondary" onClick={() => { setError(""); setStep(step - 1); }}>Nazaj</button>
        ) : <span />}
        {step < 3 && (
          <button
            className="btn-primary"
            disabled={
              (step === 0 && !service) ||
              (step === 1 && (slot == null || !date)) ||
              (step === 2 && (!form.firstName || !form.lastName || !/.+@.+\..+/.test(form.email)))
            }
            onClick={() => { setError(""); setStep(step + 1); }}
          >
            Naslednji korak
          </button>
        )}
        {step === 3 && (
          <button className="btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? "Potrjujem …" : "✨ Potrdi rezervacijo"}
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* roza stranska vrstica */}
      <aside className="hidden w-72 shrink-0 flex-col bg-gradient-to-b from-belux-500 to-belux-700 p-8 text-white lg:flex">
        <Logo light />
        <nav className="mt-14 space-y-7">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                i < step ? "bg-white/90 text-belux-700" : i === step ? "bg-belux-900/60 text-white ring-2 ring-white/70" : "bg-white/20 text-white/70"
              }`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={i === step ? "font-semibold" : "text-white/70"}>{label}</span>
            </div>
          ))}
        </nav>
        <div className="mt-auto text-sm text-white/80">
          <p className="font-medium text-white">Imate kakšno vprašanje?</p>
          <p className="mt-1">📞 040 888 438</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {/* mobilna glava */}
        <div className="flex items-center justify-between border-b border-belux-100 bg-white px-4 py-3 lg:hidden">
          <Logo size="text-xl" />
          <span className="rounded-full bg-belux-100 px-3 py-1 text-xs font-semibold text-belux-700">
            Korak {Math.min(step + 1, 4)}/4
          </span>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-8 lg:py-12">{children}</div>
      </main>
    </div>
  );
}

function MonthGrid({
  ym, days, loading, selected, onPick,
}: {
  ym: [number, number];
  days: Record<string, boolean>;
  loading: boolean;
  selected: string | null;
  onPick: (d: string) => void;
}) {
  const [year, month] = ym;
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<string | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];
  return (
    <div className={`mt-1 grid grid-cols-7 gap-1 ${loading ? "opacity-40" : ""}`}>
      {cells.map((d, i) =>
        d === null ? (
          <div key={i} />
        ) : (
          <button
            key={d}
            disabled={!days[d]}
            onClick={() => onPick(d)}
            className={`aspect-square rounded-lg text-sm font-medium transition ${
              selected === d
                ? "bg-belux-500 text-white"
                : days[d]
                ? "bg-belux-50 text-ink hover:bg-belux-200"
                : "cursor-not-allowed bg-transparent text-ink/20"
            }`}
          >
            {parseInt(d.slice(8))}
          </button>
        )
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-sm text-ink/50">{k}</span>
      <span className={big ? "text-xl font-semibold text-belux-600" : "font-medium"}>{v}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
