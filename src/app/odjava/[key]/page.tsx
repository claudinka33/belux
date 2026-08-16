import { getAllSettings, setSetting } from "@/lib/settings";
import { db, tables } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Odjava od novičk.
 *
 * Povezava je v vsaki novički. Odjava se zgodi šele ob kliku na gumb, ne ob
 * odprtju strani — nekateri poštni odjemalci povezave odpirajo sami in bi
 * stranko odjavili, ne da bi to hotela.
 */
export default async function Odjava({ params }: { params: { key: string } }) {
  const s = await getAllSettings();
  const id = params.key;

  const odjavljeni = (s.novickeOdjave || "").split(",").map((x) => x.trim()).filter(Boolean);
  const zeOdjavljen = odjavljeni.includes(id);

  const stranka = id === "test" ? null : await db.select().from(tables.clients).where(eq(tables.clients.id, id)).get();

  async function odjavi() {
    "use server";
    const nast = await getAllSettings();
    const seznam = (nast.novickeOdjave || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!seznam.includes(id)) seznam.push(id);
    await setSetting("novickeOdjave", seznam.join(","));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{s.studioName}</h1>

      {zeOdjavljen ? (
        <>
          <p className="mt-6 rounded-xl bg-belux-50 px-4 py-4 text-belux-700">
            Odjavljeni ste. Novičk ne boste več prejemali.
          </p>
          <p className="mt-4 text-sm text-ink/50">
            Obvestila o vaših terminih — potrditve, opomniki in odpovedi — prihajajo še naprej,
            saj se nanašajo na vaše rezervacije.
          </p>
        </>
      ) : !stranka && id !== "test" ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-4 text-red-700">
          Te povezave ne poznamo. Morda je bila že uporabljena.
        </p>
      ) : (
        <>
          <p className="mt-6 text-ink/70">
            Se želite odjaviti od novičk studia {s.studioName}?
          </p>
          <form action={odjavi} className="mt-6">
            <button type="submit" className="btn-primary w-full">
              Da, odjavi me
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/50">
            Obvestila o vaših terminih boste prejemali naprej.
          </p>
        </>
      )}

      <Link href="/" className="mt-10 text-sm text-belux-600 underline">
        Nazaj na stran
      </Link>
    </main>
  );
}
