"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { formatDateSl, minToHHMM, formatPrice } from "@/lib/time";

type B = {
  id: string; date: string; startMin: number; status: string;
  cancelToken: string; serviceName: string; price: number;
};

export default function MojiTermini() {
  const { status } = useSession();
  const [bookings, setBookings] = useState<B[] | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/bookings").then((r) => r.json()).then((d) => setBookings(d.bookings));
    }
  }, [status]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Moji termini</h1>
        {status === "unauthenticated" && (
          <p className="mt-6 text-ink/60">
            Za pregled terminov se <Link className="text-belux-600 underline" href="/prijava?callbackUrl=/moji-termini">prijavi</Link>.
          </p>
        )}
        {status === "authenticated" && bookings === null && <p className="mt-6 text-ink/40">Nalagam …</p>}
        {bookings?.length === 0 && (
          <div className="mt-6">
            <p className="text-ink/60">Zaenkrat še nimaš rezervacij.</p>
            <Link href="/naroci" className="btn-primary mt-4">Rezerviraj termin</Link>
          </div>
        )}
        <div className="mt-6 space-y-3">
          {bookings?.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{b.serviceName}</p>
                <p className="mt-0.5 text-sm text-ink/50">{formatDateSl(b.date)} ob {minToHHMM(b.startMin)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-belux-600">{formatPrice(b.price)}</span>
                {b.status === "PREKLICANO" ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Preklicano</span>
                ) : b.date >= today ? (
                  <Link href={`/preklic/${b.cancelToken}`} className="rounded-full bg-belux-100 px-3 py-1 text-xs font-medium text-belux-700 hover:bg-belux-200">
                    Prekliči
                  </Link>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Opravljeno</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
