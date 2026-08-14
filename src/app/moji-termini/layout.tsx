import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moji termini",
  description: "Pregled tvojih rezervacij v studiu Be.Lux.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
