# Be.Lux — spletna stran z naročanjem

Spletna stran studia Be.Lux: predstavitvena stran, spletno naročanje na termine in Anitin dashboard.

## Zagon lokalno
```bash
npm install
node scripts/seed.mjs   # napolni bazo s cenikom (samo prvič)
npm run dev             # http://localhost:3000
```

## Admin prijava (dashboard)
- E-mail: **anita@belux.si**
- Geslo: **belux2026**  ← spremeni čim prej (v bazi ali prek nove registracije + ročne spremembe role)
- Dashboard: `/admin`

## Objava na Vercel (prek GitHuba)
1. Potisni to mapo na GitHub (glej spodaj).
2. Na vercel.com → **Add New → Project** → izberi repozitorij → Deploy.
3. V **Settings → Environment Variables** dodaj:
   - `NEXTAUTH_SECRET` — poljuben dolg naključen niz (npr. iz `openssl rand -base64 32`)
   - `ADMIN_PASSWORD` — geslo za Anitin dashboard (uporabi se ob prvem polnjenju baze)

### Trajna baza (pomembno!)
Vercel nima trajnega diska — brez tega se rezervacije izgubijo ob vsakem redeployu.
Rešitev: brezplačna **Turso** baza (5 min):
1. Registracija na https://turso.tech (brezplačen paket je dovolj).
2. Ustvari bazo → skopiraj **Database URL** (`libsql://...`) in ustvari **Auth Token**.
3. V Vercel dodaj env spremenljivki: `TURSO_DATABASE_URL` in `TURSO_AUTH_TOKEN` → Redeploy.
4. Aplikacija ob prvem zagonu sama ustvari tabele in napolni cenik. ✅

### Google prijava + Google Koledar (neobvezno, se lahko doda kasneje)
1. https://console.cloud.google.com → nov projekt → **APIs & Services → Credentials → OAuth client ID (Web)**.
2. Authorized redirect URIs dodaj:
   - `https://TVOJA-DOMENA/api/auth/callback/google` (prijava strank)
   - `https://TVOJA-DOMENA/api/admin/google/callback` (Anitin koledar)
3. Omogoči **Google Calendar API**.
4. V Vercel dodaj `GOOGLE_CLIENT_ID` in `GOOGLE_CLIENT_SECRET` → Redeploy.
5. Anita nato v **Dashboard → Nastavitve** klikne "Poveži Google Koledar".

### E-mail potrditve (neobvezno)
Registriraj se na https://resend.com in v Vercel dodaj `RESEND_API_KEY` (in `EMAIL_FROM`).

## GitHub — kako potisneš kodo
```bash
cd belux
git init
git add .
git commit -m "Be.Lux spletna stran"
# na github.com ustvari nov (prazen) repozitorij "belux", potem:
git remote add origin https://github.com/TVOJ-USERNAME/belux.git
git branch -M main
git push -u origin main
```
