// Pre-shapes the KFGQPC Qaloon text with HarfBuzz so the browser only draws paths.
import * as hb from "harfbuzzjs";
import fs from "fs";

const OUT = "../site/data";
fs.mkdirSync(`${OUT}/s`, { recursive: true });
const data = fs.readFileSync("../third_party/kfgqpc/qaloon/qaloon.10.ttf");
const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
const font = new hb.Font(face);
const UPEM = face.upem;
const Q = JSON.parse(fs.readFileSync("../third_party/kfgqpc/qaloon/QaloonData_v10.json", "utf8"));

const MARKS = /[ً-ٰٟۖ-ۭـ‏]/g;
// Lafz al-jalala (الله / لله / اللهم …): shape without `calt` so lam, shadda and ha stay separate glyphs.
const isJalala = (w) => /لله/.test(w.replace(MARKS, "")) && /ل[ً-ْ۪۬]*لّ/.test(w) && /ه/.test(w);

const used = new Map(); // gid -> true
const cache = new Map();
// A glyph may cover several letters only for lam-alef; otherwise reshape with ligatures off so
// every letter body (and every mark) stays separately colourable.
const MARK = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0654\u0655\u200F]/;
const FEATURE_SETS = [[], ["-calt"], ["-liga"], ["-liga", "-calt"]].map((s) => s.map((x) => hb.Feature.fromString(x)));
function mergesLetters(text, clusters) {
  const chars = Array.from(text), sorted = [...new Set(clusters)].sort((a, b) => a - b);
  for (let k = 0; k < sorted.length; k++) {
    const e = k + 1 < sorted.length ? sorted[k + 1] : chars.length, bases = [];
    for (let i = sorted[k]; i < e; i++) if (!MARK.test(chars[i])) bases.push(chars[i]);
    if (bases.length > 1 && !(bases.length === 2 && bases[0] === "ل" && "اأإآٱ".includes(bases[1]))) return true;
  }
  return false;
}
function shape(text) {
  if (cache.has(text)) return cache.get(text);
  let r = null;
  for (const feats of FEATURE_SETS) { r = shapeWith(text, feats); if (!mergesLetters(text, r.clusters)) break; }
  for (let i = 0; i < r.out[1].length; i += 4) used.set(r.out[1][i], true);
  cache.set(text, r.out);
  return r.out;
}
function shapeWith(text, feats) {
  const b = new hb.Buffer();
  b.addText(text);
  b.guessSegmentProperties();
  b.setClusterLevel(hb.ClusterLevel.CHARACTERS);
  hb.shape(font, b, feats || []);
  const infos = b.getGlyphInfos();
  const pos = b.getGlyphPositions();
  let x = 0;
  const flat = [];
  for (let k = 0; k < infos.length; k++) {
    const gid = infos[k].codepoint, p = pos[k];
    flat.push(gid, infos[k].cluster, x + p.xOffset, p.yOffset);
    x += p.xAdvance;
  }
  const clusters = [];
  for (let k = 0; k < infos.length; k++) clusters.push(infos[k].cluster);
  return { out: [x, flat], clusters };
}

const hasLetter = (w) => /[ء-يٱے]/.test(w);
const surahs = [];
const bySurah = new Map();
for (const row of Q) {
  if (!bySurah.has(row.sura_no)) {
    bySurah.set(row.sura_no, []);
    surahs.push({ n: row.sura_no, ar: row.sura_name_ar, en: row.sura_name_en, juz: row.jozz, page: String(row.page).split(/[–-]/)[0], count: 0 });
  }
  bySurah.get(row.sura_no).push(row);
}

let totalWords = 0;
for (const s of surahs) {
  const rows = bySurah.get(s.n);
  s.count = rows.length;
  const ayahs = rows.map((row) => {
    const m = row.aya_text.match(/^([\s\S]*?) ([٠-٩]+)$/);
    const body = m ? m[1] : row.aya_text;
    const num = m ? m[2] : String(row.aya_no);
    const words = body.split(/[  ]+/).filter(Boolean).map((w) => {
      const [adv, g] = shape(w);
      totalWords++;
      return hasLetter(w) ? [w, adv, g] : [w, adv, g, 1]; // 4th field: symbol (۞)
    });
    const [eadv, eg] = shape(num);
    return { a: row.aya_no, p: row.page, w: words, e: [eadv, eg] };
  });
  fs.writeFileSync(`${OUT}/s/${String(s.n).padStart(3, "0")}.json`, JSON.stringify({ n: s.n, ar: s.ar, ayahs }));
}

// Basmala as written in the cheikh's Qaloon text (KFGQPC encoding).
const BASMALA = "بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ";
const basmala = BASMALA.split(" ").map((w) => { const [adv, g] = shape(w); return [w, adv, g]; });

// Glyph table: outline path (font units, y up) + extents.
const glyphs = {};
let yMax = -1e9, yMin = 1e9;
for (const gid of [...used.keys()].sort((a, b) => a - b)) {
  const d = font.glyphToPath(gid);
  const e = font.glyphExtents(gid) || { xBearing: 0, yBearing: 0, width: 0, height: 0 };
  glyphs[gid] = [d, e.xBearing, e.yBearing + e.height, e.xBearing + e.width, e.yBearing];
}
// Vertical extents of every word (marks included) to size the line box.
const tops = [], bottoms = [];
for (const [, [, flat]] of cache) {
  let t = -1e9, bt = 1e9;
  for (let i = 0; i < flat.length; i += 4) {
    const gl = glyphs[flat[i]]; if (!gl) continue;
    t = Math.max(t, gl[4] + flat[i + 3]);
    bt = Math.min(bt, gl[2] + flat[i + 3]);
  }
  if (t > -1e9) { tops.push(t); bottoms.push(bt); }
}
tops.sort((a, b) => a - b); bottoms.sort((a, b) => a - b);
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
yMax = pct(tops, 0.999); yMin = pct(bottoms, 0.001);

fs.writeFileSync(`${OUT}/glyphs.json`, JSON.stringify({ upem: UPEM, yMax, yMin, g: glyphs }));
fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ surahs, basmala, upem: UPEM, yMax, yMin }));
console.log({ surahs: surahs.length, totalWords, unique: cache.size, glyphs: used.size, UPEM, yMax, yMin, maxTop: tops.at(-1), minBottom: bottoms[0] });
