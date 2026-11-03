(function () {
  "use strict";
  const T = window.Tajweed;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const AR = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plain = (t) => t.replace(/[ً-ٰٟۖ-ۭـ‏]/g, "");
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("itqan:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("itqan:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem("itqan:" + k); } catch (e) { /* ignore */ } },
  };
  // A video is either an archive.org (or any https) link, or an asset id uploaded inside the Claude page.
  const blobUrl = (id) => (/^https?:\/\//.test(id) ? id : "/_blob/" + id);
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
    surah: LS.get("surah", 1), mode: LS.get("mode", null), size: LS.get("size", 34),
    hidden: new Set(LS.get("hidden", [])), lesson: LS.get("lesson", null), rendered: 0,
  };
  const P = { surah: 111, ai: 0, mode: "show", picked: null, placed: {}, checked: false };

  function refreshCats() {
    const base = T.CATEGORIES.map((c) => Object.assign({}, c, STATE.cats[c.id] || {}));
    const custom = (STATE.custom || []).map((c) => Object.assign({ custom: true, on: true, table: false }, c));
    ALLCATS = base.concat(custom);
    CATMAP = new Map(ALLCATS.map((c) => [c.id, c]));
    PRIORITY = (STATE.order || T.DEFAULT_ORDER).filter((id) => CATMAP.has(id));
    for (const c of ALLCATS) if (!PRIORITY.includes(c.id)) PRIORITY.push(c.id);
    RANK = new Map(PRIORITY.map((id, i) => [id, i]));
    applyColors();
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
  const mode = () => ui.mode || (STATE.settings && STATE.settings.mode) || "waqf";
  function engineSettings(m) {
    const st = STATE.settings || {};
    return { mode: m || mode(), finalHaraka: st.finalHaraka || "keep", tanweenAtWaqf: st.tanweenAtWaqf || "harakat",
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
  async function getJSON(u) { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
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
      nextWord: ai < S.ayahs.length - 1 ? firstReal(S.ayahs[ai + 1]) : null });
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
    for (const gid in GLY) if (GLY[gid][0]) parts.push(`<path id="g${gid}" d="${GLY[gid][0]}"/>`);
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
  /** wd = [text, advance, flat glyphs [gid, cluster, x, y, …]]; colors = category per char; range limits to chars [from, to). */
  function wordSVG(wd, colors, range) {
    if (typeof wd[0] === "number") wd = ["", wd[0], wd[1]]; // ayah-end ornament: [advance, glyphs]
    const text = wd[0], adv = wd[1], g = wd[2];
    const cov = coverage(text, g);
    let minX = range ? 1e9 : 0, maxX = range ? -1e9 : adv, uses = "";
    for (let i = 0; i < g.length; i += 4) {
      const gid = g[i], c = g[i + 1], x = g[i + 2], y = g[i + 3];
      const e = GLY[gid];
      if (!e || !e[0]) continue;
      if (range && (c < range[0] || c >= range[1])) continue;
      minX = Math.min(minX, x + e[1]); maxX = Math.max(maxX, x + e[3]);
      const cat = pickCat(colors, cov.get(c));
      uses += `<use href="#g${gid}" transform="translate(${x} ${-y}) scale(1 -1)"${cat ? ` class="k-${cat}"` : ""}/>`;
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
  const ROUTES = ["mushaf", "lessons", "practice", "about", "admin"];
  function route() {
    let r = (location.hash || "#mushaf").slice(1);
    if (!ROUTES.includes(r)) r = "mushaf";
    if (r === "admin" && !CAN_EDIT) r = "admin";
    for (const v of $$(".view")) v.hidden = v.id !== "v-" + r;
    for (const a of $$(".nav a")) a.setAttribute("aria-current", a.getAttribute("href") === "#" + r ? "page" : "false");
    closeSheet();
    if (r === "mushaf") renderMushaf();
    else if (r === "lessons") renderLessons();
    else if (r === "practice") renderPractice();
    else if (r === "about") renderAbout();
    else if (r === "admin") renderAdmin();
    window.scrollTo(0, 0);
    setTopH();
  }
  function setTopH() { const h = $(".top"); if (h) document.documentElement.style.setProperty("--topH", h.offsetHeight + "px"); }

  /* ---------------- legend ---------------- */
  function legendHTML() {
    const cats = availableCats();
    return cats.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="${!ui.hidden.has(c.id)}" style="--dot:var(--c-${c.id})" title="${esc(c.short || "")}"><span class="dot"></span>${esc(c.name)}</button>`).join("")
      + `<span class="sep"></span><span class="legend-all"><button class="linkbtn" data-legend="all">إظهار الكل</button><button class="linkbtn" data-legend="none">إخفاء الكل</button></span>`;
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
    const lesson = ui.lesson && lessonById(ui.lesson);
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === ui.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    v.innerHTML = `
      ${lesson ? `<div class="lesson-banner"><h3>الدرس ${AR(LESSONS.indexOf(lesson) + 1)}: ${esc(lesson.title)}</h3><p>${esc(lesson.text)}</p>
        <div class="row"><button class="btn primary" id="lessonDone">${(LS.get("done", [])).includes(lesson.id) ? "أنهيت هذا الدرس ✓" : "أنهيت الدرس"}</button><button class="btn ghost" id="lessonExit">الخروج من الدرس</button><a class="btn ghost" href="#lessons">كل الدروس</a></div></div>` : ""}
      <div class="bar">
        <div class="field"><label for="surahSel">السورة</label><select id="surahSel">${opts}</select></div>
        <div class="field"><label for="modeSel">القراءة</label><select id="modeSel">
          <option value="waqf"${mode() === "waqf" ? " selected" : ""}>الوقف على رؤوس الآي</option>
          <option value="wasl"${mode() === "wasl" ? " selected" : ""}>الوصل</option>
          <option value="marks"${mode() === "marks" ? " selected" : ""}>الوقف عند علامات الوقف</option></select></div>
        <div class="field" aria-label="حجم الخط"><button class="iconbtn" id="fsDown" aria-label="تصغير الخط">−</button><button class="iconbtn" id="fsUp" aria-label="تكبير الخط">+</button></div>
        <div class="field"><label for="gotoAyah">الآية</label><input id="gotoAyah" type="number" min="1" inputmode="numeric" style="width:76px" placeholder="رقم"></div>
      </div>
      <div class="legend" id="legend">${legendHTML()}</div>
      <article class="page" id="page" style="--q:${ui.size}px"><div class="loading"><div class="bar-l"><i></i></div><span>تحميل السورة…</span></div></article>`;
    bindLegend($("#legend", v), () => redrawMushaf());
    $("#surahSel", v).onchange = (e) => { ui.surah = +e.target.value; LS.set("surah", ui.surah); renderMushaf(); };
    $("#modeSel", v).onchange = (e) => { ui.mode = e.target.value; LS.set("mode", ui.mode); redrawMushaf(); };
    $("#fsDown", v).onclick = () => setSize(-2);
    $("#fsUp", v).onclick = () => setSize(2);
    $("#gotoAyah", v).onchange = (e) => gotoAyah(+e.target.value);
    if (lesson) {
      $("#lessonDone", v).onclick = () => { const d = new Set(LS.get("done", [])); d.add(lesson.id); LS.set("done", Array.from(d)); toast("أحسنت! سُجّل الدرس منتهياً."); renderMushaf(); };
      $("#lessonExit", v).onclick = () => { ui.lesson = null; LS.set("lesson", null); renderMushaf(); };
    }
    try { CUR = await loadSurah(ui.surah); } catch (e) { $("#page").innerHTML = `<p class="empty">تعذّر تحميل السورة. تحقّق من الاتصال ثم أعد المحاولة.</p>`; return; }
    ui.rendered = 0;
    drawPage();
  }
  function setSize(d) { ui.size = Math.max(20, Math.min(72, ui.size + d)); LS.set("size", ui.size); const p = $("#page"); if (p) p.style.setProperty("--q", ui.size + "px"); }
  function drawPage() {
    const S = CUR, s = META.surahs[S.n - 1];
    const page = $("#page");
    const showBasmala = S.n !== 9;
    page.innerHTML = `<div class="cartouche"><h2>سورة ${esc(s.ar)}</h2><span>${AR(s.count)} آية · الجزء ${AR(s.juz)} · الصفحة ${AR(s.page)}</span></div>
      ${showBasmala ? `<div class="basmala">${basmalaHTML()}</div>` : ""}
      <div class="mushaf" id="mushaf"></div><div class="more" id="more"></div>`;
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
            <div class="seg" id="wRate"><button data-r="0.5">٠٫٥×</button><button data-r="0.75">٠٫٧٥×</button><button data-r="1" aria-pressed="true">١×</button></div>
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
      ${CAN_EDIT ? `<div class="section"><h4>أدوات الشيخ</h4><div class="bar">
        ${hasRaw ? `<button class="btn" id="aSync">مزامنة الكلمات${hasVid ? " (مُزامنة)" : ""}</button>` : ""}
      </div><h4>فيديو تلاوة الآية</h4>${videoControlsHTML("a", !!hasRaw)}</div>` : ""}
    </section>`;
    const root = $("#sheetRoot");
    $$("[data-close]", root).forEach((b) => (b.onclick = closeSheet));
    $("#aTable", root).onclick = () => { P.surah = S.n; P.ai = ai; P.mode = "show"; resetExercise(); closeSheet(); location.hash = "#practice"; if (location.hash === "#practice") renderPractice(); };
    if (hasRaw) $("#aPlay", root).onclick = () => { closeSheet(); openRecitation(S, ai); };
    if (CAN_EDIT) {
      bindVideoControls(root, "a", `a:${S.n}:${ay.a}`, (added) => { closeSheet(); if (added) openSync(S, ai); });
      if (hasRaw) $("#aSync", root).onclick = () => { closeSheet(); openSync(S, ai); };
    }
  }
  function openSync(S, ai) {
    const ay = S.ayahs[ai], key = `a:${S.n}:${ay.a}`;
    const aid = STATE.videos[key];
    if (!aid) return;
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
        <div class="stage-ctrl"><button class="btn" id="syncStart">▶ ابدأ من البداية</button><button class="btn" id="syncNext">التالي</button><button class="btn" id="syncUndo">تراجع</button><button class="btn" id="syncSave">حفظ التوقيت</button></div></div></div>`;
    const v = $("#sv", root);
    v.src = blobUrl(aid);
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
        if (name) out.push({ i: m.i, label: name, unit: u });
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
      const val = has ? cur[s.i] : auto[s.i];
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
      <h4 style="margin-top:6px">فيديو نطق الكلمة</h4>${videoControlsHTML("vid", hasVid)}
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
      const i = +b.dataset.slot;
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
    $("#noteSave", root).onclick = async () => { const t = $("#noteTx", root).value.trim(); if (t) STATE.notes[keyNow()] = t; else delete STATE.notes[keyNow()]; await persist(); drawSheet(); };
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
    if (file.size > 20 * 1024 * 1024) { toast("حجم الفيديو أكبر من ٢٠ ميغابايت. قصّر المقطع أو صغّر جودته ثم أعد المحاولة.", 6000); return false; }
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
    const r = (location.hash || "#mushaf").slice(1);
    if (r === "mushaf" || !ROUTES.includes(r)) { if ($("#legend")) $("#legend").innerHTML = legendHTML(); redrawMushaf(); }
    else if (r === "practice") renderPractice();
    else if (r === "about") renderAbout();
    else if (r === "admin") renderAdmin();
    if (SHEET) drawSheet();
  }

  /* ---------------- lessons ---------------- */
  function renderLessons() {
    const done = new Set(LS.get("done", []));
    $("#v-lessons").innerHTML = `<h2 class="page-title">مسار الدروس</h2>
      <p class="lead">تُضاف الألوان درساً بعد درس كما في دورة «الطريق إلى الإتقان»: ابدأ بالساكن الشديد، ثم أضف لوناً جديداً في كل درس حتى تجتمع الألوان كلها.</p>
      <div class="grid">${LESSONS.map((l, i) => `<button class="card${done.has(l.id) ? " done" : ""}" data-lesson="${l.id}" style="text-align:start">
        <span class="num">الدرس ${AR(i + 1)}${done.has(l.id) ? " · أُنجز ✓" : ""}</span><h3>${esc(l.title)}</h3><p>${esc(l.sub)} · ${esc(l.practice ? "تمرين" : "سورة " + META.surahs[l.s - 1].ar)}</p>
        <span class="chips">${l.cats.filter((c) => CATMAP.has(c)).map((c) => `<span class="chip small" style="--dot:var(--c-${c})"><span class="dot"></span>${esc(CATMAP.get(c).name)}</span>`).join("")}</span></button>`).join("")}</div>`;
    $$("[data-lesson]").forEach((b) => (b.onclick = () => {
      const l = lessonById(b.dataset.lesson);
      if (l.practice) { P.surah = l.s; P.ai = 0; P.mode = "exercise"; resetExercise(); location.hash = "#practice"; return; }
      ui.lesson = l.id; LS.set("lesson", l.id); ui.surah = l.s; LS.set("surah", l.s);
      l.cats.forEach((c) => ui.hidden.delete(c)); LS.set("hidden", Array.from(ui.hidden));
      location.hash = "#mushaf"; if (location.hash === "#mushaf") route();
    }));
  }

  /* ---------------- practice table ---------------- */
  function resetExercise() { P.picked = null; P.placed = {}; P.checked = false; }
  async function renderPractice() {
    const v = $("#v-practice");
    let S;
    try { S = await loadSurah(P.surah); } catch (e) { v.innerHTML = `<p class="empty">تعذّر تحميل السورة.</p>`; return; }
    if (P.ai >= S.ayahs.length) P.ai = 0;
    const ay = S.ayahs[P.ai];
    const an = analyze(S, P.ai);
    const cols = tableCols();
    const opts = META.surahs.map((s) => `<option value="${s.n}"${s.n === P.surah ? " selected" : ""}>${AR(s.n)} · ${esc(s.ar)}</option>`).join("");
    const aopts = S.ayahs.map((a, i) => `<option value="${i}"${i === P.ai ? " selected" : ""}>${AR(a.a)}</option>`).join("");
    const words = ay.w.map((wd, wi) => ({ wd, wi })).filter((x) => !x.wd[3]);
    const answer = {};
    for (const c of cols) {
      answer[c.id] = new Set();
      for (const { wd, wi } of words) {
        const res = T.resolve(an[wi], new Set([c.id]), PRIORITY, ovFor(S.n, ay.a, wi, wd[0]));
        if (res.some((x) => x === c.id)) answer[c.id].add(wi);
      }
    }
    const vis = new Set(cols.map((c) => c.id));
    const ayahLine = words.map(({ wd, wi }) => {
      const colors = P.mode === "show" ? colorsFor(an[wi], vis, ovFor(S.n, ay.a, wi, wd[0])) : null;
      return `<button class="w" data-pw="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, colors)}</button>`;
    }).join(" ") + ` <span class="ae">${wordSVG(ay.e, null)}</span>`;
    let body = "";
    if (P.mode === "show") {
      const maxRows = Math.max(1, ...cols.map((c) => answer[c.id].size));
      body = `<tr>${cols.map((c) => `<td><div class="cell">${Array.from(answer[c.id]).map((wi) => {
        const wd = ay.w[wi];
        return `<button class="w" data-tw="${wi}" aria-label="${esc(plain(wd[0]))}">${wordSVG(wd, colorsFor(an[wi], new Set([c.id]), ovFor(S.n, ay.a, wi, wd[0])))}</button>`;
      }).join("") || `<span class="role" style="font-size:13px;color:var(--muted)">—</span>`}</div></td>`).join("")}</tr>`;
      void maxRows;
    } else {
      body = `<tr>${cols.map((c) => {
        const set = P.placed[c.id] || new Set();
        return `<td class="target" data-col="${c.id}"><div class="cell">${Array.from(set).map((wi) => {
          const wd = ay.w[wi];
          const ok = answer[c.id].has(wi);
          return `<span class="w placed${P.checked ? (ok ? " right" : " wrong") : ""}" data-unplace="${c.id}:${wi}">${wordSVG(wd, P.checked ? colorsFor(an[wi], new Set([c.id]), ovFor(S.n, ay.a, wi, wd[0])) : null)}</span>`;
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
      const sc = LS.get("scores", {}); sc[`${S.n}:${ay.a}`] = { right, total, wrong, at: Date.now() }; LS.set("scores", sc);
      result = `<div class="result"><b>النتيجة: ${AR(right)} من ${AR(total)} صحيحة${wrong ? `، و${AR(wrong)} في غير موضعها` : ""}.</b>
        ${missing.length ? `<div class="missing">لم تضعها بعد: ${missing.map(({ c, wi }) => `<span class="chip small" style="--dot:var(--c-${c.id})"><span class="dot"></span>${esc(plain(ay.w[wi][0]))} ← ${esc(c.name)}</span>`).join("")}</div>` : `<div>أحسنت، أكملت الجدول.</div>`}</div>`;
    }
    v.innerHTML = `<h2 class="page-title">جدول التدريب</h2>
      <p class="lead">كل كلمة تظهر في عمود كل حكم فيها، ملوّنةً بذلك الحكم وحده. في وضع «تمرين» اختر كلمة ثم اضغط على العمود المناسب.</p>
      <div class="bar">
        <div class="field"><label for="pS">السورة</label><select id="pS">${opts}</select></div>
        <div class="field"><label for="pA">الآية</label><select id="pA">${aopts}</select></div>
        <div class="seg" id="pMode"><button data-m="show" aria-pressed="${P.mode === "show"}">عرض</button><button data-m="exercise" aria-pressed="${P.mode === "exercise"}">تمرين</button></div>
        <button class="iconbtn" id="pPrev" aria-label="الآية السابقة">›</button><button class="iconbtn" id="pNext" aria-label="الآية التالية">‹</button>
      </div>
      <div class="ayah-show ${P.mode === "exercise" ? "pool" : ""}" id="pAyah">${ayahLine}</div>
      ${P.mode === "exercise" ? `<div class="bar"><button class="btn primary" id="pCheck">تحقّق</button><button class="btn" id="pClear">إفراغ الجدول</button><span style="font-size:13px;color:var(--muted)">${P.picked != null ? "اختر العمود لهذه الكلمة" : "اختر كلمة من الآية"}</span></div>` : ""}
      ${result}
      <div class="ptable-wrap"><table class="ptable"><thead><tr>${cols.map((c) => `<th style="--hc:var(--c-${c.id})">${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
    $("#pS", v).onchange = (e) => { P.surah = +e.target.value; P.ai = 0; resetExercise(); renderPractice(); };
    $("#pA", v).onchange = (e) => { P.ai = +e.target.value; resetExercise(); renderPractice(); };
    $$("#pMode button", v).forEach((b) => (b.onclick = () => { P.mode = b.dataset.m; resetExercise(); renderPractice(); }));
    $("#pPrev", v).onclick = () => { if (P.ai > 0) { P.ai--; resetExercise(); renderPractice(); } };
    $("#pNext", v).onclick = () => { if (P.ai < S.ayahs.length - 1) { P.ai++; resetExercise(); renderPractice(); } };
    if (P.mode === "show") {
      $$("[data-tw],[data-pw]", v).forEach((b) => (b.onclick = () => openWord(S, P.ai, +(b.dataset.tw || b.dataset.pw), "practice")));
    } else {
      $$("[data-pw]", v).forEach((b) => { if (+b.dataset.pw === P.picked) b.classList.add("picked"); b.onclick = () => { P.picked = +b.dataset.pw === P.picked ? null : +b.dataset.pw; P.checked = false; renderPractice(); }; });
      $$("[data-col]", v).forEach((td) => (td.onclick = (e) => {
        if (e.target.closest("[data-unplace]")) return;
        if (P.picked == null) { toast("اختر كلمة من الآية أولاً."); return; }
        const set = P.placed[td.dataset.col] || (P.placed[td.dataset.col] = new Set());
        set.add(P.picked); P.checked = false; renderPractice();
      }));
      $$("[data-unplace]", v).forEach((x) => (x.onclick = () => { const [c, wi] = x.dataset.unplace.split(":"); P.placed[c].delete(+wi); P.checked = false; renderPractice(); }));
      $("#pCheck", v).onclick = () => { P.checked = true; renderPractice(); };
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
      ${STATIC ? `<h3>بدون اتصال</h3><p>يمكنك تثبيت الصفحة كتطبيق من قائمة المتصفح («إضافة إلى الشاشة الرئيسية»)، وحفظ المصحف كاملاً على جهازك لتقرأ دون إنترنت.</p><p><button class="btn" id="cacheAll">حفظ المصحف كاملاً على هذا الجهاز (١١ ميغابايت تقريباً)</button></p>` : ""}
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
    s.textContent = DIRTY ? "لديك تعديلات لم تُحفظ بعد." : SAVE_NOTE || (STATE.savedAt ? "آخر حفظ: " + new Date(STATE.savedAt).toLocaleString("ar") : "لم تُحفظ أي تعديلات بعد.");
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
    const tabs = [["colors", "الألوان والأحكام"], ["rules", "ضوابط المحرّك"], ["edits", "الكلمات المعدّلة"], ["videos", "الفيديوهات"], ["backup", "نسخة احتياطية"]];
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
    else adminBackup(body);
  }
  async function previewHTML() {
    const S1 = await loadSurah(1), S111 = await loadSurah(111);
    const vis = new Set(ALLCATS.filter((c) => c.on).map((c) => c.id));
    const line = (S, ai) => S.ayahs[ai].w.map((wd, wi) => wd[3] ? "" : `<span class="w">${wordSVG(wd, colorsFor(analyze(S, ai, "waqf")[wi], vis, ovFor(S.n, S.ayahs[ai].a, wi, wd[0])))}</span>`).join(" ") + ` <span class="ae">${wordSVG(S.ayahs[ai].e, null)}</span>`;
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
      <p style="font-size:13px;color:var(--muted);margin:0 0 10px">الترتيب هو الأولوية: إذا اجتمع حكمان على الجزء نفسه من الحرف ظهر لون الأعلى. اللون الثاني لكل حكم يُستعمل في الوضع الليلي.</p>
      <div class="catrows">${rows}</div>
      <div class="bar" style="margin-top:12px"><button class="btn" id="addCat">إضافة حكم جديد</button><button class="btn" id="resetCats">استعادة ألوان الشيخ الافتراضية</button></div>`;
    const redrawPv = async () => { $("#pv", body).innerHTML = await previewHTML(); };
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
      <label for="rTan">التنوين والإقلاب عند الوقف</label><select id="rTan"><option value="harakat">بلا غنّة (لون الحركة)</option><option value="keep">يبقى بلون الغنّة</option></select>
      <label for="rShadid">الحروف الشديدة</label><input type="text" id="rShadid" value="${esc(cl.shadid)}">
      <label for="rBayni">الحروف البينية</label><input type="text" id="rBayni" value="${esc(cl.bayni)}">
      <label for="rTakh">حروف التخليص (الاستعلاء)</label><input type="text" id="rTakh" value="${esc(cl.takhlis)}">
      </div><p style="font-size:13px;color:var(--muted)">باقي الحروف تُعدّ رخوة. الراء ولام لفظ الجلالة تُفخّمان تلقائياً بحسب ما قبلهما.</p>`;
    $("#rMode", body).value = st.mode || "waqf";
    $("#rFinal", body).value = st.finalHaraka || "keep";
    $("#rTan", body).value = st.tanweenAtWaqf || "harakat";
    const upd = () => {
      STATE.settings = Object.assign({}, STATE.settings, { mode: $("#rMode", body).value, finalHaraka: $("#rFinal", body).value, tanweenAtWaqf: $("#rTan", body).value });
      STATE.classes = { shadid: $("#rShadid", body).value.trim(), bayni: $("#rBayni", body).value.trim(), takhlis: $("#rTakh", body).value.trim() };
      anVersion++; anCache.clear(); BASMALA_AN = null; markDirty();
    };
    $$("select,input", body).forEach((x) => x.addEventListener("change", upd));
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
      <p style="font-size:12.5px">لفيديو كلمة واحدة افتح الكلمة في المصحف. ${STATIC ? "" : "حدّ الرفع المباشر ٢٠ ميغابايت."}</p></div>
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

  /* ---------------- boot ---------------- */
  async function boot() {
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
      const r = (location.hash || "").slice(1);
      if (r === "admin" || r === "about") route();
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
