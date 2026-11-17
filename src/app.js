(function () {
  "use strict";
  const T = window.Tajweed;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const AR = (n) => String(n); // numbers in Western digits (1 2 3), as in the cheikh's books
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plain = (t) => t.replace(/[ً-ٰٟۖ-ۭـ‏]/g, "");
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("itqan:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("itqan:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem("itqan:" + k); } catch (e) { /* ignore */ } },
  };
  // A video is either an archive.org (or any https) link, or an asset id uploaded inside the Claude page.
  const blobUrl = (id) => (/^(https?:\/\/|media\/)/.test(id) ? id : "/_blob/" + id);
  const CORE = ["shadid", "bayni", "rikhw", "ghunna", "harakat", "takhlis"];

  /* ---------------- the cheikh's lessons (his course, in his order) ---------------- */
  const LESSONS = [
    { id: "l1", title: "الساكن الشديد", sub: "أجد قط بكت", s: 1, cats: ["shadid"],
      text: "أجد قط بكت: حروف شديدة ينحبس الصوت معها عند مروره في المخرج. نلوّن الحرف الساكن من (أجد قط بكت) في السورة باللون الأخضر." },
    { id: "l2", title: "الساكن البيني", sub: "لن عمر", s: 1, cats: ["shadid", "bayni"],
      text: "لن عمر: حروف بينيّة يجري الصوت معها جرياناً جزئيّاً. نلوّن الحرف الساكن من (لن عمر) في السورة باللون الأزرق الفاتح." },
    { id: "l3", title: "الساكن الرخو", sub: "باقي الحروف", s: 1, cats: ["shadid", "bayni", "rikhw"],
      text: "باقي الحروف رخوة يجري الصوت معها جرياناً كاملاً، ونلوّن ساكنها باللون الأحمر. مثال: «يستبشرون»: الباء ينحبس معها الصوت، والنون يجري معها جرياناً جزئياً، والسين جرياناً كاملاً؛ فالسين أطول زمناً من النون، والنون أطول من الباء." },
    { id: "l4", title: "إتمام الحركات", sub: "ـَ ـُ ـِ", s: 1, cats: ["shadid", "bayni", "rikhw", "harakat"],
      text: "الفتحة يُفتح فيها الفم، والضمة تُضمّ فيها الشفتان إلى الأمام، أما الكسرة فيُخفض فيها الفك السفلي إلى أسفل. والمراد بالإتمام عكس النقص وعكس الاختلاس، فلا بدّ من إتمام الحركة لنصل إلى إتقان أصوات حروف القرءان الكريم." },
    { id: "l5", title: "تخليص الحروف", sub: "خص ضغط قظ", s: 1, cats: ["shadid", "bayni", "rikhw", "harakat", "takhlis"],
      text: "المراد بتخليص الحروف عدم التأثير أو التأثّر (مفخّم بمرقّق أو مرقّق بمفخّم). وحروفه (خص ضغط قظ) والراء في حالة التفخيم ولام لفظ الجلالة إذا سُبقت بفتح أو ضمّ." },
    { id: "l6", title: "ضبط همزة الوصل", sub: "الحمد · اهدنا", s: 1, cats: ["shadid", "bayni", "rikhw", "harakat", "takhlis", "wasl"],
      text: "همزة الوصل تثبت في الابتداء وتسقط في الوصل، وعلامتها في المصحف تدلّ على ضبطها. لاحظ مواضعها في السورة ولا تنطقها عند وصل الكلمة بما قبلها." },
    { id: "l7", title: "تمكين الغنّة", sub: "نّ مّ", s: 111, cats: ["shadid", "bayni", "rikhw", "harakat", "takhlis", "ghunna", "idgham"],
      text: "اللون الوردي لتمكين الغنّة، ولها مراتب: كاملة في المشدّد والمدغم والمخفى والمقلب، وناقصة في النون والميم الساكنتين المظهرتين (منْ ءامن، أنْعمْت)، وأنقص في المتحرّكتين." },
    { id: "l8", title: "تدريب: جدول التدريب", sub: "سورة المسد", s: 111, practice: true, cats: CORE.slice(),
      text: "ضع كل كلمة من الآية في عمود الحكم الذي فيها، ثم اضغط «تحقّق». الكلمة قد تدخل في أكثر من عمود." },
  ];

  /* ---------------- shared state (the cheikh's settings) ---------------- */
  const blankState = () => ({ v: 1, savedAt: null, cats: {}, order: null, legend: null, tableCols: null, settings: {}, classes: null,
    overrides: {}, notes: {}, videos: {}, timings: {}, custom: [] });
  let STATE = blankState();
  const mergeState = (o) => Object.assign(blankState(), o || {});

  let META, GLY, UPEM, YMAX, YMIN;
  let ALLCATS = [], CATMAP = new Map(), PRIORITY = [], RANK = new Map();
  let CAN_EDIT = false, DIRTY = false, SAVE_NOTE = "";
  const surahCache = new Map();
  const anCache = new Map();
  let anVersion = 0;

  const ui = {
    surah: LS.get("surah", 1), size: LS.get("size", 34),
    hidden: new Set(LS.get("hidden", [])), lesson: null, rendered: 0,
  };
  const P = { surah: 111, ai: -1, mode: "show", picked: null, placed: {}, checked: false };

  function refreshCats() {
    const base = T.CATEGORIES.map((c) => Object.assign({}, c, STATE.cats[c.id] || {}));
    const custom = (STATE.custom || []).map((c) => Object.assign({ custom: true, on: true, table: false }, c));
    ALLCATS = base.concat(custom);
    CATMAP = new Map(ALLCATS.map((c) => [c.id, c]));
    PRIORITY = (STATE.order || T.DEFAULT_ORDER).filter((id) => CATMAP.has(id));
    for (const c of ALLCATS) if (!PRIORITY.includes(c.id)) PRIORITY.push(c.id);
    RANK = new Map(PRIORITY.map((id, i) => [id, i]));
    applyColors();
    const live = $("#liveLink"), L = lessonLinks();
    if (live) { live.hidden = !L.length; if (L.length) { live.href = L.length === 1 ? L[0].url : "#home"; live.target = L.length === 1 ? "_blank" : ""; } }
  }
  /** The cheikh's remote-lesson links (Meet, Zoom, Telegram, WhatsApp, YouTube…): one per line, «name | https://…». */
  const PLATFORMS = [[/meet\.google\./, "Google Meet", "🎥"], [/zoom\.(us|com)/, "Zoom", "🎥"], [/(t\.me|telegram\.(me|org))/, "تيليغرام", "✈️"], [/(wa\.me|whatsapp\.com)/, "واتساب", "💬"],
    [/(youtube\.com|youtu\.be)/, "يوتيوب", "▶️"], [/teams\.(microsoft|live)\./, "Microsoft Teams", "🎥"], [/(jit\.si|jitsi)/, "Jitsi", "🎥"], [/(facebook\.com|fb\.me|m\.me)/, "فيسبوك", "💬"], [/discord\.(gg|com)/, "Discord", "🎧"]];
  function lessonLinks() {
    const st = STATE.settings || {}, raw = (st.links || "") + (st.liveUrl ? "\n" + st.liveUrl : ""), out = [], seen = new Set();
    for (const line of raw.split(/\n+/)) {
      const m = line.match(/https:\/\/[^\s|]+/); if (!m || seen.has(m[0])) continue; seen.add(m[0]);
      const pf = PLATFORMS.find((p) => p[0].test(m[0])), label = line.replace(m[0], "").replace(/[|\s]+$/g, "").replace(/^[|\s]+/g, "").trim();
      out.push({ url: m[0], label: label || (pf ? pf[1] : "رابط الدرس"), icon: pf ? pf[2] : "🔗", pf: pf ? pf[1] : "" });
    }
    return out;
  }
  function legendOrder() {
    const L = (STATE.legend || CORE.concat(T.DEFAULT_ORDER.filter((x) => !CORE.includes(x)))).filter((id) => CATMAP.has(id));
    for (const c of ALLCATS) if (!L.includes(c.id)) L.push(c.id);
    return L.map((id) => CATMAP.get(id));
  }
  function tableCols() {
    const cols = (STATE.tableCols || CORE).filter((id) => CATMAP.has(id) && CATMAP.get(id).table !== false);
    for (const c of ALLCATS) if (c.table && !cols.includes(c.id)) cols.push(c.id);
    return cols.map((id) => CATMAP.get(id));
  }
  function applyColors() {
    const L = [], D = [];
    for (const c of ALLCATS) { L.push(`--c-${c.id}:${c.color}`); D.push(`--c-${c.id}:${c.dark || c.color}`); }
    const rules = ALLCATS.map((c) => `.qw use.k-${c.id}{fill:var(--c-${c.id})}`).join("");
    $("#catvars").textContent = `:root{${L.join(";")}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${D.join(";")}}}:root[data-theme="dark"]{${D.join(";")}}${rules}`;
  }
  const mode = () => (STATE.settings && STATE.settings.mode) || "waqf"; // the cheikh's method: a stop on every ayah end
  function engineSettings(m) {
    const st = STATE.settings || {};
    return { mode: m || mode(), finalHaraka: st.finalHaraka || "keep", 
      classes: Object.assign({}, T.SETTINGS.classes, STATE.classes || {}) };
  }
  function lessonById(id) { return LESSONS.find((l) => l.id === id) || null; }
  function visibleSet() {
    const v = new Set();
    const lesson = ui.lesson && lessonById(ui.lesson);
    for (const c of ALLCATS) {
      if (ui.hidden.has(c.id)) continue;
      if (lesson) { if (lesson.cats.includes(c.id)) v.add(c.id); } else if (c.on) v.add(c.id);
    }
    return v;
  }
  function availableCats() {
    const lesson = ui.lesson && lessonById(ui.lesson);
    return legendOrder().filter((c) => (lesson ? lesson.cats.includes(c.id) : c.on));
  }

  /* ---------------- data ---------------- */
  // Quran data is tied to the font it was shaped with: every build gets its own address, so a phone can never
  // mix an old glyph table with new surah files.
  const DATA_V = "/*DATA_V*/";
  async function getJSON(u) { if (!/state\.json|site\.json/.test(u)) u += "?v=" + DATA_V; const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
  function loadSurah(n) {
    if (!surahCache.has(n)) surahCache.set(n, getJSON(`data/s/${String(n).padStart(3, "0")}.json`).catch((e) => { surahCache.delete(n); throw e; }));
    return surahCache.get(n);
  }
  const firstReal = (ay) => { const w = ay.w.find((x) => !x[3]); return w ? w[0] : null; };
  const lastReal = (ay) => { for (let i = ay.w.length - 1; i >= 0; i--) if (!ay.w[i][3]) return ay.w[i][0]; return null; };
  function analyze(S, ai, m) {
    m = m || mode();
    const key = `${S.n}:${ai}:${m}:${anVersion}`;
    if (anCache.has(key)) return anCache.get(key);
    const ay = S.ayahs[ai];
    const idx = [], words = [];
    ay.w.forEach((w, i) => { if (!w[3]) { idx.push(i); words.push(w[0]); } });
    const W = T.analyzeAyah(words, { settings: engineSettings(m), prevWord: ai > 0 ? lastReal(S.ayahs[ai - 1]) : null,
      nextWord: ai < S.ayahs.length - 1 ? firstReal(S.ayahs[ai + 1]) : (S.n === 114 || S.n === 8 ? null : META.basmala[0][0]) });
    const out = ay.w.map(() => null);
    idx.forEach((wi, k) => (out[wi] = W[k]));
    anCache.set(key, out);
    return out;
  }
  let BASMALA_AN = null;
  function basmalaAn() {
    const key = "b" + anVersion;
    if (!BASMALA_AN || BASMALA_AN.key !== key) BASMALA_AN = { key, W: T.analyzeAyah(META.basmala.map((w) => w[0]), { settings: engineSettings("waqf") }) };
    return BASMALA_AN.W;
  }
  const occKey = (s, a, wi) => `o:${s}:${a}:${wi}`;
  function ovFor(s, a, wi, text) {
    const f = STATE.overrides["f:" + text], o = STATE.overrides[occKey(s, a, wi)];
    if (!f && !o) return null;
    return Object.assign({}, f || {}, o || {});
  }
  const colorsFor = (an, vis, ov) => (an ? T.resolve(an, vis, PRIORITY, ov) : null);

  /* ---------------- drawing: pre-shaped glyphs as SVG ---------------- */
  function buildDefs() {
    const parts = [];
    for (const gid in GLY) if (GLY[gid][0]) {
      parts.push(`<path id="g${gid}" d="${GLY[gid][0]}"/>`);
      if (GLY[gid][5]) parts.push(`<path id="g${gid}a" d="${GLY[gid][5]}"/><path id="g${gid}b" d="${GLY[gid][6]}"/>`); // tanween: two strokes
    }
    $("#gdefs").innerHTML = `<defs>${parts.join("")}</defs>`;
  }
  function pickCat(colors, idxs) {
    if (!colors || !idxs) return null;
    let best = null, br = 1e9, hide = false;
    for (const i of idxs) {
      const k = colors[i];
      if (!k) continue;
      if (k === "__hide") { hide = true; continue; }
      const r = RANK.has(k) ? RANK.get(k) : 900;
      if (r < br) { br = r; best = k; }
    }
    return best || (hide ? "__hide" : null);
  }
  /** Which characters each glyph draws. A mark merged into another mark glyph (shadda + fatha) belongs to
      that mark glyph, never to the letter body; a letter merged by lam-alef belongs to the ligature. */
  const MARK_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0654\u0655\u200F]/;
  const covCache = new Map();
  const TAN_CH = "\u064B\u064C\u064D\u0657\u065E\u0656\u08F0\u08F1\u08F2", IQ_CH = "\u06E2\u06ED";
  const WASL_RE = /^ا[\u064E\u064F\u0650][\u06EC\u06EA\u06DF]/;
  let WASL_ALT = null;
  let HIT = false; // when true, glyphs carry their character index so a tap can find the letter
  function coverage(text, g) {
    let cov = covCache.get(text);
    if (cov) return cov;
    const chars = Array.from(text), n = chars.length;
    const present = new Set();
    for (let i = 1; i < g.length; i += 4) present.add(g[i]);
    const owner = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (present.has(i)) { owner[i] = i; continue; }
      if (MARK_RE.test(chars[i])) {
        let b = i; while (b > 0 && MARK_RE.test(chars[b])) b--;
        let nb = i + 1; while (nb < n && MARK_RE.test(chars[nb])) nb++;
        let best = -1;
        for (let j = b + 1; j < nb; j++) if (j !== i && present.has(j) && MARK_RE.test(chars[j]) && (best < 0 || Math.abs(j - i) < Math.abs(best - i))) best = j;
        if (best >= 0) { owner[i] = best; continue; }
      }
      let j = i; while (j >= 0 && !present.has(j)) j--;
      owner[i] = j;
    }
    cov = new Map();
    owner.forEach((c, i) => { if (c < 0) return; if (!cov.has(c)) cov.set(c, []); cov.get(c).push(i); });
    covCache.set(text, cov);
    return cov;
  }
  /** Colour of one drawn part. A split glyph has two parts: the first stroke (the letter's haraka) and the second
      (the tanween's noon, or the small meem of iqlab). `colors.direct` (the student's own painting) wins when present. */
  function partCats(text, c, idxs, colors, split) {
    if (colors && colors.direct) return [colors.direct.get(String(c)) || null, colors.direct.get(c + "b") || null];
    if (!split || !idxs) return [pickCat(colors, idxs), null];
    const iq = idxs.find((j) => IQ_CH.includes(text[j])), tn = idxs.find((j) => TAN_CH.includes(text[j]));
    if (iq != null) return [pickCat(colors, idxs.filter((j) => j !== iq)), (colors && colors[iq]) || null];
    if (tn != null) return [(colors && colors[tn]) || null, (colors && colors.s2 && colors.s2[tn]) || null];
    const sh = idxs.find((j) => text[j] === "\u0651"), hk = idxs.find((j) => "\u064E\u064F\u0650".includes(text[j]));
    if (sh != null && hk != null) return [(colors && colors[sh]) || null, (colors && colors[hk]) || null]; // shadda, then its haraka
    const k = pickCat(colors, idxs); return [k, k];
  }
  const paint = (cat) => (cat ? ` class="k-${cat}"` : "");
  /** Every drawn part of a word with the colour it should take: Map "cluster" | "cluster b" → category. */
  function partsOf(wd, colors) {
    const text = wd[0], g = wd[2], cov = coverage(text, g), out = new Map();
    for (let i = 0; i < g.length; i += 4) {
      const e = GLY[g[i]], c = g[i + 1];
      if (!e || !e[0]) continue;
      const [ca, cb] = partCats(text, c, cov.get(c), colors, !!e[5]);
      out.set(String(c), ca); if (e[5]) out.set(c + "b", cb);
    }
    return out;
  }
  /** wd = [text, advance, flat glyphs [gid, cluster, x, y, …]]; colors = category per char; range limits to chars [from, to). */
  function wordSVG(wd, colors, range) {
    if (typeof wd[0] === "number") wd = ["", wd[0], wd[1]]; // ayah-end ornament: [advance, glyphs]
    const text = wd[0], adv = wd[1], g = wd[2];
    const cov = coverage(text, g);
    let minX = range ? 1e9 : 0, maxX = range ? -1e9 : adv, uses = "";
    const alt = WASL_ALT && WASL_RE.test(text) ? WASL_ALT(wd) : null; // hamzat al-wasl drill: draw another alif form
    for (let i = 0; i < g.length; i += 4) {
      const gid = g[i], c = g[i + 1], x = g[i + 2], y = g[i + 3];
      const e = GLY[gid];
      if (!e || !e[0]) continue;
      if (alt && c <= 2) { // the wasl head: the alif (cluster 0) and its dot (cluster 2) give way to the student's form
        if (c !== 0) continue;
        let ax = 0; for (let j = 0; j < alt[1].length; j += 4) if (alt[1][j + 1] === 0) ax = alt[1][j + 2];
        for (let j = 0; j < alt[1].length; j += 4) { const e2 = GLY[alt[1][j]]; if (e2 && e2[0]) uses += `<use href="#g${alt[1][j]}" transform="translate(${x - ax + alt[1][j + 2]} ${-alt[1][j + 3]}) scale(1 -1)"${alt[2] ? ` class="${alt[2]}"` : ""}/>`; }
        minX = Math.min(minX, x + e[1]); maxX = Math.max(maxX, x + e[3]);
        continue;
      }
      if (range && (c < range[0] || c >= range[1])) continue;
      minX = Math.min(minX, x + e[1]); maxX = Math.max(maxX, x + e[3]);
      const idxs = cov.get(c), hit = HIT ? ` data-c="${c}"` : "", tf = `transform="translate(${x} ${-y}) scale(1 -1)"`;
      if (e[5] && idxs) {
        const [ca, cb] = partCats(text, c, idxs, colors, true);
        uses += `<use href="#g${gid}a" ${tf}${paint(ca)}${hit}/><use href="#g${gid}b" ${tf}${paint(cb)}${hit}${HIT ? ' data-s="b"' : ""}/>`;
        continue;
      }
      const cat = partCats(text, c, idxs, colors, false)[0];
      uses += `<use href="#g${gid}" ${tf}${paint(cat)}${hit}/>`;
    }
    if (minX > maxX) { minX = 0; maxX = adv || 1; }
    const pad = 20, w = maxX - minX + pad * 2, h = YMAX - YMIN;
    return `<svg class="qw" viewBox="${minX - pad} ${-YMAX} ${w} ${h}" style="width:${(w / UPEM).toFixed(3)}em;height:${(h / UPEM).toFixed(3)}em" aria-hidden="true" focusable="false">${uses}</svg>`;
  }

  /* ---------------- shell ---------------- */
  function toast(msg, ms) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms || 3800);
  }
  const ROUTES = ["home", "mushaf", "practice", "progress", "students", "about", "admin"];
  function route() {
    readSchoolLink();
    let r = (location.hash || "#home").slice(1);
    if (!ROUTES.includes(r)) r = "home";
    const sl = $("#studentsLink"); if (sl) sl.hidden = !SK();
    if (r === "admin" && !CAN_EDIT) r = "admin";
    for (const v of $$(".view")) v.hidden = v.id !== "v-" + r;
    for (const a of $$(".nav a")) a.setAttribute("aria-current", a.getAttribute("href") === "#" + r ? "page" : "false");
    closeSheet();
    if (r === "home") renderHome();
    else if (r === "mushaf") renderMushaf();
    else if (r === "practice") renderPractice();
    else if (r === "progress") renderProgress();
    else if (r === "students") renderStudents();
    else if (r === "about") renderAbout();
    else if (r === "admin") renderAdmin();
    window.scrollTo(0, 0);
    setTopH();
  }
  function setTopH() { const h = $(".top"); if (h) document.documentElement.style.setProperty("--topH", h.offsetHeight + "px"); }

  /* ---------------- home: the surahs, and the tabs of one surah ---------------- */
  function renderHome() {
    const best = bestScores(), doneOf = (n) => drillsFor(n).filter((k) => (best.get(n + "|" + k) || 0) >= 80).length;
    const card = (s) => { const d = doneOf(s.n), all = drillsFor(s.n).length; return `<button class="scard${d === all ? " alldone" : ""}" data-s="${s.n}"><span class="snum">${AR(s.n)}</span><span class="sname">${esc(s.ar)}</span><span class="scount">${AR(s.count)} ${s.count > 10 ? "آية" : "آيات"}${d ? ` · <b class="sdone">✓ ${AR(d)}/${AR(all)}</b>` : ""}</span></button>`; };
    const me = TOK() ? ME : null, lvl = me && me.level, cohort = me && me.cohort;
    const last = LS.get("attempts", []).slice(-1)[0], cont = last ? META.surahs[last.s - 1] : null;
    const juz = META.surahs.filter((s) => s.n >= 78), rest = META.surahs.filter((s) => s.n > 1 && s.n < 78);
    const next = me && (me.sessions || []).length ? me.sessions[0] : null;
    const allSurahs = `<div class="sgrid one">${card(META.surahs[0])}</div><h3 class="sec">جزء عمّ</h3><div class="sgrid">${juz.map(card).join("")}</div>
      <details class="allsurahs"><summary>باقي سور القرآن</summary><div class="sgrid">${rest.map(card).join("")}</div></details>`;
    $("#v-home").innerHTML = `<div class="hero"><h2 class="page-title">${me ? `السلام عليكم يا ${esc(me.student.name)}` : "أكاديمية الزيتونة للقرآن الكريم"}</h2>
      <p class="lead">${me ? `${lvl && lvl.program ? esc(lvl.program) + " · " : ""}${lvl ? esc(lvl.name) : ""}${cohort ? " · " + esc(cohort.name) : ""}` : "دورة «الطريق إلى الإتقان» بطريقة الشيخ المقرئ محمّد بن عبد الله جوّاد · برواية قالون عن نافع."}</p></div>
      ${SK() ? `<div class="card cheikh"><b>أهلاً بك شيخنا.</b> <a class="btn primary" href="#students">متابعة الطلاب</a></div>` : ""}
      ${me && cohort ? `<div class="card live">${cohort.live_url ? `<a class="btn primary" target="_blank" rel="noopener" href="${esc(cohort.live_url)}">🎥 ادخل الحصة المباشرة</a>` : ""}
        <span class="grow">${cohort.schedule ? "موعد الحصص: " + esc(cohort.schedule) : ""}${next ? `${cohort.schedule ? " · " : ""}آخر حصة: ${fmtDate(next.at)}${next.surah ? " · " + esc(sName(next.surah)) : ""}` : ""}</span></div>` : ""}
      ${!me ? joinCardHTML() : ""}
      ${lessonLinks().length ? `<div class="card live">${lessonLinks().map((l) => `<a class="btn" target="_blank" rel="noopener" href="${esc(l.url)}">${l.icon} ${esc(l.label)}</a>`).join("")}</div>` : ""}
      ${cont ? `<p><button class="btn" data-s="${cont.n}">↩ تابع من حيث توقّفت: سورة ${esc(cont.ar)}</button></p>` : ""}
      ${lvl && lvl.surahs.length ? `<h3 class="sec">سور ${esc(lvl.name)}</h3><div class="sgrid">${lvl.surahs.map((n) => META.surahs[n - 1]).filter(Boolean).map(card).join("")}</div>
        <details class="allsurahs"><summary>تدرّب على سور أخرى</summary>${allSurahs}</details>` : allSurahs}
      <p class="note">في كل سورة: اقرأ الدرس ملوّناً واضغط الكلمة لتسمع نطق الشيخ، ثم تمارينه بالترتيب، ثم امتحن نفسك في «وضع الامتحان».</p>`;
    bindJoin($("#v-home"));
    $$("#v-home [data-s]").forEach((b) => (b.onclick = () => { ui.surah = +b.dataset.s; LS.set("surah", ui.surah); location.hash = "#mushaf"; }));
  }
  const STABS = [["show", "الدرس"], ["paint", "التلوين"], ["time", "أزمنة الحروف"], ["nun", "النون والميم"], ["madd", "المدود"], ["ra", "الراءات"], ["huruf", "المخارج والصفات"], ["wasl", "همزة الوصل"]];
  /** Best score per surah and drill, from the attempts kept on this device: "surah|kind" → percent. */
  function bestScores() { const m = new Map(); for (const a of LS.get("attempts", [])) { if (!a.n) continue; const k = a.s + "|" + a.k, pc = Math.round((a.r / a.n) * 100) - (a.x ? 1 : 0); if (!m.has(k) || m.get(k) < pc) m.set(k, pc); } return m; }
  const DRILLS = ["paint", "time", "nun", "wasl"], ALL_DRILLS = ["paint", "time", "nun", "madd", "ra", "huruf", "wasl"];
  /** The drills of a level, as the cheikh chose them (all of them when he chose none). */
  const lvlDrills = (l) => { const d = l && l.config && l.config.drills; return d && d.length ? ALL_DRILLS.filter((k) => d.includes(k)) : ALL_DRILLS; };
  const drillsFor = (n) => { const l = TOK() && ME && ME.level; return l && l.surahs.includes(n) ? lvlDrills(l) : ALL_DRILLS; };
  const surahTabs = (active) => { const b = bestScores(), n = location.hash === "#practice" ? P.surah : ui.surah; const ds = drillsFor(n); return `<div class="stabs" id="stabs">${STABS.filter(([k]) => k === "show" || ds.includes(k)).map(([k, l], i) => { const pc = b.get(n + "|" + k); return `<button data-st="${k}" aria-pressed="${active === k}"><span class="stepn">${AR(i + 1)}</span>${l}${pc != null ? `<span class="done${pc >= 80 ? " ok" : ""}">${pc >= 80 ? "✓" : AR(Math.max(0, pc)) + "%"}</span>` : ""}</button>`; }).join("")}</div>`; };
  function bindSurahTabs(root) {
    $$("#stabs button", root).forEach((b) => (b.onclick = () => {
      const k = b.dataset.st;
      if (k === "show") { ui.surah = P.surah && (location.hash === "#practice") ? P.surah : ui.surah; LS.set("surah", ui.surah); location.hash = "#mushaf"; return; }
      if (location.hash !== "#practice") { P.surah = ui.surah; P.ai = defAi(P.surah); }
      P.kind = k; P.exam = false; if (k !== "paint") P.mode = P.mode || "show"; resetExercise();
      if (location.hash === "#practice") renderPractice(); else location.hash = "#practice";
    }));
  }
  const surahHead = (n) => `<div class="shead"><a class="btn ghost" href="#home">→ السور</a><h2 class="page-title" style="margin:0">سورة ${esc(META.surahs[n - 1].ar)}</h2><span class="scount">${AR(META.surahs[n - 1].count)} آية · رواية قالون عن نافع</span></div>`;

  /* ---------------- product tour ---------------- */
  const TOURS = {
    student: [
      ["مرحباً بك في «الطريق إلى الإتقان»", "تتعلّم هنا تلاوة القرآن برواية قالون بطريقة الألوان للشيخ محمّد بن عبد الله جوّاد."],
      ["1 · انضمّ إلى دفعتك", "اكتب رمز الدفعة الذي أعطاك إياه الشيخ واسمك في الصفحة الرئيسية، فتظهر لك سور مستواك ورابط الحصة المباشرة."],
      ["2 · اقرأ ثم تمرّن", "افتح السورة: تراها ملوّنة، واضغط أي كلمة لتكبيرها وسماع نطق الشيخ. ثم تمرّن على خطواتها: التلوين، أزمنة الحروف، الميم والنون، همزة الوصل."],
      ["3 · امتحن نفسك", "«وضع الامتحان» يخفي الحل ويقبل التسليم مرة واحدة. نتائجك وحضورك وتقييم الشيخ في «نتائجي»، وتصل نتائجك إلى الشيخ وحدها."],
    ],
    cheikh: [
      ["مرحباً بك شيخنا", "ثلاث صفحات لك: «دروسي» كما يراها الطالب، و«الطلاب» للمتابعة، و«الإعدادات» للألوان والفيديو."],
      ["1 · المستويات والدفعات", "في «الطلاب» أضف سور كل مستوى، وأنشئ دفعة واختر مستواها، ثم أرسل رابط الدفعة للطلاب عبر واتساب أو تيليغرام."],
      ["2 · الحضور والتقييم", "في كل حصة سجّل الحضور بضغطة، وقيّم تلاوة الطالب على سبعة معايير من 10."],
      ["3 · التقارير", "«نظرة عامة» تجمع الحضور والتمارين والتقييم والأخطاء المشتركة، ولكل طالب تقرير تطبعه PDF."],
    ],
  };
  function startTour(kind) {
    const steps = TOURS[kind] || TOURS.student; let i = 0;
    const root = $("#stageRoot");
    const draw = () => {
      root.innerHTML = `<div class="scrim" data-x></div><section class="tour" role="dialog" aria-label="جولة تعريفية">
        <div class="tour-dots">${steps.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>
        <h3>${esc(steps[i][0])}</h3><p>${esc(steps[i][1])}</p>
        <div class="bar"><button class="btn ghost" data-x>تخطَّ</button><span class="grow"></span>${i ? `<button class="btn" id="tPrev">السابق</button>` : ""}<button class="btn primary" id="tNext">${i === steps.length - 1 ? "ابدأ" : "التالي"}</button></div></section>`;
      $$("[data-x]", root).forEach((b) => (b.onclick = end));
      if (i) $("#tPrev", root).onclick = () => { i--; draw(); };
      $("#tNext", root).onclick = () => { if (i === steps.length - 1) end(); else { i++; draw(); } };
      $("#tNext", root).focus();
    };
    const end = () => { root.innerHTML = ""; LS.set("tour:" + kind, 1); };
    draw();
  }
  function maybeTour() {
    if ((location.hash || "").length > 1 && !/^#(home|mushaf)$/.test(location.hash)) return;
    if (CAN_EDIT || SK()) { if (!LS.get("tour:cheikh", 0)) startTour("cheikh"); }
    else if (!LS.get("tour:student", 0)) startTour("student");
  }

  /* ---------------- legend ---------------- */
  function legendHTML() {
    const cats = availableCats();
    return cats.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${!ui.hidden.has(c.id)}" style="--dot:var(--c-${c.id})" title="${esc(c.short || "")}"><span class="dot"></span>${esc(c.name)}</button>`).join("")
      + `<span class="legend-all"><button class="linkbtn" data-legend="all">إظهار الكل</button><button class="linkbtn" data-legend="none">إخفاء الكل</button></span>`;
  }
  function bindLegend(root, rerender) {
    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-cat]");
      const all = e.target.closest("[data-legend]");
      if (chip) { const id = chip.dataset.cat; ui.hidden.has(id) ? ui.hidden.delete(id) : ui.hidden.add(id); }
      else if (all) { if (all.dataset.legend === "all") availableCats().forEach((c) => ui.hidden.delete(c.id)); else availableCats().forEach((c) => ui.hidden.add(c.id)); }
      else return;
      LS.set("hidden", Array.from(ui.hidden));
      root.innerHTML = legendHTML();
      rerender();
    });
  }

  /* ---------------- mushaf ---------------- */
  let CUR = null;
  async function renderMushaf() {
    const v = $("#v-mushaf");
    v.innerHTML = `
      ${surahHead(ui.surah)}${surahTabs("show")}
      ${CAN_EDIT ? `<div class="lesson-banner"><h3>أدوات الشيخ</h3><p>اضغط رقم الآية ${canRecord() ? "لتسجيل تلاوتها بالكاميرا" : "لإضافة فيديو تلاوتها"}، واضغط أي كلمة لتعديل ألوانها أو تسجيل نطقها.</p></div>` : ""}
      <div class="bar">
        <div class="field" aria-label="حجم الخط"><button class="iconbtn" id="fsDown" aria-label="تصغير الخط">−</button><button class="iconbtn" id="fsUp" aria-label="تكبير الخط">+</button></div>
        ${STATIC ? `<button class="btn" id="stuRec">🎙 سمّع تلاوتك</button><button class="btn" id="pdfBtn">🖨 السورة PDF</button><button class="btn" id="traceBtn" title="تدريب: اكتب السورة مع الضبط">✍ ورقة الكتابة</button>` : ""}
        <span class="grow note">اضغط أي كلمة لتكبيرها وسماع نطق الشيخ.</span>
      </div>
      <div class="legend" id="legend">${legendHTML()}</div>
      <article class="page" id="page" style="--q:${ui.size}px"><div class="loading"><div class="bar-l"><i></i></div><span>تحميل السورة…</span></div></article>`;
    bindLegend($("#legend", v), () => redrawMushaf());
    bindSurahTabs(v);
    $("#fsDown", v).onclick = () => setSize(-2);
    $("#fsUp", v).onclick = () => setSize(2);
    if ($("#stuRec", v)) { $("#stuRec", v).onclick = () => studentRecorder(); $("#pdfBtn", v).onclick = () => printSurah(); $("#traceBtn", v).onclick = () => printSurah(true); }
    try { CUR = await loadSurah(ui.surah); } catch (e) { $("#page").innerHTML = `<p class="empty">تعذّر تحميل السورة. تحقّق من الاتصال ثم أعد المحاولة.</p>`; return; }
    ui.rendered = 0;
    drawPage();
  }
  /** The student records his own recitation while reading; the file stays on his device and can be downloaded. */
  function studentRecorder() {
    let bar = $("#srec");
    if (bar) { bar.remove(); return; }
    if (!(navigator.mediaDevices && window.MediaRecorder)) { toast("هذا المتصفح لا يدعم التسجيل."); return; }
    bar = document.createElement("div"); bar.id = "srec"; bar.className = "srec";
    $("#legend").before(bar);
    let stream = null, rec = null, chunks = [], t0 = 0, timer = null;
    const idle = (msg) => { bar.innerHTML = `<button class="btn primary" id="srGo">● ابدأ التسجيل</button><span class="grow">${msg || "اقرأ من المصحف أمامك، ثم استمع إلى تلاوتك أو نزّلها. التسجيل يبقى على جهازك فقط."}</span><button class="iconbtn" id="srX" aria-label="إغلاق">✕</button>`; $("#srGo", bar).onclick = start; $("#srX", bar).onclick = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); bar.remove(); }; };
    async function start() {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { idle("لم يُسمح باستعمال الميكروفون. اسمح به من إعدادات المتصفح ثم أعد المحاولة."); return; }
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); stream = null;
        const type = (rec.mimeType || "audio/webm").split(";")[0], ext = /mp4|aac|m4a/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm";
        const url = URL.createObjectURL(new Blob(chunks, { type }));
        const name = `تلاوتي-${META.surahs[ui.surah - 1].ar}.${ext}`;
        const blob = new Blob(chunks, { type }); let file = null, canShare = false;
        try { file = new File([blob], name, { type }); canShare = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) {}
        bar.innerHTML = `<audio controls src="${url}" style="flex:1;min-width:180px"></audio><a class="btn primary" href="${url}" download="${esc(name)}">⬇ تنزيل</a>${canShare ? `<button class="btn" id="srShare">📤 أرسل إلى الشيخ</button>` : ""}<button class="btn" id="srAgain">↺ من جديد</button><button class="iconbtn" id="srX" aria-label="إغلاق">✕</button>`;
        $("#srAgain", bar).onclick = () => idle(); $("#srX", bar).onclick = () => bar.remove();
        if (canShare) $("#srShare", bar).onclick = () => navigator.share({ files: [file], title: name, text: `تلاوتي لسورة ${META.surahs[ui.surah - 1].ar}` }).catch(() => {});
      };
      rec.start(1000); t0 = Date.now();
      bar.innerHTML = `<button class="btn danger" id="srStop">■ إيقاف</button><span class="rec-timer" id="srT">0:00</span><span class="grow">جارٍ التسجيل… اقرأ الآن.</span>`;
      $("#srStop", bar).onclick = () => rec.stop();
      timer = setInterval(() => { const sec = (Date.now() - t0) / 1000; $("#srT", bar).textContent = mmss(sec); }, 500);
    }
    idle();
  }
  /** The surah as a framed page; with `trace`, the cheikh's first drill: the text in faint outline to write over with its dabt. */
  function printSurah(trace) {
    if (!CUR) return;
    if (ui.rendered < CUR.ayahs.length) appendAyahs(CUR.ayahs.length - ui.rendered);
    document.body.classList.toggle("trace", !!trace);
    toast("اختر «حفظ بصيغة PDF» في نافذة الطباعة.", 5000);
    setTimeout(() => { window.print(); document.body.classList.remove("trace"); }, 400);
  }
  function setSize(d) { ui.size = Math.max(20, Math.min(72, ui.size + d)); LS.set("size", ui.size); const p = $("#page"); if (p) p.style.setProperty("--q", ui.size + "px"); }
  function drawPage() {
    const S = CUR, s = META.surahs[S.n - 1];
    const page = $("#page");
    const showBasmala = S.n !== 9;
    const key = CORE.map((id) => CATMAP.get(id)).filter(Boolean).map((c) => `<span style="--c:var(--c-${c.id})"><i></i>${esc(c.name)}</span>`).join("");
    page.innerHTML = `<div class="print-only print-head"><b>الطريق إلى الإتقان</b><span class="trace-only">تدريب: اكتب السورة مع الضبط</span><span>رواية قالون عن نافع · الشيخ المقرئ محمّد بن عبد الله جوّاد</span></div>
      <div class="cartouche"><h2>سورة ${esc(s.ar)}</h2><span>${AR(s.count)} آية · الجزء ${AR(s.juz)} · الصفحة ${AR(s.page)}</span></div>
      ${showBasmala ? `<div class="basmala">${basmalaHTML()}</div>` : ""}
      <div class="mushaf" id="mushaf"></div><div class="more" id="more"></div>
      <div class="print-only print-key">${key}</div>`;
    ui.rendered = 0;
    appendAyahs(40);
  }
  function basmalaHTML() {
    const W = basmalaAn(), vis = visibleSet();
    return META.basmala.map((wd, i) => `<span class="w">${wordSVG(wd, colorsFor(W[i], vis, STATE.overrides["f:" + wd[0]] || null))}</span>`).join(" ");
  }
  function ayahHTML(S, ai, vis) {
    const ay = S.ayahs[ai];
    const an = analyze(S, ai);
    let h = `<span class="ayah" data-ai="${ai}">`;
    ay.w.forEach((wd, wi) => {
      if (wd[3]) { h += `<span class="w sym">${wordSVG(wd, null)}</span> `; return; }
      const colors = colorsFor(an[wi], vis, ovFor(S.n, ay.a, wi, wd[0]));
      h += `<button class="w" data-ai="${ai}" data-wi="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, colors)}</button> `;
    });
    h += `<button class="ae" data-ai="${ai}" aria-label="نهاية الآية ${AR(ay.a)}">${wordSVG(ay.e, null)}</button> </span>`;
    return h;
  }
  let moreObs = null;
  function appendAyahs(count) {
    const S = CUR, box = $("#mushaf");
    if (!box) return;
    const vis = visibleSet();
    const from = ui.rendered, to = Math.min(S.ayahs.length, from + count);
    let h = "";
    for (let ai = from; ai < to; ai++) h += ayahHTML(S, ai, vis);
    box.insertAdjacentHTML("beforeend", h);
    ui.rendered = to;
    const more = $("#more");
    if (moreObs) moreObs.disconnect();
    if (to < S.ayahs.length) {
      more.innerHTML = `<button class="btn" id="moreBtn">عرض الآيات التالية (${AR(to + 1)}–${AR(Math.min(S.ayahs.length, to + 40))})</button>`;
      $("#moreBtn").onclick = () => appendAyahs(40);
      if ("IntersectionObserver" in window) { moreObs = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) appendAyahs(40); }, { rootMargin: "600px" }); moreObs.observe(more); }
    } else more.innerHTML = "";
  }
  function redrawMushaf() {
    if (!CUR || !$("#mushaf")) return;
    const n = ui.rendered;
    const y = window.scrollY;
    const b = $(".basmala"); if (b) b.innerHTML = basmalaHTML();
    $("#mushaf").innerHTML = ""; ui.rendered = 0;
    appendAyahs(Math.max(n, 40));
    window.scrollTo(0, y);
  }
  function gotoAyah(a) {
    if (!CUR || !a) return;
    const ai = CUR.ayahs.findIndex((x) => x.a === a);
    if (ai < 0) { toast(`السورة ${AR(CUR.ayahs.length)} آية فقط.`); return; }
    if (ai >= ui.rendered) appendAyahs(ai - ui.rendered + 10);
    const el = $(`.ayah[data-ai="${ai}"]`);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); const w = $(".w", el); if (w) { w.classList.add("sel"); setTimeout(() => w.classList.remove("sel"), 1600); } }
  }

  /* ---------------- word sheet ---------------- */
  let SHEET = null;
  function closeSheet() { $("#sheetRoot").innerHTML = ""; SHEET = null; $$(".w.sel").forEach((x) => x.classList.remove("sel")); }
  function wordMedia(s, a, wi, text) {
    const id = STATE.videos[occKey(s, a, wi)] || STATE.videos["f:" + text];
    if (id) return { src: blobUrl(id), whole: true };
    const aid = STATE.videos[`a:${s}:${a}`], tm = STATE.timings[`a:${s}:${a}`];
    if (aid && tm && tm.length) {
      const i = tm.findIndex((x) => x[0] === wi);
      if (i >= 0) return { src: blobUrl(aid), start: tm[i][1], end: tm[i + 1] ? tm[i + 1][1] : null };
    }
    return null;
  }
  function playMedia(video, m, loop) {
    if (!m) return;
    if (video.getAttribute("src") !== m.src) video.src = m.src;
    video.loop = !!(loop && m.whole);
    const start = () => { try { video.currentTime = m.start || 0; } catch (e) { /* not seekable yet */ } video.play().catch(() => {}); };
    if (video.readyState >= 1) start(); else video.addEventListener("loadedmetadata", start, { once: true });
    video.ontimeupdate = () => { if (m.end != null && video.currentTime >= m.end) { if (loop) video.currentTime = m.start || 0; else video.pause(); } };
  }
  function unitsOf(an) {
    // char range per unit: [b, next unit b)
    return an.units.map((u, k) => ({ u, from: u.b, to: k + 1 < an.units.length ? an.units[k + 1].b : an.chars.length }));
  }
  const ROLE_LABEL = { wasl: "همزة وصل", silentWasl: "ألف وصل لا تُنطق", zaid: "لا يُنطق", lamShams: "لام مدغمة", madd: "حرف مدّ", tanAlif: "ألف التنوين", tashil: "همزة مسهّلة" };
  function openWord(S, ai, wi, from) {
    const ay = S.ayahs[ai], wd = ay.w[wi];
    if (!wd || wd[3]) return;
    $$(".w.sel").forEach((x) => x.classList.remove("sel"));
    const btn = $(`#mushaf .w[data-ai="${ai}"][data-wi="${wi}"]`); if (btn) btn.classList.add("sel");
    SHEET = { S, ai, wi, from, scope: "o", draft: null };
    drawSheet();
  }
  function drawSheet() {
    if (!SHEET) return;
    const { S, ai, wi } = SHEET;
    const ay = S.ayahs[ai], wd = ay.w[wi], an = analyze(S, ai)[wi];
    const vis = visibleSet();
    const ov = SHEET.draft ? Object.assign({}, ovFor(S.n, ay.a, wi, wd[0]) || {}, SHEET.draft) : ovFor(S.n, ay.a, wi, wd[0]);
    const colors = colorsFor(an, vis, ov);
    const media = wordMedia(S.n, ay.a, wi, wd[0]);
    const note = STATE.notes[occKey(S.n, ay.a, wi)] || STATE.notes["f:" + wd[0]] || "";
    const repKey = "f:" + wd[0];
    const reps = LS.get("reps", {});
    const r = reps[repKey] || { n: 0, target: 5 };
    const sname = META.surahs[S.n - 1].ar;
    // letter cards
    const allVis = new Set(ALLCATS.filter((c) => c.on || vis.has(c.id)).map((c) => c.id));
    const cards = unitsOf(an).map(({ u, from, to }) => {
      const seen = new Map();
      for (let i = from; i < to; i++) for (const c of an.cand[i]) if (allVis.has(c.cat) && !seen.has(c.cat)) seen.set(c.cat, c.why);
      const items = Array.from(seen.entries()).sort((a, b) => (RANK.get(a[0]) || 0) - (RANK.get(b[0]) || 0))
        .map(([cat, why]) => `<li><span class="dot" style="--dot:var(--c-${cat})"></span><span><b>${esc(CATMAP.get(cat).name)}</b>: ${esc(why)}</span></li>`).join("");
      const role = u.role && u.role !== "letter" ? `<span class="role">${esc(ROLE_LABEL[u.role] || "")}</span>` : "";
      return `<div class="unit"><div class="glyph">${wordSVG(wd, colors, [from, to])}</div><div>${role}<ul>${items || `<li class="role">لا حكم ملوّن على هذا الحرف</li>`}</ul></div></div>`;
    }).join("");
    const admin = CAN_EDIT ? adminWordHTML(an, wd, ov) : "";
    $("#sheetRoot").innerHTML = `<div class="scrim soft" data-close></div>
      <section class="sheet" role="dialog" aria-label="الكلمة">
        <div class="sheet-head"><h3>سورة ${esc(sname)} · الآية ${AR(ay.a)} · الكلمة ${AR(wi + 1)}</h3>
          <button class="iconbtn" data-nav="-1" aria-label="الكلمة السابقة">›</button><button class="iconbtn" data-nav="1" aria-label="الكلمة التالية">‹</button>
          <button class="iconbtn" data-close aria-label="إغلاق">✕</button></div>
        <div class="bigword">${wordSVG(wd, colors)}</div>
        <div class="section"><h4>نطق الشيخ</h4>
          ${media ? `<div class="video-box"><video id="wv" playsinline preload="metadata"></video>
            <div class="bar"><button class="btn primary" id="wPlay">▶ تشغيل</button><button class="btn" id="wLoop" aria-pressed="false">تكرار تلقائي</button>
            <div class="seg" id="wRate"><button data-r="0.5">0.5×</button><button data-r="0.75">0.75×</button><button data-r="1" aria-pressed="true">1×</button></div>
            <button class="btn" id="wStage">⛶ شاشة كاملة</button></div></div>`
            : `<div class="empty">لم يسجّل الشيخ نطق هذه الكلمة بعد. <button class="linkbtn" id="wStage">اعرض الكلمة بحجم كبير</button></div>`}
          ${note ? `<div class="note">${esc(note)}</div>` : ""}
        </div>
        <div class="section"><h4>التكرار</h4>
          <div class="reps"><button class="btn primary" id="repPlus">قرأتها ✓</button><span class="count">${AR(r.n)} / ${AR(r.target)}</span>
          <div class="seg" id="repTarget">${[3, 5, 10].map((t) => `<button data-t="${t}" aria-pressed="${r.target === t}">${AR(t)}</button>`).join("")}</div>
          <button class="linkbtn" id="repReset">من جديد</button></div></div>
        <div class="section"><h4>الحروف وأحكامها</h4><div class="units">${cards}</div></div>
        ${admin}
      </section>`;
    const root = $("#sheetRoot");
    $$("[data-close]", root).forEach((b) => (b.onclick = closeSheet));
    $$("[data-nav]", root).forEach((b) => (b.onclick = () => stepWord(+b.dataset.nav)));
    const video = $("#wv", root);
    let loop = false, rate = 1;
    if (video) {
      if (!SHEET.played) { SHEET.played = true; try { playMedia(video, media, false); } catch (e) { /* the play button remains */ } }
      $("#wPlay", root).onclick = () => { video.playbackRate = rate; playMedia(video, media, loop); };
      $("#wLoop", root).onclick = (e) => { loop = !loop; e.currentTarget.setAttribute("aria-pressed", loop); if (loop) { video.playbackRate = rate; playMedia(video, media, true); } };
      $$("#wRate button", root).forEach((b) => (b.onclick = () => { rate = +b.dataset.r; video.playbackRate = rate; $$("#wRate button", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
    }
    $("#wStage", root).onclick = () => { if (video) video.pause(); openStage(SHEET.S, SHEET.ai, SHEET.wi); };
    $("#repPlus", root).onclick = () => { const rr = LS.get("reps", {}); const x = rr[repKey] || { n: 0, target: r.target }; x.n++; rr[repKey] = x; LS.set("reps", rr); if (x.n === x.target) toast("أتممت العدد المطلوب. بارك الله فيك."); drawSheet(); };
    $$("#repTarget button", root).forEach((b) => (b.onclick = () => { const rr = LS.get("reps", {}); const x = rr[repKey] || { n: 0 }; x.target = +b.dataset.t; rr[repKey] = x; LS.set("reps", rr); drawSheet(); }));
    $("#repReset", root).onclick = () => { const rr = LS.get("reps", {}); if (rr[repKey]) rr[repKey].n = 0; LS.set("reps", rr); drawSheet(); };
    if (CAN_EDIT) bindAdminWord(root, an, wd);
  }
  function stepWord(d) {
    if (!SHEET) return;
    const pos = nextWordPos(SHEET.S, SHEET.ai, SHEET.wi, d);
    if (!pos) return;
    if (pos.ai >= ui.rendered && SHEET.from !== "practice" && CUR === SHEET.S) appendAyahs(pos.ai - ui.rendered + 5);
    openWord(SHEET.S, pos.ai, pos.wi, SHEET.from);
  }
  function nextWordPos(S, ai, wi, d) {
    let a = ai, w = wi;
    for (;;) {
      w += d;
      if (w < 0) { a--; if (a < 0) return null; w = S.ayahs[a].w.length - 1; }
      else if (w >= S.ayahs[a].w.length) { a++; if (a >= S.ayahs.length) return null; w = 0; }
      if (!S.ayahs[a].w[w][3]) return { ai: a, wi: w };
    }
  }

  /* ---------------- stage: big video + coloured word ---------------- */
  function openStage(S, ai, wi) {
    const root = $("#stageRoot");
    let pos = { ai, wi }, loop = true, rate = 1;
    const draw = () => {
      const ay = S.ayahs[pos.ai], wd = ay.w[pos.wi];
      const an = analyze(S, pos.ai)[pos.wi];
      const colors = colorsFor(an, visibleSet(), ovFor(S.n, ay.a, pos.wi, wd[0]));
      const media = wordMedia(S.n, ay.a, pos.wi, wd[0]);
      root.innerHTML = `<div class="stage" role="dialog" aria-label="عرض كبير">
        <div class="stage-top"><span class="title">سورة ${esc(META.surahs[S.n - 1].ar)} · الآية ${AR(ay.a)}</span><button class="iconbtn" id="sClose" aria-label="إغلاق">✕</button></div>
        ${media ? `<video id="sv" playsinline></video>` : `<div class="novideo">لم يسجّل الشيخ نطق هذه الكلمة بعد</div>`}
        <div class="stage-word"><div class="bigword">${wordSVG(wd, colors)}</div>
          <div class="stage-ctrl"><button class="btn" id="sPrev">› السابقة</button>${media ? `<button class="btn" id="sReplay">↺ إعادة</button><button class="btn" id="sLoop" aria-pressed="${loop}">${loop ? "التكرار: يعمل" : "التكرار: متوقف"}</button><button class="btn" id="sRate">السرعة ${AR(rate)}×</button>` : ""}<button class="btn" id="sNext">التالية ‹</button></div></div></div>`;
      const v = $("#sv", root);
      if (v) { v.playbackRate = rate; playMedia(v, media, loop); }
      $("#sClose", root).onclick = close;
      $("#sPrev", root).onclick = () => { const p = nextWordPos(S, pos.ai, pos.wi, -1); if (p) { pos = p; draw(); } };
      $("#sNext", root).onclick = () => { const p = nextWordPos(S, pos.ai, pos.wi, 1); if (p) { pos = p; draw(); } };
      if (v) {
        $("#sReplay", root).onclick = () => playMedia(v, media, loop);
        $("#sLoop", root).onclick = () => { loop = !loop; draw(); };
        $("#sRate", root).onclick = () => { rate = rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1; draw(); };
      }
    };
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
    const onKey = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowLeft") $("#sNext", root) && $("#sNext", root).click(); if (e.key === "ArrowRight") $("#sPrev", root) && $("#sPrev", root).click(); };
    document.addEventListener("keydown", onKey);
    draw();
    const el = $(".stage", root);
    if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  function openRecitation(S, ai) {
    const ay = S.ayahs[ai];
    const aid = STATE.videos[`a:${S.n}:${ay.a}`], tm = STATE.timings[`a:${S.n}:${ay.a}`] || [];
    const root = $("#stageRoot");
    const vis = visibleSet(), an = analyze(S, ai);
    const words = ay.w.map((wd, wi) => wd[3] ? `<span class="w sym">${wordSVG(wd, null)}</span>` : `<span class="w" data-wi="${wi}" style="background:none">${wordSVG(wd, colorsFor(an[wi], vis, ovFor(S.n, ay.a, wi, wd[0])))}</span>`).join(" ");
    root.innerHTML = `<div class="stage" role="dialog" aria-label="تلاوة الآية">
      <div class="stage-top"><span class="title">تلاوة الشيخ · سورة ${esc(META.surahs[S.n - 1].ar)} · الآية ${AR(ay.a)}</span><button class="iconbtn" id="sClose" aria-label="إغلاق">✕</button></div>
      <video id="sv" playsinline controls></video>
      <div class="stage-word"><div class="ayahline">${words}</div></div></div>`;
    const v = $("#sv", root);
    v.src = blobUrl(aid); v.play().catch(() => {});
    v.ontimeupdate = () => {
      let cur = -1;
      for (const [wi, t] of tm) if (v.currentTime >= t) cur = wi;
      $$(".ayahline .w", root).forEach((x) => { const on = +x.dataset.wi === cur; x.style.background = on ? "rgba(15,76,58,.18)" : "none"; });
    };
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    $("#sClose", root).onclick = close;
  }
  function openAyahMenu(S, ai) {
    const ay = S.ayahs[ai];
    const hasVid = STATE.videos[`a:${S.n}:${ay.a}`] && (STATE.timings[`a:${S.n}:${ay.a}`] || []).length;
    const hasRaw = STATE.videos[`a:${S.n}:${ay.a}`];
    $("#sheetRoot").innerHTML = `<div class="scrim" data-close></div><section class="sheet" role="dialog" aria-label="الآية">
      <div class="sheet-head"><h3>سورة ${esc(META.surahs[S.n - 1].ar)} · الآية ${AR(ay.a)}</h3><button class="iconbtn" data-close aria-label="إغلاق">✕</button></div>
      <div class="bar" style="margin-top:8px">
        <button class="btn primary" id="aTable">جدول التدريب لهذه الآية</button>
        ${hasRaw ? `<button class="btn" id="aPlay">▶ تلاوة الشيخ للآية</button>` : `<span class="empty">لا توجد تلاوة مسجّلة لهذه الآية بعد.</span>`}
      </div>
      ${CAN_EDIT ? `<div class="section"><h4>أدوات الشيخ</h4>${canRecord() ? `<div class="bar"><button class="btn primary" id="aRec">● تسجيل تلاوة الآية بالكاميرا</button></div>` : ""}<div class="bar">
        ${hasRaw ? `<button class="btn" id="aSync">مزامنة الكلمات${hasVid ? " (مُزامنة)" : ""}</button>` : ""}
      </div><h4>فيديو تلاوة الآية</h4>${videoControlsHTML("a", !!hasRaw)}</div>` : ""}
    </section>`;
    const root = $("#sheetRoot");
    $$("[data-close]", root).forEach((b) => (b.onclick = closeSheet));
    $("#aTable", root).onclick = () => { P.surah = S.n; P.ai = ai; P.mode = "show"; resetExercise(); closeSheet(); location.hash = "#practice"; if (location.hash === "#practice") renderPractice(); };
    if (hasRaw) $("#aPlay", root).onclick = () => { closeSheet(); openRecitation(S, ai); };
    if (CAN_EDIT) {
      bindVideoControls(root, "a", `a:${S.n}:${ay.a}`, (added) => { closeSheet(); if (added) openSync(S, ai); });
      const rec = $("#aRec", root);
      if (rec) rec.onclick = () => {
        closeSheet();
        openRecorder({ key: `a:${S.n}:${ay.a}`, ayahKey: true, title: `سورة ${META.surahs[S.n - 1].ar} · الآية ${AR(ay.a)}`,
          html: ay.w.map((wd, wi) => (wd[3] ? "" : `<span class="w">${wordSVG(wd, colorsFor(analyze(S, ai)[wi], visibleSet(), ovFor(S.n, ay.a, wi, wd[0])))}</span>`)).join(" "),
          done: (local) => openSync(S, ai, local) });
      };
      if (hasRaw) $("#aSync", root).onclick = () => { closeSheet(); openSync(S, ai); };
    }
  }
  function openSync(S, ai, local) {
    const ay = S.ayahs[ai], key = `a:${S.n}:${ay.a}`;
    const aid = STATE.videos[key];
    if (!aid && !local) return;
    const real = ay.w.map((w, i) => (w[3] ? -1 : i)).filter((i) => i >= 0);
    let k = 0, times = [];
    const root = $("#stageRoot");
    const draw = () => {
      const words = ay.w.map((wd, wi) => wd[3] ? "" : `<span class="w" data-wi="${wi}" style="background:${times.some((t) => t[0] === wi) ? "rgba(15,76,58,.16)" : "none"};${real[k] === wi ? "outline:2px solid #A88437;border-radius:6px" : ""}">${wordSVG(wd, null)}</span>`).join(" ");
      $(".ayahline", root).innerHTML = words;
      $("#syncNext", root).textContent = k < real.length ? `بداية الكلمة ${AR(k + 1)} من ${AR(real.length)} (مسافة)` : "انتهت الكلمات";
      $("#syncNext", root).disabled = k >= real.length;
      $("#syncSave", root).disabled = k < real.length;
    };
    root.innerHTML = `<div class="stage" role="dialog" aria-label="مزامنة الكلمات">
      <div class="stage-top"><span class="title">مزامنة الكلمات · الآية ${AR(ay.a)}: شغّل الفيديو واضغط الزر عند بداية كل كلمة</span><button class="iconbtn" id="sClose" aria-label="إغلاق">✕</button></div>
      <video id="sv" playsinline controls></video>
      <div class="stage-word"><div class="ayahline"></div>
        <div class="stage-ctrl"><button class="btn" id="syncAuto">توزيع تلقائي</button><button class="btn" id="syncStart">▶ ابدأ من البداية</button><button class="btn" id="syncNext">التالي</button><button class="btn" id="syncUndo">تراجع</button><button class="btn" id="syncSave">حفظ التوقيت</button></div></div></div>`;
    const v = $("#sv", root);
    v.src = local ? local.src : blobUrl(aid);
    $("#syncAuto", root).onclick = () => {
      const d = isFinite(v.duration) && v.duration > 0 ? v.duration : local && local.duration;
      if (!d) { toast("انتظر حتى يُحمَّل الفيديو ثم أعد المحاولة."); return; }
      const lens = real.map((wi) => plain(ay.w[wi][0]).length || 1), tot = lens.reduce((a, b) => a + b, 0);
      const lead = Math.min(0.4, d * 0.05), span = d - lead - Math.min(0.3, d * 0.03);
      let acc = 0;
      times = real.map((wi, i) => { const t = lead + (span * acc) / tot; acc += lens[i]; return [wi, t]; });
      k = real.length; draw();
      toast("وُزّعت الكلمات تقديرياً على مدة التلاوة. احفظ، أو اضغط «ابدأ من البداية» للضبط باليد.", 6000);
    };
    const mark = () => { if (k >= real.length) return; times.push([real[k], Math.max(0, v.currentTime - 0.05)]); k++; draw(); };
    $("#syncStart", root).onclick = () => { times = []; k = 0; v.currentTime = 0; v.play().catch(() => {}); draw(); };
    $("#syncNext", root).onclick = mark;
    $("#syncUndo", root).onclick = () => { if (k > 0) { k--; times.pop(); draw(); } };
    $("#syncSave", root).onclick = async () => { STATE.timings[key] = times.map((t) => [t[0], Math.round(t[1] * 100) / 100]); v.pause(); await persist(); close(); toast("حُفظ توقيت كلمات الآية."); };
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); if (e.code === "Space") { e.preventDefault(); mark(); } };
    document.addEventListener("keydown", onKey);
    $("#sClose", root).onclick = close;
    draw();
  }

  /* ---------------- cheikh tools inside the word sheet ---------------- */
  function slotList(an) {
    const out = [];
    for (const u of an.units) {
      out.push({ i: u.b, label: "الحرف " + (T.LETTER_NAME[u.L] || u.ch).replace(/^ال/, "") });
      for (const m of u.marks) {
        const name = { fatha: "الفتحة", damma: "الضمّة", kasra: "الكسرة", sukun: "السكون", shadda: "الشدّة", tanF: "تنوين الفتح", tanD: "تنوين الضم", tanK: "تنوين الكسر",
          otanF: "تنوين الفتح", otanD: "تنوين الضم", otanK: "تنوين الكسر", iqlab: "ميم الإقلاب", madd: "علامة المدّ", dagger: "الألف الصغيرة", swaw: "الواو الصغيرة",
          sya: "الياء الصغيرة", dot: "نقطة الضبط", dot2: "نقطة الضبط", hamza: "الهمزة", snoon: "النون الصغيرة", zero: "علامة الزيادة" }[m.t];
        if (name) out.push({ i: m.i, label: /tan/.test(m.t) ? name + " (العلامة الأولى)" : name, unit: u });
        if (/tan/.test(m.t)) out.push({ i: m.i + "b", label: name + " (العلامة الثانية)", unit: u });
      }
    }
    return out;
  }
  function adminWordHTML(an, wd, ov) {
    const { S, ai, wi } = SHEET;
    const ay = S.ayahs[ai];
    const key = SHEET.scope === "o" ? occKey(S.n, ay.a, wi) : "f:" + wd[0];
    const cur = SHEET.draft || STATE.overrides[key] || {};
    const auto = T.resolve(an, new Set(ALLCATS.filter((c) => c.on).map((c) => c.id)), PRIORITY, null);
    const slots = slotList(an).map((s) => {
      const has = Object.prototype.hasOwnProperty.call(cur, s.i);
      const val = has ? cur[s.i] : String(s.i).endsWith("b") ? auto.s2[parseInt(s.i, 10)] : auto[s.i];
      const c = val && CATMAP.get(val);
      return `<button class="slotbtn${has ? " ov" : ""}" data-slot="${s.i}" style="--dot:${c ? `var(--c-${c.id})` : "transparent"}"><span class="dot"></span>${esc(s.label)}: ${c ? esc(c.name) : "بدون لون"}${has ? " ✎" : ""}</button>`;
    }).join("");
    const vidKey = key;
    const hasVid = STATE.videos[vidKey];
    const note = STATE.notes[key] || "";
    return `<div class="section" id="adminWord"><h4>أدوات الشيخ</h4>
      <div class="bar"><span style="font-size:13px;color:var(--muted)">التعديل يشمل:</span><div class="seg" id="scopeSeg"><button data-s="o" aria-pressed="${SHEET.scope === "o"}">هذا الموضع فقط</button><button data-s="f" aria-pressed="${SHEET.scope === "f"}">كل المواضع المطابقة</button></div></div>
      <p style="margin:0;font-size:13px;color:var(--muted)">اضغط على أي جزء لتبديل لونه بين الأحكام، ثم احفظ.</p>
      <div class="slots">${slots}</div>
      <div class="bar"><button class="btn primary" id="ovSave">حفظ الألوان</button><button class="btn" id="ovReset">إرجاع للتلقائي</button></div>
      <h4 style="margin-top:6px">فيديو نطق الكلمة</h4>${canRecord() ? `<div class="bar"><button class="btn primary" id="wRec">● تسجيل نطق الكلمة بالكاميرا</button><span style="font-size:12.5px;color:var(--muted)">يُستعمل في كل مواضع هذه الكلمة</span></div>` : ""}${videoControlsHTML("vid", hasVid)}
      <label for="noteTx" style="font-size:13px;color:var(--muted)">ملاحظة الشيخ على الكلمة</label><textarea id="noteTx" rows="2">${esc(note)}</textarea>
      <div class="bar"><button class="btn" id="noteSave">حفظ الملاحظة</button></div></div>`;
  }
  function bindAdminWord(root, an, wd) {
    const { S, ai, wi } = SHEET;
    const ay = S.ayahs[ai];
    const keyNow = () => (SHEET.scope === "o" ? occKey(S.n, ay.a, wi) : "f:" + wd[0]);
    $$("#scopeSeg button", root).forEach((b) => (b.onclick = () => { SHEET.scope = b.dataset.s; SHEET.draft = null; drawSheet(); }));
    const options = ["__auto"].concat(legendOrder().filter((c) => c.on).map((c) => c.id), [""]);
    $$("[data-slot]", root).forEach((b) => (b.onclick = () => {
      const i = b.dataset.slot;
      const d = SHEET.draft || Object.assign({}, STATE.overrides[keyNow()] || {});
      const cur = Object.prototype.hasOwnProperty.call(d, i) ? d[i] : "__auto";
      const nx = options[(options.indexOf(cur) + 1) % options.length];
      if (nx === "__auto") delete d[i]; else d[i] = nx;
      SHEET.draft = d;
      drawSheet();
    }));
    $("#ovSave", root).onclick = async () => {
      const k = keyNow(), d = SHEET.draft || STATE.overrides[k] || {};
      if (Object.keys(d).length) STATE.overrides[k] = d; else delete STATE.overrides[k];
      SHEET.draft = null;
      await persist();
      redrawMushaf(); drawSheet();
    };
    $("#ovReset", root).onclick = async () => { delete STATE.overrides[keyNow()]; SHEET.draft = null; await persist(); redrawMushaf(); drawSheet(); };
    bindVideoControls(root, "vid", keyNow(), () => drawSheet());
    const wRec = $("#wRec", root);
    if (wRec) wRec.onclick = () => openRecorder({ key: "f:" + wd[0], title: "نطق الكلمة", html: `<span class="w">${wordSVG(wd, colorsFor(an, visibleSet(), ovFor(S.n, ay.a, wi, wd[0])))}</span>`, big: true, done: () => drawSheet() });
    $("#noteSave", root).onclick = async () => { const t = $("#noteTx", root).value.trim(); if (t) STATE.notes[keyNow()] = t; else delete STATE.notes[keyNow()]; await persist(); drawSheet(); };
  }

  /* ---------------- recording from the platform (camera) ---------------- */
  const canRecord = () => STATIC && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  function pickMime() {
    const list = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return list.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  }
  const mmss = (sec) => AR(Math.floor(sec / 60)) + ":" + AR(String(Math.floor(sec % 60)).padStart(2, "0"));
  function openRecorder(o) {
    const root = $("#stageRoot");
    let stream = null, rec = null, chunks = [], blob = null, localUrl = null, started = 0, secs = 0, timer = null;
    const stopStream = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
    const close = () => { stopStream(); clearInterval(timer); root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape" && !(rec && rec.state === "recording")) close(); };
    document.addEventListener("keydown", onKey);
    root.innerHTML = `<div class="stage" role="dialog" aria-label="التسجيل">
      <div class="stage-top"><span class="title">${esc(o.title)}</span><span class="rec-timer" id="rT" hidden></span><button class="iconbtn" id="rClose" aria-label="إغلاق">✕</button></div>
      <video id="rv" playsinline muted autoplay></video>
      <div class="stage-word"><div class="${o.big ? "bigword" : "ayahline"}">${o.html || ""}</div><div class="stage-ctrl" id="rCtl"></div><div id="rMsg" style="font-size:13px;color:#6A6255;text-align:center"></div></div></div>`;
    const v = $("#rv", root), ctl = $("#rCtl", root), msg = $("#rMsg", root);
    $("#rClose", root).onclick = close;
    const setUI = (state) => {
      if (state === "live") { ctl.innerHTML = `<button class="recbtn" id="rGo" aria-label="ابدأ التسجيل"></button>`; msg.textContent = "اضغط الزر الأحمر ثم اقرأ. اضغطه مرة أخرى عند الانتهاء."; $("#rGo", root).onclick = start; }
      if (state === "rec") { ctl.innerHTML = `<button class="recbtn on" id="rStop" aria-label="إيقاف التسجيل"></button>`; msg.textContent = "جارٍ التسجيل…"; $("#rStop", root).onclick = () => rec.stop(); }
      if (state === "review") { ctl.innerHTML = `<button class="btn" id="rAgain">↺ إعادة التسجيل</button><button class="btn" id="rSave" style="background:#0F4C3A;color:#fff;border-color:#0F4C3A">✓ حفظ</button>`; msg.textContent = "شاهد التسجيل، ثم احفظه أو أعده."; $("#rAgain", root).onclick = live; $("#rSave", root).onclick = save; }
      if (state === "saving") { ctl.innerHTML = ""; }
    };
    async function live() {
      blob = null; if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
      v.removeAttribute("src"); v.controls = false; v.muted = true; v.style.transform = "scaleX(-1)";
      try {
        if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      } catch (e) { msg.textContent = "لم يُسمح باستعمال الكاميرا والميكروفون. اسمح بهما من إعدادات المتصفح ثم أعد المحاولة."; ctl.innerHTML = ""; return; }
      v.srcObject = stream; v.play().catch(() => {});
      setUI("live");
    }
    function start() {
      chunks = [];
      const mime = pickMime();
      try { rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: 600000, audioBitsPerSecond: 64000 }, mime ? { mimeType: mime } : {})); }
      catch (e) { rec = new MediaRecorder(stream); }
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        clearInterval(timer); $("#rT", root).hidden = true;
        blob = new Blob(chunks, { type: (rec.mimeType || "video/webm").split(";")[0] });
        stopStream();
        localUrl = URL.createObjectURL(blob);
        v.srcObject = null; v.style.transform = ""; v.muted = false; v.controls = true; v.src = localUrl; v.play().catch(() => {});
        setUI("review");
      };
      rec.start(1000); started = Date.now(); secs = 0;
      const T = $("#rT", root); T.hidden = false; T.textContent = mmss(0);
      timer = setInterval(() => { secs = (Date.now() - started) / 1000; T.textContent = mmss(secs); if (secs > 300) rec.stop(); }, 250);
      setUI("rec");
    }
    async function save() {
      setUI("saving");
      msg.textContent = "جارٍ حفظ الفيديو… لا تغلق الصفحة.";
      try {
        const url = await storeVideo(blob, o.key, (f) => (msg.textContent = `جارٍ رفع الفيديو… ${AR(Math.round(f * 100))}%`));
        STATE.videos[o.key] = url;
        if (o.ayahKey) delete STATE.timings[o.key];
        await persist();
        const local = { src: localUrl, duration: secs };
        root.innerHTML = ""; document.removeEventListener("keydown", onKey);
        toast("حُفظ الفيديو. يظهر للطلاب خلال دقائق.", 5000);
        if (o.done) o.done(local);
      } catch (e) {
        msg.textContent = "تعذّر حفظ الفيديو. تحقّق من الاتصال ثم اضغط «حفظ» مرة أخرى.";
        setUI("review");
      }
    }
    live();
  }
  /** Saves a recording where it will last: archive.org when its keys are set, otherwise the GitHub repository (site/media). */
  async function storeVideo(blob, key, onProgress) {
    const ext = /mp4/.test(blob.type) ? "mp4" : "webm";
    const parts = key.split(":");
    const sNum = parts[0] === "a" || parts[0] === "o" ? parts[1] : null;
    const name = (parts[0] === "f" ? "w-" + Date.now().toString(36) : `s${String(sNum).padStart(3, "0")}-a${String(parts[2]).padStart(3, "0")}-${Date.now().toString(36)}`) + "." + ext;
    const ia = LS.get("ia", null);
    if (ia && ia.a && ia.s) {
      try {
        const item = `${ia.p || "itqan-qaloon"}-${sNum ? "s" + String(sNum).padStart(3, "0") : "words"}`;
        const title = `الطريق إلى الإتقان – ${sNum ? "سورة " + META.surahs[+sNum - 1].ar : "نطق الكلمات"}`;
        return await iaUpload(blob, item, name, ia, title, onProgress);
      } catch (e) { /* archive.org refused or unreachable: keep it in the repository */ }
    }
    if (GH.get()) return await ghUploadMedia(blob, name);
    throw new Error("no storage");
  }
  function iaUpload(blob, item, name, ia, title, onProgress) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open("PUT", `https://s3.us.archive.org/${item}/${name}`);
      x.setRequestHeader("authorization", `LOW ${ia.a}:${ia.s}`);
      x.setRequestHeader("x-amz-auto-make-bucket", "1");
      x.setRequestHeader("x-archive-meta-mediatype", "movies");
      x.setRequestHeader("x-archive-meta-collection", "opensource_movies");
      x.setRequestHeader("x-archive-meta-language", "ara");
      x.setRequestHeader("x-archive-meta-title", "uri(" + encodeURIComponent(title) + ")");
      x.setRequestHeader("x-archive-meta-licenseurl", "https://creativecommons.org/licenses/by-nc-nd/4.0/");
      x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = () => (x.status >= 200 && x.status < 300 ? res(`https://archive.org/download/${item}/${name}`) : rej(new Error("archive " + x.status)));
      x.onerror = () => rej(new Error("archive network"));
      x.send(blob);
    });
  }
  const blobToB64 = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });
  async function ghUploadMedia(blob, name) {
    const g = GH.get(), base = `/repos/${g.repo}`, path = `site/media/${name}`;
    const content = await blobToB64(blob);
    const made = await ghFetch(`${base}/git/blobs`, { method: "POST", body: JSON.stringify({ content, encoding: "base64" }) }, g.token);
    for (let attempt = 0; attempt < 2; attempt++) {
      const head = (await ghFetch(`${base}/git/ref/heads/${g.branch}`, {}, g.token)).object.sha;
      const baseTree = (await ghFetch(`${base}/git/commits/${head}`, {}, g.token)).tree.sha;
      const tree = await ghFetch(`${base}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: baseTree, tree: [{ path, mode: "100644", type: "blob", sha: made.sha }] }) }, g.token);
      const commit = await ghFetch(`${base}/git/commits`, { method: "POST", body: JSON.stringify({ message: "فيديو جديد من الشيخ", tree: tree.sha, parents: [head] }) }, g.token);
      try { await ghFetch(`${base}/git/refs/heads/${g.branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) }, g.token); return `media/${name}`; }
      catch (e) { if (e.status !== 422 || attempt) throw e; }
    }
    throw new Error("github media");
  }
  /* ---------------- the cheikh's one-tap link (no GitHub account needed) ---------------- */
  const b64url = (str) => b64utf8(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  function readKeyLink() {
    const h = location.hash || "";
    if (!h.startsWith("#k=")) return;
    try {
      let b = h.slice(3).replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0))));
      if (j.r && j.t) GH.set({ repo: j.r, token: j.t, branch: j.b || "main" });
      if (j.sk) LS.set("sk", j.sk);
      if (j.ia) LS.set("ia", j.ia);
      LS.set("welcome", 1);
    } catch (e) { /* malformed link */ }
    history.replaceState(null, "", location.pathname + location.search + "#mushaf");
  }
  function adminKeyLink(body) {
    const ia = LS.get("ia", null) || {};
    const g = GH.get();
    const prefix = ia.p || "itqan-qaloon-" + Math.random().toString(36).slice(2, 6);
    body.innerHTML = `<div class="card" style="max-width:640px"><h3>رابط دخول الشيخ</h3>
      <p>رابط واحد يرسله المشرف إلى الشيخ عبر واتساب. يفتحه الشيخ مرة واحدة على هاتفه فتظهر له أدوات الشيخ دائماً، دون أي حساب.</p>
      <div class="kv">
        <label for="iaA">مفتاح archive.org (Access key)</label><input type="text" id="iaA" dir="ltr" value="${esc(ia.a || "")}" placeholder="اختياري">
        <label for="iaS">المفتاح السري (Secret key)</label><input type="password" id="iaS" dir="ltr" value="${esc(ia.s || "")}" placeholder="اختياري">
        <label for="iaP">اسم مجموعة الفيديو</label><input type="text" id="iaP" dir="ltr" value="${esc(prefix)}">
      </div>
      <p style="font-size:12.5px;color:var(--muted)">المفتاحان من <bdi dir="ltr">archive.org/account/s3.php</bdi> بعد إنشاء حساب المشروع. إن تُركا فارغين تُحفظ الفيديوهات في مستودع GitHub (يتّسع لنحو ألف فيديو قصير).</p>
      <div class="bar"><button class="btn primary" id="mkLink">إنشاء رابط الشيخ</button></div><div id="linkOut" class="list"></div></div>`;
    $("#mkLink", body).onclick = () => {
      const iaNew = { a: $("#iaA", body).value.trim(), s: $("#iaS", body).value.trim(), p: $("#iaP", body).value.trim() || prefix };
      if (iaNew.a && iaNew.s) LS.set("ia", iaNew);
      const payload = g ? { r: g.repo, t: g.token, b: g.branch } : {};
      if (SK()) payload.sk = SK();
      if (iaNew.a && iaNew.s) payload.ia = iaNew;
      const link = location.origin + location.pathname + "#k=" + b64url(JSON.stringify(payload));
      const msgTxt = "السلام عليكم شيخنا، هذا رابط أدوات الشيخ في موقع «الطريق إلى الإتقان». افتحه مرة واحدة على هاتفك:\n" + link;
      $("#linkOut", body).innerHTML = `<div class="item"><input type="text" readonly dir="ltr" value="${esc(link)}" style="flex:1;min-width:0" id="linkTx"><button class="btn" id="cpLink">نسخ</button></div>
        <div class="item"><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msgTxt)}">إرسال عبر واتساب</a>
        <span class="grow" style="color:var(--muted)">أرسله للشيخ وحده: من يملك الرابط يستطيع التعديل. لإلغائه احذف الرمز من GitHub وأنشئ رابطاً جديداً.</span></div>`;
      $("#cpLink", body).onclick = () => { const t = $("#linkTx", body); navigator.clipboard.writeText(t.value).then(() => toast("نُسخ الرابط."), () => { t.select(); }); };
    };
  }

  /* ---------------- capabilities: saving & uploads ---------------- */
  // Inside Claude the page gets `window.claude`; on GitHub Pages / Cloudflare Pages it never appears (static mode).
  let STATIC = false;
  const RUNTIME = new Promise((res) => {
    let tries = 0;
    const go = () => { if (window.claude && typeof window.claude.use === "function") res(true); else if (tries++ < 20) setTimeout(go, 150); else res(false); };
    go();
  });
  const capP = {};
  function cap(name) {
    if (!capP[name]) capP[name] = RUNTIME.then((ok) => (ok ? window.claude.use(name).then((x) => x, () => null) : null));
    return capP[name];
  }

  /* ---------------- static hosting: the cheikh saves straight to GitHub ---------------- */
  let SITE = { repo: "", branch: "main", statePath: "site/data/state.json" };
  const GH = { get() { return LS.get("gh", null); }, set(v) { LS.set("gh", v); }, clear() { LS.del("gh"); } };
  async function ghFetch(path, opts, token) {
    const r = await fetch("https://api.github.com" + path, Object.assign({}, opts || {}, {
      headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" } }));
    if (!r.ok) { const e = new Error("github " + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  async function ghLogin(repo, token) {
    const info = await ghFetch(`/repos/${repo}`, {}, token);
    if (!info.permissions || !info.permissions.push) { const e = new Error("no push"); e.status = 403; throw e; }
    GH.set({ repo, token, branch: info.default_branch || SITE.branch || "main" });
  }
  function b64utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  async function ghSaveState(json) {
    const g = GH.get();
    if (!g) return false;
    const path = `/repos/${g.repo}/contents/${SITE.statePath}`;
    let sha;
    try { sha = (await ghFetch(`${path}?ref=${encodeURIComponent(g.branch)}`, {}, g.token)).sha; } catch (e) { if (e.status !== 404) throw e; }
    await ghFetch(path, { method: "PUT", body: JSON.stringify({ message: "تحديث إعدادات الشيخ", content: b64utf8(json), branch: g.branch, sha }) }, g.token);
    return true;
  }
  /** archive.org page or file link → direct file URL that a <video> can play. */
  async function resolveVideoUrl(u) {
    u = (u || "").trim();
    const m = u.match(/^https?:\/\/(?:www\.)?archive\.org\/(?:details|download)\/([^/?#]+)(?:\/([^?#]+))?/);
    if (m && m[2] && /\.(mp4|webm|m4v|mov)$/i.test(m[2])) return `https://archive.org/download/${m[1]}/${m[2]}`;
    if (m) {
      try {
        const j = await (await fetch(`https://archive.org/metadata/${m[1]}`)).json();
        const f = (j.files || []).find((x) => /\.mp4$/i.test(x.name)) || (j.files || []).find((x) => /\.webm$/i.test(x.name));
        if (f) return `https://archive.org/download/${m[1]}/${f.name.split("/").map(encodeURIComponent).join("/")}`;
      } catch (e) { /* metadata unreachable */ }
      return null;
    }
    return /^https:\/\//.test(u) ? u : null;
  }
  function videoControlsHTML(prefix, hasVid) {
    return `<div class="bar">${STATIC ? "" : `<label class="btn">${hasVid ? "استبدال الفيديو" : "رفع فيديو"}<input type="file" accept="video/*" id="${prefix}Up" hidden></label>`}
      ${hasVid ? `<button class="btn danger" id="${prefix}Del">حذف الفيديو</button>` : ""}</div>
      <div class="bar"><input type="text" id="${prefix}Url" dir="ltr" placeholder="https://archive.org/details/…" style="flex:1;min-width:200px" aria-label="رابط الفيديو"><button class="btn" id="${prefix}UrlSave">حفظ الرابط</button></div>
      <p style="margin:0;font-size:12.5px;color:var(--muted)">الأفضل رفع الفيديو إلى archive.org ولصق رابطه هنا، ليبقى مجاناً ومتاحاً دائماً.</p>`;
  }
  function bindVideoControls(root, prefix, key, after) {
    const up = $(`#${prefix}Up`, root);
    if (up) up.onchange = async (e) => { const f = e.target.files[0]; if (f && (await uploadVideo(f, key))) after(true); };
    const del = $(`#${prefix}Del`, root);
    if (del) del.onclick = async () => { delete STATE.videos[key]; delete STATE.timings[key]; await persist(); after(false); };
    $(`#${prefix}UrlSave`, root).onclick = async () => {
      const raw = $(`#${prefix}Url`, root).value;
      const url = await resolveVideoUrl(raw);
      if (!url) { toast("لم أجد ملف فيديو في هذا الرابط. الصق رابط صفحة archive.org أو رابط ملف MP4 يبدأ بـ https.", 6500); return; }
      STATE.videos[key] = url; await persist(); after(true);
    };
  }
  async function uploadVideo(file, key) {
    const assets = await cap("assets");
    if (!assets) { toast("رفع الفيديو متاح لمن يملك صلاحية التعديل على هذه الصفحة."); return false; }
    if (file.size > 20 * 1024 * 1024) { toast("حجم الفيديو أكبر من 20 ميغابايت. قصّر المقطع أو صغّر جودته ثم أعد المحاولة.", 6000); return false; }
    toast("جارٍ رفع الفيديو…", 60000);
    try {
      const type = file.type && file.type.startsWith("video/") ? undefined : { contentType: "video/mp4" };
      const r = await assets.upload(file, type);
      STATE.videos[key] = r.id;
      await persist();
      toast("رُفع الفيديو.");
      return true;
    } catch (e) {
      toast(e && e.code === "unsupported_type" ? "صيغة الفيديو غير مدعومة. استعمل MP4 أو WebM." : "تعذّر رفع الفيديو. أعد المحاولة بعد قليل.", 6000);
      return false;
    }
  }
  async function persist() {
    STATE.savedAt = new Date().toISOString();
    const json = JSON.stringify(STATE);
    const art = await cap("artifact");
    if (art) {
      try {
        await art.publish({ "data/state.json": { content: json, contentType: "application/json" } });
        LS.del("draft"); DIRTY = false; SAVE_NOTE = "حُفظ ونُشر لكل الطلاب.";
        updateSavebar(); toast(SAVE_NOTE);
        return true;
      } catch (e) {
        if (e && e.code === "conflict") { toast("حُفظت نسخة أحدث من مكان آخر، وستُحمَّل الآن."); return false; }
      }
    }
    if (GH.get()) {
      try {
        await ghSaveState(json);
        LS.del("draft"); DIRTY = false; SAVE_NOTE = "حُفظ في GitHub. يصل إلى الطلاب خلال دقائق بعد إعادة النشر التلقائي.";
        updateSavebar(); toast(SAVE_NOTE, 6000);
        return true;
      } catch (e) {
        if (e.status === 401 || e.status === 403) { toast("رمز GitHub منتهٍ أو بلا صلاحية كتابة. سجّل الدخول من جديد في لوحة الشيخ.", 7000); }
        else toast("تعذّر الحفظ في GitHub. تحقّق من الاتصال ثم أعد المحاولة.", 6000);
        LS.set("draft", json); DIRTY = true; updateSavebar();
        return false;
      }
    }
    const db = await cap("db");
    if (db) {
      try {
        await db.doc("shared/state").set({ json, savedAt: STATE.savedAt });
        DIRTY = false; SAVE_NOTE = "حُفظ. يظهر فوراً لمن يفتح الصفحة بحساب Claude، ويصل إلى كل الطلاب عند النشر التالي.";
        updateSavebar(); toast(SAVE_NOTE, 6000);
        return true;
      } catch (e) { /* fall through */ }
    }
    LS.set("draft", json);
    DIRTY = false; SAVE_NOTE = "لم يُحفظ على الخادم: هذا الحساب لا يملك صلاحية الحفظ هنا. التعديلات محفوظة في هذا المتصفح فقط.";
    updateSavebar(); toast(SAVE_NOTE, 7000);
    return false;
  }
  function onStateChanged() {
    anVersion++; anCache.clear(); BASMALA_AN = null;
    refreshCats();
    const r = (location.hash || "#home").slice(1);
    if (r === "mushaf") { if ($("#legend")) $("#legend").innerHTML = legendHTML(); redrawMushaf(); }
    else if (r === "practice") renderPractice();
    else if (r === "about") renderAbout();
    else if (r === "admin") renderAdmin();
    if (SHEET) drawSheet();
  }

  /* ---------------- practice: tables and the colouring drill ---------------- */
  function resetExercise() { P.picked = null; P.placed = {}; P.checked = false; P.paint = {}; P.solved = false; P.wasl = {}; P.wPick = null; P.locked = false; P.fresh = false; P.ans = {}; }
  const KINDS = [["time", "أزمنة الحروف"], ["nun", "النون الساكنة والتنوين والميم"], ["paint", "التلوين"]];
  const kindSeg = () => `<div class="seg" id="pKind" style="margin-bottom:10px;flex-wrap:wrap">${KINDS.map(([k, l]) => `<button data-k="${k}" aria-pressed="${(P.kind || "time") === k}">${l}</button>`).join("")}</div>`;
  function bindKindSeg(v) { $$("#pKind button", v).forEach((b) => (b.onclick = () => { P.kind = b.dataset.k; resetExercise(); renderPractice(); })); }
  /** The words a drill works on: one ayah, or the whole surah when P.ai is -1. Each word has an id = ayah index × 1000 + word index. */
  const defAi = (n) => (META.surahs[n - 1].count <= 40 ? -1 : 0); // short surahs open whole; long ones ayah by ayah
  function drillScope(S) {
    const ais = P.ai < 0 ? S.ayahs.map((_, i) => i) : [P.ai], items = [], by = new Map();
    for (const ai of ais) { const ay = S.ayahs[ai], an = analyze(S, ai); ay.w.forEach((wd, wi) => { if (wd[3]) return; const it = { id: ai * 1000 + wi, ai, wi, wd, ay, an: an[wi] }; items.push(it); by.set(it.id, it); }); }
    const line = (fn) => ais.map((ai) => items.filter((it) => it.ai === ai).map(fn).join(" ") + ` <span class="ae">${wordSVG(S.ayahs[ai].e, null)}</span>`).join(" ");
    return { items, by, line, key: P.ai < 0 ? "all" : S.ayahs[P.ai].a };
  }
  const ayahOpts = (S) => `<option value="-1"${P.ai < 0 ? " selected" : ""}>السورة كلها</option>` + S.ayahs.map((a, i) => `<option value="${i}"${i === P.ai ? " selected" : ""}>${AR(a.a)}</option>`).join("");
  const ovOf = (S, it) => ovFor(S.n, it.ay.a, it.wi, it.wd[0]);
  /* ---------------- attempts and exams ----------------
     Every check is logged on the student's device, and sent to the cheikh when the student has joined a cohort. */
  const KIND_LABEL = { time: "أزمنة الحروف", nun: "الميم والنون", paint: "التلوين", wasl: "همزة الوصل", madd: "المدود", ra: "الراءات", huruf: "المخارج والصفات" };
  function ruleLabel(kind, id) {
    if (!id) return "";
    if (kind === "wasl") return "همزة الوصل: " + waslLabel(id).replace("<br>", "، ");
    if (kind === "madd") return (MADD_T[id] || [id])[0];
    if (kind === "ra") return id === "tafkhim" ? "تفخيم الراء" : "ترقيق الراء";
    if (kind === "huruf") return id === "makhraj" ? "مخارج الحروف" : "صفات الحروف";
    const n = T.NUN_RULES.find((r) => r.id === id);
    return n ? n.name : (CATMAP.get(id) || { name: id }).name;
  }
  function logAttempt(kind, S, key, right, total, wrong, errs) {
    if (!P.fresh) return;
    P.fresh = false;
    const agg = new Map();
    for (const [w, exp, got] of errs) { const k = w + "|" + (exp || "") + "|" + (got || ""); agg.set(k, (agg.get(k) || 0) + 1); }
    const e = [...agg].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, c]) => { const [w, exp, got] = k.split("|"); return [w, exp, got, c]; });
    const A = LS.get("attempts", []);
    A.push({ t: Date.now(), k: kind, s: S.n, a: key, r: right, n: total, x: wrong, ex: P.exam ? 1 : 0, e });
    LS.set("attempts", A.slice(-200));
    sendAttempt(A[A.length - 1]);
    if (P.exam) P.locked = true;
  }
  const examBtn = () => `<button class="btn exam${P.exam ? " on" : ""}" id="pExam" aria-pressed="${!!P.exam}" title="في الامتحان لا يُعرض الحل، والتسليم مرة واحدة، والنتيجة تُسجَّل في «نتائجي»">📝 ${P.exam ? "أنت في امتحان" : "وضع الامتحان"}</button>`;
  function bindExam(v) { const b = $("#pExam", v); if (b) b.onclick = () => { P.exam = !P.exam; if (P.exam) P.mode = "exercise"; resetExercise(); renderPractice(); }; }
  const examNote = () => (P.exam && P.locked ? `<div style="margin-top:6px">سُجّل الامتحان في «نتائجي»${TOK() ? " ووصل إلى الشيخ" : ""}.</div>` : "");
  /** Mistakes added up: by rule (what was expected, or what was wrongly given) and by word. */
  function errStats(rows) { // rows: [kind, word, exp, got, count]
    const rules = new Map(), words = new Map();
    for (const [kind, w, exp, got, c] of rows) {
      const rk = kind + "|" + (exp || got);
      rules.set(rk, (rules.get(rk) || 0) + c);
      const pw = plain(w); words.set(pw, (words.get(pw) || 0) + c);
    }
    const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
    return { rules: top(rules, 8).map(([k, c]) => { const [kind, id] = k.split("|"); return { label: ruleLabel(kind, id), kind, c }; }), words: top(words, 10) };
  }
  const focusHTML = (st) => (st.rules.length ? `<div class="focus">${st.rules.map((r) => `<div><b>${esc(r.label)}</b><span>${esc(KIND_LABEL[r.kind] || "")}</span><i>${AR(r.c)} خطأ</i></div>`).join("")}</div>
    ${st.words.length ? `<p class="fwords">أكثر الكلمات خطأً: ${st.words.map(([w, c]) => `<span class="chip small">${esc(w)} · ${AR(c)}</span>`).join(" ")}</p>` : ""}` : `<p class="empty">لا أخطاء مسجّلة بعد.</p>`);
  const attemptRow = (a) => `<tr><td>${new Date(a.t).toLocaleDateString("ar-u-nu-latn")}</td><td>${esc((META.surahs[a.s - 1] || {}).ar || "")}${a.a === "all" ? "" : " · " + AR(a.a)}</td><td>${esc(KIND_LABEL[a.k] || a.k)}${a.ex ? ` <span class="badge">امتحان</span>` : ""}</td><td><b>${AR(a.r)} / ${AR(a.n)}</b>${a.x ? ` <small>(${AR(a.x)} خطأ)</small>` : ""}</td><td>${a.n ? AR(Math.round((a.r / a.n) * 100)) + "%" : "—"}</td></tr>`;
  const attemptsTable = (A) => `<div class="ptable-wrap"><table class="atable"><thead><tr><th>التاريخ</th><th>السورة</th><th>التمرين</th><th>الصحيح</th><th>النسبة</th></tr></thead><tbody>${A.slice().reverse().map(attemptRow).join("")}</tbody></table></div>`;
  const rowsOf = (A) => A.flatMap((a) => (a.e || []).map((e) => [a.k, e[0], e[1], e[2], e[3] || 1]));
  /* ---------------- the school (Supabase) ----------------
     The page talks to the database only through the itqan_* functions: a student is known by the token he got
     when he joined his cohort, the cheikh by his key. Without a connection everything still works on the device. */
  const DB = {
    ok: () => !!(SITE.supabase && SITE.supabase.url && SITE.supabase.key),
    async rpc(fn, args) {
      const r = await fetch(`${SITE.supabase.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SITE.supabase.key, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
      const t = await r.text(); let j = null;
      try { j = t ? JSON.parse(t) : null; } catch (e) { /* not json */ }
      if (!r.ok) { const e = new Error((j && j.message) || "HTTP " + r.status); e.status = r.status; e.msg = j && j.message; throw e; }
      return j;
    },
  };
  const SK = () => LS.get("sk", "");
  const TOK = () => LS.get("stok", "");
  let ME = LS.get("me", null), TD = null;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
  const pctTxt = (x) => (x == null ? "—" : AR(x) + "%");
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }) : "");
  const sName = (n) => (META.surahs[n - 1] || {}).ar || "";
  async function refreshMe() {
    if (!TOK() || !DB.ok()) return ME;
    try { ME = await DB.rpc("itqan_me", { p_token: TOK() }); LS.set("me", ME); await flushOutbox(); }
    catch (e) { if (e.msg === "bad_token") { LS.del("stok"); LS.del("me"); ME = null; } }
    return ME;
  }
  /** Drill results go to the cheikh; when the network fails they wait on the device and leave with the next call. */
  async function sendAttempt(a) {
    if (!TOK() || !DB.ok()) return;
    const box = LS.get("outbox", []); box.push(a); LS.set("outbox", box.slice(-100));
    await flushOutbox();
  }
  async function flushOutbox() {
    let box = LS.get("outbox", []);
    while (box.length && TOK()) {
      const a = box[0];
      try { await DB.rpc("itqan_attempt", { p_token: TOK(), p_surah: a.s, p_kind: a.k, p_scope: String(a.a), p_right: a.r, p_total: a.n, p_wrong: a.x, p_exam: !!a.ex, p_errors: a.e || [] }); }
      catch (e) { if (e.status && e.status < 500 && e.msg !== "bad_token") { box.shift(); LS.set("outbox", box); continue; } return; }
      box.shift(); LS.set("outbox", box);
    }
  }
  async function joinCohort(code, name) {
    const j = await DB.rpc("itqan_join", { p_code: code, p_name: name });
    LS.set("stok", j.token); delete j.token; ME = j; LS.set("me", ME); LS.del("joinCode");
    return ME;
  }
  /** Links: #j=CODE opens the join form with the cohort code, #s=TOKEN signs a student in on another device. */
  function readSchoolLink() {
    const h = location.hash || "";
    if (h.startsWith("#j=")) { LS.set("joinCode", decodeURIComponent(h.slice(3)).toUpperCase()); history.replaceState(null, "", location.pathname + "#home"); }
    if (h.startsWith("#s=")) { LS.set("stok", decodeURIComponent(h.slice(3))); LS.del("me"); ME = null; history.replaceState(null, "", location.pathname + "#home"); }
  }
  const siteUrl = () => location.origin + location.pathname;
  async function shareText(title, url) {
    if (navigator.share) { try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast("نُسخ الرابط."); } catch (e) { prompt("انسخ الرابط:", url); }
  }
  function joinCardHTML() {
    if (!DB.ok()) return "";
    return `<div class="card join"><h3 class="sec" style="margin-top:0">انضمّ إلى دفعتك</h3>
      <p>اكتب الرمز الذي أعطاك إياه الشيخ واسمك، فتظهر لك سور مستواك وتصل نتائجك إلى الشيخ وحدها.</p>
      <div class="bar"><div class="field"><label for="jCode">رمز الدفعة</label><input id="jCode" dir="ltr" maxlength="8" autocomplete="off" style="width:110px;text-transform:uppercase" value="${esc(LS.get("joinCode", ""))}"></div>
        <div class="field grow"><label for="jName">الاسم واللقب</label><input id="jName" autocomplete="name"></div>
        <button class="btn primary" id="jGo">انضمّ</button></div></div>`;
  }
  function bindJoin(root) {
    const go = $("#jGo", root); if (!go) return;
    go.onclick = async () => {
      const code = $("#jCode", root).value.trim(), name = $("#jName", root).value.trim();
      if (!code || name.length < 2) { toast("اكتب رمز الدفعة واسمك."); return; }
      go.disabled = true;
      try { await joinCohort(code, name); toast(`أهلاً بك يا ${name}. انضممت إلى ${ME.cohort ? ME.cohort.name : "الدفعة"}.`); renderHome(); }
      catch (e) { toast(e.msg === "bad_code" ? "الرمز غير صحيح. تأكّد منه عند الشيخ." : "تعذّر الاتصال. أعد المحاولة."); go.disabled = false; }
    };
  }

  /* ---------------- the cheikh's follow-up: cohorts, attendance, evaluation, reports ---------------- */
  // the academy's programs (the cheikh's list); a level belongs to one of them
  const PROGRAMS = ["التجويد العملي", "التجويد النظري", "أصول الرواية", "علوم القرآن", "الرسم والضبط", "القراءات: الإفراد", "القراءات: الجمع الصغرى", "القراءات: الجمع الكبرى", "التفسير", "التزكية"];
  const EVAL = [["makharij", "مخارج الحروف"], ["sifat", "أزمنة الحروف وصفاتها"], ["harakat", "إتمام الحركات"], ["takhlis", "تخليص الحروف"],
    ["ghunna", "الغنّة وأحكام النون والميم"], ["waqf", "الوقف والابتداء وهمزة الوصل"], ["fluency", "الطلاقة والحفظ"]];
  const STATUS = [["present", "حاضر", "✓"], ["late", "متأخّر", "◔"], ["absent", "غائب", "✗"], ["excused", "بعذر", "–"]];
  const SV = { tab: "overview", cohort: null, student: null, session: null };
  async function loadTD() { TD = await DB.rpc("itqan_t_data", { p_key: SK() }); return TD; }
  async function tsave(kind, row) { const r = await DB.rpc("itqan_t_save", { p_key: SK(), p_kind: kind, p_row: row }); await loadTD(); return r; }
  async function tdel(kind, id) { await DB.rpc("itqan_t_delete", { p_key: SK(), p_kind: kind, p_id: id }); await loadTD(); }
  const levelOf = (c) => TD.levels.find((l) => l.id === (c && c.level_id)) || null;
  const studentsOf = (cid) => TD.students.filter((s) => s.cohort_id === cid);
  /** Everything known about one student, reduced to the numbers the cheikh reads. */
  function studentStats(s) {
    const c = TD.cohorts.find((x) => x.id === s.cohort_id), lvl = levelOf(c);
    const sess = TD.sessions.filter((x) => x.cohort_id === s.cohort_id);
    const att = new Map(TD.attendance.filter((a) => a[1] === s.id).map((a) => [a[0], a[2]]));
    let got = 0, cnt = 0;
    for (const se of sess) { const st = att.get(se.id); if (!st || st === "excused") continue; cnt++; got += st === "present" ? 1 : st === "late" ? 0.75 : 0; }
    const attRate = cnt ? Math.round((100 * got) / cnt) : null;
    const prog = TD.progress.filter((p) => p[0] === s.id);
    const best = new Map(); for (const p of prog) best.set(p[1] + "|" + p[2], p[4]);
    const surahs = lvl ? lvl.surahs : [...new Set(prog.map((p) => p[1]))];
    const cells = [];
    const LD = lvlDrills(lvl);
    for (const n of surahs) for (const k of LD) cells.push(best.has(n + "|" + k) ? +best.get(n + "|" + k) : 0);
    const drills = cells.length && prog.length ? Math.round(cells.reduce((a, b) => a + b, 0) / cells.length) : null;
    const evs = TD.evaluations.filter((e) => e.student_id === s.id), crit = {};
    for (const [k] of EVAL) { const xs = evs.map((e) => e.scores && e.scores[k]).filter((x) => x != null && x !== ""); crit[k] = xs.length ? xs.reduce((a, b) => a + +b, 0) / xs.length : null; }
    const cv = Object.values(crit).filter((x) => x != null), evalPct = cv.length ? Math.round((10 * cv.reduce((a, b) => a + b, 0)) / cv.length) : null;
    const parts = [[evalPct, 0.5], [drills, 0.3], [attRate, 0.2]].filter((x) => x[0] != null), w = parts.reduce((a, x) => a + x[1], 0);
    const overall = parts.length ? Math.round(parts.reduce((a, x) => a + x[0] * x[1], 0) / w) : null;
    const errs = TD.errors.filter((e) => e[0] === s.id).map((e) => [e[1], e[3], e[2], "", +e[4] || 1]);
    return { c, lvl, LD, sess, att, attRate, cnt, best, surahs, drills, evs, crit, evalPct, overall, errs, prog };
  }
  const scoreCls = (x) => (x == null ? "" : x >= 80 ? "good" : x >= 50 ? "mid" : "low");
  const cell = (x) => `<td class="sc ${scoreCls(x)}">${pctTxt(x)}</td>`;
  async function renderStudents() {
    const v = $("#v-students");
    if (!DB.ok()) { v.innerHTML = `<h2 class="page-title">الطلاب</h2><p class="empty">لم تُربط قاعدة البيانات بعد.</p>`; return; }
    if (!SK()) {
      v.innerHTML = `<h2 class="page-title">دخول الشيخ</h2><p class="lead">افتح «رابط الشيخ» الذي وصلك مرة واحدة على هذا الجهاز، أو الصق مفتاح الشيخ هنا.</p>
        <div class="bar"><div class="field grow"><label for="skIn">مفتاح الشيخ</label><input id="skIn" dir="ltr" autocomplete="off"></div><button class="btn primary" id="skGo">دخول</button></div>`;
      $("#skGo", v).onclick = async () => { LS.set("sk", $("#skIn", v).value.trim()); try { await loadTD(); route(); } catch (e) { LS.del("sk"); toast("المفتاح غير صحيح."); } };
      return;
    }
    if (!TD) {
      v.innerHTML = `<div class="loading"><div class="bar-l"><i></i></div><span>تحميل بيانات الطلاب…</span></div>`;
      try { await loadTD(); } catch (e) {
        if (e.msg === "bad_key") { LS.del("sk"); return renderStudents(); }
        v.innerHTML = `<p class="empty">تعذّر الاتصال بقاعدة البيانات. تحقّق من الإنترنت ثم أعد المحاولة.</p>`; return;
      }
    }
    if (!SV.cohort || !TD.cohorts.some((c) => c.id === SV.cohort)) SV.cohort = (TD.cohorts[0] || {}).id || null;
    const tabs = [["overview", "نظرة عامة"], ["cohort", "الدفعة والطلاب"], ["sessions", "الحصص والحضور"], ["eval", "التقييم"], ["levels", "المستويات"]];
    const copts = TD.cohorts.map((c) => `<option value="${c.id}"${c.id === SV.cohort ? " selected" : ""}>${esc(c.name)}${levelOf(c) ? " · " + esc(levelOf(c).name) : ""}</option>`).join("");
    v.innerHTML = `<div class="shead"><h2 class="page-title" style="margin:0">متابعة الطلاب</h2>
        ${TD.cohorts.length ? `<div class="field"><label for="svC">الدفعة</label><select id="svC">${copts}</select></div>` : ""}
        <button class="btn ghost" id="svNewC">+ دفعة جديدة</button></div>
      <div class="admin-tabs">${tabs.map(([k, l]) => `<button data-sv="${k}" aria-pressed="${SV.tab === k}">${l}</button>`).join("")}</div>
      <div id="svBody"></div>`;
    $$("[data-sv]", v).forEach((b) => (b.onclick = () => { SV.tab = b.dataset.sv; SV.student = null; renderStudents(); }));
    if ($("#svC", v)) $("#svC", v).onchange = (e) => { SV.cohort = e.target.value; SV.student = null; SV.session = null; renderStudents(); };
    $("#svNewC", v).onclick = async () => { const c = await tsave("cohort", { name: "دفعة جديدة", level_id: (TD.levels[0] || {}).id || "" }); SV.cohort = c.id; SV.tab = "cohort"; renderStudents(); };
    const body = $("#svBody", v);
    if (SV.student) return studentReport(body, TD.students.find((s) => s.id === SV.student));
    ({ overview: svOverview, cohort: svCohort, sessions: svSessions, eval: svEval, levels: svLevels })[SV.tab](body);
  }
  const curCohort = () => TD.cohorts.find((c) => c.id === SV.cohort) || null;
  function svOverview(body) {
    const c = curCohort();
    if (!c) { body.innerHTML = `<p class="empty">أنشئ أول دفعة بزر «+ دفعة جديدة».</p>`; return; }
    const lvl = levelOf(c), studs = studentsOf(c.id).filter((s) => s.active), stats = studs.map((s) => [s, studentStats(s)]);
    const avg = (f) => { const xs = stats.map(([, st]) => f(st)).filter((x) => x != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
    const week = Date.now() - 7 * 864e5, active = studs.filter((s) => s.last_seen && new Date(s.last_seen) > week).length;
    // common mistakes: how many students erred in each rule
    const who = new Map(), cnt = new Map(), words = new Map();
    for (const [s] of stats) {
      const seen = new Set();
      for (const e of TD.errors.filter((x) => x[0] === s.id)) {
        const k = e[1] + "|" + e[2]; cnt.set(k, (cnt.get(k) || 0) + (+e[4] || 1));
        if (!seen.has(k)) { seen.add(k); who.set(k, (who.get(k) || 0) + 1); }
        const w = plain(e[3] || ""); if (w) words.set(w, (words.get(w) || 0) + (+e[4] || 1));
      }
    }
    const common = [...who].sort((a, b) => b[1] - a[1] || cnt.get(b[0]) - cnt.get(a[0])).slice(0, 8);
    const crit = EVAL.map(([k, l]) => { const xs = stats.map(([, st]) => st.crit[k]).filter((x) => x != null); return [l, xs.length ? Math.round((10 * xs.reduce((a, b) => a + b, 0)) / xs.length) : null]; });
    const surahs = lvl ? lvl.surahs : [];
    body.innerHTML = `<div class="report" id="rep">
      <div class="rep-head"><h3>${esc(c.name)}${lvl ? " · " + esc(lvl.name) : ""}</h3><span>${fmtDate(new Date())}</span></div>
      <div class="stats s5"><div><b>${AR(studs.length)}</b><span>عدد الطلاب</span></div><div><b>${AR(active)}</b><span>نشط هذا الأسبوع</span></div>
        <div><b>${pctTxt(avg((st) => st.attRate))}</b><span>الحضور</span></div><div><b>${pctTxt(avg((st) => st.drills))}</b><span>التمارين</span></div><div><b>${pctTxt(avg((st) => st.overall))}</b><span>التقييم الشامل</span></div></div>
      <h3 class="sec">ما يجب التركيز عليه في الدرس</h3>
      ${common.length ? `<div class="focus">${common.map(([k, n]) => { const [kind, id] = k.split("|"); return `<div><b>${esc(ruleLabel(kind, id))}</b><span>${esc(KIND_LABEL[kind] || "")}</span><i>${AR(n)} من ${AR(studs.length)} طلاب · ${AR(cnt.get(k))} خطأ</i></div>`; }).join("")}</div>
        <p class="fwords">أكثر الكلمات خطأً: ${[...words].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, n]) => `<span class="chip small">${esc(w)} · ${AR(n)}</span>`).join(" ")}</p>` : `<p class="empty">لا أخطاء مسجّلة بعد: تظهر هنا حين يتمرّن الطلاب.</p>`}
      ${crit.some((x) => x[1] != null) ? `<h3 class="sec">معدّل تقييم الشيخ لكل معيار</h3><div class="bars">${crit.map(([l, x]) => `<div><span>${esc(l)}</span><i style="--w:${x || 0}%" class="${scoreCls(x)}"></i><b>${pctTxt(x)}</b></div>`).join("")}</div>` : ""}
      <h3 class="sec">تقدّم الطلاب في سور المستوى</h3>
      ${studs.length ? `<div class="ptable-wrap"><table class="atable matrix"><thead><tr><th>الطالب</th>${surahs.map((n) => `<th>${esc(sName(n))}</th>`).join("")}<th>الحضور</th><th>التقييم</th><th>الشامل</th></tr></thead><tbody>
        ${stats.sort((a, b) => (b[1].overall || 0) - (a[1].overall || 0)).map(([s, st]) => `<tr><td><button class="linkbtn" data-stu="${s.id}">${esc(s.name)}</button></td>${surahs.map((n) => { const xs = st.LD.map((k) => st.best.get(n + "|" + k)).filter((x) => x != null); return cell(xs.length ? Math.round(xs.reduce((a, b) => a + +b, 0) / st.LD.length) : null); }).join("")}${cell(st.attRate)}${cell(st.evalPct)}${cell(st.overall)}</tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">لم ينضمّ أحد بعد. أرسل رابط الدفعة من تبويب «الدفعة والطلاب».</p>`}
      <p class="note">التقييم الشامل = تقييم الشيخ 50% + التمارين 30% + الحضور 20% (يُحسب ممّا هو متوفّر). نسبة السورة = معدّل أفضل نتيجة في تمارين المستوى.</p>
      </div><div class="bar noprint"><button class="btn" id="repPrint">🖨 تقرير PDF</button></div>`;
    $$("[data-stu]", body).forEach((b) => (b.onclick = () => { SV.student = b.dataset.stu; renderStudents(); }));
    $("#repPrint", body).onclick = () => printReport();
  }
  function printReport() { document.body.classList.add("print-report"); toast("اختر «حفظ بصيغة PDF» في نافذة الطباعة.", 4000); setTimeout(() => { window.print(); document.body.classList.remove("print-report"); }, 300); }
  function svCohort(body) {
    const c = curCohort();
    if (!c) { body.innerHTML = `<p class="empty">لا توجد دفعة بعد.</p>`; return; }
    const link = siteUrl() + "#j=" + c.join_code, studs = studentsOf(c.id);
    body.innerHTML = `<div class="card"><div class="kv">
        <label for="cName">اسم الدفعة</label><input id="cName" value="${esc(c.name)}">
        <label for="cLevel">المستوى</label><select id="cLevel"><option value="">—</option>${TD.levels.map((l) => `<option value="${l.id}"${l.id === c.level_id ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</select>
        <label for="cLive">رابط الحصة المباشرة (Google Meet، Zoom، تيليغرام، واتساب…)</label><input id="cLive" dir="ltr" placeholder="https://meet.google.com/…" value="${esc(c.live_url)}">
        <label for="cSched">موعد الحصص</label><input id="cSched" placeholder="مثال: السبت والثلاثاء بعد العصر" value="${esc(c.schedule)}">
      </div>
      <div class="bar"><button class="btn primary" id="cSave">حفظ</button><span class="grow"></span><button class="btn ghost danger" id="cDel">حذف الدفعة</button></div></div>
      <div class="card"><h3 class="sec" style="margin-top:0">انضمام الطلاب</h3>
        <p>يفتح الطالب هذا الرابط ويكتب اسمه، أو يكتب الرمز في الصفحة الرئيسية.</p>
        <div class="joincode"><b dir="ltr">${esc(c.join_code)}</b><button class="btn primary" id="cShare">📤 أرسل رابط الدفعة</button><button class="btn" id="cCode">رمز جديد</button></div></div>
      <h3 class="sec">الطلاب (${AR(studs.length)})</h3>
      ${studs.length ? `<div class="ptable-wrap"><table class="atable"><thead><tr><th>الاسم</th><th>الهاتف</th><th>آخر دخول</th><th>الدفعة</th><th></th></tr></thead><tbody>
        ${studs.map((s) => `<tr data-sid="${s.id}"${s.active ? "" : ' class="off"'}><td><input class="sName" value="${esc(s.name)}"></td><td><input class="sPhone" dir="ltr" value="${esc(s.phone || "")}" style="width:120px"></td>
          <td>${s.last_seen ? fmtDate(s.last_seen) : "—"}</td><td><select class="sCoh">${TD.cohorts.map((x) => `<option value="${x.id}"${x.id === s.cohort_id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></td>
          <td class="nowrap"><button class="linkbtn" data-stu="${s.id}">التقرير</button> · <button class="linkbtn sAct">${s.active ? "إيقاف" : "تفعيل"}</button> · <button class="linkbtn danger sDel">حذف</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">لم ينضمّ أحد بعد.</p>`}`;
    $("#cSave", body).onclick = async () => { await tsave("cohort", { id: c.id, name: $("#cName", body).value.trim() || c.name, level_id: $("#cLevel", body).value, live_url: $("#cLive", body).value.trim(), schedule: $("#cSched", body).value.trim() }); toast("حُفظت الدفعة."); renderStudents(); };
    $("#cDel", body).onclick = async (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "اضغط مرة أخرى: تُحذف الدفعة وحصصها"; return; } await tdel("cohort", c.id); SV.cohort = null; renderStudents(); };
    $("#cShare", body).onclick = () => shareText(`انضمّ إلى «${c.name}» في الطريق إلى الإتقان`, link);
    $("#cCode", body).onclick = async () => { await tsave("cohort", { id: c.id, new_code: true }); toast("صار للدفعة رمز جديد، والرابط القديم لم يعد يعمل."); renderStudents(); };
    $$("tr[data-sid]", body).forEach((tr) => {
      const id = tr.dataset.sid, s = TD.students.find((x) => x.id === id);
      $(".sName", tr).onchange = (e) => tsave("student", { id, name: e.target.value.trim() });
      $(".sPhone", tr).onchange = (e) => tsave("student", { id, phone: e.target.value.trim() });
      $(".sCoh", tr).onchange = async (e) => { await tsave("student", { id, cohort_id: e.target.value }); renderStudents(); };
      $(".sAct", tr).onclick = async () => { await tsave("student", { id, active: !s.active }); renderStudents(); };
      $(".sDel", tr).onclick = async (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "تأكيد الحذف"; return; } await tdel("student", id); renderStudents(); };
    });
    $$("[data-stu]", body).forEach((b) => (b.onclick = () => { SV.student = b.dataset.stu; renderStudents(); }));
  }
  function svSessions(body) {
    const c = curCohort();
    if (!c) { body.innerHTML = `<p class="empty">لا توجد دفعة بعد.</p>`; return; }
    const lvl = levelOf(c), sess = TD.sessions.filter((x) => x.cohort_id === c.id), studs = studentsOf(c.id).filter((s) => s.active);
    if (!SV.session || !sess.some((x) => x.id === SV.session)) SV.session = (sess[0] || {}).id || null;
    const se = sess.find((x) => x.id === SV.session), att = new Map(TD.attendance.filter((a) => a[0] === SV.session).map((a) => [a[1], a[2]]));
    const surOpts = (cur) => `<option value="">—</option>` + (lvl ? lvl.surahs : META.surahs.map((s) => s.n)).map((n) => `<option value="${n}"${+cur === n ? " selected" : ""}>${esc(sName(n))}</option>`).join("");
    const counts = (id) => { const a = TD.attendance.filter((x) => x[0] === id); return `${AR(a.filter((x) => x[2] === "present" || x[2] === "late").length)}/${AR(studs.length)}`; };
    body.innerHTML = `<div class="card"><h3 class="sec" style="margin-top:0">حصة جديدة</h3>
        <div class="bar"><div class="field"><label for="nsAt">التاريخ</label><input type="date" id="nsAt" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="field"><label for="nsSurah">السورة</label><select id="nsSurah">${surOpts("")}</select></div>
        <div class="field grow"><label for="nsTitle">الموضوع</label><input id="nsTitle" placeholder="مثال: الساكن البيني"></div>
        <button class="btn primary" id="nsGo">إضافة</button></div></div>
      ${sess.length ? `<div class="sesslist">${sess.map((x) => `<button data-se="${x.id}" aria-pressed="${x.id === SV.session}">${fmtDate(x.at)}${x.surah ? " · " + esc(sName(x.surah)) : ""}${x.title ? " · " + esc(x.title) : ""} <small>${counts(x.id)}</small></button>`).join("")}</div>` : `<p class="empty">لا حصص مسجّلة بعد.</p>`}
      ${se ? `<div class="card"><div class="bar"><h3 class="sec grow" style="margin:0">الحضور: ${fmtDate(se.at)}${se.surah ? " · " + esc(sName(se.surah)) : ""}</h3><button class="btn" id="allPresent">الكلّ حاضر</button><button class="btn ghost danger" id="seDel">حذف الحصة</button></div>
        ${studs.length ? `<div class="attlist">${studs.map((s) => `<div class="att" data-sid="${s.id}"><span>${esc(s.name)}</span><span class="seg">${STATUS.map(([k, l, ic]) => `<button data-st="${k}" aria-pressed="${att.get(s.id) === k}" title="${l}">${ic} ${l}</button>`).join("")}</span></div>`).join("")}</div>` : `<p class="empty">لا طلاب في الدفعة.</p>`}</div>` : ""}`;
    $("#nsGo", body).onclick = async () => { const r = await tsave("session", { cohort_id: c.id, at: $("#nsAt", body).value, surah: $("#nsSurah", body).value, title: $("#nsTitle", body).value.trim() }); SV.session = r.id; renderStudents(); };
    $$("[data-se]", body).forEach((b) => (b.onclick = () => { SV.session = b.dataset.se; renderStudents(); }));
    if (se) {
      $$(".att", body).forEach((row) => $$("[data-st]", row).forEach((b) => (b.onclick = async () => {
        const st = att.get(row.dataset.sid) === b.dataset.st ? "" : b.dataset.st;
        $$("[data-st]", row).forEach((x) => x.setAttribute("aria-pressed", x === b && !!st));
        await tsave("attendance", { session_id: se.id, student_id: row.dataset.sid, status: st }); att.set(row.dataset.sid, st);
      })));
      $("#allPresent", body).onclick = async () => { for (const s of studs) if (!att.get(s.id)) await DB.rpc("itqan_t_save", { p_key: SK(), p_kind: "attendance", p_row: { session_id: se.id, student_id: s.id, status: "present" } }); await loadTD(); renderStudents(); };
      $("#seDel", body).onclick = async (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "تأكيد الحذف"; return; } await tdel("session", se.id); SV.session = null; renderStudents(); };
    }
  }
  function svEval(body) {
    const c = curCohort();
    if (!c) { body.innerHTML = `<p class="empty">لا توجد دفعة بعد.</p>`; return; }
    const lvl = levelOf(c), studs = studentsOf(c.id).filter((s) => s.active);
    if (!studs.length) { body.innerHTML = `<p class="empty">لا طلاب في الدفعة.</p>`; return; }
    if (!SV.evalStudent || !studs.some((s) => s.id === SV.evalStudent)) SV.evalStudent = studs[0].id;
    const s = studs.find((x) => x.id === SV.evalStudent), evs = TD.evaluations.filter((e) => e.student_id === s.id);
    body.innerHTML = `<div class="card"><div class="bar"><div class="field"><label for="evS">الطالب</label><select id="evS">${studs.map((x) => `<option value="${x.id}"${x.id === s.id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="evAt">التاريخ</label><input type="date" id="evAt" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="field"><label for="evSurah">السورة</label><select id="evSurah"><option value="">—</option>${(lvl ? lvl.surahs : []).map((n) => `<option value="${n}">${esc(sName(n))}</option>`).join("")}</select></div></div>
      <p class="note">ضع لكل معيار علامة من 10 بعد سماع تلاوة الطالب. اترك المعيار فارغاً إن لم تقيّمه.</p>
      <div class="evgrid">${EVAL.map(([k, l]) => `<label>${esc(l)}</label><div class="evbtns" data-k="${k}">${[...Array(11).keys()].map((i) => `<button data-v="${i}">${AR(i)}</button>`).join("")}</div>`).join("")}</div>
      <label for="evNote">ملاحظة للطالب</label><textarea id="evNote" rows="2" class="full"></textarea>
      <div class="bar"><button class="btn primary" id="evGo">حفظ التقييم</button></div></div>
      <h3 class="sec">تقييمات ${esc(s.name)}</h3>
      ${evs.length ? `<div class="ptable-wrap"><table class="atable"><thead><tr><th>التاريخ</th><th>السورة</th>${EVAL.map(([, l]) => `<th>${esc(l)}</th>`).join("")}<th>ملاحظة</th><th></th></tr></thead><tbody>
        ${evs.map((e) => `<tr><td>${fmtDate(e.at)}</td><td>${esc(sName(e.surah))}</td>${EVAL.map(([k]) => `<td>${e.scores[k] != null ? AR(e.scores[k]) : "—"}</td>`).join("")}<td>${esc(e.note)}</td><td><button class="linkbtn danger" data-del="${e.id}">حذف</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">لا تقييم بعد.</p>`}`;
    const pick = {};
    $$(".evbtns", body).forEach((g) => $$("button", g).forEach((b) => (b.onclick = () => { const k = g.dataset.k, val = +b.dataset.v; pick[k] = pick[k] === val ? undefined : val; $$("button", g).forEach((x) => x.setAttribute("aria-pressed", pick[k] === +x.dataset.v)); })));
    $("#evS", body).onchange = (e) => { SV.evalStudent = e.target.value; renderStudents(); };
    $("#evGo", body).onclick = async () => {
      const scores = {}; for (const k in pick) if (pick[k] != null) scores[k] = pick[k];
      if (!Object.keys(scores).length && !$("#evNote", body).value.trim()) { toast("ضع علامة لمعيار واحد على الأقل."); return; }
      await tsave("evaluation", { student_id: s.id, at: $("#evAt", body).value, surah: $("#evSurah", body).value, scores, note: $("#evNote", body).value.trim() });
      toast("حُفظ التقييم."); renderStudents();
    };
    $$("[data-del]", body).forEach((b) => (b.onclick = async () => { await tdel("evaluation", b.dataset.del); renderStudents(); }));
  }
  function svLevels(body) {
    const progs = [...new Set(PROGRAMS.concat(TD.levels.map((l) => l.program).filter(Boolean)))];
    const byProg = progs.map((pg) => [pg, TD.levels.filter((l) => (l.program || PROGRAMS[0]) === pg)]).filter(([, ls]) => ls.length);
    body.innerHTML = `<p class="lead">الأكاديمية مسارات (التجويد، القراءات، التفسير…)، ولكل مسار مستويات، ولكل مستوى سوره وتمارينه بالترتيب الذي يدرّسه الشيخ.</p>
      <datalist id="progList">${progs.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
      ${byProg.map(([pg, ls]) => `<h3 class="sec">${esc(pg)}</h3>${ls.map((l) => `<div class="card lvl" data-lid="${l.id}"><div class="kv"><label>المسار</label><input class="lProg" list="progList" value="${esc(l.program || PROGRAMS[0])}"><label>اسم المستوى</label><input class="lName" value="${esc(l.name)}">
          <label>وصف قصير</label><input class="lDesc" value="${esc(l.description)}"></div>
        <div class="chips">${l.surahs.map((n, i) => `<span class="chip">${esc(sName(n))}<button class="linkbtn" data-rm="${i}" aria-label="إزالة">✕</button></span>`).join("") || `<span class="note">لا سور بعد.</span>`}</div>
        <label class="note">تمارين المستوى</label><div class="chips">${ALL_DRILLS.map((k) => `<button class="chip" data-dr="${k}" aria-pressed="${lvlDrills(l).includes(k)}">${esc(KIND_LABEL[k])}</button>`).join("")}</div>
        ${lvlDrills(l).includes("huruf") && l.surahs.length ? `<label class="note">حروف درس المخارج والصفات في كل سورة</label><div class="letters">${l.surahs.map((n) => `<span>${esc(sName(n))} <input data-let="${n}" value="${esc(((l.config || {}).letters || {})[n] || "")}" placeholder="ء ه ع" style="width:90px"></span>`).join("")}</div>` : ""}
        <div class="bar"><div class="field"><label>أضف سورة</label><select class="lAdd"><option value="">—</option>${META.surahs.filter((s) => !l.surahs.includes(s.n)).map((s) => `<option value="${s.n}">${AR(s.n)} · ${esc(s.ar)}</option>`).join("")}</select></div>
          <button class="btn primary lSave">حفظ</button><span class="grow"></span><button class="btn ghost danger lDel">حذف المستوى</button></div></div>`).join("")}`).join("")}
      <button class="btn" id="lvNew">+ مستوى جديد</button>`;
    $$(".lvl", body).forEach((box) => {
      const l = TD.levels.find((x) => x.id === box.dataset.lid), sur = l.surahs.slice();
      const cfg = Object.assign({ drills: lvlDrills(l).slice(), letters: {} }, l.config || {});
      $$("[data-dr]", box).forEach((b) => (b.onclick = async () => { const k = b.dataset.dr, d = new Set(lvlDrills(l)); d.has(k) ? d.delete(k) : d.add(k); if (!d.size) return; cfg.drills = ALL_DRILLS.filter((x) => d.has(x)); await tsave("level", { id: l.id, config: cfg }); renderStudents(); }));
      $$("[data-let]", box).forEach((x) => (x.onchange = async () => { cfg.letters = Object.assign({}, cfg.letters, { [x.dataset.let]: x.value.trim() }); await tsave("level", { id: l.id, config: cfg }); toast("حُفظت الحروف."); }));
      $(".lAdd", box).onchange = async (e) => { if (!e.target.value) return; sur.push(+e.target.value); await tsave("level", { id: l.id, surahs: sur }); renderStudents(); };
      $$("[data-rm]", box).forEach((b) => (b.onclick = async () => { sur.splice(+b.dataset.rm, 1); await tsave("level", { id: l.id, surahs: sur }); renderStudents(); }));
      $(".lSave", box).onclick = async () => {
        await tsave("level", { id: l.id, program: $(".lProg", box).value.trim(), name: $(".lName", box).value.trim() || l.name, description: $(".lDesc", box).value.trim() }); toast("حُفظ المستوى."); renderStudents();
      };
      $(".lDel", box).onclick = async (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "تأكيد الحذف"; return; } await tdel("level", l.id); renderStudents(); };
    });
    $("#lvNew", body).onclick = async () => { await tsave("level", { name: "مستوى جديد", surahs: [], sort: TD.levels.length + 1 }); renderStudents(); };
  }
  async function studentReport(body, s) {
    if (!s) { SV.student = null; return renderStudents(); }
    const st = studentStats(s);
    body.innerHTML = `<div class="report" id="rep">
      <div class="rep-head"><h3>تقرير الطالب: ${esc(s.name)}</h3><span>${st.c ? esc(st.c.name) : ""}${st.lvl ? " · " + esc(st.lvl.name) : ""} · ${fmtDate(new Date())}</span></div>
      <div class="stats s4"><div><b>${pctTxt(st.overall)}</b><span>التقييم الشامل</span></div><div><b>${pctTxt(st.evalPct)}</b><span>تقييم الشيخ</span></div><div><b>${pctTxt(st.drills)}</b><span>التمارين</span></div><div><b>${pctTxt(st.attRate)}</b><span>الحضور (${AR(st.cnt)} حصة)</span></div></div>
      ${Object.values(st.crit).some((x) => x != null) ? `<h3 class="sec">تقييم الشيخ لكل معيار</h3><div class="bars">${EVAL.map(([k, l]) => { const x = st.crit[k] == null ? null : Math.round(st.crit[k] * 10); return `<div><span>${esc(l)}</span><i style="--w:${x || 0}%" class="${scoreCls(x)}"></i><b>${pctTxt(x)}</b></div>`; }).join("")}</div>` : ""}
      <h3 class="sec">ما يحتاج التركيز عليه</h3>${focusHTML(errStats(st.errs))}
      <h3 class="sec">التمارين في سور المستوى</h3>
      <div class="ptable-wrap"><table class="atable matrix"><thead><tr><th>السورة</th>${st.LD.map((k) => `<th>${esc(KIND_LABEL[k])}</th>`).join("")}</tr></thead><tbody>
        ${st.surahs.map((n) => `<tr><td>${esc(sName(n))}</td>${st.LD.map((k) => cell(st.best.has(n + "|" + k) ? +st.best.get(n + "|" + k) : null)).join("")}</tr>`).join("")}</tbody></table></div>
      <h3 class="sec">الحضور</h3>
      ${st.sess.length ? `<div class="chips">${st.sess.map((x) => { const a = st.att.get(x.id), S = STATUS.find((y) => y[0] === a); return `<span class="chip small att-${a || "none"}">${fmtDate(x.at)} · ${S ? S[1] : "لم يُسجَّل"}</span>`; }).join("")}</div>` : `<p class="empty">لا حصص بعد.</p>`}
      ${st.evs.some((e) => e.note) ? `<h3 class="sec">ملاحظات الشيخ</h3><ul>${st.evs.filter((e) => e.note).map((e) => `<li>${fmtDate(e.at)}${e.surah ? " · " + esc(sName(e.surah)) : ""}: ${esc(e.note)}</li>`).join("")}</ul>` : ""}
      </div><div class="bar noprint"><button class="btn" id="repBack">→ رجوع</button><button class="btn" id="repPrint">🖨 تقرير PDF</button></div>`;
    $("#repBack", body).onclick = () => { SV.student = null; renderStudents(); };
    $("#repPrint", body).onclick = () => printReport();
  }

  /* ---------------- the student's own page: results, attendance, the cheikh's evaluation ---------------- */
  async function renderProgress() {
    const v = $("#v-progress"), A = LS.get("attempts", []);
    if (TOK()) refreshMe().then((m) => { if (m && location.hash === "#progress" && !v.dataset.fresh) { v.dataset.fresh = 1; renderProgress(); } });
    delete v.dataset.fresh;
    const me = TOK() ? ME : null, tot = A.reduce((s, a) => s + a.n, 0), ok = A.reduce((s, a) => s + a.r, 0);
    const sess = me ? me.sessions || [] : [], evs = me ? me.evaluations || [] : [];
    let got = 0, cnt = 0; for (const x of sess) { if (!x.status || x.status === "excused") continue; cnt++; got += x.status === "present" ? 1 : x.status === "late" ? 0.75 : 0; }
    const crit = {}; for (const [k] of EVAL) { const xs = evs.map((e) => e.scores && e.scores[k]).filter((x) => x != null); crit[k] = xs.length ? Math.round((10 * xs.reduce((a, b) => a + +b, 0)) / xs.length) : null; }
    v.innerHTML = `<h2 class="page-title">نتائجي</h2>
      ${me ? `<p class="lead">${esc(me.student.name)}${me.cohort ? " · " + esc(me.cohort.name) : ""}${me.level ? " · " + esc(me.level.name) : ""}. نتائج تمارينك تصل إلى الشيخ وحدها.</p>`
        : `<p class="lead">نتائجك محفوظة على هذا الجهاز. ${DB.ok() ? "انضمّ إلى دفعتك من الصفحة الرئيسية لتصل إلى الشيخ وحدها." : ""}</p>`}
      <div class="stats s4"><div><b>${AR(A.length)}</b><span>محاولة</span></div><div><b>${pctTxt(pct(ok, tot))}</b><span>نسبة الصواب</span></div>
        <div><b>${me ? pctTxt(pct(got, cnt)) : "—"}</b><span>الحضور</span></div><div><b>${AR(A.filter((a) => a.ex).length)}</b><span>امتحان</span></div></div>
      ${evs.length ? `<h3 class="sec">تقييم الشيخ</h3><div class="bars">${EVAL.map(([k, l]) => `<div><span>${esc(l)}</span><i style="--w:${crit[k] || 0}%" class="${scoreCls(crit[k])}"></i><b>${pctTxt(crit[k])}</b></div>`).join("")}</div>
        ${evs.filter((e) => e.note).slice(0, 5).map((e) => `<p class="note">${fmtDate(e.at)}${e.surah ? " · " + esc(sName(e.surah)) : ""}: ${esc(e.note)}</p>`).join("")}` : ""}
      <h3 class="sec">ما تحتاج التركيز عليه</h3>${focusHTML(errStats(rowsOf(A)))}
      ${sess.length ? `<h3 class="sec">حضوري</h3><div class="chips">${sess.map((x) => { const S = STATUS.find((y) => y[0] === x.status); return `<span class="chip small att-${x.status || "none"}">${fmtDate(x.at)}${x.surah ? " · " + esc(sName(x.surah)) : ""} · ${S ? S[1] : "لم يُسجَّل"}</span>`; }).join("")}</div>` : ""}
      <h3 class="sec">محاولاتي</h3>${A.length ? attemptsTable(A) : `<p class="empty">لم تُجرِ أي تمرين بعد.</p>`}
      ${me ? `<p class="note">لفتح حسابك على جهاز آخر: <button class="linkbtn" id="myLink">أرسل رابط حسابي إلى نفسي</button> · <button class="linkbtn" id="logout">خروج من هذا الجهاز</button></p>` : ""}`;
    if (me) {
      $("#myLink", v).onclick = () => shareText("حسابي في الطريق إلى الإتقان", siteUrl() + "#s=" + encodeURIComponent(TOK()));
      $("#logout", v).onclick = (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "اضغط مرة أخرى للتأكيد"; return; } LS.del("stok"); LS.del("me"); ME = null; location.hash = "#home"; };
    }
  }
  /** Hamzat al-wasl drill: every marked wasl alif is drawn plain; the student gives each one of the six forms. */
  const WASL_LABEL = { "\u06EC": "نقطة فوق الألف<br>يُبدأ بالفتح", "\u06EA": "نقطة تحت الألف<br>يُبدأ بالكسر", "\u06DF": "نقطة في وسطها<br>يُبدأ بالضمّ" };
  const waslKey = (text) => text.match(WASL_RE)[0][2]; // the ibtida dot: the only sign the cheikh writes on the alif
  const waslLabel = (k) => WASL_LABEL[k[k.length - 1]] || "";
  function renderWasl(v, S) {
    const sc = drillScope(S);
    P.wasl = P.wasl || {};
    const targets = sc.items.filter((x) => WASL_RE.test(x.wd[0])).map((x) => ({ wd: x.wd, wi: x.id }));
    const keyOf = (wd) => waslKey(wd[0]);
    if (P.wPick == null || !targets.some((t) => t.wi === P.wPick)) P.wPick = targets.length ? targets[0].wi : null;
    let cur = -1;
    WASL_ALT = () => { const k = P.solved ? keyOf(sc.by.get(cur).wd) : P.wasl[cur]; const sh = k ? META.waslForms[k] : META.plainAlif; return [sh[0], sh[1], P.checked && !P.solved && P.wasl[cur] ? (P.wasl[cur] === keyOf(sc.by.get(cur).wd) ? "k-ok" : "k-bad") : cur === P.wPick && !P.solved ? "k-pick" : ""]; };
    const line = sc.line(({ wd, id: wi }) => { cur = wi; return WASL_RE.test(wd[0]) ? `<button class="w${wi === P.wPick ? " picked" : ""}" data-ww="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, null)}</button>` : `<span class="w">${wordSVG(wd, null)}</span>`; });
    WASL_ALT = null;
    const forms = Object.keys(META.waslForms).map((k) => `<button class="wform" data-wf="${k}" aria-pressed="${P.wPick != null && P.wasl[P.wPick] === k}"><span class="wf-g">${wordSVG(["", META.waslForms[k][0], META.waslForms[k][1]], null)}</span><span>${waslLabel(k)}</span></button>`).join("");
    let result = "";
    if (P.checked) {
      const right = targets.filter((t) => P.wasl[t.wi] === keyOf(t.wd)).length;
      const bad = targets.filter((t) => P.wasl[t.wi] !== keyOf(t.wd));
      logAttempt("wasl", S, sc.key, right, targets.length, bad.filter((t) => P.wasl[t.wi]).length, bad.map((t) => [t.wd[0], keyOf(t.wd), P.wasl[t.wi] || ""]));
      result = `<div class="result"><b>${right === targets.length ? "أحسنت! كل همزات الوصل صحيحة." : `الصحيح ${AR(right)} من ${AR(targets.length)}.`}</b>${examNote()}</div>`;
    }
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === P.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    const aopts = ayahOpts(S);
    v.innerHTML = `${surahHead(P.surah)}${surahTabs("wasl")}
      <p class="lead">كل همزة وصل مرسومة هنا ألفاً مجرّدة. اختر الكلمة ثم اختر شكل همزتها.</p>
      <details class="waslref" open><summary>ضبط همزة الوصل</summary>
        <p>همزة الوصل تثبت في الابتداء وتسقط في الوصل. علامتها <b>نقطة واحدة</b> على الألف تدلّ على الحركة التي يُبدأ بها: <b>فوق</b> الألف = يُبدأ بالفتح (همزة «ال»)، <b>تحتها</b> = يُبدأ بالكسر (اِهدنا، اِبتغاء)، <b>في وسطها</b> = يُبدأ بالضمّ (اُدعوا، اُنظروا: ثالث الفعل مضموم ضمّاً لازماً).</p>
        <p>الألف بعد حرف زائد (وَالليل، فَالمغيرات، بِالحسنى) تُكتب مجرّدة بلا نقطة، لأنه لا يُبتدأ بها.</p>
      </details>
      <div class="bar">
        <div class="field"><label for="pS">السورة</label><select id="pS">${opts}</select></div>
        <div class="field"><label for="pA">الآية</label><select id="pA">${aopts}</select></div>
        <button class="iconbtn" id="pPrev" aria-label="الآية السابقة">›</button><button class="iconbtn" id="pNext" aria-label="الآية التالية">‹</button>
      </div>
      <div class="ayah-show pool" id="pAyah" style="font-size:44px">${line}</div>
      ${targets.length ? `<div class="wforms">${forms}</div>
      <div class="bar"><button class="btn primary" id="wCheck"${P.locked ? " disabled" : ""}>${P.exam ? "سلّم الامتحان" : "تحقّق"}</button>${P.exam && !P.locked ? "" : `<button class="btn" id="wSolve">${P.solved ? "عُد إلى إجاباتي" : "اعرض الحل"}</button>`}<button class="btn" id="wClear">${P.locked ? "امتحان جديد" : "امسح الكل"}</button>${examBtn()}</div>` : `<p class="empty">لا توجد هنا همزة وصل معلَّمة. انتقل إلى آية أخرى.</p>`}
      ${result}`;
    bindSurahTabs(v);
    $("#pS", v).onchange = (e) => { P.surah = +e.target.value; ui.surah = P.surah; LS.set("surah", ui.surah); P.ai = defAi(P.surah); resetExercise(); renderPractice(); };
    $("#pA", v).onchange = (e) => { P.ai = +e.target.value; resetExercise(); renderPractice(); };
    $("#pPrev", v).onclick = () => { if (P.ai >= 0) { P.ai--; resetExercise(); renderPractice(); } };
    $("#pNext", v).onclick = () => { if (P.ai < S.ayahs.length - 1) { P.ai++; resetExercise(); renderPractice(); } };
    $$("[data-ww]", v).forEach((b) => (b.onclick = () => { P.wPick = +b.dataset.ww; renderPractice(); }));
    $$("[data-wf]", v).forEach((b) => (b.onclick = () => { if (P.wPick == null || P.locked) return; P.wasl[P.wPick] = b.dataset.wf; P.checked = false; P.solved = false; const nx = targets.find((t) => !P.wasl[t.wi]); if (nx) P.wPick = nx.wi; renderPractice(); }));
    if (targets.length) {
      $("#wCheck", v).onclick = () => { P.checked = true; P.solved = false; P.fresh = true; renderPractice(); };
      if ($("#wSolve", v)) $("#wSolve", v).onclick = () => { P.solved = !P.solved; renderPractice(); };
      bindExam(v);
      $("#wClear", v).onclick = () => { resetExercise(); renderPractice(); };
    }
  }
  /** Colouring drill: the student paints part by part — the letter, its shadda, sukun, fatha, damma, kasra,
      each stroke of a tanween — and each part is graded on its own. */
  function renderPaint(v, S) {
    const sc = drillScope(S);
    const brushes = CORE.map((id) => CATMAP.get(id)).filter(Boolean);
    if (!P.brush || (P.brush !== "__erase" && !CATMAP.has(P.brush))) P.brush = brushes[0].id;
    if (!P.paint || Array.isArray(P.paint)) P.paint = {};
    const coreSet = new Set(CORE);
    const words = sc.items.map((x) => ({ wd: x.wd, wi: x.id }));
    const solution = (wi) => T.resolve(sc.by.get(wi).an, coreSet, PRIORITY, ovOf(S, sc.by.get(wi)));
    const expected = new Map();
    for (const { wd, wi } of words) for (const [k, cat] of partsOf(wd, solution(wi))) if (coreSet.has(cat)) expected.set(`${wi}:${k}`, cat);
    const mineOf = (wi) => { const m = new Map(); for (const key in P.paint) { const j = key.indexOf(":"); if (+key.slice(0, j) === wi) m.set(key.slice(j + 1), P.paint[key]); } const c = []; c.direct = m; return c; };
    HIT = true;
    const line = sc.line(({ wd, id: wi }) => `<span class="w paintw" data-wi="${wi}">${wordSVG(wd, P.solved ? solution(wi) : mineOf(wi))}</span>`);
    HIT = false;
    let result = "";
    if (P.checked) {
      let right = 0, wrong = 0;
      for (const key in P.paint) expected.get(key) === P.paint[key] ? right++ : wrong++;
      const missing = [...expected.keys()].filter((k) => !(k in P.paint)).length;
      const per = brushes.map((b) => { const need = [...expected.values()].filter((x) => x === b.id).length, got = Object.keys(P.paint).filter((k) => P.paint[k] === b.id && expected.get(k) === b.id).length; return need ? `<span class="chip small" style="--dot:var(--c-${b.id})"><span class="dot"></span>${esc(b.name)} ${AR(got)}/${AR(need)}</span>` : ""; }).join("");
      const wordOf = (key) => sc.by.get(+key.slice(0, key.indexOf(":"))).wd[0], errs = [];
      for (const [key, cat] of expected) if (P.paint[key] !== cat) errs.push([wordOf(key), cat, P.paint[key] || ""]);
      for (const key in P.paint) if (!expected.has(key)) errs.push([wordOf(key), "", P.paint[key]]);
      logAttempt("paint", S, sc.key, right, expected.size, wrong, errs);
      const sc0 = LS.get("scores", {}); sc0[`paint:${S.n}:${sc.key}`] = { right, total: expected.size, wrong, at: Date.now() }; LS.set("scores", sc0);
      result = `<div class="result"><b>${missing === 0 && wrong === 0 ? "أحسنت! التلوين صحيح كله." : `الصحيح ${AR(right)} من ${AR(expected.size)}${wrong ? `، وفي غير موضعه أو بغير لونه ${AR(wrong)}` : ""}${missing ? `، وبقي ${AR(missing)}` : ""}.`}</b><div class="missing" style="margin-top:6px">${per}</div>${examNote()}</div>`;
    }
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === P.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    const aopts = ayahOpts(S);
    v.innerHTML = `${surahHead(P.surah)}${surahTabs(P.kind || "time")}
      <p class="lead">اختر لوناً ثم اضغط على الجزء الذي تريد تلوينه: الحرف نفسه، أو الشدّة، أو السكون، أو الفتحة، أو الضمّة، أو الكسرة، أو إحدى علامتي التنوين. كل جزء يُلوَّن ويُصحَّح وحده. اضغط الجزء مرة ثانية باللون نفسه لإزالته.</p>
      <div class="bar">
        <div class="field"><label for="pS">السورة</label><select id="pS">${opts}</select></div>
        <div class="field"><label for="pA">الآية</label><select id="pA">${aopts}</select></div>
        <button class="iconbtn" id="pPrev" aria-label="الآية السابقة">›</button><button class="iconbtn" id="pNext" aria-label="الآية التالية">‹</button>
        <div class="field" aria-label="حجم الخط"><button class="iconbtn" id="ptMinus" aria-label="تصغير">−</button><button class="iconbtn" id="ptPlus" aria-label="تكبير">+</button></div>
      </div>
      <div class="legend" style="position:static">${brushes.map((b) => `<button class="chip brush${P.brush === b.id ? " on" : ""}" data-brush="${b.id}" style="--dot:var(--c-${b.id})"><span class="dot"></span>${esc(b.name)}</button>`).join("")}<button class="chip brush${P.brush === "__erase" ? " on" : ""}" data-brush="__erase" style="--dot:transparent"><span class="dot"></span>ممحاة</button></div>
      <div class="rulekey">${brushes.map((b) => `<div class="${P.brush === b.id ? "on" : ""}"><span class="dot" style="--dot:var(--c-${b.id})"></span><b>${esc(b.name)}</b><span>${esc(b.short || "")}</span></div>`).join("")}</div>
      <div class="ayah-show paint" id="pAyah" style="font-size:${P.psize || 56}px">${line}</div>
      <div class="bar"><button class="btn primary" id="ptCheck"${P.locked ? " disabled" : ""}>${P.exam ? "سلّم الامتحان" : "تحقّق"}</button>${P.exam && !P.locked ? "" : `<button class="btn" id="ptSolve">${P.solved ? "عُد إلى تلويني" : "اعرض الحل"}</button>`}<button class="btn" id="ptClear">${P.locked ? "امتحان جديد" : "امسح الكل"}</button>${examBtn()}</div>
      ${result}`;
    bindSurahTabs(v);
    $("#pS", v).onchange = (e) => { P.surah = +e.target.value; ui.surah = P.surah; LS.set("surah", ui.surah); P.ai = defAi(P.surah); resetExercise(); renderPractice(); };
    $("#pA", v).onchange = (e) => { P.ai = +e.target.value; resetExercise(); renderPractice(); };
    $("#pPrev", v).onclick = () => { if (P.ai >= 0) { P.ai--; resetExercise(); renderPractice(); } };
    $("#pNext", v).onclick = () => { if (P.ai < S.ayahs.length - 1) { P.ai++; resetExercise(); renderPractice(); } };
    $("#ptMinus", v).onclick = () => { P.psize = Math.max(36, (P.psize || 56) - 8); renderPractice(); };
    $("#ptPlus", v).onclick = () => { P.psize = Math.min(120, (P.psize || 56) + 8); renderPractice(); };
    $$("[data-brush]", v).forEach((b) => (b.onclick = () => { P.brush = b.dataset.brush; renderPractice(); }));
    $("#pAyah", v).onclick = (e) => {
      if (P.solved || P.locked) return;
      const use = e.target.closest("use[data-c]"), wEl = e.target.closest(".paintw");
      if (!use || !wEl) return;
      const wi = +wEl.dataset.wi, w = sc.by.get(wi).an, c = +use.dataset.c;
      let unit = w.units[0]; for (const u of w.units) if (u.b <= c) unit = u;
      if (unit.role === "wasl" || unit.role === "silentWasl") { toast("همزة الوصل لا تُلوَّن."); return; }
      const key = `${wi}:${c}${use.dataset.s || ""}`;
      if (P.brush === "__erase" || P.paint[key] === P.brush) delete P.paint[key]; else P.paint[key] = P.brush;
      P.checked = false; renderPractice();
    };
    $("#ptCheck", v).onclick = () => { P.checked = true; P.solved = false; P.fresh = true; renderPractice(); };
    if ($("#ptSolve", v)) $("#ptSolve", v).onclick = () => { P.solved = !P.solved; renderPractice(); };
    $("#ptClear", v).onclick = () => { resetExercise(); renderPractice(); };
    bindExam(v);
  }
  /* ---------------- the cheikh's tables: المدود، الراءات، المخارج والصفات ----------------
     As in his workbook («تدريب: املأ الجداول بما يناسب»): the word (or letter) is given, the student fills the
     rest, and «تحقّق» shows the answer with its reason. */
  const MADD_T = {
    tabii: ["المدّ الطبيعي", "2", "حرف مدّ لم يأتِ بعده همز ولا سكون."],
    muttasil: ["المدّ المتّصل", "4-5", "حرف مدّ بعده همز في الكلمة نفسها."],
    munfasil: ["المدّ المنفصل", "2-4", "حرف مدّ في آخر الكلمة، والهمز في أوّل الكلمة التي بعدها."],
    lazim: ["المدّ اللازم", "6", "حرف مدّ بعده سكون أصلي ثابت وصلاً ووقفاً."],
    arid: ["المدّ العارض للسكون", "2-4-6", "حرف مدّ بعده حرف سُكّن لأجل الوقف."],
    badal: ["مدّ البدل", "2", "همز بعده حرف مدّ (تقدّم الهمز على المدّ)، ولقالون فيه القصر."],
    leen: ["مدّ اللين", "2-4-6", "واو أو ياء ساكنة بعد فتح، وبعدها حرف سُكّن للوقف."],
    sila_s: ["الصلة الصغرى", "2", "هاء الضمير بين متحرّكين، وليس بعدها همز."],
    sila_k: ["الصلة الكبرى", "2-4", "هاء الضمير بين متحرّكين وبعدها همز: تُمدّ كالمنفصل."],
  };
  const MADD_LEN = { "2": "حركتان", "4-5": "4 أو 5 حركات", "2-4": "2 أو 4 حركات (القصر أو التوسّط)", "6": "6 حركات", "2-4-6": "2 أو 4 أو 6 حركات" };
  const HAMZA_L = "ءأإؤئ";
  /** Like the cheikh's tables, a whole surah gives a few words of each kind (at most two per kind, ten in all), not every one. */
  function sampleRows(rows, keyOf, scope) {
    if (scope !== "all") return rows;
    const seen = new Map(), out = [];
    for (const r of rows) { const k = keyOf(r), n = seen.get(k) || 0; if (n < 2 && out.length < 10) { seen.set(k, n + 1); out.push(r); } }
    return out;
  }
  /** Every madd in the scope: the word, the char that carries it, its type. */
  function maddRows(sc, S) {
    const rows = [];
    for (const it of sc.items) {
      const w = it.an, U = w.units, next = sc.items.find((x) => x.ai === it.ai && x.wi > it.wi);
      const nextHamza = next && next.an.units.length && HAMZA_L.includes(next.an.units[0].L) && next.an.units[0].role !== "wasl";
      // the first word of the next ayah, for a madd letter that ends the ayah (تُجْزَىٰ ۝ إِلَّا: منفصل when the ayahs are joined)
      const nAy = !next && S.ayahs[it.ai + 1], nAn = nAy && analyze(S, it.ai + 1), nU = nAn && (nAn.find(Boolean) || {}).units;
      const hamzaAfter = next ? nextHamza : !!(nU && nU.length && HAMZA_L.includes(nU[0].L) && nU[0].role !== "wasl");
      const isLast = !next;
      U.forEach((u, k) => {
        const c = (i) => (i != null && w.cand[i] ? w.cand[i].find((x) => /^madd_/.test(x.cat)) : null);
        const at = u.role === "madd" ? u.b : u.madd ? u.madd.i : u.dagger ? u.dagger.i : null, m = c(at);
        if (m) {
          let t = m.cat.slice(5);
          // a hamza before the madd letter (ءَامَنُوا), or a hamza carrying the maddah (لَلْءَاخِرَةُ written أٓ): madd al-badal
          let p = k - 1; while (p >= 0 && (U[p].role === "zaid" || U[p].role === "kashida")) p--;
          const host = u.role === "madd" ? U[p] : u;
          if ((t === "tabii" || (t !== "muttasil" && t !== "munfasil" && u.madd && HAMZA_L.includes(u.L))) && host && HAMZA_L.includes(host.L) && host.role !== "wasl") t = "badal";
          else if (t === "tabii" && u.role === "madd" && k === U.length - 1 && hamzaAfter) t = "munfasil";
          if (MADD_T[t]) rows.push({ id: it.id + ":" + at, it, at, t });
        }
        u.marks.forEach((mk) => { if ((mk.t === "swaw" || mk.t === "sya") && !isLast) rows.push({ id: it.id + ":" + mk.i, it, at: mk.i, t: nextHamza ? "sila_k" : "sila_s" }); });
        // a sakin waw or ya after a fatha, before the letter stopped on at the end of the ayah: madd al-leen
        if (isLast && (u.L === "و" || u.L === "ي") && u.sukun && u.role !== "madd" && k === U.length - 2 && U[k - 1] && U[k - 1].vowel === "a") rows.push({ id: it.id + ":" + u.b, it, at: u.b, t: "leen" });
      });
    }
    return rows;
  }
  /** Every ra in the scope with its ruling (from the engine's colouring) and the reason. */
  function raRows(sc) {
    const rows = [];
    for (const it of sc.items) {
      const w = it.an, U = w.units, isLast = !sc.items.some((x) => x.ai === it.ai && x.wi > it.wi);
      U.forEach((u, k) => {
        if (u.L !== "ر" || u.role !== "letter") return;
        const heavy = (w.cand[u.b] || []).some((x) => x.cat === "takhlis"), stop = isLast && k === U.length - 1;
        let p = k - 1; while (p >= 0 && ["zaid", "kashida", "lamShams"].includes(U[p].role)) p--;
        const pv = U[p], pvv = pv ? (pv.role === "madd" ? (pv.L === "ا" || pv.L === "ى" ? "a" : pv.L === "و" ? "u" : "i") : pv.vowel) : null;
        let why;
        if (u.vowel && !stop) why = u.vowel === "i" ? "مكسورة" : u.vowel === "a" ? "مفتوحة" : "مضمومة";
        else if (pv && !pvv && pv.L === "ي") why = "ساكنة للوقف بعد ياء ساكنة";
        else if (pvv) why = `ساكنة${stop ? " للوقف" : ""} بعد ${pvv === "i" ? "كسر" : pvv === "a" ? "فتح" : "ضمّ"}`;
        else { let q = p - 1; while (q >= 0 && !U[q].vowel) q--; const v2 = q >= 0 ? U[q].vowel : null; why = `ساكنة${stop ? " للوقف" : ""} وقبلها ساكن${v2 ? " قبله " + (v2 === "i" ? "كسر" : v2 === "a" ? "فتح" : "ضمّ") : ""}`; }
        if (heavy && /بعد كسر/.test(why)) why += "، وبعدها حرف استعلاء";
        rows.push({ id: it.id + ":" + u.b, it, at: u.b, t: heavy ? "tafkhim" : "tarqiq", why });
      });
    }
    return rows;
  }
  // The places of articulation and the qualities of the letters (المقدّمة الجزرية).
  const MAKHARIJ = [
    ["jawf", "الجوف", "حروف المدّ"], ["aqsa_halq", "أقصى الحلق", "ء ه"], ["wasat_halq", "وسط الحلق", "ع ح"], ["adna_halq", "أدنى الحلق", "غ خ"],
    ["qaf", "أقصى اللسان مع ما يحاذيه من الحنك الأعلى", "ق"], ["kaf", "أقصى اللسان أسفل من مخرج القاف قليلاً", "ك"],
    ["wasat_lisan", "وسط اللسان مع ما يحاذيه من الحنك الأعلى", "ج ش ي"], ["dad", "إحدى حافتي اللسان مع ما يحاذيها من الأضراس العليا", "ض"],
    ["lam", "أدنى حافة اللسان إلى منتهى طرفها مع لثة الأسنان العليا", "ل"], ["nun", "طرف اللسان مع لثة الثنيتين العلييين، تحت اللام قليلاً", "ن"],
    ["ra", "طرف اللسان مع ظهره، قريباً من مخرج النون", "ر"], ["nit", "طرف اللسان مع أصول الثنيتين العلييين", "ط د ت"],
    ["asal", "طرف اللسان مع ما فوق الثنيتين السفليين", "ص س ز"], ["lithawi", "طرف اللسان مع أطراف الثنيتين العلييين", "ظ ذ ث"],
    ["fa", "باطن الشفة السفلى مع أطراف الثنيتين العلييين", "ف"], ["shafatan", "الشفتان", "ب م و"], ["khayshum", "الخيشوم", "الغنّة"],
  ];
  const makhrajOf = (L) => (MAKHARIJ.find((m) => m[0] !== "jawf" && m[0] !== "khayshum" && m[2].split(" ").includes(L)) || [])[0];
  const SIFAT_PAIRS = [[["jahr", "الجهر"], ["hams", "الهمس"]], [["shidda", "الشدّة"], ["bayniyya", "البينيّة"], ["rakhawa", "الرخاوة"]], [["istila", "الاستعلاء"], ["istifal", "الاستفال"]],
    [["itbaq", "الإطباق"], ["infitah", "الانفتاح"]], [["idhlaq", "الإذلاق"], ["ismat", "الإصمات"]]];
  const SIFAT_SOLO = [["safir", "الصفير"], ["qalqala", "القلقلة"], ["inhiraf", "الانحراف"], ["takrir", "التكرير"], ["tafashshi", "التفشّي"], ["istitala", "الاستطالة"], ["ghunna", "الغنّة"], ["lin", "اللين"]];
  function sifatOf(L) {
    const has = (s) => s.includes(L);
    const pair = [has("فحثهشخصسكت") ? "hams" : "jahr", has("أجدقطبكتء") ? "shidda" : has("لنعمر") ? "bayniyya" : "rakhawa", has("خصضغطقظ") ? "istila" : "istifal",
      has("صضطظ") ? "itbaq" : "infitah", has("فرمنلب") ? "idhlaq" : "ismat"];
    const solo = [["safir", "صسز"], ["qalqala", "قطبجد"], ["inhiraf", "لر"], ["takrir", "ر"], ["tafashshi", "ش"], ["istitala", "ض"], ["ghunna", "نم"], ["lin", "وي"]].filter(([, x]) => has(x)).map(([k]) => k);
    return { pair, solo };
  }
  const LETTER_NAMES = { "ء": "الهمزة", "ب": "الباء", "ت": "التاء", "ث": "الثاء", "ج": "الجيم", "ح": "الحاء", "خ": "الخاء", "د": "الدال", "ذ": "الذال", "ر": "الراء", "ز": "الزاي", "س": "السين", "ش": "الشين", "ص": "الصاد", "ض": "الضاد", "ط": "الطاء", "ظ": "الظاء", "ع": "العين", "غ": "الغين", "ف": "الفاء", "ق": "القاف", "ك": "الكاف", "ل": "اللام", "م": "الميم", "ن": "النون", "ه": "الهاء", "و": "الواو", "ي": "الياء" };
  /** The letters of a lesson: the cheikh's choice for this surah in the student's level, else the throat letters. */
  function lessonLetters(n) {
    const lv = TOK() && ME && ME.level, cfg = lv && lv.config && lv.config.letters;
    const s = cfg && cfg[n];
    return Array.from((s || P.letters || "ءهعحغخ").replace(/[^ءبتثجحخدذرزسشصضطظعغفقكلمنهوي]/g, ""));
  }
  function tableShell(v, S, kind, lead, inner, canSolve) {
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === P.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    v.innerHTML = `${surahHead(P.surah)}${surahTabs(kind)}<p class="lead">${lead}</p>
      ${kind === "huruf" ? "" : `<div class="bar"><div class="field"><label for="pS">السورة</label><select id="pS">${opts}</select></div>
        <div class="field"><label for="pA">الآية</label><select id="pA">${ayahOpts(S)}</select></div>
        <button class="iconbtn" id="pPrev" aria-label="الآية السابقة">›</button><button class="iconbtn" id="pNext" aria-label="الآية التالية">‹</button></div>`}
      ${inner}
      <div class="bar"><button class="btn primary" id="tCheck"${P.locked ? " disabled" : ""}>${P.exam ? "سلّم الامتحان" : "تحقّق"}</button>${canSolve && !(P.exam && !P.locked) ? `<button class="btn" id="tSolve">${P.solved ? "عُد إلى إجاباتي" : "اعرض الحل"}</button>` : ""}<button class="btn" id="tClear">${P.locked ? "امتحان جديد" : "امسح الكل"}</button>${examBtn()}</div>`;
    bindSurahTabs(v); bindExam(v);
    if ($("#pS", v)) {
      $("#pS", v).onchange = (e) => { P.surah = +e.target.value; ui.surah = P.surah; LS.set("surah", ui.surah); P.ai = defAi(P.surah); resetExercise(); renderPractice(); };
      $("#pA", v).onchange = (e) => { P.ai = +e.target.value; resetExercise(); renderPractice(); };
      $("#pPrev", v).onclick = () => { if (P.ai >= 0) { P.ai--; resetExercise(); renderPractice(); } };
      $("#pNext", v).onclick = () => { if (P.ai < S.ayahs.length - 1) { P.ai++; resetExercise(); renderPractice(); } };
    }
    $("#tCheck", v).onclick = () => { P.checked = true; P.solved = false; P.fresh = true; renderPractice(); };
    if ($("#tSolve", v)) $("#tSolve", v).onclick = () => { P.solved = !P.solved; renderPractice(); };
    $("#tClear", v).onclick = () => { resetExercise(); renderPractice(); };
  }
  const pickWord = (wd, at) => { const c = []; c[at] = "pick"; c.s2 = []; return wordSVG(wd, c); };
  const ansOf = () => P.ans || (P.ans = {});
  function bindAnswers(v) {
    $$("[data-ans]", v).forEach((x) => (x.onchange = () => { if (P.locked) return; ansOf()[x.dataset.ans] = x.value; P.checked = false; }));
  }
  function renderMadd(v, S) {
    const sc = drillScope(S), rows = sampleRows(maddRows(sc, S), (r) => r.t, sc.key), A = ansOf();
    let result = "";
    if (P.checked) {
      let right = 0; const errs = [];
      for (const r of rows) { const ok = A[r.id + "t"] === r.t && A[r.id + "l"] === MADD_T[r.t][1]; if (ok) right++; else errs.push([r.it.wd[0], r.t, A[r.id + "t"] || ""]); }
      logAttempt("madd", S, sc.key, right, rows.length, errs.filter((e) => e[2]).length, errs);
      result = `<div class="result"><b>${right === rows.length ? "أحسنت! الجدول صحيح كله." : `الصحيح ${AR(right)} من ${AR(rows.length)}.`}</b>${examNote()}</div>`;
    }
    const show = P.checked || P.solved;
    const inner = rows.length ? `<div class="ptable-wrap"><table class="atable ttable"><thead><tr><th>الكلمة</th><th>نوع المدّ</th><th>الحكم (المقدار)</th><th>التعليل</th></tr></thead><tbody>
      ${rows.map((r) => { const t = P.solved ? r.t : A[r.id + "t"] || "", l = P.solved ? MADD_T[r.t][1] : A[r.id + "l"] || "", ok = t === r.t && l === MADD_T[r.t][1];
        return `<tr class="${P.checked && !P.solved ? (ok ? "right" : "wrong") : ""}"><td class="tw">${pickWord(r.it.wd, r.at)}</td>
        <td><select data-ans="${r.id}t"${P.locked || P.solved ? " disabled" : ""}><option value="">—</option>${Object.entries(MADD_T).map(([k, x]) => `<option value="${k}"${t === k ? " selected" : ""}>${x[0]}</option>`).join("")}</select></td>
        <td><select data-ans="${r.id}l"${P.locked || P.solved ? " disabled" : ""}><option value="">—</option>${Object.entries(MADD_LEN).map(([k, x]) => `<option value="${k}"${l === k ? " selected" : ""}>${x}</option>`).join("")}</select></td>
        <td class="why">${show && !(P.exam && P.checked && !P.solved && !P.locked) ? `${P.checked && !ok ? `<b>${MADD_T[r.t][0]} · ${MADD_LEN[MADD_T[r.t][1]]}</b><br>` : ""}${MADD_T[r.t][2]}` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>${result}` : `<p class="empty">لا مدّ في هذا الموضع.</p>`;
    tableShell(v, S, "madd", "الكلمة معطاة وحرف المدّ فيها مُعلَّم: اختر نوع المدّ ومقداره لقالون، ثم اضغط «تحقّق» لترى التعليل.", inner, true);
    bindAnswers(v);
  }
  function renderRa(v, S) {
    const sc = drillScope(S), rows = sampleRows(raRows(sc), (r) => r.t + r.why, sc.key), A = ansOf();
    let result = "";
    if (P.checked) {
      let right = 0; const errs = [];
      for (const r of rows) { if (A[r.id] === r.t) right++; else errs.push([r.it.wd[0], r.t, A[r.id] || ""]); }
      logAttempt("ra", S, sc.key, right, rows.length, errs.filter((e) => e[2]).length, errs);
      result = `<div class="result"><b>${right === rows.length ? "أحسنت! كل الراءات صحيحة." : `الصحيح ${AR(right)} من ${AR(rows.length)}.`}</b>${examNote()}</div>`;
    }
    const inner = rows.length ? `<div class="ptable-wrap"><table class="atable ttable"><thead><tr><th>الكلمة</th><th>الحكم</th><th>التعليل</th></tr></thead><tbody>
      ${rows.map((r) => { const t = P.solved ? r.t : A[r.id] || "", ok = t === r.t;
        return `<tr class="${P.checked && !P.solved ? (ok ? "right" : "wrong") : ""}"><td class="tw">${pickWord(r.it.wd, r.at)}</td>
        <td><span class="seg">${[["tafkhim", "تفخيم"], ["tarqiq", "ترقيق"]].map(([k, l]) => `<button data-ra="${r.id}" data-v="${k}" aria-pressed="${t === k}"${P.locked || P.solved ? " disabled" : ""}>${l}</button>`).join("")}</span></td>
        <td class="why">${P.checked || P.solved ? `${P.checked && !ok ? `<b>${r.t === "tafkhim" ? "تفخيم" : "ترقيق"}</b>: ` : ""}راء ${esc(r.why)}` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>${result}` : `<p class="empty">لا راء في هذا الموضع.</p>`;
    tableShell(v, S, "ra", "اختر حكم كل راء: تفخيم أو ترقيق، ثم اضغط «تحقّق» لترى التعليل.", inner, true);
    $$("[data-ra]", v).forEach((b) => (b.onclick = () => { if (P.locked) return; A[b.dataset.ra] = b.dataset.v; P.checked = false; renderPractice(); }));
  }
  function renderHuruf(v, S) {
    const letters = lessonLetters(S.n), A = ansOf();
    let result = "", right = 0, total = 0;
    const errs = [];
    const grade = (L) => {
      const sf = sifatOf(L), mk = makhrajOf(L);
      const okM = A[L + ":m"] === mk, okP = sf.pair.every((x, i) => A[L + ":p" + i] === x), mine = new Set((A[L + ":s"] || "").split(",").filter(Boolean)), okS = sf.solo.length === mine.size && sf.solo.every((x) => mine.has(x));
      return { okM, okP, okS, sf, mk };
    };
    if (P.checked) {
      for (const L of letters) { const g = grade(L); total += 3; right += g.okM + g.okP + g.okS; if (!g.okM) errs.push([L, "makhraj", ""]); if (!g.okP || !g.okS) errs.push([L, "sifat", ""]); }
      logAttempt("huruf", S, LETTER_NAMES[letters[0]] ? letters.join("") : "all", right, total, 0, errs);
      result = `<div class="result"><b>${right === total ? "أحسنت! المخارج والصفات صحيحة." : `الصحيح ${AR(right)} من ${AR(total)}.`}</b>${examNote()}</div>`;
    }
    const inner = `${!(TOK() && ME && ME.level && ME.level.config && ME.level.config.letters && ME.level.config.letters[S.n]) ? `<div class="bar"><div class="field grow"><label for="hLet">الحروف</label><input id="hLet" value="${esc(letters.join(" "))}" placeholder="مثال: ء ه ع"></div></div>` : ""}
      ${letters.map((L) => { const g = grade(L), shw = P.solved, mk = shw ? g.mk : A[L + ":m"] || "", mine = new Set(shw ? g.sf.solo : (A[L + ":s"] || "").split(",").filter(Boolean));
        return `<div class="card hcard"><h3>${esc(LETTER_NAMES[L] || L)} <span class="hl">${L}</span></h3>
        <div class="kv"><label>المخرج</label><select data-ans="${L}:m"${P.locked || P.solved ? " disabled" : ""} class="${P.checked ? (g.okM ? "ok" : "bad") : ""}"><option value="">—</option>${MAKHARIJ.map(([k, l]) => `<option value="${k}"${mk === k ? " selected" : ""}>${l}</option>`).join("")}</select>
        <label>صفات لها ضدّ</label><div class="pairs ${P.checked ? (g.okP ? "ok" : "bad") : ""}">${SIFAT_PAIRS.map((grp, i) => `<span class="seg">${grp.map(([k, l]) => `<button data-sf="${L}:p${i}" data-v="${k}" aria-pressed="${(shw ? g.sf.pair[i] : A[L + ":p" + i]) === k}"${P.locked || P.solved ? " disabled" : ""}>${l}</button>`).join("")}</span>`).join("")}</div>
        <label>صفات لا ضدّ لها</label><div class="pairs ${P.checked ? (g.okS ? "ok" : "bad") : ""}"><span class="seg wrap">${SIFAT_SOLO.map(([k, l]) => `<button data-solo="${L}" data-v="${k}" aria-pressed="${mine.has(k)}"${P.locked || P.solved ? " disabled" : ""}>${l}</button>`).join("")}</span></div></div>
        ${P.checked && !(g.okM && g.okP && g.okS) ? `<p class="why"><b>الجواب:</b> ${esc((MAKHARIJ.find((m) => m[0] === g.mk) || [])[1] || "")} · ${g.sf.pair.map((x, i) => SIFAT_PAIRS[i].find((y) => y[0] === x)[1]).join("، ")}${g.sf.solo.length ? " · " + g.sf.solo.map((x) => SIFAT_SOLO.find((y) => y[0] === x)[1]).join("، ") : ""}</p>` : ""}</div>`; }).join("")}
      ${result}`;
    tableShell(v, S, "huruf", "لكل حرف من حروف الدرس: اختر مخرجه، وصفاته التي لها ضدّ، وصفاته التي لا ضدّ لها.", inner, true);
    bindAnswers(v);
    $$("[data-sf]", v).forEach((b) => (b.onclick = () => { if (P.locked) return; A[b.dataset.sf] = b.dataset.v; P.checked = false; renderPractice(); }));
    $$("[data-solo]", v).forEach((b) => (b.onclick = () => { if (P.locked) return; const k = b.dataset.solo + ":s", s = new Set((A[k] || "").split(",").filter(Boolean)); s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v); A[k] = [...s].join(","); P.checked = false; renderPractice(); }));
    const hl = $("#hLet", v); if (hl) hl.onchange = () => { P.letters = hl.value; resetExercise(); renderPractice(); };
  }
  async function renderPractice() {
    const v = $("#v-practice");
    let S;
    try { S = await loadSurah(P.surah); } catch (e) { v.innerHTML = `<p class="empty">تعذّر تحميل السورة.</p>`; return; }
    if (P.ai >= S.ayahs.length) P.ai = 0;
    if (P.kind === "paint") return renderPaint(v, S);
    if (P.kind === "wasl") return renderWasl(v, S);
    if (P.kind === "madd") return renderMadd(v, S);
    if (P.kind === "ra") return renderRa(v, S);
    if (P.kind === "huruf") return renderHuruf(v, S);
    const nunKind = P.kind === "nun";
    if (P.exam) P.mode = "exercise";
    const cols = nunKind ? T.NUN_RULES.map((r) => ({ id: r.id, name: r.name, cat: r.cat, short: r.short, vis: ["ghunna", "bayni", "idgham"] })) : tableCols();
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === P.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    const aopts = ayahOpts(S);
    const sc = drillScope(S), W = (wi) => sc.by.get(wi);
    const words = sc.items.map((x) => ({ wd: x.wd, wi: x.id }));
    const answer = {};
    for (const c of cols) {
      answer[c.id] = new Set();
      for (const { wd, wi } of words) {
        if (nunKind) { if (W(wi).an.rules.some((r) => r.rule === c.id)) answer[c.id].add(wi); continue; }
        const res = T.resolve(W(wi).an, new Set([c.id]), PRIORITY, ovOf(S, W(wi)));
        if (res.some((x) => x === c.id) || res.s2.some((x) => x === c.id)) answer[c.id].add(wi);
      }
    }
    const vis = new Set(nunKind ? ["ghunna", "bayni", "idgham"] : cols.map((c) => c.id));
    const ayahLine = sc.line(({ wd, id: wi }) => {
      const colors = P.mode === "show" ? colorsFor(W(wi).an, vis, ovOf(S, W(wi))) : null;
      return `<button class="w" data-pw="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, colors)}</button>`;
    });
    let body = "";
    if (P.mode === "show") {
      const maxRows = Math.max(1, ...cols.map((c) => answer[c.id].size));
      body = `<tr>${cols.map((c) => `<td><div class="cell">${Array.from(answer[c.id]).map((wi) => {
        const wd = W(wi).wd;
        return `<button class="w" data-tw="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, colorsFor(W(wi).an, new Set(c.vis || [c.id]), ovOf(S, W(wi))))}</button>`;
      }).join("") || `<span class="role" style="font-size:13px;color:var(--muted)">—</span>`}</div></td>`).join("")}</tr>`;
      void maxRows;
    } else {
      body = `<tr>${cols.map((c) => {
        const set = P.placed[c.id] || new Set();
        return `<td class="target" data-col="${c.id}"><div class="cell">${Array.from(set).map((wi) => {
          const wd = W(wi).wd;
          const ok = answer[c.id].has(wi);
          return `<span class="w placed${P.checked ? (ok ? " right" : " wrong") : ""}" data-unplace="${c.id}:${wi}">${wordSVG(wd, P.checked ? colorsFor(W(wi).an, new Set(c.vis || [c.id]), ovOf(S, W(wi))) : null)}</span>`;
        }).join("")}</div></td>`;
      }).join("")}</tr>`;
    }
    let result = "";
    if (P.mode === "exercise" && P.checked) {
      let right = 0, total = 0, wrong = 0;
      const missing = [];
      for (const c of cols) {
        const set = P.placed[c.id] || new Set();
        total += answer[c.id].size;
        for (const wi of set) answer[c.id].has(wi) ? right++ : wrong++;
        for (const wi of answer[c.id]) if (!set.has(wi)) missing.push({ c, wi });
      }
      const errs = missing.map(({ c, wi }) => [W(wi).wd[0], c.id, ""]);
      for (const c of cols) for (const wi of P.placed[c.id] || []) if (!answer[c.id].has(wi)) errs.push([W(wi).wd[0], (cols.find((c2) => answer[c2.id].has(wi)) || {}).id || "", c.id]);
      logAttempt(nunKind ? "nun" : "time", S, sc.key, right, total, wrong, errs);
      const sc0 = LS.get("scores", {}); sc0[`${S.n}:${sc.key}`] = { right, total, wrong, at: Date.now() }; LS.set("scores", sc0);
      result = `<div class="result"><b>النتيجة: ${AR(right)} من ${AR(total)} صحيحة${wrong ? `، و${AR(wrong)} في غير موضعها` : ""}.</b>
        ${missing.length ? `<div class="missing">لم تضعها بعد: ${missing.map(({ c, wi }) => `<span class="chip small" style="--dot:var(--c-${c.cat || c.id})"><span class="dot"></span>${esc(plain(W(wi).wd[0]))} ← ${esc(c.name)}</span>`).join("")}</div>` : `<div>أحسنت، أكملت الجدول.</div>`}${examNote()}</div>`;
    }
    v.innerHTML = `${surahHead(P.surah)}${surahTabs(P.kind || "time")}
      <p class="lead">${nunKind ? "جدول أحكام النون الساكنة والتنوين والميم الساكنة: ضع كل كلمة في عمود حكمها. القراءة موصولة عبر رؤوس الآي، والنون والميم المشدّدتان لا تُسألان." : "كل كلمة تظهر في عمود كل حكم فيها، ملوّنةً بذلك الحكم وحده. في وضع «تمرين» اختر كلمة ثم اضغط على العمود المناسب."}</p>
      <div class="bar">
        <div class="field"><label for="pS">السورة</label><select id="pS">${opts}</select></div>
        <div class="field"><label for="pA">الآية</label><select id="pA">${aopts}</select></div>
        ${P.exam ? "" : `<div class="seg" id="pMode"><button data-m="show" aria-pressed="${P.mode === "show"}">عرض</button><button data-m="exercise" aria-pressed="${P.mode === "exercise"}">تمرين</button></div>`}
        ${examBtn()}
        <button class="iconbtn" id="pPrev" aria-label="الآية السابقة">›</button><button class="iconbtn" id="pNext" aria-label="الآية التالية">‹</button>
      </div>
      <div class="ayah-show ${P.mode === "exercise" ? "pool" : ""}" id="pAyah">${ayahLine}</div>
      ${P.mode === "exercise" ? `<div class="bar"><button class="btn primary" id="pCheck"${P.locked ? " disabled" : ""}>${P.exam ? "سلّم الامتحان" : "تحقّق"}</button><button class="btn" id="pClear">${P.locked ? "امتحان جديد" : "إفراغ الجدول"}</button><span style="font-size:13px;color:var(--muted)">${P.picked != null ? "اختر العمود لهذه الكلمة" : "اختر كلمة"}</span></div>` : ""}
      ${result}
      <div class="ptable-wrap"><table class="ptable"><thead><tr>${cols.map((c) => `<th style="--hc:var(--c-${c.cat || c.id})">${esc(c.name)}<small>${esc(c.short || (CATMAP.get(c.id) || {}).short || "")}</small></th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
    bindSurahTabs(v); bindExam(v);
    $("#pS", v).onchange = (e) => { P.surah = +e.target.value; ui.surah = P.surah; LS.set("surah", ui.surah); P.ai = defAi(P.surah); resetExercise(); renderPractice(); };
    $("#pA", v).onchange = (e) => { P.ai = +e.target.value; resetExercise(); renderPractice(); };
    $$("#pMode button", v).forEach((b) => (b.onclick = () => { P.mode = b.dataset.m; resetExercise(); renderPractice(); }));
    $("#pPrev", v).onclick = () => { if (P.ai >= 0) { P.ai--; resetExercise(); renderPractice(); } };
    $("#pNext", v).onclick = () => { if (P.ai < S.ayahs.length - 1) { P.ai++; resetExercise(); renderPractice(); } };
    if (P.mode === "show") {
      $$("[data-tw],[data-pw]", v).forEach((b) => (b.onclick = () => { const it = W(+(b.dataset.tw || b.dataset.pw)); openWord(S, it.ai, it.wi, "practice"); }));
    } else {
      $$("[data-pw]", v).forEach((b) => { if (+b.dataset.pw === P.picked) b.classList.add("picked"); b.onclick = () => { if (P.locked) return; P.picked = +b.dataset.pw === P.picked ? null : +b.dataset.pw; P.checked = false; renderPractice(); }; });
      $$("[data-col]", v).forEach((td) => (td.onclick = (e) => {
        if (e.target.closest("[data-unplace]") || P.locked) return;
        if (P.picked == null) { toast("اختر كلمة من الآية أولاً."); return; }
        const set = P.placed[td.dataset.col] || (P.placed[td.dataset.col] = new Set());
        set.add(P.picked); P.checked = false; renderPractice();
      }));
      $$("[data-unplace]", v).forEach((x) => (x.onclick = () => { if (P.locked) return; const [c, wi] = x.dataset.unplace.split(":"); P.placed[c].delete(+wi); P.checked = false; renderPractice(); }));
      $("#pCheck", v).onclick = () => { P.checked = true; P.fresh = true; renderPractice(); };
      $("#pClear", v).onclick = () => { resetExercise(); renderPractice(); };
    }
  }

  /* ---------------- about ---------------- */
  function renderAbout() {
    const key = legendOrder().filter((c) => c.on).map((c) => `<div><span class="dot" style="--dot:var(--c-${c.id})"></span><b>${esc(c.name)}</b><span>${esc(c.short || "")}</span></div>`).join("");
    $("#v-about").innerHTML = `<div class="prose">
      <h2 class="page-title">الطريق إلى الإتقان</h2>
      <p class="lead">دورة «طريقك إلى الإتقان» معتمدةً كتاب «الطريق إلى الإتقان – المستوى الأول» من إعداد الشيخ المقرئ محمّد بن عبد الله جوّاد، برواية قالون عن نافع.</p>
      <blockquote>خطوات عملية تطبيقية للوصول إلى إتقان أصوات حروف كتاب الله سبحانه وتعالى، ولتحقيق هذا الهدف ينبغي علينا الاهتمام بما يلي: أولاً: مخارج الحروف وصفاتها. ثانياً: إتمام الحركات. ثالثاً: تخليص الحروف.</blockquote>
      <h3>مخارج الحروف وصفاتها</h3>
      <p>مخارج الحروف: الالتزام بها واجب والإخلال بها حرام مطلقاً. وصفات الحروف تشمل زمن الحرف (شدّة، بينيّة، رخاوة، تمكين الغنّة) والاستعلاء.</p>
      <p>يختلف زمن الحرف إذا كان ساكناً بحسب جريان الصوت: (أجد قط بكت) حروف شديدة ينحبس معها الصوت في المخرج، و(لن عمر) حروف بينيّة يجري معها الصوت جرياناً جزئياً، وباقي الحروف رخوة يجري معها الصوت جرياناً كاملاً.</p>
      <h3>إتمام الحركات</h3>
      <p>الفتحة يُفتح فيها الفم، والضمّة تُضمّ فيها الشفتان إلى الأمام، أما الكسرة فيُخفض فيها الفكّ السفلي إلى أسفل. والمراد بالإتمام عكس النقص وعكس الاختلاس.</p>
      <h3>تخليص الحروف</h3>
      <p>عدم التأثير أو التأثّر (مفخّم بمرقّق أو مرقّق بمفخّم). وحروفه (خص ضغط قظ) والراء في حالة التفخيم ولام لفظ الجلالة إذا سُبقت بفتح أو ضمّ.</p>
      <h3>مفتاح الألوان</h3>
      <div class="colorkey">${key}</div>
      <p>فإذا انتبه الطالب من خلال هذه الألوان إلى زمن الحرف من شدّة وبينيّة ورخاوة وتمكين الغنّة، وإلى إتمام الحركة وتخليص الحروف، فإنّه سيحصل على مستوى جيد من الإتقان.</p>
      ${STATIC ? `<h3>بدون اتصال</h3><p>يمكنك تثبيت الصفحة كتطبيق من قائمة المتصفح («إضافة إلى الشاشة الرئيسية»)، وحفظ المصحف كاملاً على جهازك لتقرأ دون إنترنت.</p><p><button class="btn" id="cacheAll">حفظ المصحف كاملاً على هذا الجهاز (11 ميغابايت تقريباً)</button></p>` : ""}
      <h3>كيف تستعمل الصفحة</h3>
      <p>اختر السورة، ثم اضغط على أي كلمة لترى حروفها وأحكامها ونطق الشيخ لها، ويمكنك فتح الفيديو بشاشة كاملة والكلمة ظاهرة تحته. اضغط على رقم الآية لفتح جدول التدريب أو تلاوة الشيخ للآية. استعمل أزرار الألوان لإظهار حكم أو إخفائه أثناء المراجعة.</p>
    </div>`;
    const ca = $("#cacheAll");
    if (ca) ca.onclick = () => cacheWholeMushaf(ca);
  }

  /* ---------------- admin (the cheikh's dashboard) ---------------- */
  let ADMIN_TAB = "colors";
  function updateSavebar() {
    const s = $("#saveStatus");
    if (!s) return;
    s.textContent = DIRTY ? "لديك تعديلات لم تُحفظ بعد." : SAVE_NOTE || (STATE.savedAt ? "آخر حفظ: " + new Date(STATE.savedAt).toLocaleString("ar-u-nu-latn") : "لم تُحفظ أي تعديلات بعد.");
  }
  function markDirty() { DIRTY = true; updateSavebar(); }
  function catPatch(id, patch) {
    const c = CATMAP.get(id);
    if (c && c.custom) { const x = STATE.custom.find((y) => y.id === id); Object.assign(x, patch); }
    else STATE.cats[id] = Object.assign({}, STATE.cats[id] || {}, patch);
    anVersion++; refreshCats(); markDirty();
  }
  function renderAdmin() {
    const v = $("#v-admin");
    if (!CAN_EDIT && STATIC) { renderGhLogin(v); return; }
    if (!CAN_EDIT) {
      v.innerHTML = `<h2 class="page-title">لوحة الشيخ</h2><p class="lead">هذه الصفحة للشيخ ومن يملك صلاحية التعديل. افتح الصفحة بالحساب الذي يملك صلاحية التعديل لترى أدوات الألوان والفيديو.</p>`;
      return;
    }
    const tabs = [["colors", "الألوان والأحكام"], ["rules", "ضوابط المحرّك"], ["edits", "الكلمات المعدّلة"], ["videos", "الفيديوهات"], ["backup", "نسخة احتياطية"]].concat(STATIC ? [["key", "رابط الشيخ"]] : []);
    v.innerHTML = `<h2 class="page-title">لوحة الشيخ</h2>
      <p class="lead">كل تغيير هنا يُطبَّق مباشرة على المعاينة، ويصل إلى الطلاب بعد الضغط على «حفظ ونشر».</p>
      <div class="admin-tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${ADMIN_TAB === k}">${l}</button>`).join("")}</div>
      <div id="adminBody"></div>
      <div class="savebar"><span class="status" id="saveStatus"></span><button class="btn primary" id="saveBtn">حفظ ونشر للطلاب</button>${STATIC ? `<button class="btn ghost" id="ghOut">خروج</button>` : ""}</div>`;
    if (STATIC) $("#ghOut", v).onclick = () => { GH.clear(); CAN_EDIT = false; $("#adminLink").hidden = true; renderAdmin(); };
    $$("[data-tab]", v).forEach((b) => (b.onclick = () => { ADMIN_TAB = b.dataset.tab; renderAdmin(); }));
    $("#saveBtn", v).onclick = () => persist();
    updateSavebar();
    const body = $("#adminBody", v);
    if (ADMIN_TAB === "colors") adminColors(body);
    else if (ADMIN_TAB === "rules") adminRules(body);
    else if (ADMIN_TAB === "edits") adminEdits(body);
    else if (ADMIN_TAB === "videos") adminVideos(body);
    else if (ADMIN_TAB === "key" && STATIC) adminKeyLink(body);
    else adminBackup(body);
  }
  async function previewHTML() {
    const S1 = await loadSurah(1), S111 = await loadSurah(111);
    const vis = new Set(ALLCATS.filter((c) => c.on).map((c) => c.id));
    const line = (S, ai) => S.ayahs[ai].w.map((wd, wi) => wd[3] ? "" : `<span class="w" role="button" tabindex="0" data-ps="${S.n}" data-pai="${ai}" data-pwi="${wi}">${wordSVG(wd, colorsFor(analyze(S, ai, "waqf")[wi], vis, ovFor(S.n, S.ayahs[ai].a, wi, wd[0])))}</span>`).join(" ") + ` <span class="ae">${wordSVG(S.ayahs[ai].e, null)}</span>`;
    const b = META.basmala.map((wd, i) => `<span class="w">${wordSVG(wd, colorsFor(basmalaAn()[i], vis, null))}</span>`).join(" ");
    return `<div>${b}</div><div>${line(S1, 0)} ${line(S1, 1)}</div><div>${line(S111, 0)} ${line(S111, 2)}</div>`;
  }
  async function adminColors(body) {
    const rows = PRIORITY.map((id, idx) => {
      const c = CATMAP.get(id);
      return `<div class="catrow" data-id="${c.id}">
        <div class="order"><button data-mv="-1" aria-label="أولوية أعلى">▲</button><button data-mv="1" aria-label="أولوية أدنى">▼</button></div>
        <div class="colors"><input type="color" data-k="color" value="${c.color}" aria-label="اللون"><input type="color" data-k="dark" value="${c.dark || c.color}" aria-label="لون الوضع الليلي" title="لون الوضع الليلي"></div>
        <div class="meta"><input type="text" data-k="name" value="${esc(c.name)}" aria-label="اسم الحكم"><input type="text" data-k="short" value="${esc(c.short || "")}" aria-label="شرح مختصر"></div>
        <div class="flags"><label><input type="checkbox" data-k="on"${c.on ? " checked" : ""}> متاح للطلاب</label><label><input type="checkbox" data-k="table"${c.table ? " checked" : ""}> في جدول التدريب</label>
          <span style="color:var(--muted);font-size:12px">الأولوية ${AR(idx + 1)}${c.core ? " · من ألوان الشيخ" : ""}</span>${c.custom ? `<button class="linkbtn" data-del>حذف الحكم</button>` : ""}</div></div>`;
    }).join("");
    body.innerHTML = `<div class="preview" id="pv"><div class="loading" style="min-height:120px"><div class="bar-l"><i></i></div></div></div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 10px">اضغط أي كلمة في المعاينة أو في المصحف لتعديل ألوانها. الترتيب هو الأولوية: إذا اجتمع حكمان على الجزء نفسه من الحرف ظهر لون الأعلى. اللون الثاني لكل حكم يُستعمل في الوضع الليلي.</p>
      <div class="catrows">${rows}</div>
      <div class="bar" style="margin-top:12px"><button class="btn" id="addCat">إضافة حكم جديد</button><button class="btn" id="resetCats">استعادة ألوان الشيخ الافتراضية</button></div>`;
    const redrawPv = async () => { $("#pv", body).innerHTML = await previewHTML(); };
    $("#pv", body).onclick = async (e) => { const w = e.target.closest("[data-ps]"); if (!w) return; openWord(await loadSurah(+w.dataset.ps), +w.dataset.pai, +w.dataset.pwi, "admin"); };
    redrawPv();
    let t = null;
    const later = () => { clearTimeout(t); t = setTimeout(redrawPv, 120); };
    $$(".catrow", body).forEach((row) => {
      const id = row.dataset.id;
      $$("input", row).forEach((inp) => {
        inp.addEventListener(inp.type === "text" ? "change" : "input", () => {
          const k = inp.dataset.k;
          catPatch(id, { [k]: inp.type === "checkbox" ? inp.checked : inp.value });
          later();
        });
      });
      $$("[data-mv]", row).forEach((b) => (b.onclick = () => {
        const order = PRIORITY.slice(), i = order.indexOf(id), j = i + +b.dataset.mv;
        if (j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        STATE.order = order; anVersion++; refreshCats(); markDirty(); adminColors(body);
      }));
      const del = $("[data-del]", row);
      if (del) del.onclick = () => { STATE.custom = STATE.custom.filter((x) => x.id !== id); for (const k in STATE.overrides) for (const i in STATE.overrides[k]) if (STATE.overrides[k][i] === id) delete STATE.overrides[k][i]; refreshCats(); markDirty(); adminColors(body); };
    });
    $("#addCat", body).onclick = () => { const id = "c" + Date.now().toString(36); STATE.custom.push({ id, name: "حكم جديد", color: "#7A4FB5", dark: "#B596E8", short: "يلوّنه الشيخ يدوياً في محرّر الكلمة.", on: true, table: false }); refreshCats(); markDirty(); adminColors(body); };
    $("#resetCats", body).onclick = () => { STATE.cats = {}; STATE.order = null; anVersion++; refreshCats(); markDirty(); adminColors(body); };
  }
  function adminRules(body) {
    const st = STATE.settings || {}, cl = Object.assign({}, T.SETTINGS.classes, STATE.classes || {});
    body.innerHTML = `<div class="kv">
      <label for="rMode">طريقة القراءة الافتراضية</label><select id="rMode"><option value="waqf">الوقف على رؤوس الآي</option><option value="wasl">الوصل</option><option value="marks">الوقف عند علامات الوقف</option></select>
      <label for="rFinal">الحركة الأخيرة عند الوقف</label><select id="rFinal"><option value="keep">تبقى بلون إتمام الحركات</option><option value="sakin">تأخذ لون الساكن</option><option value="hide">تُخفى</option></select>
      <label for="rLive">روابط الدروس عن بُعد: سطر لكل رابط (Google Meet، Zoom، تيليغرام، واتساب، يوتيوب للتسجيلات…). يمكن كتابة اسم قبل الرابط: «حصة السبت | https://…»</label><textarea id="rLive" dir="ltr" rows="4" placeholder="https://meet.google.com/…&#10;قناة التسجيلات | https://t.me/…">${esc(lessonLinks().map((l) => (l.label && l.label !== l.pf && l.label !== "رابط الدرس" ? l.label + " | " : "") + l.url).join("\n"))}</textarea>
      <label for="rShadid">الحروف الشديدة</label><input type="text" id="rShadid" value="${esc(cl.shadid)}">
      <label for="rBayni">الحروف البينية</label><input type="text" id="rBayni" value="${esc(cl.bayni)}">
      <label for="rTakh">حروف التخليص (الاستعلاء)</label><input type="text" id="rTakh" value="${esc(cl.takhlis)}">
      </div><p style="font-size:13px;color:var(--muted)">باقي الحروف تُعدّ رخوة. الراء ولام لفظ الجلالة تُفخّمان تلقائياً بحسب ما قبلهما.</p>`;
    $("#rMode", body).value = st.mode || "waqf";
    $("#rFinal", body).value = st.finalHaraka || "keep";
    const upd = () => {
      STATE.settings = Object.assign({}, STATE.settings, { mode: $("#rMode", body).value, finalHaraka: $("#rFinal", body).value, links: $("#rLive", body).value.trim(), liveUrl: "" });
      refreshCats();
      STATE.classes = { shadid: $("#rShadid", body).value.trim(), bayni: $("#rBayni", body).value.trim(), takhlis: $("#rTakh", body).value.trim() };
      anVersion++; anCache.clear(); BASMALA_AN = null; markDirty();
    };
    $$("select,input,textarea", body).forEach((x) => x.addEventListener("change", upd));
  }
  function keyLabel(k) {
    if (k.startsWith("f:")) return `كل مواضع «${plain(k.slice(2))}»`;
    const p = k.split(":");
    if (p[0] === "o") return `سورة ${META.surahs[+p[1] - 1].ar} · الآية ${AR(p[2])} · الكلمة ${AR(+p[3] + 1)}`;
    if (p[0] === "a") return `سورة ${META.surahs[+p[1] - 1].ar} · الآية ${AR(p[2])} (فيديو الآية)`;
    return k;
  }
  function keyOpen(k) {
    const p = k.split(":");
    if (p[0] === "o" || p[0] === "a") return { s: +p[1], a: +p[2], wi: p[0] === "o" ? +p[3] : null };
    return null;
  }
  function adminEdits(body) {
    const ov = Object.keys(STATE.overrides), notes = Object.keys(STATE.notes);
    body.innerHTML = `<h3 class="page-title" style="font-size:19px">تعديلات الألوان (${AR(ov.length)})</h3>
      <div class="list">${ov.map((k) => `<div class="item"><span class="grow">${esc(keyLabel(k))} · ${AR(Object.keys(STATE.overrides[k]).length)} جزء</span>${keyOpen(k) ? `<button class="btn" data-open="${esc(k)}">فتح</button>` : ""}<button class="btn danger" data-delov="${esc(k)}">حذف</button></div>`).join("") || `<p class="empty">لا توجد تعديلات بعد. افتح أي كلمة في المصحف لتعديل ألوانها.</p>`}</div>
      <h3 class="page-title" style="font-size:19px">ملاحظات الشيخ (${AR(notes.length)})</h3>
      <div class="list">${notes.map((k) => `<div class="item"><span class="grow">${esc(keyLabel(k))}: ${esc(STATE.notes[k])}</span><button class="btn danger" data-delnote="${esc(k)}">حذف</button></div>`).join("") || `<p class="empty">لا توجد ملاحظات بعد.</p>`}</div>`;
    $$("[data-delov]", body).forEach((b) => (b.onclick = () => { delete STATE.overrides[b.dataset.delov]; anVersion++; markDirty(); adminEdits(body); }));
    $$("[data-delnote]", body).forEach((b) => (b.onclick = () => { delete STATE.notes[b.dataset.delnote]; markDirty(); adminEdits(body); }));
    $$("[data-open]", body).forEach((b) => (b.onclick = () => openKey(b.dataset.open)));
  }
  async function openKey(k) {
    const o = keyOpen(k); if (!o) return;
    ui.surah = o.s; LS.set("surah", o.s); ui.lesson = null;
    location.hash = "#mushaf";
    await renderMushaf();
    const ai = CUR.ayahs.findIndex((x) => x.a === o.a);
    if (ai >= ui.rendered) appendAyahs(ai - ui.rendered + 5);
    if (o.wi != null) openWord(CUR, ai, o.wi); else openAyahMenu(CUR, ai);
  }
  function adminVideos(body) {
    const keys = Object.keys(STATE.videos);
    const opts = META.surahs.map((s) => `<option value="${s.n}">${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    body.innerHTML = `<div class="card" style="margin-bottom:14px"><h3>فيديو آية مع مزامنة الكلمات</h3>
      <p>ارفع تلاوة الآية مرة واحدة، ثم اضغط عند بداية كل كلمة. بعدها يُقتطع نطق كل كلمة من فيديو الآية تلقائياً، فلا حاجة إلى فيديو لكل كلمة.</p>
      <div class="bar"><div class="field"><label for="vS">السورة</label><select id="vS">${opts}</select></div><div class="field"><label for="vA">الآية</label><input id="vA" type="number" min="1" value="1" style="width:80px"></div>
      <button class="btn" id="vSync">مزامنة الكلمات</button></div>
      ${videoControlsHTML("v", false)}
      <p style="font-size:12.5px">لفيديو كلمة واحدة افتح الكلمة في المصحف. ${STATIC ? "" : "حدّ الرفع المباشر 20 ميغابايت."}</p></div>
      <div class="list">${keys.map((k) => `<div class="item"><span class="grow">${esc(keyLabel(k))}${STATE.timings[k] ? " · مُزامن" : ""}</span>${keyOpen(k) ? `<button class="btn" data-open="${esc(k)}">فتح</button>` : ""}<button class="btn danger" data-delv="${esc(k)}">حذف</button></div>`).join("") || `<p class="empty">لم يُرفع أي فيديو بعد.</p>`}</div>`;
    const target = async () => { const s = +$("#vS", body).value, a = +$("#vA", body).value; const S = await loadSurah(s); const ai = S.ayahs.findIndex((x) => x.a === a); if (ai < 0) { toast("رقم الآية غير موجود في هذه السورة."); return null; } return { S, ai, key: `a:${s}:${a}` }; };
    const vUp = $("#vUp", body);
    if (vUp) vUp.onchange = async (e) => { const f = e.target.files[0]; const t = await target(); if (f && t && (await uploadVideo(f, t.key))) { adminVideos(body); openSync(t.S, t.ai); } };
    $("#vUrlSave", body).onclick = async () => {
      const t = await target(); if (!t) return;
      const url = await resolveVideoUrl($("#vUrl", body).value);
      if (!url) { toast("لم أجد ملف فيديو في هذا الرابط. الصق رابط صفحة archive.org أو رابط ملف MP4 يبدأ بـ https.", 6500); return; }
      STATE.videos[t.key] = url; await persist(); adminVideos(body); openSync(t.S, t.ai);
    };
    $("#vSync", body).onclick = async () => { const t = await target(); if (!t) return; if (!STATE.videos[t.key]) { toast("ارفع فيديو هذه الآية أولاً."); return; } openSync(t.S, t.ai); };
    $$("[data-delv]", body).forEach((b) => (b.onclick = () => { delete STATE.videos[b.dataset.delv]; delete STATE.timings[b.dataset.delv]; markDirty(); adminVideos(body); }));
    $$("[data-open]", body).forEach((b) => (b.onclick = () => openKey(b.dataset.open)));
  }
  function renderGhLogin(v) {
    const g = GH.get();
    v.innerHTML = `<h2 class="page-title">دخول الشيخ</h2>
      <p class="lead">الإعدادات تُحفظ في مستودع GitHub الخاص بالمشروع، ثم يُعاد نشر الموقع تلقائياً. يكفي إدخال الرمز مرة واحدة على هذا الجهاز.</p>
      <div class="card" style="max-width:560px"><div class="kv">
        <label for="ghRepo">المستودع</label><input type="text" id="ghRepo" dir="ltr" value="${esc((g && g.repo) || SITE.repo)}" placeholder="owner/repository">
        <label for="ghTok">رمز الوصول</label><input type="password" id="ghTok" dir="ltr" autocomplete="off" placeholder="github_pat_…">
      </div>
      <div class="bar"><button class="btn primary" id="ghIn">دخول</button></div>
      <h3 style="font-size:16px">لإنشاء الرمز مرة واحدة</h3>
      <ol style="margin:0;padding-inline-start:20px;display:grid;gap:4px;font-size:13.5px;color:var(--muted)">
        <li>افتح <bdi dir="ltr">github.com/settings/personal-access-tokens/new</bdi></li>
        <li>في <bdi dir="ltr">Repository access</bdi> اختر هذا المستودع فقط.</li>
        <li>في <bdi dir="ltr">Permissions → Contents</bdi> اختر <bdi dir="ltr">Read and write</bdi>.</li>
        <li>انسخ الرمز والصقه هنا. لا يُرسل إلى أي مكان غير GitHub، ويبقى على هذا الجهاز.</li>
      </ol></div>`;
    $("#ghIn", v).onclick = async () => {
      const repo = $("#ghRepo", v).value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""), tok = $("#ghTok", v).value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !tok) { toast("اكتب اسم المستودع بالشكل owner/repository والصق الرمز."); return; }
      try { await ghLogin(repo, tok); CAN_EDIT = true; $("#adminLink").hidden = false; setTopH(); toast("تمّ الدخول."); renderAdmin(); }
      catch (e) { toast(e.status === 401 ? "الرمز غير صحيح." : e.status === 403 ? "هذا الرمز لا يملك صلاحية الكتابة في المستودع." : e.status === 404 ? "لم أجد المستودع، أو الرمز لا يصل إليه." : "تعذّر الاتصال بـ GitHub.", 6000); }
    };
  }
  async function cacheWholeMushaf(btn) {
    btn.disabled = true;
    let done = 0;
    for (const s of META.surahs) {
      try { await loadSurah(s.n); done++; } catch (e) { /* keep going */ }
      if (done % 6 === 0 || done === META.surahs.length) btn.textContent = `جارٍ الحفظ… ${AR(done)} / ${AR(META.surahs.length)}`;
    }
    btn.textContent = done === META.surahs.length ? "حُفظ المصحف كاملاً على هذا الجهاز ✓" : "حُفظ جزء منه؛ أعد المحاولة عند توفّر الاتصال";
    btn.disabled = false;
  }
  function adminBackup(body) {
    body.innerHTML = `<div class="card"><h3>نسخة احتياطية</h3><p>نزّل ملفاً يحوي كل الألوان والتعديلات والملاحظات وروابط الفيديو، أو استرجع ملفاً سابقاً.</p>
      <div class="bar"><button class="btn" id="bDown">تنزيل نسخة</button><label class="btn">استرجاع من ملف<input type="file" accept="application/json,.json" id="bUp" hidden></label></div></div>`;
    $("#bDown", body).onclick = async () => {
      const d = await cap("downloads");
      if (!d) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(STATE, null, 1)], { type: "application/json" }));
        a.download = "state.json"; document.body.appendChild(a); a.click(); a.remove();
        return;
      }
      try { await d.save({ filename: "itqan-settings.json", data: JSON.stringify(STATE, null, 1) }); } catch (e) { /* declined */ }
    };
    $("#bUp", body).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { STATE = mergeState(JSON.parse(await f.text())); onStateChanged(); markDirty(); toast("استُرجعت النسخة. اضغط «حفظ ونشر» لاعتمادها."); } catch (err) { toast("الملف ليس نسخة صالحة."); }
    };
  }

  // ?audit exposes the drawing pipeline to the colour audit (test/audit.js); nothing changes for users.
  if (/[?&]audit\b/.test(location.search)) window.__A = { analyze, loadSurah, colorsFor, partsOf, coverage, visibleSet, ovFor, meta: () => META, gly: () => GLY, T, CORE };
  /* ---------------- boot ---------------- */
  async function boot() {
    readKeyLink();
    try {
      const [meta, gly, st, site] = await Promise.all([getJSON("data/meta.json"), getJSON("data/glyphs.json"), getJSON("data/state.json").catch(() => null), getJSON("data/site.json").catch(() => null)]);
      if (site) SITE = Object.assign(SITE, site);
      META = meta; GLY = gly.g; UPEM = gly.upem; YMAX = gly.yMax + 60; YMIN = gly.yMin - 60;
      if (st) STATE = mergeState(st);
    } catch (e) {
      $("#v-mushaf").innerHTML = `<div class="loading"><span>تعذّر تحميل بيانات المصحف. أعد تحميل الصفحة.</span></div>`;
      return;
    }
    refreshCats();
    buildDefs();
    window.addEventListener("hashchange", route);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && SHEET) closeSheet(); });
    $("#v-mushaf").addEventListener("click", (e) => {
      const w = e.target.closest(".w[data-wi]");
      if (w && CUR) { openWord(CUR, +w.dataset.ai, +w.dataset.wi, "mushaf"); return; }
      const ae = e.target.closest(".ae[data-ai]");
      if (ae && CUR) openAyahMenu(CUR, +ae.dataset.ai);
    });
    window.addEventListener("resize", setTopH);
    route();
    if (TOK()) refreshMe().then(() => { if ((location.hash || "#home") === "#home") renderHome(); });
    // live state for signed-in viewers
    cap("db").then(async (db) => {
      if (!db) return;
      try {
        const snap = await db.doc("shared/state").get();
        const d = snap.exists ? snap.data() : null;
        if (d && d.json && (!STATE.savedAt || String(d.savedAt) > String(STATE.savedAt))) { STATE = mergeState(JSON.parse(d.json)); onStateChanged(); }
      } catch (e) { /* read refused: keep the published file */ }
    });
    RUNTIME.then((inClaude) => {
      if (inClaude) return;
      STATIC = true;
      $("#ownerLink").hidden = false;
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
      if (GH.get()) { CAN_EDIT = true; $("#adminLink").hidden = false; setTopH(); }
      if (SK() && LS.get("welcome", 0)) { $("#studentsLink").hidden = false; setTopH(); }
      if ((CAN_EDIT || SK()) && LS.get("welcome", 0)) { LS.del("welcome"); toast("مرحباً بك شيخنا. تمّ تفعيل أدوات الشيخ على هذا الجهاز.", 6000); }
      const r = (location.hash || "#home").slice(1);
      if (r === "admin" || r === "about" || (CAN_EDIT && r === "mushaf")) route();
      setTimeout(maybeTour, 600);
    });
    cap("user").then(async (u) => {
      if (!u) return;
      try { CAN_EDIT = await u.canEdit(); } catch (e) { CAN_EDIT = false; }
      if (CAN_EDIT) {
        $("#adminLink").hidden = false; setTopH();
        const draft = LS.get("draft", null);
        if (draft) { try { const d = JSON.parse(draft); if (!STATE.savedAt || d.savedAt > STATE.savedAt) { STATE = mergeState(d); DIRTY = true; onStateChanged(); toast("استُرجعت تعديلات لم تُنشر بعد من هذا المتصفح."); } } catch (e) { /* ignore */ } }
        if ((location.hash || "").slice(1) === "admin") renderAdmin();
        if (SHEET) drawSheet();
      }
    });
  }
  boot();
})();
