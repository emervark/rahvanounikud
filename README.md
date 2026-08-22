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
| 2. Frontend (localStorage'i hinded) | pooleli |
| 3. Cloudflare backend (D1, hinded) | ees |
| 4. Google login | ees |
| 5. Spotify / YouTube lingid | ees |
| 6. Deploy | ees |

## Andmed

Kõik lugude andmed tuletatakse podcasti RSS-feedist. Torustik on jagatud sammudeks, et
iga samm oleks eraldi kontrollitav:

```bash
npm run fetch       # RSS → data/raw-episodes.json
npm run parse       # kirjeldused → data/parsed-songs.json + data/parse-report.md
npm run build:data  # kõik kokku + overrides → data/episodes.json
npm run data        # kõik kolm järjest
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

### Loo ID-de stabiilsus

`data/song-ids.json` on lukustusfail: kord loole antud ID ei muutu kunagi, ka siis mitte,
kui parsimist hiljem parandada. Ilma selleta nihkuksid juba antud hinded vale loo külge.
