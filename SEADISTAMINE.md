# Seadistamine

Kolm välist teenust. Cloudflare'i on vaja lehe püsti panemiseks, ülejäänud kahte
kuulamislinkide ja sisselogimise jaoks — leht töötab ka ilma nendeta.

| Teenus | Milleks | Kulu | Millal vaja |
|---|---|---|---|
| Cloudflare | leht + andmebaas | tasuta tier | kohe (etapp 3) |
| Google Cloud | sisselogimine + YouTube | tasuta | etapp 4–5 |
| Spotify for Developers | lugude mängijad | tasuta | etapp 5 |

Kõik saladused käivad `.dev.vars` faili (kohalik, `.gitignore`'is) ja
`wrangler secret put` käsuga Cloudflare'i. **Ühtegi võtit ei panda repositooriumi.**

---

## 1. Cloudflare

### 1.1. Logi wrangler sisse

```bash
npx wrangler login
```

Avaneb brauser, kinnita ligipääs. Kontrolli, et õige konto:

```bash
npx wrangler whoami
```

### 1.2. Loo andmebaas

```bash
npx wrangler d1 create rahvanounikud
```

Käsk trükib välja midagi sellist:

```
[[d1_databases]]
binding = "DB"
database_name = "rahvanounikud"
database_id = "a1b2c3d4-...."
```

**Kopeeri see `database_id`** ja asenda sellega `wrangler.jsonc` failis
rida `"database_id": "PLACEHOLDER-ASENDA-MIND"`.

### 1.3. Loo tabelid ja vii lood sisse

```bash
npx wrangler d1 execute rahvanounikud --remote --file=schema.sql
```

```bash
npx wrangler d1 execute rahvanounikud --remote --file=data/seed-songs.sql
```

Kontroll — peab tulema 376:

```bash
npx wrangler d1 execute rahvanounikud --remote --command="SELECT COUNT(*) FROM songs"
```

### 1.4. Küpsise allkirjastamise võti

See võti hoiab ära selle, et keegi saaks võõra kasutaja-ID välja mõelda ja
teise inimese hindeid üle kirjutada. Genereeri juhuslik ja pane Cloudflare'i:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npx wrangler secret put COOKIE_SECRET
```

Küsib väärtust — kleebi eelmise käsu väljund.

> **Ära muuda seda hiljem.** Võtme vahetamine muudab kõigi olemasolevate
> küpsiste allkirjad kehtetuks ja iga anonüümne hindaja kaotab oma hinded.

Kohalikuks arenduseks on sama võti failis `.dev.vars` (loodud juba automaatselt).

### 1.5. Vii leht üles

```bash
npm run deploy
```

Saad `*.workers.dev` aadressi. Kontrolli, et leht avaneb ja hindamine töötab.

### 1.6. Domeen `rahvan6unikud.emervark.ee`

Eeldab, et `emervark.ee` on juba Cloudflare'i nimeserverite all
(Cloudflare'i töölaual **Websites** all olemas). Kui ei ole, tuleb domeen enne
Cloudflare'i lisada ja registripidaja juures nimeserverid ümber suunata.

Kui on, siis lisa `wrangler.jsonc` faili:

```jsonc
"routes": [
  { "pattern": "rahvan6unikud.emervark.ee", "custom_domain": true }
]
```

ja käivita uuesti:

```bash
npm run deploy
```

Cloudflare teeb DNS-kirje ja sertifikaadi ise. Levimine võtab kuni paar minutit.

> `6` `õ` asemel on teadlik: Instagramis on saade `@muusikan6unikud`, nii et
> kirjapilt on tuttav. Täpitähtedega domeen (`rahvanõunikud.emervark.ee`) töötaks
> ka, aga punycode'i tõttu näeks link kopeerituna välja nagu `xn--...`.

---

## 2. Google Cloud (sisselogimine + YouTube)

Üks projekt katab mõlemad.

### 2.1. Loo projekt

1. Ava [console.cloud.google.com](https://console.cloud.google.com)
2. Ülal projektivalija → **New Project**
3. Nimi: `rahvanounikud` → **Create**

### 2.2. Google'i sisselogimine (etapp 4)

> **NB!** Google nimetas selle osa ümber. Vanad juhendid — ka Google'i enda omad —
> räägivad menüüpunktist **APIs & Services → OAuth consent screen**. Seda seal enam
> **ei ole**. Uus nimi on **Google Auth Platform**, jagatud vahelehtedeks
> *Overview*, *Branding*, *Audience*, *Clients*, *Data access*.
>
> Menüüst otsimise asemel kasuta otselinke — projekt on URL-i sees, nii et õige
> projekt valitakse automaatselt.

**Samm 1 — seadista Auth Platform** (üks kord projekti kohta)

`https://console.cloud.google.com/auth/overview?project=rahvanounikud`

Uue projekti puhul näed nuppu **Get started**. Vasta neljale küsimusele:

| Küsimus | Vastus |
|---|---|
| App name | `Rahvanõunikud` |
| User support email | sinu meiliaadress |
| Audience | **External** |
| Contact information | sinu meiliaadress |

Lõpuks nõustu "Google API Services: User Data Policy" tingimustega → **Create**.

**Samm 2 — lisa lubatud domeen**

`https://console.cloud.google.com/auth/branding?project=rahvanounikud`

Lisa **Authorized domains** alla `emervark.ee`. Ilma selleta ei võta Google
järgmises sammus vastu `rahvan6unikud.emervark.ee` suunamisaadressi.

**Samm 3 — loo OAuth klient** (siit tulevad võtmed)

`https://console.cloud.google.com/auth/clients?project=rahvanounikud`

**Create client** →

| Väli | Väärtus |
|---|---|
| Application type | **Web application** |
| Name | `Rahvanõunikud veeb` |
| Authorized redirect URIs | `http://localhost:5173/api/auth/callback` |
| *(vajuta "Add URI" ja lisa teine)* | `https://rahvan6unikud.emervark.ee/api/auth/callback` |

**Create** → avaneb aken **Client ID** ja **Client secret**'iga.

> Aadressid peavad klappima **täht-tähelt**: lõpus ei tohi olla kaldkriipsu ning
> `http` vs `https` loeb. Vale aadress annab sisse logides vea `redirect_uri_mismatch`.

**Samm 4 — lisa endale testkasutaja õigus**

`https://console.cloud.google.com/auth/audience?project=rahvanounikud`

Publishing status on **Testing**. Selles olekus saavad sisse logida **ainult**
nimekirjas olevad inimesed → **Add users** → lisa oma Google'i meiliaadress.

Testrežiim sobib alustuseks. Kui tahad, et kõik saaksid sisse logida, vajuta
sealsamas **Publish app**. Me küsime ainult `email` ja `profile` skoope, mis on
Google'i mõistes "mittetundlikud" — ülevaatust need ei nõua ja avaldamine on kohene.

**Samm 5 — saada võtmed Cloudflare'i**

> **Ära kleebi võtmeid terminali.** PowerShellis Ctrl+V ei kleebi, vaid sisestab
> juhtmärgi `0x16`. `wrangler secret put` võtab selle vastu ja salvestab võtme
> asemel ühe juhtmärgi — deploy õnnestub, leht paistab korras ja alles sisse
> logides tuleb Google'ilt arusaamatu viga. Seda on tüütu tagantjärele leida.

Selle asemel käib see faili kaudu:

```bash
cp .secrets.example.json .secrets.json
```

Ava `.secrets.json` **tekstiredaktoris** (VS Code vms), kleebi väärtused sisse
ja salvesta. Siis:

```bash
npm run secrets:push
```

Skript kontrollib enne saatmist, et väärtused pole tühjad, asendamata näidised
ega sisalda juhtmärke. Pärast õnnestumist kustuta `.secrets.json` ära —
see on `.gitignore`'is, aga kettale pole seda mõtet jätta.

Lisa needsamad ka `.dev.vars` faili kohalikuks arenduseks:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 2.3. YouTube Data API (etapp 5)

Siin on menüünimed endised (ümber nimetati ainult OAuth-i osa). Otselingid:

1. Lülita API sisse:
   `https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=rahvanounikud`
   → **Enable**
2. Loo võti:
   `https://console.cloud.google.com/apis/credentials?project=rahvanounikud`
   → **Create Credentials** → **API key**
3. Klõpsa võtmel → **Restrict key** → API restrictions → vali `YouTube Data API v3`

See võti on ainult build-aegse skripti jaoks, mitte Workeri jaoks — pane
see `.dev.vars` faili:

```
YOUTUBE_API_KEY=...
```

> **Kvoot: 100 otsingut päevas.** Üks `search.list` päring maksab 100 ühikut
> päevasest 10 000-st. 376 lugu tähendab ~4 päeva. Resolver on katkestatav ja
> salvestab vahetulemused `data/youtube-cache.json` faili — käivita lihtsalt
> igal päeval uuesti. Kuni ID puudub, näitab leht YouTube'i otsingulinki.

---

## 3. Spotify for Developers (etapp 5)

1. Ava [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   ja logi sisse tavalise Spotify kontoga
2. **Create app**
   - App name: `Rahvanõunikud`
   - Redirect URI: `http://127.0.0.1:5173/callback` (nõutud väli, aga meie seda
     ei kasuta — kasutame Client Credentials voogu, kus kasutaja sisse ei logi)
   - Which API/SDKs: **Web API**
3. Ava app → **Settings** → **Client ID** ja **View client secret**

Pane `.dev.vars` faili:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

Neid ei ole vaja Cloudflare'i panna — Spotify ID-d lahendatakse build-ajal
skriptiga ja salvestatakse `data/spotify-cache.json` faili, mis läheb repos kaasa.
Workeril endal Spotifyga asja ei ole.

Spotify otsingul päevakvooti ei ole, nii et kõik 376 lugu saab korraga läbi käia.

---

## Kokkuvõte: mis kuhu läheb

| Saladus | `.dev.vars` | `wrangler secret` | Miks |
|---|---|---|---|
| `COOKIE_SECRET` | jah | **jah** | Worker vajab igal päringul |
| `GOOGLE_CLIENT_ID` | jah | **jah** | Worker teeb OAuth voogu |
| `GOOGLE_CLIENT_SECRET` | jah | **jah** | sama |
| `YOUTUBE_API_KEY` | jah | ei | ainult build-aegne skript |
| `SPOTIFY_CLIENT_ID` | jah | ei | ainult build-aegne skript |
| `SPOTIFY_CLIENT_SECRET` | jah | ei | sama |

---

## Kui midagi ei tööta

**`wrangler d1 execute` ütleb "database not found"** — `database_id`
`wrangler.jsonc` failis on veel asendamata või vale.

**Leht avaneb, aga hindamine annab vea** — vaata Workeri logisid:

```bash
npx wrangler tail
```

Kõige tõenäolisem põhjus: `COOKIE_SECRET` on panemata või tabelid on loomata
(`schema.sql` jooksutamata).

**Hinded kadusid ära** — kontrolli, kas `COOKIE_SECRET` vahetus. Anonüümsed
hinded on seotud küpsise allkirjaga; uus võti tähendab uut identiteeti.

**Kohalik andmebaas on tühi** — kohalik ja päris andmebaas on eraldi. Kohalik
vajab omaette:

```bash
npx wrangler d1 execute rahvanounikud --local --file=schema.sql
npx wrangler d1 execute rahvanounikud --local --file=data/seed-songs.sql
```
