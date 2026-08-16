import { getAllSettings } from "./settings";
import { formatDateSl, minToHHMM, formatPrice, gcalDatesParam } from "./time";
import { SITE_URL } from "./site";

type BookingInfo = {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  firstName: string;
  email: string;
  cancelToken: string;
  serviceName: string;
  price: number;
};

/**
 * Naslov, na katerega pade odgovor stranke.
 *
 * Pošiljatelj (from) je info@belux.si, ker mora biti na potrjeni domeni,
 * odgovore pa Anita bere v Gmailu. Vrednost pride iz EMAIL_REPLY_TO,
 * sicer se uporabi adminEmail iz nastavitev. Če ni ne enega ne drugega,
 * se polje izpusti in odgovor gre na from.
 */
function replyTo(s: Record<string, string>): { reply_to?: string } {
  const addr = process.env.EMAIL_REPLY_TO || s.adminEmail || "";
  return addr ? { reply_to: addr } : {};
}


/* ------------------------------------------------------------------ *
 *  Besedila, ki jih ureja Anita
 * ------------------------------------------------------------------ */

/** Prepreči, da bi znak iz besedila razbil sporočilo. */
function esc(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Zamenja oznake v zavitih oklepajih: {ime}, {datum} … */
export function fill(template: string, vars: Record<string, string | number>): string {
  return String(template ?? "").replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m
  );
}

