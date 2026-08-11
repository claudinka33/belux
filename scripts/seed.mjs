import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const db = new Database(process.env.DATABASE_FILE || path.join(dir, "belux.db"));

// tabele (enako kot v src/lib/db.ts)
db.exec(`
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, parent_id TEXT);
CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', duration_min INTEGER NOT NULL, price REAL NOT NULL, image TEXT, active INTEGER NOT NULL DEFAULT 1, "order" INTEGER NOT NULL DEFAULT 0, category_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', password_hash TEXT, role TEXT NOT NULL DEFAULT 'CLIENT', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'POTRJENO', first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', cancel_token TEXT NOT NULL UNIQUE, gcal_event_id TEXT, service_id TEXT NOT NULL, user_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS working_hours (id TEXT PRIMARY KEY, weekday INTEGER NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS day_overrides (id TEXT PRIMARY KEY, date TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 1, start_min INTEGER, end_min INTEGER, note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
`);

const already = db.prepare("SELECT COUNT(*) c FROM services").get();
if (already.c > 0 && !process.env.FORCE_SEED) {
  console.log("Baza že vsebuje storitve — preskočim seed. (FORCE_SEED=1 za ponovni seed)");
  process.exit(0);
}

db.exec("DELETE FROM services; DELETE FROM categories; DELETE FROM working_hours;");

const insCat = db.prepare('INSERT INTO categories (id, name, "order", parent_id) VALUES (?,?,?,?)');
const insSvc = db.prepare('INSERT INTO services (id, name, description, duration_min, price, "order", category_id) VALUES (?,?,?,?,?,?,?)');

function cat(name, order, parentId = null) {
  const id = randomUUID();
  insCat.run(id, name, order, parentId);
  return id;
}

const trep = cat("Trepalnice", 0);
const obrvi = cat("Obrvi", 1);
const makeup = cat("Make-up", 2);
const poroka = cat("Poročno ličenje", 0, makeup);

let i = 0;
const svc = (catId, name, desc, dur, price) => insSvc.run(randomUUID(), name, desc, dur, price, i++, catId);

// TREPALNICE
svc(trep, "Klasične trepalnice 1:1 - prvič", "Klasične trepalnice 1:1 💫 Naraven videz, elegantna dolžina, vsakodnevna svežina.", 105, 40);
svc(trep, "Klasične trepalnice 1:1 | Korekcija do 2 tedna", "Korekcija trepalnic 1:1 – do 2 tedna 🔄 Osvežitev in popoln videz brez ponovnega podaljševanja.", 75, 25);
svc(trep, "Klasične trepalnice 1:1 | Korekcija do 3 tednov", "Korekcija trepalnic 1:1 – do 3 tedne 🔄 Podaljšaj življenje svojih trepalnic – svež videz, brez ponovne celotne aplikacije.", 75, 30);
svc(trep, "Klasične trepalnice 1:1 | Korekcija do 4 tednov", "Korekcija trepalnic 1:1 – do 4 tedne 🕐 Za vse, ki ste malo zamudile – a si še vedno želite lepih, polnih trepalnic.", 90, 35);
svc(trep, "Klasične trepalnice 1:1 | Korekcija od 5 tednov in več", "Korekcija trepalnic 1:1 – 5 tednov in več 🕐 Za vse, ki ste zamudile svoj termin – a si še vedno želite urejenih in elegantnih trepalnic.", 105, 60);
svc(trep, "Hybrid trepalnice - prvič", "✨ Hibridne trepalnice – popolna kombinacija volumna in naravnosti ✨ Hibridna tehnika združuje klasično in volumensko podaljševanje trepalnic.", 105, 40);
svc(trep, "Hybrid trepalnice | Korekcija do 2 tednov", "Korekcija hybrida – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", 75, 25);
svc(trep, "Hybrid trepalnice | Korekcija do 3 tednov", "Korekcija hybrida – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", 75, 30);
svc(trep, "Hybrid trepalnice | Korekcija do 4 tednov", "Korekcija hybrida – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", 90, 35);
svc(trep, "Hybrid trepalnice | Korekcija od 5 tednov in več", "Korekcija hybrida – od 5 tednov naprej 🔄 Obnova, ko ste zamudili – a še vedno želite popoln videz.", 90, 60);
svc(trep, "Volumenske trepalnice - prvič", "🌟 Dramatičen volumen, brez teže – za izrazit, a še vedno eleganten pogled.", 105, 40);
svc(trep, "Volumenske trepalnice | Korekcija do 2 tedna", "Korekcija volumna – do 2 tedna 🔄 Mini osvežitev za maksimalen učinek.", 75, 25);
svc(trep, "Volumenske trepalnice | Korekcija do 3 tednov", "Korekcija volumna – do 3 tedne 🔄 Svež in poln pogled tudi po treh tednih.", 75, 30);
svc(trep, "Volumenske trepalnice | Korekcija do 4 tednov", "Korekcija volumna – do 4 tedne 🔄 Obnova, ko ste nekoliko zamudili – a še vedno želite popoln videz.", 90, 35);
svc(trep, "Volumenske trepalnice | Korekcija od 5 tednov in več", "Korekcija volumna – 5 tednov in več 🔄 Obnova, ko ste zamudili termin – a še vedno želite popoln videz.", 90, 60);
svc(trep, "Odstranitev trepalnic", "Odstranitev podaljšanih trepalnic. Nežno in strokovno odstranimo stare podaljške brez poškodovanja naravnih trepalnic.", 60, 10);

