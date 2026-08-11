"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateSl, minToHHMM, formatPrice, addDays } from "@/lib/time";

type B = {
  id: string; date: string; startMin: number; endMin: number; status: string;
  firstName: string; lastName: string; phone: string; serviceName: string; price: number;
};

export default function AdminHome() {
  const [bookings, setBookings] = useState<B[] | null>(null);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" });

  useEffect(() => {
    fetch(`/api/admin/bookings?from=${today}&to=${addDays(today, 14)}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings));
  }, [today]);

  const active = (bookings || []).filter((b) => b.status === "POTRJENO");
  const todays = active.filter((b) => b.date === today);
  const upcoming = active.filter((b) => b.date > today);
  const revenue = todays.reduce((s, b) => s + b.price, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pozdravljena, Anita! 🌸</h1>
      <p className="mt-1 text-sm text-ink/50">{formatDateSl(today)}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Današnji termini" value={String(todays.length)} icon="📅" />
        <Stat label="Prihodnjih 14 dni" value={String(upcoming.length)} icon="📈" />
        <Stat label="Današnji promet" value={formatPrice(revenue)} icon="💶" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Danes</h2>
          {bookings === null && <p className="text-sm text-ink/40">Nalagam …</p>}
          {bookings !== null && todays.length === 0 && (
            <div className="card text-center text-sm text-ink/50">Danes ni rezervacij. ☕</div>
          )}
          <div className="space-y-3">
            {todays.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Prihajajoči termini</h2>
          {bookings !== null && upcoming.length === 0 && (
            <div className="card text-center text-sm text-ink/50">Ni prihajajočih rezervacij.</div>
          )}
          <div className="space-y-3">
            {upcoming.slice(0, 8).map((b) => <BookingCard key={b.id} b={b} withDate />)}
          </div>
          {upcoming.length > 8 && (
            <Link href="/admin/rezervacije" className="mt-3 inline-block text-sm font-medium text-belux-600 underline underline-offset-4">
              Vse rezervacije →
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-belux-100 text-2xl">{icon}</div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-ink/50">{label}</p>
      </div>
    </div>
  );
}

function BookingCard({ b, withDate }: { b: B; withDate?: boolean }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-16 shrink-0 text-center">
        <p className="text-lg font-semibold text-belux-600">{minToHHMM(b.startMin)}</p>
        {withDate && <p className="text-[11px] text-ink/40">{b.date.slice(8)}.{b.date.slice(5, 7)}.</p>}
      </div>
      <div className="min-w-0 flex-1 border-l border-belux-100 pl-4">
        <p className="truncate font-medium">{b.serviceName}</p>
        <p className="truncate text-sm text-ink/50">
          {b.firstName} {b.lastName}{b.phone ? ` · ${b.phone}` : ""}
        </p>
      </div>
      <p className="shrink-0 font-semibold text-belux-600">{formatPrice(b.price)}</p>
    </div>
  );
}
