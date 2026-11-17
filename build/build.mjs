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
function marksInLetter(text, clusters) {
  const chars = Array.from(text), have = new Set(clusters);
  for (let i = 0; i < chars.length; i++) {
    if (!/[\u064B-\u0652\u0656\u0657\u065E\u06E1\u06E2\u06ED\u08F0-\u08F2]/.test(chars[i]) || have.has(i)) continue;
    if (/[\u064B-\u064D\u0656\u0657\u065E\u08F0-\u08F2]/.test(chars[i])) return true; // a tanween shares a glyph: its two strokes need two colours
    let j = i - 1; while (j >= 0 && MARK.test(chars[j]) && !have.has(j)) j--;
    if (j < 0 || !MARK.test(chars[j])) return true; // no mark glyph before it in its run: it went into the letter
  }
  return false;
}
function mergesLetters(text, clusters) {
  const chars = Array.from(text), sorted = [...new Set(clusters)].sort((a, b) => a - b), have = new Set(clusters);
  // a letter with no glyph of its own was drawn inside another letter's glyph (ض + ر, خ after a mark…)
  for (let i = 0; i < chars.length; i++) {
    if (MARK.test(chars[i]) || have.has(i)) continue;
    let p = i - 1; while (p >= 0 && MARK.test(chars[p])) p--;
    if (p >= 0 && chars[p] === "ل" && "اأإآٱ".includes(chars[i])) continue; // lam-alef
    return true;
  }
  for (let k = 0; k < sorted.length; k++) {
    const e = k + 1 < sorted.length ? sorted[k + 1] : chars.length, bases = [];
    for (let i = sorted[k]; i < e; i++) if (!MARK.test(chars[i])) bases.push(chars[i]);
    if (bases.length > 1 && !(bases.length === 2 && bases[0] === "ل" && "اأإآٱ".includes(bases[1]))) return true;
  }
  return false;
}
function shape(text) {
  if (cache.has(text)) return cache.get(text);
  // prefer a shaping where every letter and every coloured mark has a glyph of its own; a mark drawn inside its
  // letter's glyph (a final meem with its kasra and the small meem of iqlab) could not take its own colour
  let r = null, fi = 0, firstOk = null;
  for (const feats of FEATURE_SETS) {
    r = shapeWith(text, feats);
    if (!mergesLetters(text, r.clusters)) { if (!firstOk) firstOk = r; if (!marksInLetter(text, r.clusters)) break; }
    fi++;
  }
  if (fi === FEATURE_SETS.length && firstOk) r = firstOk;
  // Hamzat al-wasl, drawn as the cheikh writes it («المصحف المعلّم»): the alif and its ibtida dot only (above:
  // begun with a fatha, below: a kasra, in the middle: a damma). The sila stroke stays in the text, so the engine
  // still tells a wasl alif from an eased hamza, but it is not drawn. An alif never joins the next letter, so the
  // head is shaped apart and appended.
  const wp = text.match(/^\u0627[\u064E\u064F\u0650][\u06EC\u06EA\u06DF]/);
  if (wp && wp[0].length < text.length) {
    const hs = shapeWith("\u0627" + wp[0][2], []), n = wp[0].length;
    const head = { out: [hs.out[0], hs.out[1].map((v, i) => (i % 4 === 1 ? (v === 0 ? 0 : 2) : v))] };
    {
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
  // the Douri font has no final-ya form for U+06D2: draw it as a dotless ya. A hamza below with an open kasratan
  // (اِ۪مْرِےٕٖ) is one glyph in the font: draw the plain kasratan so its two strokes stay apart.
  b.addText(text.replace(/\u06D2/g, "\u0649").replace(/\u0655\u0656/g, "\u0655\u064D"));
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
// Every ayah ends on a stop (the cheikh stops on the last letter with a sukun). The KFGQPC text writes the last word
// for reading on: a pause mark after it (ۖ on almost every ayah), the small meem of iqlab into the next ayah or the
// next surah's basmala («مَّسَدِۢ»), the open tanween. At a stop they mean nothing: drop the pause mark and write
// the tanween in full.
const TAN_OF = { "\u064E": "\u064B", "\u064F": "\u064C", "\u0650": "\u064D" };
const atStop = (w) => w.replace(/[\u06D6-\u06DC]/g, "").replace(/([\u064E\u064F\u0650])[\u06E2\u06ED]/g, (m, h) => TAN_OF[h])
  .replace(/[\u08F0\u065E]/g, "\u064B").replace(/[\u08F1\u0657]/g, "\u064C").replace(/[\u08F2\u0656]/g, "\u064D");
// Ayah numbers in Western digits (1 2 3), as on the cheikh's slides, inside the font's empty ornament.
const ORN = 247, ORN_ADV = shapeWith("\u06DD", []).out[0], OE = font.glyphExtents(ORN);
const digitGid = (d) => shapeWith(String(d), []).out[1][0];
const DIG_SCALE = 0.36 * Math.abs(OE.height) / Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => Math.abs(font.glyphExtents(digitGid(d)).height)));
const synth = new Map(); // synthetic gid -> scaled outline and extents
const scalePath = (d, k) => d.replace(/-?\d+(\.\d+)?/g, (v) => String(Math.round(+v * k)));
function digitGlyph(d) {
  const id = 90000 + d;
  if (!synth.has(id)) {
    const g = digitGid(d), e = font.glyphExtents(g);
    synth.set(id, { d: scalePath(font.glyphToPath(g), DIG_SCALE), x0: e.xBearing * DIG_SCALE, x1: (e.xBearing + e.width) * DIG_SCALE, y1: e.yBearing * DIG_SCALE, y0: (e.yBearing + e.height) * DIG_SCALE, adv: shapeWith(String(d), []).out[0] * DIG_SCALE });
  }
  return id;
}
function ayahMark(n) {
  const ds = String(n).split("").map(Number).map(digitGlyph), sp = ds.map((id) => synth.get(id));
  const w = sp.reduce((a, g) => a + g.adv, 0), cx = OE.xBearing + OE.width / 2, cy = OE.yBearing + OE.height / 2;
  const top = Math.max(...sp.map((g) => g.y1)), bot = Math.min(...sp.map((g) => g.y0)), flat = [ORN, 0, 0, 0];
  let x = cx - w / 2;
  ds.forEach((id, k) => { flat.push(id, 0, Math.round(x), Math.round(cy - (top + bot) / 2)); x += sp[k].adv; });
  used.set(ORN, true);
  return [ORN_ADV, flat];
}
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
    const toks = body.split(/[  ]+/).filter(Boolean);
    let li = toks.length - 1; while (li > 0 && !hasLetter(toks[li])) li--;
    toks[li] = atStop(toks[li]);
    // «المصحف المعلّم»: a sakin noon before ي or و of the next word is written bare, and the ي or و without a shadda
    // (KFGQPC: «مَنْ يَّخْشَىٰ», Tunisian: «مَن يَخْشَىٰ»). The noon is read with a complete ghunna either way.
    for (let i = 0; i + 1 < toks.length; i++) {
      if (/ن[\u0652\u06E1][\u06D6-\u06DC]?$/.test(toks[i]) && /^[يو]\u0651/.test(toks[i + 1])) {
        toks[i] = toks[i].replace(/ن[\u0652\u06E1]([\u06D6-\u06DC]?)$/, "ن$1");
        toks[i + 1] = toks[i + 1].replace(/^([يو])\u0651/, "$1");
      }
    }
    const words = toks.map((w) => {
      const [adv, g] = shape(w);
      totalWords++;
      return hasLetter(w) ? [w, adv, g] : [w, adv, g, 1]; // 4th field: symbol (۞)
    });
    const [eadv, eg] = ayahMark(row.aya_no);
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
for (const d of ["\u06EC", "\u06EA", "\u06DF"]) waslForms[d] = shape("ا" + d);

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
for (const [id, g] of synth) glyphs[id] = [g.d, g.x0, g.y1, g.x1, g.y0];
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