// OBRVI
svc(obrvi, "Laminacija z barvanjem in oblikovanjem obrvi", "Laminacija z barvanjem in oblikovanjem obrvi 🌺 Popolna nega za vaš pogled – vse v enem tretmaju.", 60, 40);
svc(obrvi, "Laminacija obrvi", "Laminacija obrvi 🌿 Naraven dvig in nega vaših obrvi – brez umetnih podaljškov.", 30, 35);
svc(obrvi, "Barvanje obrvi", "🎨 Poudarjene, temne obrvi – brez vsakodnevne uporabe svinčnika.", 15, 4);
svc(obrvi, "Urejanje obrvi", "🪶 Hitra osvežitev za urejen in negovan videz.", 15, 6);
svc(obrvi, "Oblikovanje in barvanje obrvi", "Oblikovanje in barvanje obrvi za popoln okvir obraza.", 60, 10);

// MAKE-UP
svc(makeup, "Poskusno ličenje", "Poskusno ličenje — preizkusi svoj videz pred posebnim dogodkom.", 60, 50);
svc(makeup, "Priložnostno ličenje", "Priložnostno ličenje 💄 Vključuje: temeljita priprava kože (čiščenje, podlaga, primer).", 60, 50);
svc(poroka, "Osnovni poročni meni", "Vključuje: 💍 oblikovanje obrvi, poročno ličenje na dan poroke.", 90, 80);
svc(poroka, "Vip poročni meni", "Vključuje: 💍 poskusno poročno ličenje, oblikovanje obrvi, poročno ličenje na dan poroke.", 90, 120);

// Privzet delovni čas: pon–pet 8:00–16:00 (Anita spremeni v dashboardu)
const insWh = db.prepare("INSERT INTO working_hours (id, weekday, start_min, end_min) VALUES (?,?,?,?)");
for (let wd = 0; wd < 5; wd++) insWh.run(randomUUID(), wd, 8 * 60, 16 * 60);

// Admin uporabnica
const adminEmail = "anita@belux.si";
const exists = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);
if (!exists) {
  db.prepare("INSERT INTO users (id, email, first_name, last_name, password_hash, role) VALUES (?,?,?,?,?,?)").run(
    randomUUID(), adminEmail, "Anita", "Be.Lux", bcrypt.hashSync("belux2026", 10), "ADMIN"
  );
}

console.log("Seed končan ✅  Admin: anita@belux.si / belux2026");
