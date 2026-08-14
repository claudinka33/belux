/**
 * Osnovni podatki o strani in studiu — uporabljeni za SEO metapodatke,
 * sitemap, robots.txt in strukturirane podatke (JSON-LD).
 *
 * NEXT_PUBLIC_SITE_URL lahko nastaviš v Vercelu, če se domena kdaj spremeni.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  "https://belux.si"
).replace(/\/+$/, "");

export const SITE_NAME = "Studio Be.Lux";

/** Slika za predogled ob deljenju (Facebook, Instagram, WhatsApp, Viber, Google). */
export const OG_IMAGE = `${SITE_URL}/belux-og.png`;

/** Naslov studia — razbit po delih za strukturirane podatke. */
export const STUDIO = {
  street: "Presečno 19a",
  postalCode: "3224",
  city: "Dobje pri Planini",
  country: "SI",
  phoneDisplay: "040 888 438",
  phoneE164: "+38640888438",
};

/** Kraji v okolici — uporabljeno v JSON-LD (areaServed) za lokalno iskanje. */
export const AREA_SERVED = [
  "Dobje pri Planini",
  "Šentjur",
  "Celje",
  "Planina pri Sevnici",
  "Rogaška Slatina",
  "Šmarje pri Jelšah",
  "Laško",
  "Štore",
];
