# Ülevaatamist vajavad lood

Koostatud failist `data/episodes.json` (93 saadet, 384 lugu). Kindluse lävi on 0.72; alla 0.85 loeme kahtlaseks.

| Korv | Lugusid |
|---|---|
| Kahtlane link üleval | 0 |
| Pakkumine olemas, link puudub | 1 |
| Kumbki link puudub | 9 |
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

- Taavi — Ateljee — saade 93 · 2026-09-11
  - `c2d505ab-taavi-ateljee` · [YouTube](https://www.youtube.com/results?search_query=Taavi%20Ateljee) · [Spotify](https://open.spotify.com/search/Taavi%20Ateljee)
- Beyoncé ft Pharrell Williams — Can I Watch — saade 93 · 2026-09-11
  - `c2d505ab-beyonce-ft-pharrell-williams-can-i-watch` · [YouTube](https://www.youtube.com/results?search_query=Beyonc%C3%A9%20ft%20Pharrell%20Williams%20Can%20I%20Watch) · [Spotify](https://open.spotify.com/search/Beyonc%C3%A9%20ft%20Pharrell%20Williams%20Can%20I%20Watch)
- Mamu Thao — Wing — saade 93 · 2026-09-11
  - `c2d505ab-mamu-thao-wing` · [YouTube](https://www.youtube.com/results?search_query=Mamu%20Thao%20Wing) · [Spotify](https://open.spotify.com/search/Mamu%20Thao%20Wing)
- The Game, Kanye West — 40 Nights — saade 93 · 2026-09-11
  - `c2d505ab-the-game-40-nights` · [YouTube](https://www.youtube.com/results?search_query=The%20Game%2C%20Kanye%20West%2040%20Nights) · [Spotify](https://open.spotify.com/search/The%20Game%2C%20Kanye%20West%2040%20Nights)
- Prodigyboys — Bieber — saade 92 · 2026-09-04
  - `190ec892-prodigyboys-bieber` · [YouTube](https://www.youtube.com/results?search_query=Prodigyboys%20Bieber) · [Spotify](https://open.spotify.com/search/Prodigyboys%20Bieber)
- Bullion — Roo — saade 92 · 2026-09-04
  - `190ec892-bullion-roo` · [YouTube](https://www.youtube.com/results?search_query=Bullion%20Roo) · [Spotify](https://open.spotify.com/search/Bullion%20Roo)
- heleenyum — Heaven – Slowed — saade 92 · 2026-09-04
  - `190ec892-heleenyum-heaven-slowed` · [YouTube](https://www.youtube.com/results?search_query=heleenyum%20Heaven%20%E2%80%93%20Slowed) · [Spotify](https://open.spotify.com/search/heleenyum%20Heaven%20%E2%80%93%20Slowed)
- Turnstile — Sunshower: Nourished By Time version — saade 92 · 2026-09-04
  - `190ec892-turnstile-sunshower-nourished-by-time-version` · [YouTube](https://www.youtube.com/results?search_query=Turnstile%20Sunshower%3A%20Nourished%20By%20Time%20version) · [Spotify](https://open.spotify.com/search/Turnstile%20Sunshower%3A%20Nourished%20By%20Time%20version)
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
