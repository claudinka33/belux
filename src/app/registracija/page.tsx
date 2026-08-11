"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function Registracija() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Napaka pri registraciji.");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/naroci");
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-belux-100 via-cream to-belux-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="text-3xl" /></div>
        <form onSubmit={submit} className="card !p-8">
          <h1 className="text-center text-2xl font-semibold">Registracija</h1>
          <p className="mt-2 text-center text-sm text-ink/50">Naslednjič se samo prijaviš — brez vpisovanja podatkov.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><label className="label">Ime *</label><input className="input" value={form.firstName} onChange={set("firstName")} required /></div>
            <div><label className="label">Priimek *</label><input className="input" value={form.lastName} onChange={set("lastName")} required /></div>
          </div>
          <div className="mt-4"><label className="label">E-naslov *</label><input className="input" type="email" value={form.email} onChange={set("email")} required /></div>
          <div className="mt-4"><label className="label">Telefon</label><input className="input" type="tel" placeholder="031 234 567" value={form.phone} onChange={set("phone")} /></div>
          <div className="mt-4"><label className="label">Geslo * (vsaj 6 znakov)</label><input className="input" type="password" value={form.password} onChange={set("password")} required minLength={6} /></div>
          <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Ustvarjam račun …" : "Ustvari račun"}</button>
          <p className="mt-6 text-center text-sm text-ink/50">
            Že imaš račun? <Link href="/prijava" className="font-semibold text-belux-600 underline underline-offset-4">Prijava</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
