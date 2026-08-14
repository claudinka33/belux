import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registracija",
  description: "Ustvari račun in si termine rezerviraj hitreje.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
