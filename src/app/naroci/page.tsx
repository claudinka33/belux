import type { Metadata } from "next";
import { Suspense } from "react";
import BookingWizard from "./wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Naročanje na termin — trepalnice, obrvi, ličenje",
  description:
    "Rezerviraj termin v studiu Be.Lux v treh korakih: izberi storitev, prost datum in uro. Potrditev takoj, preklic ali prestavitev možna do 24 ur pred terminom.",
  alternates: { canonical: "/naroci" },
  openGraph: {
    title: "Rezerviraj termin — Studio Be.Lux",
    description: "Izberi storitev, prost datum in uro. Spletno naročanje na voljo 24 ur na dan.",
    url: "/naroci",
  },
};

export default function NarociPage() {
  return (
    <Suspense>
      <BookingWizard />
    </Suspense>
  );
}
