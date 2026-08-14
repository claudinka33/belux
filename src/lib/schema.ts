import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  parentId: text("parent_id"),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull(),
  price: real("price").notNull(),
  image: text("image"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  order: integer("order").notNull().default(0),
  categoryId: text("category_id").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("CLIENT"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().$defaultFn(createId),
  date: text("date").notNull(), // YYYY-MM-DD (lokalni čas, Europe/Ljubljana)
  startMin: integer("start_min").notNull(), // minute od polnoči
  endMin: integer("end_min").notNull(),
  status: text("status").notNull().default("POTRJENO"), // POTRJENO | PREKLICANO
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  note: text("note").notNull().default(""),
  cancelToken: text("cancel_token").notNull().unique().$defaultFn(createId),
  gcalEventId: text("gcal_event_id"),
  serviceId: text("service_id").notNull(),
  userId: text("user_id"),
  clientId: text("client_id"),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  paymentMethod: text("payment_method").notNull().default("Gotovina"),
  reminderSentAt: text("reminder_sent_at"),
  followupSentAt: text("followup_sent_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

/**
 * Kartoteka strank. Ključ je normaliziran e-mail (ali telefon, če e-maila ni),
 * da se ista oseba ob ponovnem naročanju ne podvoji.
 */
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$defaultFn(createId),
  key: text("key").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  note: text("note").notNull().default(""), // zasebna beležka (alergije, tip trepalnic …)
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const workingHours = sqliteTable("working_hours", {
  id: text("id").primaryKey().$defaultFn(createId),
  weekday: integer("weekday").notNull(), // 0 = ponedeljek … 6 = nedelja
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
});

export const dayOverrides = sqliteTable("day_overrides", {
  id: text("id").primaryKey().$defaultFn(createId),
  date: text("date").notNull(), // YYYY-MM-DD
  closed: integer("closed", { mode: "boolean" }).notNull().default(true),
  startMin: integer("start_min"),
  endMin: integer("end_min"),
  note: text("note").notNull().default(""),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
