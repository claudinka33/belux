"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateSl, minToHHMM, formatPrice } from "@/lib/time";

type C = {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  note: string; createdAt: string; visits: number; cancelled: number;
  lastVisit: string | null; nextVisit: string | null; totalSpent: number;
  lastService: string | null; daysSinceLast: number | null;
};
type H = {
  id: string; date: string; startMin: number; status: string; note: string;
  paid: boolean; serviceName: string; price: number;
};

type Filter = "vse" | "korekcija" | "nove" | "stalne";

export default function Stranke() {
  const [clients, setClients] = useState<C[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("vse");
  const [open, setOpen] = useState<C | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []));
  }, []);
  useEffect(load, [load]);

  const list = useMemo(() => {
    let out = clients ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((c) =>
        `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(needle)
      );
    }
    if (filter === "korekcija") {
      out = out.filter((c) => c.daysSinceLast !== null && c.daysSinceLast >= 21 && !c.nextVisit);
    } else if (filter === "nove") {
      out = out.filter((c) => c.visits <= 1);
    } else if (filter === "stalne") {
      out = out.filter((c) => c.visits >= 3);
    }
    return out;
  }, [clients, q, filter]);

  const due = (clients ?? []).filter(
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 21 && !c.nextVisit
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stranke</h1>
          <p className="mt-1 text-sm text-ink/50">
            {clients === null ? "Nalagam …" : `${clients.length} strank v kartoteki`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary !py-2.5" onClick={() => exportCsv(list)}>
            ⭳ Izvoz CSV
          </button>
          <button className="btn-primary !py-2.5" onClick={() => setShowAdd(true)}>
            + Dodaj stranko
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Išči po imenu, e-mailu ali telefonu …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === "vse"} onClick={() => setFilter("vse")}>Vse</Chip>
          <Chip active={filter === "korekcija"} onClick={() => setFilter("korekcija")}>
            Za korekcijo {due > 0 && <span className="ml-1 rounded-full bg-belux-600 px-1.5 text-[11px] text-white">{due}</span>}
          </Chip>
          <Chip active={filter === "nove"} onClick={() => setFilter("nove")}>Nove</Chip>
          <Chip active={filter === "stalne"} onClick={() => setFilter("stalne")}>Stalne</Chip>
        </div>
      </div>

      {filter === "korekcija" && (
        <p className="mt-4 rounded-xl border-l-4 border-belux-400 bg-belux-50 px-4 py-3 text-sm text-ink/70">
          Stranke, ki so bile zadnjič pred 3 tedni ali več in <strong>še nimajo naslednjega termina</strong>.
          Klik na telefon jih pokliče, klik na e-mail odpre sporočilo.
        </p>
      )}

      {clients !== null && list.length === 0 && (
        <div className="card mt-6 text-center text-sm text-ink/50">
          {clients.length === 0
            ? "Kartoteka je še prazna. Stranke se dodajo same ob prvi rezervaciji."
            : "Nobena stranka ne ustreza iskanju."}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {list.map((c) => (
          <ClientCard key={c.id} c={c} onOpen={() => setOpen(c)} />
        ))}
      </div>

      {open && <ClientDrawer client={open} onClose={() => setOpen(null)} onSaved={() => { load(); setOpen(null); }} />}
      {showAdd && <AddClient onClose={() => setShowAdd(false)} onSaved={() => { load(); setShowAdd(false); }} />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-belux-500 text-white" : "bg-white text-ink/60 hover:bg-belux-50"
      }`}
    >
      {children}
    </button>
  );
}

function ClientCard({ c, onOpen }: { c: C; onOpen: () => void }) {
  const initials = `${c.firstName[0] ?? "?"}${c.lastName[0] ?? ""}`.toUpperCase();
  const dueSoon = c.daysSinceLast !== null && c.daysSinceLast >= 21 && !c.nextVisit;

  return (
    <div className="card flex flex-wrap items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-belux-100 font-semibold text-belux-700">
        {initials}
      </div>

      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate font-semibold">
          {c.firstName} {c.lastName}
          {c.note && <span title="Ima beležko" className="ml-2 text-xs">📝</span>}
        </p>
        <p className="truncate text-sm text-ink/50">
          {c.lastVisit ? `Zadnjič ${formatDateSl(c.lastVisit, false)}` : "Še ni bila"}
          {c.lastService ? ` · ${c.lastService}` : ""}
        </p>
      </button>

      <div className="hidden text-center sm:block">
        <p className="text-lg font-semibold">{c.visits}</p>
        <p className="text-[11px] text-ink/50">obiskov</p>
      </div>
      <div className="hidden text-center sm:block">
        <p className="text-lg font-semibold text-belux-600">{formatPrice(c.totalSpent)}</p>
        <p className="text-[11px] text-ink/50">skupaj</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {c.nextVisit ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Naročena {formatDateSl(c.nextVisit, false)}
          </span>
        ) : dueSoon ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Za korekcijo · {c.daysSinceLast} dni
          </span>
        ) : null}
        {c.phone && (
          <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="rounded-lg bg-belux-50 px-3 py-2 text-sm" title={c.phone}>📞</a>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} className="rounded-lg bg-belux-50 px-3 py-2 text-sm" title={c.email}>✉️</a>
        )}
      </div>
    </div>
  );
}