/** Besedilo v odstavke. Prazna vrstica pomeni nov odstavek. */
function paragraphs(text: string, vars: Record<string, string | number>): string {
  return fill(text, vars)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export function gcalLink(b: BookingInfo, studioName: string, address: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.serviceName} — ${studioName}`,
    dates: gcalDatesParam(b.date, b.startMin, b.endMin),
    details: `Termin v studiu ${studioName}.`,
    location: address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function sendBookingEmail(b: BookingInfo, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !b.email) return;
  const s = await getAllSettings();
  const cancelUrl = `${baseUrl}/preklic/${b.cancelToken}`;
  const calUrl = gcalLink(b, s.studioName, s.address);
  const vars = {
    ime: b.firstName, storitev: b.serviceName, studio: s.studioName,
    datum: formatDateSl(b.date), ura: minToHHMM(b.startMin),
    cena: formatPrice(b.price), naslov: s.address, telefon: s.phone, ure: s.cancelHours,
  };
  const html = `
  <div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;color:#3b3b3b">
    <div style="background:#cf6d90;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${s.studioName}</h1>
    </div>
    <div style="border:1px solid #f3d3e0;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      ${paragraphs(s.mailBookingText, vars)}
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#9b9b9b">Storitev</td><td style="text-align:right"><strong>${b.serviceName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#9b9b9b">Datum</td><td style="text-align:right"><strong>${formatDateSl(b.date)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#9b9b9b">Ura</td><td style="text-align:right"><strong>${minToHHMM(b.startMin)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#9b9b9b">Cena</td><td style="text-align:right"><strong>${formatPrice(b.price)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#9b9b9b">Lokacija</td><td style="text-align:right">${s.address}</td></tr>
      </table>
      <p style="text-align:center;margin:24px 0">
        <a href="${calUrl}" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">📅 Dodaj v Google Koledar</a>
      </p>
      <p style="font-size:13px;color:#9b9b9b">Termin lahko prekličete do ${s.cancelHours} h prej: <a href="${cancelUrl}" style="color:#cf6d90">preklic termina</a>.<br/>Za kasnejše spremembe pokličite ${s.phone}.</p>
    </div>
  </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${s.studioName} <onboarding@resend.dev>`,
        to: b.email,
        ...replyTo(s),
        subject: fill(s.mailBookingSubject, { ...vars, datum: formatDateSl(b.date, false) }),
        html,
      }),
    });
  } catch {
    /* e-mail ni kritičen */
  }
}

/* ------------------------------------------------------------------ *
 *  Skupna ovojnica in pošiljanje
 * ------------------------------------------------------------------ */

function shell(studioName: string, inner: string): string {
  return `
  <div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;color:#3b3b3b">
    <div style="background:#cf6d90;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${studioName}</h1>
    </div>
    <div style="border:1px solid #f3d3e0;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      ${inner}
    </div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const s = await getAllSettings();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${s.studioName} <onboarding@resend.dev>`,
        to,
        ...replyTo(s),
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false; // e-mail ni kritičen za delovanje rezervacije
  }
}

/** Opomnik dan pred terminom. */
export async function sendReminderEmail(b: {
  date: string; startMin: number; firstName: string; email: string;
  serviceName: string; price: number; cancelToken: string;
}) {
  const s = await getAllSettings();
  if (s.emailReminder === "0") return false;
  const vars = {
    ime: b.firstName, storitev: b.serviceName, studio: s.studioName,
    datum: formatDateSl(b.date), ura: minToHHMM(b.startMin),
    cena: formatPrice(b.price), naslov: s.address, telefon: s.phone,
  };
  const html = shell(
    s.studioName,
    `${paragraphs(s.mailReminderText, vars)}
     <table style="width:100%;border-collapse:collapse">
       <tr><td style="padding:6px 0;color:#9b9b9b">Storitev</td><td style="text-align:right"><strong>${b.serviceName}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Datum</td><td style="text-align:right"><strong>${formatDateSl(b.date)}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Ura</td><td style="text-align:right"><strong>${minToHHMM(b.startMin)}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Kje</td><td style="text-align:right">${s.address}</td></tr>
     </table>
     <p style="font-size:13px;color:#9b9b9b;margin-top:20px">Če ti termin ne ustreza, ga lahko
       <a href="${SITE_URL}/preklic/${b.cancelToken}" style="color:#cf6d90">prekličeš tukaj</a>
       ali pokličeš na ${s.phone}.</p>`
  );
  return send(b.email, fill(s.mailReminderSubject, vars), html);
}

/** Zahvala po terminu z vabilom na naslednji obisk. */
export async function sendThankYouEmail(b: {
  firstName: string; email: string; serviceName: string;
}) {
  const s = await getAllSettings();
  if (s.emailThanks === "0") return false;
  const vars = { ime: b.firstName, storitev: b.serviceName, studio: s.studioName, telefon: s.phone, naslov: s.address };
  const html = shell(
    s.studioName,
    `${paragraphs(s.mailThanksText, vars)}
     <p style="text-align:center;margin:24px 0">
       <a href="${SITE_URL}/naroci" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">Rezerviraj naslednji termin</a>
     </p>
     <p style="font-size:13px;color:#9b9b9b">Če vam je bilo pri nas všeč, bo vaša ocena na Googlu
       ogromno pomenila. Hvala!</p>`
  );
  return send(b.email, fill(s.mailThanksSubject, vars), html);
}

/** Vabilo na korekcijo, ko je od zadnjega obiska minilo dovolj časa. */
export async function sendFollowUpEmail(b: {
  firstName: string; email: string; weeks: number;
}) {
  const s = await getAllSettings();
  if (s.emailFollowUp === "0") return false;
  const vars = { ime: b.firstName, tedni: b.weeks, studio: s.studioName, telefon: s.phone, naslov: s.address };
  const html = shell(
    s.studioName,
    `${paragraphs(s.mailFollowUpText, vars)}
     <p style="text-align:center;margin:24px 0">
       <a href="${SITE_URL}/naroci" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">Izberi prost termin</a>
     </p>
     <p style="font-size:13px;color:#9b9b9b">Lahko pa se enostavno oglasite na ${s.phone}.</p>`
  );
  return send(b.email, fill(s.mailFollowUpSubject, vars), html);
}

/** Obvestilo stranki, kadar termin prekliče Anita. */
export async function sendCancellationEmail(b: {
  date: string; startMin: number; firstName: string; email: string; serviceName: string;
}) {
  const s = await getAllSettings();
  const vars = {
    ime: b.firstName, storitev: b.serviceName, studio: s.studioName,
    datum: formatDateSl(b.date), ura: minToHHMM(b.startMin), telefon: s.phone, naslov: s.address,
  };
  const html = shell(
    s.studioName,
    `${paragraphs(s.mailCancelText, vars)}
     <p style="text-align:center;margin:24px 0">
       <a href="${SITE_URL}/naroci" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">Izberi nov termin</a>
     </p>
     <p style="font-size:13px;color:#9b9b9b">Za dogovor lahko pokličete na ${s.phone}.</p>`
  );
  return send(b.email, fill(s.mailCancelSubject, vars), html);
}

/** Obvestilo Aniti o novi rezervaciji. */
export async function notifyAdminNewBooking(b: {
  date: string; startMin: number; firstName: string; lastName: string;
  phone: string; email: string; serviceName: string; price: number;
}) {
  const s = await getAllSettings();
  if (!s.adminEmail || s.emailAdminNotify === "0") return false;
  const html = shell(
    s.studioName,
    `<p><strong>Nova rezervacija</strong> 🎉</p>
     <table style="width:100%;border-collapse:collapse">
       <tr><td style="padding:6px 0;color:#9b9b9b">Stranka</td><td style="text-align:right"><strong>${b.firstName} ${b.lastName}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Storitev</td><td style="text-align:right">${b.serviceName}</td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Kdaj</td><td style="text-align:right"><strong>${formatDateSl(b.date)} ob ${minToHHMM(b.startMin)}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Telefon</td><td style="text-align:right">${b.phone || "—"}</td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">E-mail</td><td style="text-align:right">${b.email || "—"}</td></tr>
       <tr><td style="padding:6px 0;color:#9b9b9b">Cena</td><td style="text-align:right">${formatPrice(b.price)}</td></tr>
     </table>
     <p style="text-align:center;margin:24px 0">
       <a href="${SITE_URL}/admin/rezervacije" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">Odpri dashboard</a>
     </p>`
  );
  return send(s.adminEmail, `Nova rezervacija: ${b.firstName} ${b.lastName}, ${formatDateSl(b.date, false)}`, html);
}

/** Obvestilo stranki, da je termin prestavljen. */
export async function sendRescheduleEmail(b: {
  firstName: string; email: string; serviceName: string;
  oldDate: string; oldStartMin: number;
  newDate: string; newStartMin: number;
  cancelToken: string;
}) {
  const s = await getAllSettings();
  const vars = {
    ime: b.firstName, storitev: b.serviceName, studio: s.studioName,
    starDatum: formatDateSl(b.oldDate), staraUra: minToHHMM(b.oldStartMin),
    novDatum: formatDateSl(b.newDate), novaUra: minToHHMM(b.newStartMin),
    naslov: s.address, telefon: s.phone,
  };
  const html = shell(
    s.studioName,
    `${paragraphs(s.mailRescheduleText, vars)}
     <table style="width:100%;border-collapse:collapse;margin:16px 0">
       <tr><td style="padding:8px 0;color:#9b9b9b">Prej</td>
           <td style="text-align:right;color:#9b9b9b;text-decoration:line-through">${formatDateSl(b.oldDate)} ob ${minToHHMM(b.oldStartMin)}</td></tr>
       <tr><td style="padding:8px 0;color:#9b9b9b">Novi termin</td>
           <td style="text-align:right"><strong style="color:#cf6d90;font-size:16px">${formatDateSl(b.newDate)} ob ${minToHHMM(b.newStartMin)}</strong></td></tr>
       <tr><td style="padding:8px 0;color:#9b9b9b">Kje</td><td style="text-align:right">${s.address}</td></tr>
     </table>
     <p style="text-align:center;margin:24px 0">
       <a href="${gcalLink({
         id: "", date: b.newDate, startMin: b.newStartMin, endMin: b.newStartMin + 60,
         firstName: b.firstName, email: b.email, cancelToken: b.cancelToken,
         serviceName: b.serviceName, price: 0,
       }, s.studioName, s.address)}" style="background:#cf6d90;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">📅 Dodaj novi termin v koledar</a>
     </p>
     <p style="font-size:13px;color:#9b9b9b">Če vam novi termin ne ustreza, ga lahko
       <a href="${SITE_URL}/preklic/${b.cancelToken}" style="color:#cf6d90">prekličete tukaj</a>
       ali pokličete na ${s.phone} — dogovorili se bomo za drugega.</p>`
  );
  return send(
    b.email,
    fill(s.mailRescheduleSubject, { ...vars, novDatum: formatDateSl(b.newDate, false) }),
    html
  );
}
