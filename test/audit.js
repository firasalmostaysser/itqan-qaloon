// Colour audit: every part the cheikh's method colours must get a colour, and the colour must be visible on a drawn
// glyph part. Runs the real page code in Chromium.
//   cd site && python3 -m http.server 8765 &  then  node test/audit.js [surahs, e.g. 1,78-114 | all]
const { chromium } = require("playwright");
const arg = process.argv[2] || "1,78-114";
const list = arg === "all" ? Array.from({ length: 114 }, (_, i) => i + 1)
  : arg.split(",").flatMap((p) => { const [a, b] = p.split("-").map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto("http://localhost:8765/?audit#home");
  await p.waitForFunction(() => window.__A && window.__A.meta(), null, { timeout: 30000 });
  const res = await p.evaluate(async (list) => {
    const A = window.__A, T = A.T, vis = new Set(A.CORE), issues = {}, ex = {};
    const HAR = "َُِ", TAN = "ًࣰٌࣱٍࣲٖٗٞ", SUK = "ْۡ", HEAVY = "خصضغطقظ", IQ = "ۭۢ";
    const TIME = new Set(["shadid", "bayni", "rikhw", "ghunna"]);
    const note = (k, s) => { issues[k] = (issues[k] || 0) + 1; (ex[k] = ex[k] || []).length < 6 && ex[k].push(s); };
    let words = 0;
    for (const n of list) {
      const S = await A.loadSurah(n);
      S.ayahs.forEach((ay, ai) => {
        const an = A.analyze(S, ai);
        const lastW = (() => { for (let i = ay.w.length - 1; i >= 0; i--) if (!ay.w[i][3]) return i; return -1; })();
        ay.w.forEach((wd, wi) => {
          if (wd[3] || !an[wi]) return;
          words++;
          const text = wd[0], ch = Array.from(text), col = A.colorsFor(an[wi], vis, A.ovFor(n, ay.a, wi, text));
          const where = `${n}:${ay.a} ${text}`;
          const roleOf = new Map(); an[wi].units.forEach((u) => { roleOf.set(u.b, u); u.marks.forEach((m) => roleOf.set(m.i, u)); });
          const silent = (u) => !u || ["wasl", "silentWasl", "zaid", "lamShams"].includes(u.role);
          const need = new Map(); // char index -> expected kind of colour
          ch.forEach((c, i) => {
            const u = roleOf.get(i);
            if (silent(u)) return;
            if (HAR.includes(c)) need.set(i, "harakat");
            else if (TAN.includes(c)) { need.set(i, "harakat"); if (!col.s2[i]) note("tanween second stroke without colour", where); }
            else if (SUK.includes(c) && u.role !== "madd") need.set(i, "time");
            else if (c === "ّ") need.set(i, "time");
            else if (IQ.includes(c)) need.set(i, "ghunna");
            else if (HEAVY.includes(c) && i === u.b) need.set(i, "takhlis");
          });
          if (wi === lastW) { // the letter stopped on
            const lu = [...an[wi].units].reverse().find((u) => !["zaid", "kashida"].includes(u.role));
            if (lu && lu.role === "letter" && !(lu.L === "ر" && lu.vowel === "i" && !lu.shadda && !lu.tanMark) && !col[lu.b]) note("stopped letter without colour", where);
          }
          for (const [i, kind] of need) {
            const c = col[i];
            if (!c) { note(`${kind} without colour (${ch[i].codePointAt(0).toString(16)})`, where); continue; }
            if (kind === "harakat" && c !== "harakat") note(`haraka coloured ${c}`, where);
            if (kind === "time" && !TIME.has(c)) note(`sukun/shadda coloured ${c}`, where);
            if (kind === "takhlis" && c !== "takhlis" && c !== "ghunna" && !TIME.has(c)) note(`heavy letter coloured ${c}`, where);
          }
          // drawing: each coloured char must show its colour on a part of the glyph that draws it
          const parts = A.partsOf(wd, col), cov = A.coverage(text, wd[2]);
          for (const [cl, idxs] of cov) {
            const shown = new Set([parts.get(String(cl)), parts.get(cl + "b")].filter(Boolean));
            for (const i of idxs) {
              const want = [col[i], TAN.includes(ch[i]) ? col.s2[i] : null].filter((x) => x && vis.has(x));
              for (const w of want) if (!shown.has(w)) note(`colour hidden by a merged glyph: ${w} on ${ch[i].codePointAt(0).toString(16)} (glyph ${[...idxs].map((j) => ch[j].codePointAt(0).toString(16)).join("+")})`, where);
            }
          }
        });
      });
    }
    return { words, issues, ex };
  }, list);
  console.log("words checked:", res.words);
  const keys = Object.keys(res.issues).sort((a, b) => res.issues[b] - res.issues[a]);
  if (!keys.length) console.log("no issues");
  for (const k of keys) console.log(String(res.issues[k]).padStart(6), k, "\n        ", res.ex[k].join("  |  "));
  await b.close();
})();
