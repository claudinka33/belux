import * as t from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Samodejno napolni prazno bazo s cenikom Be.Lux in privzetim urnikom.

/**
 * Kdo sme v dashboard.
 *
 * Seznam pride iz spremenljivke ADMIN_SEED (nastavljena v Vercelu), oblika:
 *   ime@primer.si:geslo,drugi@primer.si:drugogeslo
 *
 * Pravila:
 *  - kdor je na seznamu, dobi vlogo ADMIN,
 *  - geslo se zapiše samo, kadar uporabnik še nima svojega, zato se
 *    geslo, spremenjeno v dashboardu, ob naslednjem zagonu ne povozi,
 *  - kdor NI na seznamu, vlogo ADMIN izgubi (tako odpade privzeti
 *    anita@belux.si, katerega geslo je bilo zapisano v javni kodi).
 *
 * Če ADMIN_SEED ni nastavljen, funkcija ne naredi ničesar — da se ob
 * pomotoma izbrisani spremenljivki nihče ne zaklene ven.
 */
export async function ensureAdmins(db: any) {
  const spec = (process.env.ADMIN_SEED || "").trim();
  if (!spec) return;

  const wanted: { email: string; password: string }[] = [];
  for (const part of spec.split(",")) {
    const sep = part.indexOf(":");
    if (sep < 1) continue;
    const email = part.slice(0, sep).trim().toLowerCase();
    const password = part.slice(sep + 1).trim();
    if (email && password) wanted.push({ email, password });
  }
  if (wanted.length === 0) return;

  const users: any[] = await db.select().from(t.users).all();
  const mailOf = (u: any) => String(u.email || "").toLowerCase();

  for (const want of wanted) {
    const user = users.find((u) => mailOf(u) === want.email);
    if (!user) {
      await db.insert(t.users).values({
        email: want.email,
        firstName: "",
        lastName: "",
        passwordHash: bcrypt.hashSync(want.password, 10),
        role: "ADMIN",
      });
      continue;
    }
    const patch: Record<string, string> = {};
    if (user.role !== "ADMIN") patch.role = "ADMIN";
    if (!user.passwordHash) patch.passwordHash = bcrypt.hashSync(want.password, 10);
    if (Object.keys(patch).length > 0) {
      await db.update(t.users).set(patch).where(eq(t.users.id, user.id));
    }
  }

  for (const user of users) {
    const listed = wanted.some((w) => w.email === mailOf(user));
    if (user.role === "ADMIN" && !listed) {
      await db.update(t.users).set({ role: "CLIENT" }).where(eq(t.users.id, user.id));
    }
  }
}

