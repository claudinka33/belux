import * as t from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

/**
 * Napolni bazo z manjkajočimi podatki.
 *
 * Vsak del se preverja posebej — skrbniki, delovni čas in vsaka kategorija
 * cenika. Prejšnja različica je pogledala samo, ali obstaja kakšna storitev,
 * in če je polnjenje umrlo sredi poti (kar se na strežniku brez stanja zlahka
 * zgodi), se ni nikoli več dokončalo: trepalnice so bile vpisane, obrvi,
 * make-up in delovni čas pa ne. Brez delovnega časa koledar ne ponudi
 * nobenega termina.
 */

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
 *  - kdor NI na seznamu, vlogo ADMIN izgubi.
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

/** Privzet delovni čas: ponedeljek–petek 8:00–16:00. */
async function ensureWorkingHours(db: any) {
  const rows: any[] = await db.select().from(t.workingHours).all();
  if (rows.length > 0) return;
  for (let wd = 0; wd < 5; wd++) {
    await db.insert(t.workingHours).values({ weekday: wd, startMin: 8 * 60, endMin: 16 * 60 });
  }
}

type Svc = { name: string; description: string; durationMin: number; price: number };
type Group = { category: string; parent: string | null; order: number; services: Svc[] };

const CATALOG: Group[] = [
  {
    category: "Trepalnice",
    parent: null,
    order: 0,
    services: [
      { name: "Klasične trepalnice 1:1 - prvič", description: "Klasične trepalnice 1:1 💫 Naraven videz, elegantna dolžina, vsakodnevna svežina.", durationMin: 105, price: 40 },
      { name: "Klasične trepalnice 1:1 | Korekcija do 2 tedna", description: "Korekcija trepalnic 1:1 – do 2 tedna 🔄 Osvežitev in popoln videz brez ponovnega podaljševanja.", durationMin: 75, price: 25 },
      { name: "Klasične trepalnice 1:1 | Korekcija do 3 tednov", description: "Korekcija trepalnic 1:1 – do 3 tedne 🔄 Podaljšaj življenje svojih trepalnic – svež videz, brez ponovne celotne aplikacije.", durationMin: 75, price: 30 },
      { name: "Klasične trepalnice 1:1 | Korekcija do 4 tednov", description: "Korekcija trepalnic 1:1 – do 4 tedne 🕐 Za vse, ki ste malo zamudile – a si še vedno želite lepih, polnih trepalnic.", durationMin: 90, price: 35 },
      { name: "Klasične trepalnice 1:1 | Korekcija od 5 tednov in več", description: "Korekcija trepalnic 1:1 – 5 tednov in več 🕐 Za vse, ki ste zamudile svoj termin – a si še vedno želite urejenih in elegantnih trepalnic.", durationMin: 105, price: 60 },
      { name: "Hybrid trepalnice - prvič", description: "✨ Hibridne trepalnice – popolna kombinacija volumna in naravnosti ✨", durationMin: 105, price: 40 },
      { name: "Hybrid trepalnice | Korekcija do 2 tednov", description: "Korekcija hybrida – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", durationMin: 75, price: 25 },
      { name: "Hybrid trepalnice | Korekcija do 3 tednov", description: "Korekcija hybrida – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", durationMin: 75, price: 30 },
      { name: "Hybrid trepalnice | Korekcija do 4 tednov", description: "Korekcija hybrida – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", durationMin: 90, price: 35 },
      { name: "Hybrid trepalnice | Korekcija od 5 tednov in več", description: "Korekcija hybrida – od 5 tednov naprej 🔄 Obnova, ko ste zamudili – a še vedno želite popoln videz.", durationMin: 90, price: 60 },
      { name: "Volumenske trepalnice - prvič", description: "🌟 Dramatičen volumen, brez teže – za izrazit, a še vedno eleganten pogled.", durationMin: 105, price: 40 },
      { name: "Volumenske trepalnice | Korekcija do 2 tedna", description: "Korekcija volumna – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", durationMin: 75, price: 25 },
      { name: "Volumenske trepalnice | Korekcija do 3 tednov", description: "Korekcija volumna – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", durationMin: 75, price: 30 },
      { name: "Volumenske trepalnice | Korekcija do 4 tednov", description: "Korekcija volumna – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", durationMin: 90, price: 35 },
      { name: "Volumenske trepalnice | Korekcija od 5 tednov in več", description: "Korekcija volumna – 5 tednov in več 🔄 Obnova, ko ste zamudili termin – a še vedno želite popoln videz.", durationMin: 90, price: 60 },
      { name: "Odstranitev trepalnic", description: "Odstranitev podaljšanih trepalnic. Nežno in strokovno odstranimo stare podaljške brez poškodovanja naravnih trepalnic.", durationMin: 60, price: 10 },
    ],
  },
  {
    category: "Obrvi",
    parent: null,
    order: 1,
    services: [
      { name: "Laminacija z barvanjem in oblikovanjem obrvi", description: "🌺 Popolna nega za vaš pogled – vse v enem tretmaju.", durationMin: 60, price: 40 },
      { name: "Laminacija obrvi", description: "🌿 Naraven dvig in nega vaših obrvi – brez umetnih podaljškov.", durationMin: 30, price: 35 },
      { name: "Barvanje obrvi", description: "🎨 Poudarjene, temne obrvi – brez vsakodnevne uporabe svinčnika.", durationMin: 15, price: 4 },
      { name: "Urejanje obrvi", description: "🪶 Hitra osvežitev za urejen in negovan videz.", durationMin: 15, price: 6 },
      { name: "Oblikovanje in barvanje obrvi", description: "Oblikovanje in barvanje obrvi za popoln okvir obraza.", durationMin: 60, price: 10 },
    ],
  },
  {
    category: "Make-up",
    parent: null,
    order: 2,
    services: [
      { name: "Poskusno ličenje", description: "Poskusno ličenje — preizkusi svoj videz pred posebnim dogodkom.", durationMin: 60, price: 50 },
      { name: "Priložnostno ličenje", description: "💄 Vključuje: temeljita priprava kože (čiščenje, podlaga, primer).", durationMin: 60, price: 50 },
    ],
  },
  {
    category: "Poročno ličenje",
    parent: "Make-up",
    order: 0,
    services: [
      { name: "Osnovni poročni meni", description: "Vključuje: 💍 oblikovanje obrvi, poročno ličenje na dan poroke.", durationMin: 90, price: 80 },
      { name: "Vip poročni meni", description: "Vključuje: 💍 poskusno poročno ličenje, oblikovanje obrvi, poročno ličenje na dan poroke.", durationMin: 90, price: 120 },
    ],
  },
];

