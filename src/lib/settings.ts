import { db, tables } from "./db";
import { eq } from "drizzle-orm";

export const DEFAULT_SETTINGS: Record<string, string> = {
  studioName: "Studio Be.Lux",
  address: "Presečno 19a, 3224 Dobje pri Planini",
  phone: "040 888 438",
  email: "",
  instagram: "",
  facebook: "",
  cancelHours: "24", // do koliko ur pred terminom lahko stranka prekliče
  slotStepMin: "30", // razmik med ponujenimi termini
  minNoticeHours: "2", // najmanj toliko ur vnaprej se je možno naročiti
  maxDaysAhead: "60", // koliko dni vnaprej je možno naročanje
  bufferMin: "0", // odmor med terminoma
  heroTitle: "Tvoj pogled. Naša strast.",
  heroSubtitle: "Podaljševanje trepalnic, urejanje obrvi in profesionalno ličenje v prijetnem ambientu studia Be.Lux.",
  aboutText: "Sem Anita, ustanoviteljica studia Be.Lux. Z ljubeznijo do lepote in natančnostjo poskrbim, da se vsaka stranka počuti posebno. Specializirana sem za podaljševanje trepalnic, laminacijo obrvi in profesionalno ličenje.",
  gcalRefreshToken: "",
  gcalCalendarId: "primary",
  gcalTwoWay: "1",

  // Obveščanje po e-pošti (Resend)
  adminEmail: "", // kam Anita prejema obvestila o novih rezervacijah
  emailAdminNotify: "1", // obvestilo Aniti ob vsaki novi rezervaciji
  emailReminder: "1", // opomnik stranki dan pred terminom
  emailThanks: "1", // zahvala po opravljeni storitvi
  emailFollowUp: "1", // vabilo na korekcijo
  followUpWeeks: "3", // po koliko tednih poslati vabilo na korekcijo
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.select().from(tables.settings).where(eq(tables.settings.key, key)).get();
  return row?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(tables.settings).all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(tables.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: tables.settings.key, set: { value } });
}
