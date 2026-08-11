import { getAllSettings } from "./settings";
import { formatDateSl, minToHHMM, formatPrice, gcalDatesParam } from "./time";

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
  const html = `
  <div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;color:#3b3b3b">
    <div style="background:#cf6d90;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">${s.studioName}</h1>
    </div>
    <div style="border:1px solid #f3d3e0;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      <p>Pozdravljeni, ${b.firstName}!</p>
      <p>Vaš termin je <strong>potrjen</strong>. 🎀</p>
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
        subject: `Potrditev termina — ${b.serviceName}, ${formatDateSl(b.date, false)} ob ${minToHHMM(b.startMin)}`,
        html,
      }),
    });
  } catch {
    /* e-mail ni kritičen */
  }
}