function ClientDrawer({ client, onClose, onSaved }: { client: C; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: client.firstName, lastName: client.lastName,
    email: client.email, phone: client.phone, note: client.note,
  });
  const [history, setHistory] = useState<H[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients?id=${client.id}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }, [client.id]);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: client.id, ...form }),
    });
    setSaving(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Res izbrišem to stranko? Njeni termini ostanejo v rezervacijah.")) return;
    await fetch(`/api/admin/clients?id=${client.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-cream p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">{client.firstName} {client.lastName}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-ink/40 hover:text-ink">×</button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Mini label="Obiskov" value={String(client.visits)} />
          <Mini label="Skupaj" value={formatPrice(client.totalSpent)} />
          <Mini label="Preklicev" value={String(client.cancelled)} />
        </div>

        <div className="card mt-5">
          <h3 className="mb-3 font-semibold">Podatki</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Ime</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="label">Priimek</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><label className="label">E-mail</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Telefon</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="mt-3">
            <label className="label">Beležka (vidi jo samo Anita)</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Npr. alergija na lepilo, ima rada naravni videz, C-krivina 0.07 …"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={remove} className="text-sm text-red-500 hover:underline">Izbriši stranko</button>
            <button onClick={save} disabled={saving} className="btn-primary !py-2.5">
              {saving ? "Shranjujem …" : "Shrani"}
            </button>
          </div>
        </div>

        <h3 className="mb-3 mt-6 font-semibold">Zgodovina obiskov</h3>
        {history === null && <p className="text-sm text-ink/40">Nalagam …</p>}
        {history?.length === 0 && (
          <div className="card text-center text-sm text-ink/50">Še ni terminov.</div>
        )}
        <div className="space-y-2">
          {(history ?? []).map((h) => (
            <div key={h.id} className="card flex items-center gap-3 !p-4">
              <div className="w-20 shrink-0">
                <p className="text-sm font-semibold">{formatDateSl(h.date, false)}</p>
                <p className="text-xs text-ink/40">{minToHHMM(h.startMin)}</p>
              </div>
              <div className="min-w-0 flex-1 border-l border-belux-100 pl-3">
                <p className="truncate text-sm font-medium">{h.serviceName}</p>
                {h.note && <p className="truncate text-xs text-ink/50">{h.note}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-belux-600">{formatPrice(h.price)}</p>
                {h.status === "PREKLICANO" ? (
                  <span className="text-[11px] text-red-500">preklicano</span>
                ) : (
                  <span className={`text-[11px] ${h.paid ? "text-emerald-600" : "text-ink/40"}`}>
                    {h.paid ? "plačano" : "ni plačano"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center !p-4">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-ink/50">{label}</p>
    </div>
  );
}

function AddClient({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", note: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Napaka pri shranjevanju.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-cream p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">Nova stranka</h2>
        <p className="mt-1 text-sm text-ink/50">Vpiši vsaj e-mail ali telefon.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label className="label">Ime</label>
            <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><label className="label">Priimek</label>
            <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          <div><label className="label">E-mail</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Telefon</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="mt-3">
          <label className="label">Beležka</label>
          <textarea className="input min-h-[70px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary !py-2.5" onClick={onClose}>Prekliči</button>
          <button className="btn-primary !py-2.5" onClick={submit} disabled={saving}>
            {saving ? "Shranjujem …" : "Dodaj"}
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCsv(rows: C[]) {
  const head = ["Ime", "Priimek", "E-mail", "Telefon", "Obiskov", "Zadnji obisk", "Naslednji termin", "Skupaj EUR", "Beležka"];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((c) =>
    [c.firstName, c.lastName, c.email, c.phone, String(c.visits), c.lastVisit ?? "", c.nextVisit ?? "", c.totalSpent.toFixed(2), c.note]
      .map(esc)
      .join(";")
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...body].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `belux-stranke-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