/**
 * Dopolni cenik. Za vsako kategorijo posebej: če je ni, jo ustvari; če v njej
 * ni nobene storitve, vpiše njene storitve. Kar je Anita že spremenila ali
 * izbrisala, ostane nedotaknjeno — dodajamo samo tam, kjer je prazno.
 */
async function ensureCatalog(db: any) {
  let order = 0;

  for (const group of CATALOG) {
    const cats: any[] = await db.select().from(t.categories).all();
    let category = cats.find((c) => c.name === group.category);

    if (!category) {
      const parent = group.parent ? cats.find((c) => c.name === group.parent) : null;
      category = await db
        .insert(t.categories)
        .values({
          name: group.category,
          order: group.order,
          parentId: parent ? parent.id : null,
        })
        .returning()
        .get();
    }

    const services: any[] = await db.select().from(t.services).all();
    const mine = services.filter((s) => s.categoryId === category.id);
    if (mine.length > 0) {
      order += group.services.length;
      continue;
    }

    for (const svc of group.services) {
      await db.insert(t.services).values({
        categoryId: category.id,
        name: svc.name,
        description: svc.description,
        durationMin: svc.durationMin,
        price: svc.price,
        order: order++,
      });
    }
  }
}

export async function seedIfEmpty(db: any) {
  await ensureAdmins(db);
  await ensureWorkingHours(db);
  await ensureCatalog(db);
}
