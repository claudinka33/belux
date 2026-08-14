import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preklic termina",
  description: "Preklic rezerviranega termina v studiu Be.Lux.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
