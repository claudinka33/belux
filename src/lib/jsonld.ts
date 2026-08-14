import { SITE_URL, SITE_NAME, OG_IMAGE, STUDIO, AREA_SERVED } from "./site";
import { minToHHMM } from "./time";

type Svc = { id: string; name: string; description: string; durationMin: number; price: number; categoryId: string };
type Cat = { id: string; name: string; parentId: string | null };
type Hours = { weekday: number; startMin: number; endMin: number };

// V bazi: 0 = ponedeljek … 6 = nedelja
const SCHEMA_DAYS = [
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
  "https://schema.org/Sunday",
];

/**
 * Strukturirani podatki za Google (rich results + lokalno iskanje).
 * Sestavi jih iz istih podatkov, kot jih Anita ureja v dashboardu,
 * zato so vedno usklajeni s stranjo.
 */
export function studioJsonLd({
  settings,
  services,
  categories,
  hours,
}: {
  settings: Record<string, string>;
  services: Svc[];
  categories: Cat[];
  hours: Hours[];
}) {
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Storitve";

  const sameAs = [settings.instagram, settings.facebook].filter(Boolean);

  const business = {
    "@type": "BeautySalon",
    "@id": `${SITE_URL}/#studio`,
    name: settings.studioName || SITE_NAME,
    alternateName: "Be.Lux",
    url: `${SITE_URL}/`,
    image: OG_IMAGE,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Kozmetični studio Be.Lux v Dobju pri Planini: podaljševanje trepalnic (klasične 1:1, hybrid, volumenske), laminacija in urejanje obrvi ter profesionalno in poročno ličenje.",
    telephone: STUDIO.phoneE164,
    ...(settings.email ? { email: settings.email } : {}),
    priceRange: "€€",
    currenciesAccepted: "EUR",
    address: {
      "@type": "PostalAddress",
      streetAddress: STUDIO.street,
      postalCode: STUDIO.postalCode,
      addressLocality: STUDIO.city,
      addressCountry: STUDIO.country,
    },
    areaServed: AREA_SERVED.map((name) => ({ "@type": "City", name })),
    ...(sameAs.length ? { sameAs } : {}),
    openingHoursSpecification: hours
      .filter((h) => h.weekday >= 0 && h.weekday <= 6)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[h.weekday],
        opens: minToHHMM(h.startMin),
        closes: minToHHMM(h.endMin),
      })),
    potentialAction: {
      "@type": "ReserveAction",
      name: "Rezerviraj termin",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/naroci`,
        inLanguage: "sl-SI",
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: "Termin v studiu Be.Lux" },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Cenik storitev",
      itemListElement: services.map((svc) => ({
        "@type": "Offer",
        name: svc.name,
        ...(svc.description ? { description: svc.description } : {}),
        price: String(svc.price),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/naroci?storitev=${svc.id}`,
        itemOffered: {
          "@type": "Service",
          name: svc.name,
          serviceType: catName(svc.categoryId),
          provider: { "@id": `${SITE_URL}/#studio` },
        },
      })),
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: settings.studioName || SITE_NAME,
    inLanguage: "sl-SI",
    publisher: { "@id": `${SITE_URL}/#studio` },
  };

  return { "@context": "https://schema.org", "@graph": [business, website] };
}
