import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db, tables } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { formatDuration, formatPrice } from "@/lib/time";
import { studioJsonLd } from "@/lib/jsonld";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Be.Lux — trepalnice, obrvi in ličenje | Dobje pri Planini",
  description:
    "Podaljševanje trepalnic (klasične 1:1, hybrid, volumenske), laminacija in urejanje obrvi ter profesionalno in poročno ličenje. Studio Be.Lux, Dobje pri Planini — rezerviraj termin na spletu.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const s = await getAllSettings();
  const cats = await db.select().from(tables.categories).orderBy(asc(tables.categories.order)).all();
  const svcs = await db
    .select()
    .from(tables.services)
    .where(eq(tables.services.active, true))
    .orderBy(asc(tables.services.order))
    .all();
  const hours = await db.select().from(tables.workingHours).all();
  const jsonLd = studioJsonLd({ settings: s, services: svcs, categories: cats, hours });

  const topCats = cats.filter((c) => !c.parentId);
  const servicesOf = (catId: string) => {
    const subIds = cats.filter((c) => c.parentId === catId).map((c) => c.id);
    return svcs.filter((x) => x.categoryId === catId || subIds.includes(x.categoryId));
  };

  return (
    <>
      {/* Strukturirani podatki za Google (BeautySalon + cenik + delovni čas) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
          <div className="relative mx-auto h-72 w-60 md:h-96 md:w-80">
            <div className="absolute inset-0 rounded-[3rem] bg-white/70 shadow-soft backdrop-blur" />
            <Image
              src="/belux-logo.png"
              alt="Logotip studia Be.Lux"
              width={769}
              height={1100}
              priority
              className="relative h-full w-full object-contain p-8"
            />
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

            <p className="mt-6 text-sm font-medium uppercase tracking-wider text-ink/40">
              Zaključena strokovna izobraževanja
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[
                "Podaljševanje trepalnic",
                "Russian Volume",
                "Laminacija obrvi",
                "Profesionalno ličenje",
              ].map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-belux-200 bg-white px-3 py-1.5 text-sm text-belux-700"
                >
                  {c}
                </li>
              ))}
            </ul>

            <p className="mt-6 font-medium text-belux-700">Anita · Studio Be.Lux</p>
          </div>
          <div className="order-1 md:order-2">
            <Image
              src="/anita.jpg"
              alt="Anita, ustanoviteljica studia Be.Lux, s certifikati za podaljševanje trepalnic, laminacijo obrvi in profesionalno ličenje"
              width={880}
              height={1100}
              sizes="(max-width: 768px) 100vw, 420px"
              className="mx-auto w-full max-w-sm rounded-2xl object-cover shadow-card"
              priority={false}
            />
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
