"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Logo from "@/components/Logo";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "Pregled", icon: "🏠" },
  { href: "/admin/rezervacije", label: "Rezervacije", icon: "📋" },
  { href: "/admin/storitve", label: "Storitve in cenik", icon: "💅" },
  { href: "/admin/urnik", label: "Delovni čas", icon: "🕐" },
  { href: "/admin/nastavitve", label: "Nastavitve", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = NAV.map((n) => {
    const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
          active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{n.icon}</span> {n.label}
      </Link>
    );
  });

  return (
    <div className="flex min-h-screen bg-belux-50/50">
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-belux-600 to-belux-800 p-5 lg:flex">
        <div className="px-2 py-3"><Logo light /></div>
        <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-white/50">Dashboard</p>
        <nav className="space-y-1">{nav}</nav>
        <div className="mt-auto space-y-1">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            🌐 Poglej stran
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            👋 Odjava
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-belux-100 bg-white px-4 py-3 lg:hidden">
          <Logo size="text-xl" />
          <button onClick={() => setOpen(!open)} className="rounded-lg bg-belux-100 px-3 py-2 text-sm font-medium text-belux-700">
            Meni
          </button>
        </div>
        {open && (
          <div className="space-y-1 bg-belux-700 p-4 lg:hidden">{nav}</div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
