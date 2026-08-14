import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Studio Be.Lux — trepalnice, obrvi in ličenje | Dobje pri Planini",
    template: "%s | Studio Be.Lux",
  },
  description:
    "Podaljševanje trepalnic, laminacija in urejanje obrvi ter profesionalno ličenje v studiu Be.Lux, Dobje pri Planini (blizu Šentjurja in Celja). Rezerviraj termin na spletu.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "podaljševanje trepalnic",
    "trepalnice Šentjur",
    "trepalnice Celje",
    "klasične trepalnice 1:1",
    "volumenske trepalnice",
    "hybrid trepalnice",
    "laminacija obrvi",
    "urejanje obrvi",
    "barvanje obrvi",
    "profesionalno ličenje",
    "poročno ličenje",
    "kozmetični studio Dobje pri Planini",
    "Studio Be.Lux",
  ],
  category: "beauty",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "sl_SI",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Studio Be.Lux — trepalnice, obrvi in ličenje",
    description:
      "Podaljševanje trepalnic, laminacija obrvi in profesionalno ličenje v Dobju pri Planini. Spletno naročanje na termin, 24 ur na dan.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Studio Be.Lux — trepalnice, obrvi in make-up, Dobje pri Planini",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Be.Lux — trepalnice, obrvi in ličenje",
    description:
      "Podaljševanje trepalnic, laminacija obrvi in profesionalno ličenje v Dobju pri Planini. Rezerviraj termin na spletu.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: true, address: true, email: true },
};

export const viewport: Viewport = {
  themeColor: "#cf6d90",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
