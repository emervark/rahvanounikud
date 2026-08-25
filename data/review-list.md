# Ülevaatamist vajavad lood

Koostatud failist `data/episodes.json` (91 saadet, 376 lugu). Kindluse lävi on 0.72; alla 0.85 loeme kahtlaseks.

| Korv | Lugusid |
|---|---|
| Kahtlane link üleval | 0 |
| Pakkumine olemas, link puudub | 1 |
| Kumbki link puudub | 1 |
| YouTube veel otsimata | 1 |

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

- **0,00** jooseppro ja Lennu — Kaliiber — saade 67 · 2025-12-05
  - pakub: —
  - `17d543f7-jooseppro-kaliiber` · [otsi](https://www.youtube.com/results?search_query=jooseppro%20ja%20Lennu%20Kaliiber)

## 3. Kumbki link puudub

Ei Spotifys ega YouTube'is. Osa neist ei olegi voogedastuses.

- Kergo Klubi — Kergo Klubi räpp — saade 5 · 2024-04-05
  - `bf14f06b-kergo-klubi-kergo-klubi-rapp` · [YouTube](https://www.youtube.com/results?search_query=Kergo%20Klubi%20Kergo%20Klubi%20r%C3%A4pp) · [Spotify](https://open.spotify.com/search/Kergo%20Klubi%20Kergo%20Klubi%20r%C3%A4pp)

## 4. YouTube veel otsimata

1 lugu, päevakvoot 90 → ~1 päeva.
Spotify link on neil olemas, nii et lehel on lugu kuulatav.

```bash
npm run resolve:youtube && npm run build:data && npm run deploy
```

- Skuuba — Kuidas sul on läind? — saade 6 · 2024-04-12

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
