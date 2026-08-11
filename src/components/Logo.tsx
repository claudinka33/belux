import Link from "next/link";

export default function Logo({ light = false, size = "text-2xl" }: { light?: boolean; size?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold ${size} ${light ? "text-white" : "text-ink"}`}>
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" aria-hidden>
        {/* stiliziran obraz z zaprtim očesom in trepalnicami */}
        <path d="M30 6c-8 1-14 8-14 17 0 7 3 12 3 17" stroke={light ? "#fff" : "#2f2a2d"} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M18 22c2.5-1.5 6.5-1.5 9 0" stroke={light ? "#fff" : "#2f2a2d"} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 26.5l-1.8 2M23 27.5l-1 2.4M26 27l0.6 2.4" stroke={light ? "#fff" : "#2f2a2d"} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M27 34c-1.5 1.2-4 1.2-5.5 0M26 37.5c-1 .8-2.8.8-3.8 0" stroke={light ? "#fff" : "#2f2a2d"} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 14c3-5 9-8 15-7" stroke={light ? "#f0a8c3" : "#cf6d90"} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>
        Be<span className="text-belux-500">.</span>Lux
      </span>
    </Link>
  );
}
