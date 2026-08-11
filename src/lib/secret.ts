// Rezervni ključ za podpisovanje sej, če NEXTAUTH_SECRET ni nastavljen v okolju.
// Za produkcijo priporočeno: nastavi NEXTAUTH_SECRET v Vercel → Settings → Environment Variables.
export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || "belux-fallback-secret-3f9c2a71d84e5b06-spremeni-me";
