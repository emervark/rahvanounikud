# Ülevaatamist vajavad lood

Koostatud failist `data/episodes.json` (92 saadet, 380 lugu). Kindluse lävi on 0.72; alla 0.85 loeme kahtlaseks.

| Korv | Lugusid |
|---|---|
| Kahtlane link üleval | 0 |
| Pakkumine olemas, link puudub | 4 |
| Kumbki link puudub | 0 |
| YouTube veel otsimata | 0 |

## 1. Kahtlane link on üleval

Need on kuulajale juba nähtavad, seega vale link on siin halvem kui puuduv.

Enamik neist on tegelikult õiged: kindlus langeb ka siis, kui YouTube'i
pealkirjas artistit ei ole („kah mul asi") või kui pealkiri on veidi teisiti
kirjutatud („I LUV BEING MYSELF"). Nimekiri on madalaimast kindlusest ülespoole,
nii et tõelised vead on eespool — allapoole jõudes muutub üle vaatamine kiiresti
mõttetuks.

_Puhas._
## 2. Pakkumine olemas, aga jäi läve alla

Otsing leidis midagi, kindlus jäi väikseks. Osa on õiged (pealkirjas lisasõna),
osa on täiesti mööda, osa on õige lugu vales versioonis.

- **0,67** heleenyum — Heaven – Slowed — saade 92 · 2026-09-04
  - pakub: heleenyum — Heaven → https://www.youtube.com/watch?v=gQMFQwh_NAg
  - `190ec892-heleenyum-heaven-slowed` · [otsi](https://www.youtube.com/results?search_query=heleenyum%20Heaven%20%E2%80%93%20Slowed)
- **0,01** Kergo Klubi — Kergo Klubi räpp — saade 5 · 2024-04-05
  - pakub: Yung Lord — Yung Lord – ДЕВОЧКА ЛАМБО (Prod. Call Me G) → https://www.youtube.com/watch?v=OMDz9uYw96w
  - `bf14f06b-kergo-klubi-kergo-klubi-rapp` · [otsi](https://www.youtube.com/results?search_query=Kergo%20Klubi%20Kergo%20Klubi%20r%C3%A4pp)
- **0,00** jooseppro ja Lennu — Kaliiber — saade 67 · 2025-12-05
  - pakub: —
  - `17d543f7-jooseppro-kaliiber` · [otsi](https://www.youtube.com/results?search_query=jooseppro%20ja%20Lennu%20Kaliiber)
- **0,00** Skuuba — Kuidas sul on läind? — saade 6 · 2024-04-12
  - pakub: —
  - `afee239a-skuuba-kuidas-sul-on-laind` · [otsi](https://www.youtube.com/results?search_query=Skuuba%20Kuidas%20sul%20on%20l%C3%A4ind%3F)

## 3. Kumbki link puudub

Ei Spotifys ega YouTube'is. Osa neist ei olegi voogedastuses.


## 4. YouTube veel otsimata

0 lugu, päevakvoot 90 → ~0 päeva.
Spotify link on neil olemas, nii et lehel on lugu kuulatav.

```bash
npm run resolve:youtube && npm run build:data && npm run deploy
```


---

## Kuidas parandada

Lisa `data/overrides.json` faili `songs` alla:

```json
"loo-id-siia": {
  "_note": "miks käsitsi",
  "youtubeId": "videoId",
  "spotifyId": "trackId"
}
```

Seejärel `npm run build:data && npm run deploy`. Käsitsi kinnitatud lood
kaovad sellest nimekirjast ära, ka siis kui automaatne kindlus jäi madalaks.
