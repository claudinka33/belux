"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration, formatPrice } from "@/lib/time";

type Category = { id: string; name: string; order: number; parentId: string | null };
type Service = {
  id: string; name: string; description: string; durationMin: number;
  price: number; image: string | null; active: boolean; order: number; categoryId: string;
};

export default function Storitve() {
  const [cats, setCats] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [catModal, setCatModal] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/services").then((r) => r.json()).then((d) => {
      setCats(d.categories);
      setServices(d.services);
    });
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    if (!confirm("Res izbrišem to storitev? (Namesto brisanja jo lahko tudi samo skriješ.)")) return;
    await fetch("/api/admin/services", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function toggleActive(s: Service) {
    await fetch("/api/admin/services", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, active: !s.active }) });
    load();
  }

  const catName = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return "?";
    const p = c.parentId ? cats.find((x) => x.id === c.parentId) : null;
    return p ? `${p.name} › ${c.name}` : c.name;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Storitve in cenik</h1>
        <div className="flex gap-2">
          <button className="btn-secondary !py-2.5" onClick={() => setCatModal(true)}>Kategorije</button>
          <button className="btn-primary !py-2.5" onClick={() => setEditing({})}>+ Nova storitev</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {services.map((s) => (
          <div key={s.id} className={`card flex flex-wrap items-center gap-4 ${!s.active ? "opacity-50" : ""}`}>
            {s.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-belux-100" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-belux-100 text-xl">💅</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-ink/50">{catName(s.categoryId)} · {formatDuration(s.durationMin)}</p>
            </div>
            <p className="font-semibold text-belux-600">{formatPrice(s.price)}</p>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setEditing(s)} className="rounded-full bg-belux-100 px-3 py-1.5 font-medium text-belux-700 hover:bg-belux-200">Uredi</button>
              <button onClick={() => toggleActive(s)} className="rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-200">
                {s.active ? "Skrij" : "Pokaži"}
              </button>
              <button onClick={() => remove(s.id)} className="rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-600 hover:bg-red-100">Izbriši</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ServiceModal
          svc={editing}
          cats={cats}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {catModal && <CategoryModal cats={cats} onClose={() => setCatModal(false)} onChanged={load} />}
    </div>
  );
}

function ServiceModal({ svc, cats, onClose, onSaved }: {
  svc: Partial<Service>; cats: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: svc.name || "",
    description: svc.description || "",
    durationMin: svc.durationMin ?? 60,
    price: svc.price ?? 0,
    categoryId: svc.categoryId || cats[0]?.id || "",
    image: svc.image || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Slika naj bo manjša od 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // pomanjšaj sliko na 300×300
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 300;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setF((x) => ({ ...x, image: canvas.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError("");
    const method = svc.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/services", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: svc.id, ...f }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || "Napaka."); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">{svc.id ? "Uredi storitev" : "Nova storitev"}</h2>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-4">
          <div><label className="label">Ime storitve *</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Opis</label><textarea className="input min-h-[80px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Trajanje (minute) *</label>
              <input type="number" min={5} step={5} className="input" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: parseInt(e.target.value) || 0 })} />
              <p className="mt-1 text-xs text-ink/40">{formatDuration(f.durationMin || 0)}</p>
            </div>
            <div>
              <label className="label">Cena (€) *</label>
              <input type="number" min={0} step={0.5} className="input" value={f.price} onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="label">Kategorija *</label>
            <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              {cats.filter((c) => !c.parentId).map((top) => (
                <optgroup key={top.id} label={top.name}>
                  <option value={top.id}>{top.name}</option>
                  {cats.filter((c) => c.parentId === top.id).map((sub) => (
                    <option key={sub.id} value={sub.id}>&nbsp;&nbsp;› {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Slika storitve</label>
            <div className="flex items-center gap-4">
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-belux-200" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-belux-100 text-xl">💅</div>
              )}
              <input type="file" accept="image/*" onChange={onFile} className="text-sm" />
              {f.image && <button className="text-xs text-red-600 underline" onClick={() => setF({ ...f, image: "" })}>Odstrani</button>}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Prekliči</button>
          <button className="btn-primary" disabled={saving || !f.name || !f.categoryId} onClick={save}>
            {saving ? "Shranjujem …" : "Shrani"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ cats, onClose, onChanged }: { cats: Category[]; onClose: () => void; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");

  async function add() {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
    });
    if (res.ok) { setName(""); setParentId(""); onChanged(); }
  }
  async function remove(id: string) {
    setError("");
    const res = await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const d = await res.json();
    if (!res.ok) setError(d.error);
    else onChanged();
  }
  async function rename(c: Category) {
    const n = prompt("Novo ime kategorije:", c.name);
    if (!n) return;
    await fetch("/api/admin/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, name: n }) });
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">Kategorije</h2>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-2">
          {cats.filter((c) => !c.parentId).map((top) => (
            <div key={top.id}>
              <CatRow c={top} onRename={rename} onDelete={remove} />
              {cats.filter((c) => c.parentId === top.id).map((sub) => (
                <div key={sub.id} className="ml-6"><CatRow c={sub} onRename={rename} onDelete={remove} /></div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-belux-100 pt-4">
          <p className="mb-2 text-sm font-medium">Dodaj kategorijo</p>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Ime" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="input !w-40" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">glavna</option>
              {cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>pod: {c.name}</option>)}
            </select>
            <button className="btn-primary !px-4" onClick={add}>+</button>
          </div>
        </div>
        <div className="mt-6 text-right"><button className="btn-secondary" onClick={onClose}>Zapri</button></div>
      </div>
    </div>
  );
}

function CatRow({ c, onRename, onDelete }: { c: Category; onRename: (c: Category) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-belux-50 px-4 py-2.5">
      <span className="font-medium">{c.name}</span>
      <span className="flex gap-2 text-xs">
        <button className="text-belux-700 underline" onClick={() => onRename(c)}>Preimenuj</button>
        <button className="text-red-600 underline" onClick={() => onDelete(c.id)}>Izbriši</button>
      </span>
    </div>
  );
}
