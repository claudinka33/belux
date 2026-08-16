"use client";
import Link from "next/link";
import Logo from "./Logo";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function SiteHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isAdmin = (session as any)?.role === "ADMIN";

  const nav = (
    <>
      <Link href="/#storitve" className="hover:text-belux-600" onClick={() => setOpen(false)}>Storitve</Link>
      <Link href="/#o-nas" className="hover:text-belux-600" onClick={() => setOpen(false)}>O meni</Link>
      <Link href="/#kontakt" className="hover:text-belux-600" onClick={() => setOpen(false)}>Kontakt</Link>
      {session ? (
        <>
          <Link href="/moji-termini" className="hover:text-belux-600" onClick={() => setOpen(false)}>Moji termini</Link>
          {isAdmin && <Link href="/admin" className="hover:text-belux-600" onClick={() => setOpen(false)}>Dashboard</Link>}
          <button onClick={() => signOut({ callbackUrl: "/" })} className="text-left hover:text-belux-600">Odjava</button>
        </>
      ) : (
        <Link href="/prijava" className="hover:text-belux-600" onClick={() => setOpen(false)}>Prijava</Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-belux-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {nav}
          <Link href="/naroci" className="btn-primary !px-5 !py-2.5">Naroči se</Link>
        </nav>
        <button
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Meni"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-belux-100 bg-white px-6 py-4 text-sm font-medium md:hidden">
          {nav}
          <Link href="/naroci" className="btn-primary" onClick={() => setOpen(false)}>Naroči se</Link>
        </div>
      )}
    </header>
  );
}
