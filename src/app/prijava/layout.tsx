import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prijava",
  description: "Prijava v uporabniški račun Studia Be.Lux.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
