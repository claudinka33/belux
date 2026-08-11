import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatDateSl, minToHHMM } from "@/lib/time";
import CancelButton from "./ui";
import Logo from "@/components/Logo";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PreklicPage({ params }: { params: { token: string } }) {
  const booking = await db
    .select({
      id: tables.bookings.id,
      date: tables.bookings.date,
      startMin: tables.bookings.startMin,
      status: tables.bookings.status,
      firstName: tables.bookings.firstName,
      serviceName: tables.services.name,
    })
    .from(tables.bookings)
    .innerJoin(tables.services, eq(tables.bookings.serviceId, tables.services.id))
    .where(eq(tables.bookings.cancelToken, params.token))
    .get();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-belux-100 via-cream to-belux-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo size="text-3xl" /></div>
        <div className="card !p-8">
          {!booking && <p>Rezervacija ne obstaja.</p>}
          {booking && booking.status === "PREKLICANO" && (
            <>
              <h1 className="text-xl font-semibold">Termin je že preklican</h1>
              <p className="mt-2 text-sm text-ink/50">{booking.serviceName} · {formatDateSl(booking.date)} ob {minToHHMM(booking.startMin)}</p>
            </>
          )}
          {booking && booking.status !== "PREKLICANO" && (
            <>
              <h1 className="text-xl font-semibold">Preklic termina</h1>
              <p className="mt-3 text-sm text-ink/70">
                {booking.firstName}, res želiš preklicati termin?
              </p>
              <div className="mt-4 rounded-xl bg-belux-50 p-4 text-sm">
                <p className="font-semibold">{booking.serviceName}</p>
                <p className="mt-1 text-ink/60">{formatDateSl(booking.date)} ob {minToHHMM(booking.startMin)}</p>
              </div>
              <CancelButton token={params.token} />
            </>
          )}
          <Link href="/naroci" className="btn-secondary mt-6 w-full">Rezerviraj nov termin</Link>
        </div>
      </div>
    </div>
  );
}
