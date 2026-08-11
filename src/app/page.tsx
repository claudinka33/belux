import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db, tables } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { formatDuration, formatPrice } from "@/lib/time";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getAllSettings();
  const cats = await db.select().from(tables.categories).orderBy(asc(tables.categories.order)).all();
  const svcs = await db
    .select()
    .from(tables.services)
    .where(eq(tables.services.active, true))
    .orderBy(asc(tables.services.order))
    .all();

  const topCats = cats.filter((c) => !c.parentId);
  const servicesOf = (catId: string) => {
    const subIds = cats.filter((c) => c.parentId === catId).map((c) => c.id);
    return svcs.filter((x) => x.categoryId === catId || subIds.includes(x.categoryId));
  };

  return (
    <>
      <SiteHeader />
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-belux-100 via-cream to-belux-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-belux-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-belux-300/30 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-belux-600">Studio Be.Lux</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{s.heroTitle}</h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">{s.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/naroci" className="btn-primary">✨ Rezerviraj termin</Link>
              <a href="#storitve" className="btn-secondary">Cenik storitev</a>
            </div>
            <p className="mt-6 text-sm text-ink/50">📍 {s.address} · 📞 {s.phone}</p>
          </div>
          <div className="relative mx-auto hidden h-80 w-80 md:block">
            <div className="absolute inset-0 rounded-[3rem] bg-white/70 shadow-soft backdrop-blur" />
            <svg viewBox="0 0 200 200" className="relative h-full w-full p-10" fill="none">
              <path d="M128 22c-34 4-58 34-58 70 0 30 12 50 12 72" stroke="#2f2a2d" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M76 92c11-7 28-7 39 0" stroke="#2f2a2d" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M83 111l-7 8M96 114l-4 10M109 112l3 10" stroke="#2f2a2d" strokeWidth="2" strokeLinecap="round" />
              <path d="M113 143c-7 5-17 5-24 0M110 158c-5 4-13 4-17 0" stroke="#2f2a2d" strokeWidth="2" strokeLinecap="round" />
              <path d="M60 56c12-21 38-33 62-28" stroke="#cf6d90" strokeWidth="2.4" strokeLinecap="round" />
              <text x="52" y="46" fontSize="15" fontFamily="Poppins" fill="#2f2a2d" transform="rotate(-35 52 46)">Be.Lux</text>
            </svg>
          </div>
        </div>
      </section>

      {/* PREDNOSTI */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:grid-cols-3">
        {[
          ["🗓️", "Spletno naročanje 24/7", "Prosti termini so vedno ažurni — rezerviraš v minuti."],
          ["💖", "Individualen pristop", "Vsaka storitev prilagojena tvojemu obrazu in željam."],
          ["📅", "Opomnik v koledarju", "Termin si z enim klikom dodaš v svoj Google Koledar."],
        ].map(([icon, title, text]) => (
          <div key={title} className="card text-center">
            <div className="text-3xl">{icon}</div>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-ink/60">{text}</p>
          </div>
        ))}
      </section>

      {/* STORITVE */}
      <section id="storitve" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-center text-3xl font-semibold">Storitve in cenik</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink/60">
          Izberi svojo storitev in si rezerviraj termin — hitro, enostavno in kadarkoli.
        </p>
        <div className="mt-10 space-y-10">
          {topCats.map((cat) => {
            const list = servicesOf(cat.id);
            if (list.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-belux-700">
                  <span className="h-px w-8 bg-belux-300" /> {cat.name}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {list.map((svc) => (
                    <div key={svc.id} className="card flex items-center gap-4">
                      {svc.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={svc.image} alt={svc.name} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-belux-100" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-belux-100 text-2xl">💅</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{svc.name}</p>
                        <p className="mt-0.5 text-xs text-ink/50">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{formatDuration(svc.durationMin)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-belux-600">{formatPrice(svc.price)}</p>
                        <Link href={`/naroci?storitev=${svc.id}`} className="text-xs font-medium text-belux-500 underline-offset-4 hover:underline">
                          Rezerviraj →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <Link href="/naroci" className="btn-primary">Naroči se na termin</Link>
        </div>
      </section>

      {/* O NAS */}
      <section id="o-nas" className="bg-belux-50/60 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <h2 className="text-3xl font-semibold">O meni</h2>
            <p className="mt-4 leading-8 text-ink/70">{s.aboutText}</p>
            <p className="mt-6 font-medium text-belux-700">Anita · Studio Be.Lux</p>
          </div>
          <div className="order-1 mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-br from-belux-200 to-belux-400 text-7xl shadow-soft md:order-2">
            🌸
          </div>
        </div>
      </section>

      {/* LOKACIJA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-3xl font-semibold">Kje nas najdeš?</h2>
        <p className="mt-3 text-ink/60">{s.address}</p>
        <a
          className="btn-secondary mt-6"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}
        >
          🗺️ Odpri v Google Zemljevidih
        </a>
      </section>

      <SiteFooter s={s} />
    </>
  );
}
