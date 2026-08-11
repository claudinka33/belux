import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Be.Lux — Studio za trepalnice, obrvi in make-up",
  description:
    "Studio Be.Lux, Dobje pri Planini. Podaljševanje trepalnic, laminacija obrvi in profesionalno ličenje. Spletno naročanje na termin.",
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
