import Link from "next/link";
import Image from "next/image";

/**
 * Znak Be.Lux — izrez očesa iz originalnega logotipa.
 * Pri majhnih velikostih (glava, noga) je celoten obraz preveč drobno risan,
 * zato uporabimo detajl očesa in ob njem napis Be.Lux.
 */
export default function Logo({ light = false, size = "text-2xl" }: { light?: boolean; size?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 font-semibold ${size} ${light ? "text-white" : "text-ink"}`}
    >
      <Image
        src={light ? "/belux-mark-white.png" : "/belux-mark.png"}
        alt=""
        width={199}
        height={220}
        priority
        aria-hidden
        className="h-9 w-auto"
      />
      <span>
        Be<span className="text-belux-500">.</span>Lux
      </span>
    </Link>
  );
}
