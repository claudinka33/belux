"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

function PrijavaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);
  const callbackUrl = params.get("callbackUrl") || "/";

  useEffect(() => {
    fetch("/api/auth/providers").then((r) => r.json()).then((p) => setHasGoogle(Boolean(p?.google))).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Napačen e-naslov ali geslo.");
    else router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-belux-100 via-cream to-belux-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="text-3xl" /></div>
        <form onSubmit={submit} className="card !p-8">
          <h1 className="text-center text-2xl font-semibold">Prijava</h1>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">E-naslov</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Geslo</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? "Prijavljam …" : "Prijava"}
          </button>
          {hasGoogle && (
            <button type="button" onClick={() => signIn("google", { callbackUrl })} className="btn-secondary mt-3 w-full">
              Prijava z Google računom
            </button>
          )}
          <p className="mt-6 text-center text-sm text-ink/50">
            Še nimaš računa?{" "}
            <Link href="/registracija" className="font-semibold text-belux-600 underline underline-offset-4">Registriraj se</Link>
          </p>
        </form>
        <p className="mt-6 text-center text-sm"><Link href="/" className="text-ink/50 hover:text-belux-600">← Nazaj na stran</Link></p>
      </div>
    </div>
  );
}

export default function Prijava() {
  return <Suspense><PrijavaForm /></Suspense>;
}
