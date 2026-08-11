"use client";

import { useEffect, useState, useCallback } from "react";
import { addDays, formatDateSl, minToHHMM, formatPrice, hhmmToMin } from "@/lib/time";

type B = {
  id: string; date: string; startMin: number; endMin: number; status: string;
  firstName: string; lastName: string; email: string; phone: string; note: string;
  serviceName: string; price: number;
};
type Service = { id: string; name: string; durationMin: number; price: number; active: boolean };

export default function Rezervacije() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" });
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 30));
  const [bookings, setBookings] = useState<B[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const load = useCallback(() => {
    setBookings(null);
    fetch(`/api/admin/bookings?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings));
  }, [from, to]);

  useEffect(load, [load]);
  useEffect(() => {
    fetch("/api/admin/services").then((r) => r.json()).then((d) => setServices(d.services.filter((s: Service) => s.active)));
  }, []);

  async function cancelBooking(id: string) {
    if (!confirm("Res prekličem to rezervacijo?")) return;
    await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "PREKLICANO" }),
    });
    load();
  }

  const byDate: Record<string, B[]> = {};
  for (const b of bookings || []) (byDate[b.date] ??= []).push(b);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Rezervacije</h1>
        <button className="btn-primary !py-2.5" onClick={() => setShowAdd(true)}>+ Dodaj termin</button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Od</label>
          <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Do</label>
          <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {bookings === null && <p className="mt-8 text-sm text-ink/40">Nalagam …</p>}
      {bookings !== null && bookings.length === 0 && (
        <div className="card mt-8 text-center text-sm text-ink/50">V tem obdobju ni rezervacij.</div>
      )}

      <div className="mt-6 space-y-8">
        {Object.entries(byDate).map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-3 font-semibold text-belux-700">{formatDateSl(date)}</h2>
            <div className="space-y-3">
              {list.map((b) => (
                <div key={b.id} className={`card flex flex-wrap items-center gap-4 ${b.status === "PREKLICANO" ? "opacity-50" : ""}`}>
                  <p className="w-24 text-lg font-semibold text-belux-600">{minToHHMM(b.startMin)}–{minToHHMM(b.endMin)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{b.serviceName}</p>
                    <p className="text-sm text-ink/50">
                      {b.firstName} {b.lastName}
                      {b.phone && <> · <a className="underline" href={`tel:${b.phone}`}>{b.phone}</a></>}
                      {b.email && <> · {b.email}</>}
                    </p>
                    {b.note && <p className="mt-1 text-xs italic text-ink/40">„{b.note}“</p>}
                  </div>
                  <p className="font-semibold">{formatPrice(b.price)}</p>
                  {b.status === "PREKLICANO" ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Preklicano</span>
                  ) : (
                    <button onClick={() => cancelBooking(b.id)} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                      Prekliči
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showAdd && <AddModal services={services} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddModal({ services, onClose, onSaved }: { services: Service[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" });
  const [f, setF] = useState({ serviceId: "", date: today, time: "09:00", firstName: "", lastName: "", phone: "", email: "", note: "" });
  const [error, setError] = useState("");
  const [canForce, setCanForce] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(force = false) {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, startMin: hhmmToMin(f.time), force }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(d.error || "Napaka.");
      setCanForce(Boolean(d.canForce));
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">Ročno dodaj termin</h2>
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {canForce && (
              <button className="ml-2 font-semibold underline" onClick={() => save(true)}>Vseeno dodaj</button>
            )}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Storitev *</label>
            <select className="input" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
              <option value="">— izberi —</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Datum *</label><input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><label className="label">Ura *</label><input type="time" className="input" step={300} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Ime</label><input className="input" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
            <div><label className="label">Priimek</label><input className="input" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Telefon</label><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><label className="label">E-naslov</label><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><label className="label">Opomba</label><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Prekliči</button>
          <button className="btn-primary" disabled={saving || !f.serviceId} onClick={() => save(false)}>
            {saving ? "Shranjujem …" : "Shrani"}
          </button>
        </div>
      </div>
    </div>
  );
}
