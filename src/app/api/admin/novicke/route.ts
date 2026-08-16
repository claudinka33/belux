import { NextResponse } from "next/server";
import { db, tables } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAllSettings, setSetting } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Prejemnik = { id: string; email: string; firstName: string };

/** Odjavljeni od novičk — id-ji strank so shranjeni v nastavitvah. */
function odjavljeni(s: Record<string, string>): string[] {
  return (s.novickeOdjave || "").split(",").map((x) => x.trim()).filter(Boolean);
}

async function seznam(): Promise<{ prejemniki: Prejemnik[]; odjav: number }> {
  const s = await getAllSettings();
  const off = odjavljeni(s);
  const vsi = await db.select().from(tables.clients).all();

  const videni: string[] = [];
  const prejemniki: Prejemnik[] = [];
  for (const c of vsi) {
    const mail = String(c.email || "").toLowerCase().trim();
    if (!mail || !mail.includes("@")) continue;
    if (off.includes(c.id)) continue;
    if (videni.includes(mail)) continue; // isti naslov samo enkrat
    videni.push(mail);
    prejemniki.push({ id: c.id, email: mail, firstName: c.firstName || "" });
  }
  return { prejemniki, odjav: off.length };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const { prejemniki, odjav } = await seznam();
  return NextResponse.json({ prejemniki, odjav });
}

/**
 * Pošiljanje novičke vsem strankam z e-naslovom.
 *
 * Vsaka stranka dobi svoje sporočilo (ne skupinsko), da med sabo ne vidijo
 * naslovov in da je nagovor oseben. Na dnu je povezava za odjavo — brez nje
 * obveščanje o novostih ni v skladu z zakonom, ponudniki pošte pa tako sporočilo
 * hitreje označijo za neželeno.
 *
 * Resend sprejme do 100 sporočil na zahtevo, zato pošiljamo po svežnjih.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Resend ni nastavljen." }, { status: 400 });

  const { subject, text, test } = await req.json();
  if (!subject?.trim()) return NextResponse.json({ error: "Vpiši zadevo." }, { status: 400 });
  if (!text?.trim()) return NextResponse.json({ error: "Vpiši besedilo." }, { status: 400 });

  const s = await getAllSettings();
  const from = process.env.EMAIL_FROM || `${s.studioName} <onboarding@resend.dev>`;
  const replyTo = process.env.EMAIL_REPLY_TO || s.adminEmail || "";

  const esc = (v: string) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const telo = (ime: string, odjavaUrl: string) => {
    const odstavki = String(text)
      .replace(/\{ime\}/g, ime || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
      .join("\n");

    return `
  <div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;color:#3b3b3b">
    <div style="background:#cf6d90;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${esc(s.studioName)}</h1>
    </div>
    <div style="border:1px solid #f3d3e0;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      ${odstavki}
      <p style="text-align:center;margin:28px 0">
        <a href="${SITE_URL}/naroci" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">Rezerviraj termin</a>
      </p>
      <p style="margin-top:28px;border-top:1px solid #f3d3e0;padding-top:14px;font-size:12px;color:#b0b0b0">
        To sporočilo ste prejeli kot stranka studia ${esc(s.studioName)}.<br/>
        Če novičk ne želite več, se lahko <a href="${odjavaUrl}" style="color:#b0b0b0">odjavite tukaj</a>.
      </p>
    </div>
  </div>`;
  };

  /* Preizkusno pošiljanje — samo Aniti, da vidi, kako sporočilo izgleda. */
  if (test) {
    const naslov = replyTo || s.adminEmail;
    if (!naslov) return NextResponse.json({ error: "Ni naslova za test." }, { status: 400 });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: naslov,
        subject: `[TEST] ${subject}`,
        html: telo("Anita", `${SITE_URL}/odjava/test`),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "Pošiljanje ni uspelo." }, { status: 502 });
    return NextResponse.json({ ok: true, test: true, poslano: 1, naslov });
  }

  const { prejemniki } = await seznam();
  if (prejemniki.length === 0) {
    return NextResponse.json({ error: "Nobena stranka nima vpisanega e-naslova." }, { status: 400 });
  }

  let poslano = 0;
  let napak = 0;

  for (let i = 0; i < prejemniki.length; i += 100) {
    const sveženj = prejemniki.slice(i, i + 100).map((p) => ({
      from,
      to: p.email,
      subject,
      html: telo(p.firstName, `${SITE_URL}/odjava/${p.id}`),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(sveženj),
      });
      if (res.ok) poslano += sveženj.length;
      else napak += sveženj.length;
    } catch {
      napak += sveženj.length;
    }
  }

  // zapomnimo si zadnjo poslano novičko, da se vidi v dashboardu
  await setSetting("novickeZadnja", new Date().toISOString().slice(0, 10));

  return NextResponse.json({ ok: true, poslano, napak });
}
