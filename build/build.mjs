// Pre-shapes the KFGQPC Qaloon text with HarfBuzz so the browser only draws paths.
import * as hb from "harfbuzzjs";
import fs from "fs";

const OUT = "../site/data";
fs.mkdirSync(`${OUT}/s`, { recursive: true });
const data = fs.readFileSync(process.env.ITQAN_FONT || "../third_party/kfgqpc/doori/doori.9.ttf");
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
  let r = null, fi = 0;
  for (const feats of FEATURE_SETS) { r = shapeWith(text, feats); if (!mergesLetters(text, r.clusters)) break; fi++; }
  // Hamzat al-wasl: the alif with its sila stroke and ibtida dot is one composite glyph that the font only
  // builds with its default features. An alif never joins the next letter, so shape it apart and append it.
  const wp = fi > 0 && text.match(/^\u0627[\u064E\u064F\u0650]?[\u06EC\u06EA\u06DF]/);
  if (wp && wp[0].length < text.length) {
    const head = shapeWith(wp[0], []), n = wp[0].length;
    if (head.out[1].length === 4) {
      let tail = null;
      for (const feats of FEATURE_SETS) { tail = shapeWith(text.slice(n), feats); if (!mergesLetters(text.slice(n), tail.clusters)) break; }
      const flat = [];
      for (let i = 0; i < tail.out[1].length; i += 4) flat.push(tail.out[1][i], tail.out[1][i + 1] + n, tail.out[1][i + 2], tail.out[1][i + 3]);
      flat.push(head.out[1][0], 0, tail.out[0] + head.out[1][2], head.out[1][3]);
      r = { out: [tail.out[0] + head.out[0], flat] };
    }
  }
  for (let i = 0; i < r.out[1].length; i += 4) used.set(r.out[1][i], true);
  cache.set(text, r.out);
  return r.out;
}
function shapeWith(text, feats) {
  const b = new hb.Buffer();
  b.addText(text.replace(/\u06D2/g, "\u0649")); // the Douri font has no final-ya form for U+06D2: draw it as a dotless ya
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

// Hamzat al-wasl drill: the plain alif and the six marked forms (sign above / below / middle × begun with fatha / kasra).
const plainAlif = shape("ا");
const waslForms = {};
for (const h of ["", "\u064E", "\u0650", "\u064F"]) for (const d of ["\u06EC", "\u06EA", "\u06DF"]) waslForms[h + d] = shape("ا" + h + d);

// Tanween glyphs are split into their two strokes so each can take its own colour:
// A = the stroke next to the letter (its haraka), B = the other one (the tanween's noon).
// The kasra + small-meem ligature is split the same way (A = kasra, B = the meem of iqlab),
// and so is a shadda drawn in one glyph with its fatha or damma (A = shadda, B = the haraka).
const TAN = "\u064B\u064C\u064D\u0657\u065E\u0656\u08F0\u08F1\u08F2", IQ = "\u06E2\u06ED", HAR = "\u064E\u064F\u0650", SHD = "\u0651";
const splitKind = new Map();
for (const [text, [, flat]] of cache) {
  const cl = new Set(); for (let i = 1; i < flat.length; i += 4) cl.add(flat[i]);
  for (let i = 0; i < flat.length; i += 4) {
    const ch = text[flat[i + 1]], nx = text[flat[i + 1] + 1], pv = text[flat[i + 1] - 1];
    if (TAN.includes(ch)) splitKind.set(flat[i], "tan");
    else if ((ch === SHD && ((HAR.includes(nx) && !cl.has(flat[i + 1] + 1)) || (HAR.includes(pv) && !cl.has(flat[i + 1] - 1)))) || (HAR.includes(ch) && ((nx === SHD && !cl.has(flat[i + 1] + 1)) || (pv === SHD && !cl.has(flat[i + 1] - 1))))) { if (!splitKind.has(flat[i])) splitKind.set(flat[i], "shd"); }
    else if ((HAR.includes(ch) && nx && IQ.includes(nx) && !cl.has(flat[i + 1] + 1)) || (IQ.includes(ch) && pv && HAR.includes(pv) && !cl.has(flat[i + 1] - 1))) splitKind.set(flat[i], "lig");
  }
}
function splitStrokes(d) {
  const subs = d.split(/(?=M)/).filter(Boolean).map((p) => {
    const nums = p.match(/-?\d+(\.\d+)?/g).map(Number), xs = [], ys = [];
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
    const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    return { p, b, area: (b[2] - b[0]) * (b[3] - b[1]), cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 };
  });
  const maxA = Math.max(...subs.map((x) => x.area));
  const big = subs.filter((x) => x.area > maxA * 0.3), holes = subs.filter((x) => x.area <= maxA * 0.3);
  if (big.length !== 2) return null;
  const below = (big[0].cy + big[1].cy) / 2 < 0;
  // nearest to the letter first: lower stroke above the letter, upper stroke below it; side by side → the right one
  big.sort((p, q) => (Math.abs(p.cy - q.cy) > 90 ? (below ? q.cy - p.cy : p.cy - q.cy) : q.cx - p.cx));
  const parts = [big[0].p, big[1].p];
  for (const h of holes) {
    const inside = big.map((g) => h.cx >= g.b[0] && h.cx <= g.b[2] && h.cy >= g.b[1] && h.cy <= g.b[3]);
    let k = inside[0] && !inside[1] ? 0 : inside[1] && !inside[0] ? 1 : Math.abs(h.cy - big[0].b[3]) < Math.abs(h.cy - big[1].b[3]) ? 0 : 1; // a damma's eye sits in its head
    parts[k] += h.p;
  }
  return parts;
}

// Glyph table: outline path (font units, y up) + extents.
const glyphs = {};
let yMax = -1e9, yMin = 1e9;
for (const gid of [...used.keys()].sort((a, b) => a - b)) {
  const d = font.glyphToPath(gid);
  const e = font.glyphExtents(gid) || { xBearing: 0, yBearing: 0, width: 0, height: 0 };
  glyphs[gid] = [d, e.xBearing, e.yBearing + e.height, e.xBearing + e.width, e.yBearing];
  if (splitKind.has(gid)) { const parts = splitStrokes(d); if (parts) glyphs[gid].push(parts[0], parts[1]); }
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
fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ surahs, basmala, plainAlif, waslForms, upem: UPEM, yMax, yMin }));
console.log("split glyphs:", [...splitKind].map(([g, k]) => g + ":" + k + (glyphs[g].length > 5 ? "" : "(one piece)")).join(" "));
console.log({ surahs: surahs.length, totalWords, unique: cache.size, glyphs: used.size, UPEM, yMax, yMin, maxTop: tops.at(-1), minBottom: bottoms[0] });