export async function seedIfEmpty(db: any) {
  await ensureAdmins(db);

  const existing = await db.select().from(t.services).all();
  if (existing.length > 0) return;

  const cat = async (name: string, order: number, parentId: string | null = null) => {
    const row = await db.insert(t.categories).values({ name, order, parentId }).returning().get();
    return row.id as string;
  };

  const trep = await cat("Trepalnice", 0);
  const obrvi = await cat("Obrvi", 1);
  const makeup = await cat("Make-up", 2);
  const poroka = await cat("Poročno ličenje", 0, makeup);

  let i = 0;
  const svc = (categoryId: string, name: string, description: string, durationMin: number, price: number) =>
    db.insert(t.services).values({ categoryId, name, description, durationMin, price, order: i++ }).run();

  await svc(trep, "Klasične trepalnice 1:1 - prvič", "Klasične trepalnice 1:1 💫 Naraven videz, elegantna dolžina, vsakodnevna svežina.", 105, 40);
  await svc(trep, "Klasične trepalnice 1:1 | Korekcija do 2 tedna", "Korekcija trepalnic 1:1 – do 2 tedna 🔄 Osvežitev in popoln videz brez ponovnega podaljševanja.", 75, 25);
  await svc(trep, "Klasične trepalnice 1:1 | Korekcija do 3 tednov", "Korekcija trepalnic 1:1 – do 3 tedne 🔄 Podaljšaj življenje svojih trepalnic – svež videz, brez ponovne celotne aplikacije.", 75, 30);
  await svc(trep, "Klasične trepalnice 1:1 | Korekcija do 4 tednov", "Korekcija trepalnic 1:1 – do 4 tedne 🕐 Za vse, ki ste malo zamudile – a si še vedno želite lepih, polnih trepalnic.", 90, 35);
  await svc(trep, "Klasične trepalnice 1:1 | Korekcija od 5 tednov in več", "Korekcija trepalnic 1:1 – 5 tednov in več 🕐 Za vse, ki ste zamudile svoj termin – a si še vedno želite urejenih in elegantnih trepalnic.", 105, 60);
  await svc(trep, "Hybrid trepalnice - prvič", "✨ Hibridne trepalnice – popolna kombinacija volumna in naravnosti ✨", 105, 40);
  await svc(trep, "Hybrid trepalnice | Korekcija do 2 tednov", "Korekcija hybrida – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", 75, 25);
  await svc(trep, "Hybrid trepalnice | Korekcija do 3 tednov", "Korekcija hybrida – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", 75, 30);
  await svc(trep, "Hybrid trepalnice | Korekcija do 4 tednov", "Korekcija hybrida – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", 90, 35);
  await svc(trep, "Hybrid trepalnice | Korekcija od 5 tednov in več", "Korekcija hybrida – od 5 tednov naprej 🔄 Obnova, ko ste zamudili – a še vedno želite popoln videz.", 90, 60);
  await svc(trep, "Volumenske trepalnice - prvič", "🌟 Dramatičen volumen, brez teže – za izrazit, a še vedno eleganten pogled.", 105, 40);
  await svc(trep, "Volumenske trepalnice | Korekcija do 2 tedna", "Korekcija volumna – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", 75, 25);
  await svc(trep, "Volumenske trepalnice | Korekcija do 3 tednov", "Korekcija volumna – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", 75, 30);
  await svc(trep, "Volumenske trepalnice | Korekcija do 4 tednov", "Korekcija volumna – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", 90, 35);
  await svc(trep, "Volumenske trepalnice | Korekcija od 5 tednov in več", "Korekcija volumna – 5 tednov in več 🔄 Obnova, ko ste zamudili termin – a še vedno želite popoln videz.", 90, 60);
  await svc(trep, "Odstranitev trepalnic", "Odstranitev podaljšanih trepalnic. Nežno in strokovno odstranimo stare podaljške brez poškodovanja naravnih trepalnic.", 60, 10);

  await svc(obrvi, "Laminacija z barvanjem in oblikovanjem obrvi", "🌺 Popolna nega za vaš pogled – vse v enem tretmaju.", 60, 40);
  await svc(obrvi, "Laminacija obrvi", "🌿 Naraven dvig in nega vaših obrvi – brez umetnih podaljškov.", 30, 35);
  await svc(obrvi, "Barvanje obrvi", "🎨 Poudarjene, temne obrvi – brez vsakodnevne uporabe svinčnika.", 15, 4);
  await svc(obrvi, "Urejanje obrvi", "🪶 Hitra osvežitev za urejen in negovan videz.", 15, 6);
  await svc(obrvi, "Oblikovanje in barvanje obrvi", "Oblikovanje in barvanje obrvi za popoln okvir obraza.", 60, 10);

  await svc(makeup, "Poskusno ličenje", "Poskusno ličenje — preizkusi svoj videz pred posebnim dogodkom.", 60, 50);
  await svc(makeup, "Priložnostno ličenje", "💄 Vključuje: temeljita priprava kože (čiščenje, podlaga, primer).", 60, 50);
  await svc(poroka, "Osnovni poročni meni", "Vključuje: 💍 oblikovanje obrvi, poročno ličenje na dan poroke.", 90, 80);
  await svc(poroka, "Vip poročni meni", "Vključuje: 💍 poskusno poročno ličenje, oblikovanje obrvi, poročno ličenje na dan poroke.", 90, 120);

  // Privzet delovni čas: pon–pet 8:00–16:00
  for (let wd = 0; wd < 5; wd++) {
    await db.insert(t.workingHours).values({ weekday: wd, startMin: 8 * 60, endMin: 16 * 60 }).run();
  }

  // Skrbniki se uredijo v ensureAdmins() na vrhu te datoteke.
}
