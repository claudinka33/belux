"use client";

import { useState } from "react";

export default function CancelButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function cancel() {
    setState("loading");
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const d = await res.json();
    if (res.ok) setState("done");
    else {
      setState("error");
      setMsg(d.error || "Napaka pri preklicu.");
    }
  }

  if (state === "done") {
    return <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">Termin je uspešno preklican. 💐</p>;
  }
  return (
    <>
      {state === "error" && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{msg}</p>}
      <button onClick={cancel} disabled={state === "loading"} className="btn-primary mt-5 w-full !bg-red-500 hover:!bg-red-600">
        {state === "loading" ? "Preklicujem …" : "Da, prekliči termin"}
      </button>
    </>
  );
}
