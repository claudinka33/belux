"use client";

import { useState } from "react";

export default function Geslo() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [repeat, setRepeat] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setMsg(null);

    if (newPassword !== repeat) {
      setMsg({ ok: false, text: "Novi gesli se ne ujemata." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ ok: false, text: "Novo geslo mora imeti vsaj 8 znakov." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: "Geslo je spremenjeno. Ob naslednji prijavi uporabi novo." });
        setCurrent("");
        setNew("");
        setRepeat("");
      } else {
        setMsg({ ok: false, text: data.error || "Sprememba ni uspela." });
      }
    } catch {
      setMsg({ ok: false, text: "Napaka pri povezavi. Poskusi znova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Geslo</h1>
      <p className="mt-1 text-sm text-ink/50">
        Spremeni geslo za svojo prijavo. Vpliva samo na tvoj račun.
      </p>

      <section className="card mt-6">
        <div className="grid gap-4">
          <div>
            <label className="label">Trenutno geslo</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Novo geslo</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink/50">Najmanj 8 znakov.</p>
          </div>
          <div>
            <label className="label">Ponovi novo geslo</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>
        </div>

        {msg && (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              msg.ok ? "bg-belux-50 text-belux-700" : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-6">
          <button className="btn-primary shadow-lg" onClick={save} disabled={busy}>
            {busy ? "Shranjujem …" : "Shrani novo geslo"}
          </button>
        </div>
      </section>
    </div>
  );
}
