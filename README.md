# Rahvanõunikud

Kuulajate hindamisleht Delfi podcastile [„Muusikanõunikud”](https://tasku.delfi.ee/podcast/33d58660-ca9f-4b57-bb79-27629e949861).

Igas saates kuulavad ja hindavad muusikakriitikud ~4 uut lugu. Siin saab neid samu lugusid
ise hinnata skaalal 1–10 — üksikult kuulates või tervet saadet taustaks pannes ja koos
kriitikutega kaasa hinnates. Kasutajate hinnetest moodustub **Rahvanõunikud koondhinne**.

Saade on Delfi Meedia oma. See projekt ei ole Delfiga seotud, lingib originaali juurde ja
kasutab podcasti avalikku RSS-feedi.

## Seis

| Etapp | Staatus |
|---|---|
| 1. Andmetorustik (RSS → lood) | tehtud |
| 2. Frontend | tehtud |
| 3. Cloudflare backend (D1, hinded) | tehtud |
| 4. Google login | ees |
| 5. Spotify / YouTube lingid | ees |
| 6. Deploy | **tehtud** — https://rahvan6unikud.emervark.ee |

Väliste teenuste seadistamine: **[SEADISTAMINE.md](SEADISTAMINE.md)**

## Arendus

```bash
npm install
npm run db:local     # kohalik D1: tabelid + 376 lugu (üks kord)
npm run dev          # http://localhost:5173
```

`npm run dev` käivitab Vite'i koos Cloudflare'i pluginaga, nii et `/api` ja D1
töötavad päris Workers-runtime'is — kohalik käitumine vastab sellele, mis tuleb
pärast deploy'd.

```bash
npm run build        # andmed + frontend + Worker + tüübikontroll
npm run deploy       # build ja Cloudflare'i
npm run tail         # päris Workeri logid
```

## Kuidas hinded töötavad

Hindamiseks ei pea sisse logima. Brauser saab allkirjastatud küpsise (`rn_uid`),
mille külge hinded seotakse — allkiri takistab võõra kasutaja-ID väljamõtlemist ja
teise inimese hinnete ülekirjutamist. Küpsist saab muidugi kustutada ja uue saada;
tugevam identiteet tuleb etapis 4 valikulise Google'i sisselogimisega.

Koondnäitajad (`song_stats`) arvutatakse iga kirjutamise järel hinnetest **uuesti**,
mitte juurdekasvuna. Juurdekasv triibiks aja jooksul paigast ja vale keskmine oleks
kõigile nähtav; üks indekseeritud kokkulöömine on selle kindluse hind.

Varem ainult brauserisse salvestatud hinded tuuakse serverisse üle automaatselt,
esimesel külastusel. Server ei kirjuta olemasolevaid hindeid üle.

## Andmed

Kõik lugude andmed tuletatakse podcasti RSS-feedist. Torustik on jagatud sammudeks, et
iga samm oleks eraldi kontrollitav:

```bash
npm run fetch       # RSS → data/raw-episodes.json
npm run parse       # kirjeldused → data/parsed-songs.json + data/parse-report.md
npm run build:data  # kõik kokku + overrides → data/episodes.json
npm run data        # kõik järjest
npm run critics     # värskendab data/critic-scores.json (nõunike hinded)
```

`npm run fetch -- --cached` kasutab salvestatud `data/raw-feed.xml`-i ja ei käi võrgus.

### Miks parser nii kahtlustav on

Saadete kirjeldused on inimese kirjutatud ja ebaühtlased: jutumärke on viit eri sorti
(kohati sulgemata), lood on kohati murtud üle kahe rea, paar erisaadet kirjeldab lugusid
proosas ilma nimekirjata. Parser eelistab kahtluse korral rida **mitte** vastu võtta ja
saata see `data/parse-report.md`-i käsitsi ülevaatuseks.

Põhjus on see, et vale artist ei jää vaikseks veaks — see annab vale Spotify lingi ja
lõpuks koguneksid päris inimeste hinded vale loo külge. Parsimata rida on odav; vale
rida on kallis.

Käsitsi sisestatud ja parandatud lood elavad failis `data/overrides.json`, mis kirjutab
automaatika tulemuse üle.

### Nõunike skoor tuleb ainult käsitsi

Podcasti kirjeldustes numbrilisi hindeid **ei ole** — 91 kirjelduse peale on
üksainus sõna „punktisumma" ja seegi jutu sees. Kriitikute hinded kõlavad
ainult helis.

Seepärast on `data/critic-scores.json`: iga lugu eraldi real koos artisti,
pealkirja ja saatenumbriga, saadete kaupa järjest. Ühte saadet kuulates
täidad ühe ploki.

```jsonc
"51067548-an-marlen-tahtede-eest": {
  "_": "An-Marlen, Kermo Murel — Tähtede eest · saade 91",
  "skoor": 7                                    // nõunike ühine hinne
}
```

`skoor` võib olla ka kriitikute kaupa — siis arvutatakse keskmine ja lehel
näidatakse ka üksikhinded:

```jsonc
"skoor": { "Raul Saaremets": 7, "Valner Valme": 6, "Siim Nestor": 8 }
```

Kuni skoori pole, on plaat ja edetabel lihtsalt kahesed: nõunike veerg ilmub
alles siis, kui vähemalt üks skoor on sisestatud. Tühi veerg oleks lubadus,
mida andmed ei kata.

`npm run critics` lisab uute saadete lood faili juurde ja jätab juba
sisestatud väärtused puutumata.

### Loo ID-de stabiilsus

`data/song-ids.json` on lukustusfail: kord loole antud ID ei muutu kunagi, ka siis mitte,
kui parsimist hiljem parandada. Ilma selleta nihkuksid juba antud hinded vale loo külge.
