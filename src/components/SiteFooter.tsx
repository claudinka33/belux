import Logo from "./Logo";

export default function SiteFooter({ s }: { s: Record<string, string> }) {
  return (
    <footer id="kontakt" className="mt-20 bg-belux-900 text-belux-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 text-sm text-belux-200">
            Trepalnice · Obrvi · Make-up
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Kontakt</h3>
          <p className="text-sm leading-7">
            {s.studioName}
            <br />
            {s.address}
            <br />
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline decoration-belux-400 underline-offset-4">
              {s.phone}
            </a>
            {s.email && (
              <>
                <br />
                <a href={`mailto:${s.email}`} className="underline decoration-belux-400 underline-offset-4">{s.email}</a>
              </>
            )}
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Naročanje</h3>
          <p className="text-sm leading-7">
            Termin si enostavno rezerviraš prek spletne strani — na voljo 24/7.
          </p>
          <a href="/naroci" className="btn-primary mt-4 !bg-white !text-belux-800 hover:!bg-belux-100">
            Naroči se
          </a>
        </div>
      </div>
      <div className="border-t border-belux-800 py-4 text-center text-xs text-belux-300">
        © {new Date().getFullYear()} {s.studioName}. Vse pravice pridržane.
        <span className="mx-2 text-belux-700">·</span>
        <a href="/admin" rel="nofollow" className="text-belux-400 transition hover:text-belux-200">
          Za osebje
        </a>
      </div>
    </footer>
  );
}
