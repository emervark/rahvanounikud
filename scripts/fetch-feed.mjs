// Laeb "Muusikanõunike" RSS-i alla ja teisendab selle raw-episodes.json-iks.
// Toorfeed jäetakse alles (raw-feed.xml), et parsimist saaks hiljem võrgutas korrata.

import fs from 'node:fs/promises';
import { RSS_URL } from './feed-config.mjs';
import { paths } from './lib/paths.mjs';
import { extractItems, tagText, tagAttrs, htmlToText } from './lib/xml.mjs';

const ITUNES = 'itunes:';

async function main() {
  const useCache = process.argv.includes('--cached');

  let xml;
  if (useCache) {
    xml = await fs.readFile(paths.rawFeed, 'utf8');
    console.log(`Kasutan salvestatud feedi: ${paths.rawFeed}`);
  } else {
    console.log(`Laen: ${RSS_URL}`);
    const res = await fetch(RSS_URL, { headers: { 'user-agent': 'rahvanounikud-data/0.1' } });
    if (!res.ok) throw new Error(`RSS vastas ${res.status} ${res.statusText}`);
    xml = await res.text();
    await fs.writeFile(paths.rawFeed, xml, 'utf8');
  }

  const items = extractItems(xml);
  if (items.length === 0) throw new Error('Feedist ei leitud ühtegi <item> elementi.');

  const episodes = items.map((block, i) => {
    const enclosure = tagAttrs(block, 'enclosure');
    const image = tagAttrs(block, `${ITUNES}image`);
    const descriptionHtml = tagText(block, 'description') ?? '';

    return {
      guid: tagText(block, 'guid'),
      title: tagText(block, 'title'),
      publishedAt: new Date(tagText(block, 'pubDate')).toISOString(),
      duration: tagText(block, `${ITUNES}duration`),
      descriptionHtml,
      description: htmlToText(descriptionHtml),
      audioUrl: enclosure?.url ?? null,
      audioBytes: enclosure?.length ? Number(enclosure.length) : null,
      coverImageUrl: image?.href ?? null,
      feedIndex: i, // 0 = värskeim
    };
  });

  // Terviklikkuse kontroll — vaikselt poolik andmestik on halvem kui vigane build.
  const problems = [];
  for (const ep of episodes) {
    for (const field of ['guid', 'title', 'publishedAt', 'description', 'audioUrl']) {
      if (!ep[field]) problems.push(`${ep.guid ?? '?'}: puudub ${field}`);
    }
    if (Number.isNaN(Date.parse(ep.publishedAt))) problems.push(`${ep.guid}: vigane kuupäev`);
  }
  const guids = new Set(episodes.map((e) => e.guid));
  if (guids.size !== episodes.length) problems.push('GUID-id ei ole unikaalsed');

  if (problems.length) {
    console.error('\nProbleemid feedis:');
    for (const p of problems) console.error('  - ' + p);
    throw new Error(`${problems.length} probleemi — ei kirjuta raw-episodes.json faili.`);
  }

  await fs.writeFile(paths.rawEpisodes, JSON.stringify(episodes, null, 2) + '\n', 'utf8');

  const oldest = episodes.at(-1), newest = episodes[0];
  console.log(`\n${episodes.length} saadet kirjutatud → ${paths.rawEpisodes}`);
  console.log(`Vanim:  ${oldest.publishedAt.slice(0, 10)}  ${oldest.title.slice(0, 60)}`);
  console.log(`Värskeim: ${newest.publishedAt.slice(0, 10)}  ${newest.title.slice(0, 60)}`);
}

main().catch((err) => {
  console.error('\nfetch-feed ebaõnnestus:', err.message);
  process.exit(1);
});
