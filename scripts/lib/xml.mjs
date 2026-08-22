// Minimaalne XML-abimees. Feed on masinagenereeritud ja ühtlase struktuuriga,
// nii et täisparserit pole vaja — aga olemid ja CDATA peavad korrektselt lahti tulema.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

export function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Kõik <item>…</item> plokid. */
export function extractItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}

/** Ühe elemendi tekstisisu, olemid lahti kodeeritud. */
export function tagText(block, tag) {
  const re = new RegExp('<' + tag + String.raw`(?:\s[^>]*)?>([\s\S]*?)</` + tag + '>');
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

/** Iseseisva elemendi atribuudid, nt <enclosure url="…" />. */
export function tagAttrs(block, tag) {
  const m = block.match(new RegExp('<' + tag + String.raw`\s([^>]*?)/?>`));
  if (!m) return null;
  const attrs = {};
  for (const a of m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[a[1]] = decodeEntities(a[2]);
  }
  return attrs;
}

/** HTML-kirjeldus → puhas tekst, plokipiirid reavahetusteks. */
export function htmlToText(html) {
  return decodeEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .trim();
}
